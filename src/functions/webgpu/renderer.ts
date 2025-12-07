import { initWebGPU, type DeviceContext } from './device';
import { VoxelBuffer } from './resource/VoxelBuffer';
import { UniformBuffer } from './resource/UniformBuffer';
import { DepthTexture } from './resource/DepthTexture';
import { createVoxelPipeline } from './pipeline/VoxelPipeline';
import { VoxelMaterial } from './material/VoxelMaterial';
import { TextureAtlas } from './resource/TextureAtlas';

export type RendererState = {
  deviceContext: DeviceContext;
  pipeline: GPURenderPipeline;
  voxelBuffer: VoxelBuffer;
  uniformBuffer: UniformBuffer;
  depthTexture: DepthTexture;
  material: VoxelMaterial;
  textureAtlas: TextureAtlas;
  
  cameraConfig?: {
    position: [number, number, number];
    target: [number, number, number];
  };
};

export async function createRenderer(canvas: HTMLCanvasElement): Promise<RendererState> {
  const deviceContext = await initWebGPU(canvas);
  const { device, format } = deviceContext;

  // Increase max voxels to handle deeper terrain rendering
  const voxelBuffer = new VoxelBuffer(device, 100000);
  const uniformBuffer = new UniformBuffer(device);
  const pipeline = createVoxelPipeline(device, format);
  const textureAtlas = new TextureAtlas(device);
  const material = new VoxelMaterial(device, pipeline, uniformBuffer.buffer, voxelBuffer.buffer, textureAtlas.texture!, textureAtlas.sampler!);
  const depthTexture = new DepthTexture(device, canvas.width, canvas.height);

  const state: RendererState = {
    deviceContext,
    pipeline,
    voxelBuffer,
    uniformBuffer,
    depthTexture,
    material,
    textureAtlas,
  };

  resize(state);
  window.addEventListener('resize', () => resize(state));

  return state;
}

function resize(state: RendererState) {
  const { canvas, device } = state.deviceContext;
  const devicePixelRatio = window.devicePixelRatio || 1;
  const width = Math.floor(canvas.clientWidth * devicePixelRatio);
  const height = Math.floor(canvas.clientHeight * devicePixelRatio);
  
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    state.depthTexture.resize(device, width, height);
  }
}

export function addVoxel(state: RendererState, x: number, y: number, z: number, r: number, g: number, b: number, textureIndices: number[] = []) {
  state.voxelBuffer.addVoxel(x, y, z, r, g, b, false, textureIndices);
}

export function clearVoxels(state: RendererState) {
  state.voxelBuffer.clear();
}

function renderFrame(state: RendererState) {
  const { device, context, canvas } = state.deviceContext;

  // Update Buffers
  state.voxelBuffer.update(device);
  state.uniformBuffer.update(device, canvas.width, canvas.height, state.cameraConfig);
  
  // Render Pass
  const commandEncoder = device.createCommandEncoder();
  const textureView = context.getCurrentTexture().createView();
  
  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [{
      view: textureView,
      clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
      loadOp: 'clear',
      storeOp: 'store',
    }],
    depthStencilAttachment: {
      view: state.depthTexture.texture.createView(),
      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };
  
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(state.pipeline);
  passEncoder.setBindGroup(0, state.material.bindGroup);
  passEncoder.draw(36, state.voxelBuffer.count);
  passEncoder.end();
  
  device.queue.submit([commandEncoder.finish()]);
  
  requestAnimationFrame(() => renderFrame(state));
}

export function startRenderLoop(state: RendererState) {
  renderFrame(state);
}
