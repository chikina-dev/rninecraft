export class VoxelMaterial {
  bindGroup!: GPUBindGroup;
  device: GPUDevice;
  pipeline: GPURenderPipeline;
  uniformBuffer: GPUBuffer;
  voxelBuffer: GPUBuffer;

  constructor(
    device: GPUDevice, 
    pipeline: GPURenderPipeline, 
    uniformBuffer: GPUBuffer, 
    voxelBuffer: GPUBuffer,
    texture: GPUTexture,
    sampler: GPUSampler
  ) {
    this.device = device;
    this.pipeline = pipeline;
    this.uniformBuffer = uniformBuffer;
    this.voxelBuffer = voxelBuffer;
    this.updateBindGroup(texture, sampler);
  }

  updateBindGroup(texture: GPUTexture, sampler: GPUSampler) {
    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: { buffer: this.voxelBuffer } },
        { binding: 2, resource: texture.createView({ dimension: '2d-array' }) },
        { binding: 3, resource: sampler },
      ],
    });
  }
}
