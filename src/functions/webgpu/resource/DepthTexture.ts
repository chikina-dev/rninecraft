export class DepthTexture {
  texture: GPUTexture;

  constructor(device: GPUDevice, width: number, height: number) {
    this.texture = device.createTexture({
      size: [width, height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }

  resize(device: GPUDevice, width: number, height: number) {
    this.texture.destroy();
    this.texture = device.createTexture({
      size: [width, height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  }
}
