export type DeviceContext = {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  canvas: HTMLCanvasElement;
};

export async function initWebGPU(canvas: HTMLCanvasElement): Promise<DeviceContext> {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No WebGPU adapter found');
  
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu') as GPUCanvasContext;
  const format = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device: device,
    format: format,
    alphaMode: 'opaque',
  });

  return { device, context, format, canvas };
}
