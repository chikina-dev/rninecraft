export class TextureAtlas {
  private texturePaths: Map<string, number> = new Map();
  private images: ImageBitmap[] = [];
  texture: GPUTexture | null = null;
  sampler: GPUSampler | null = null;

  constructor(device: GPUDevice) {
    this.createPlaceholder(device);
  }

  private createPlaceholder(device: GPUDevice) {
    this.texture = device.createTexture({
      size: [1, 1, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.sampler = device.createSampler();
    
    const data = new Uint8Array([255, 255, 255, 255]);
    device.queue.writeTexture(
      { texture: this.texture },
      data,
      { bytesPerRow: 4 },
      { width: 1, height: 1, depthOrArrayLayers: 1 }
    );
  }

  async loadTextures(device: GPUDevice, paths: string[]): Promise<boolean> {
    const newPaths = paths.filter(p => !this.texturePaths.has(p));
    if (newPaths.length === 0) return false;

    const promises = newPaths.map(async path => {
      const img = new Image();
      img.src = path;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
      return createImageBitmap(img);
    });

    const newImages = await Promise.all(promises);
    
    newPaths.forEach((path, i) => {
      this.texturePaths.set(path, this.images.length);
      this.images.push(newImages[i]);
    });

    // Recreate texture with all images
    if (this.texture) this.texture.destroy();

    // Assuming 16x16 for now
    const width = 16;
    const height = 16;

    this.texture = device.createTexture({
      size: [width, height, this.images.length],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.sampler = device.createSampler({
      magFilter: 'nearest',
      minFilter: 'nearest',
      mipmapFilter: 'nearest',
      addressModeU: 'repeat',
      addressModeV: 'repeat',
    });

    this.images.forEach((bitmap, i) => {
      device.queue.copyExternalImageToTexture(
        { source: bitmap },
        { texture: this.texture!, origin: [0, 0, i] },
        [width, height]
      );
    });

    return true;
  }

  getTextureIndex(path: string): number {
    return this.texturePaths.get(path) ?? -1;
  }
}
