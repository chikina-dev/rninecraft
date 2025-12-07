export class VoxelHandle {
  index: number;
  constructor(index: number) {
    this.index = index;
  }
}

export class VoxelBuffer {
  buffer: GPUBuffer;
  data: ArrayBuffer;
  floatView: Float32Array;
  uintView: Uint32Array;
  count: number = 0;
  maxVoxels: number;
  handles: VoxelHandle[] = [];

  // Stride in floats (4 bytes)
  // 4 (pos) + 4 (color) + 4 (texIndices) = 12 floats = 48 bytes
  readonly STRIDE = 12;

  constructor(device: GPUDevice, maxVoxels: number = 100000) {
    this.maxVoxels = maxVoxels;
    this.data = new ArrayBuffer(maxVoxels * this.STRIDE * 4);
    this.floatView = new Float32Array(this.data);
    this.uintView = new Uint32Array(this.data);

    this.buffer = device.createBuffer({
      size: this.data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
  }

  addVoxel(x: number, y: number, z: number, r: number, g: number, b: number, border: boolean = false, textureIndices: number[] = [], blurMask: number = 0): VoxelHandle | null {
    if (this.count >= this.maxVoxels) {
      console.warn('Max voxels reached');
      return null;
    }
    
    const index = this.count;
    const handle = new VoxelHandle(index);
    this.handles[index] = handle;

    this.setVoxelData(index, x, y, z, r, g, b, border, textureIndices, blurMask);
    
    this.count++;
    return handle;
  }

  updateVoxel(handle: VoxelHandle, x: number, y: number, z: number, r: number, g: number, b: number, border: boolean = false, textureIndices: number[] = [], blurMask: number = 0) {
    if (handle.index === -1 || handle.index >= this.count) {
      console.warn('Invalid voxel handle');
      return;
    }
    this.setVoxelData(handle.index, x, y, z, r, g, b, border, textureIndices, blurMask);
  }

  removeVoxel(handle: VoxelHandle) {
    if (handle.index === -1 || handle.index >= this.count) {
      return;
    }

    const indexToRemove = handle.index;
    const lastIndex = this.count - 1;

    if (indexToRemove !== lastIndex) {
      // Move the last voxel to the removed slot
      const lastHandle = this.handles[lastIndex];
      
      // Copy data
      const srcOffset = lastIndex * this.STRIDE;
      const dstOffset = indexToRemove * this.STRIDE;
      
      // Copy using Uint32Array to copy everything (floats and uints) bitwise
      for (let i = 0; i < this.STRIDE; i++) {
        this.uintView[dstOffset + i] = this.uintView[srcOffset + i];
      }

      // Update handle mapping
      this.handles[indexToRemove] = lastHandle;
      lastHandle.index = indexToRemove;
    }

    // Clear the handle that was removed
    handle.index = -1;
    this.count--;
  }

  private setVoxelData(index: number, x: number, y: number, z: number, r: number, g: number, b: number, border: boolean, textureIndices: number[], blurMask: number) {
    const offset = index * this.STRIDE;
    this.floatView[offset] = x;
    this.floatView[offset + 1] = y;
    this.floatView[offset + 2] = z;
    this.floatView[offset + 3] = border ? 1.0 : 0.0;
    
    this.floatView[offset + 4] = r;
    this.floatView[offset + 5] = g;
    this.floatView[offset + 6] = b;
    this.floatView[offset + 7] = 1.0; // Alpha unused for now

    // Pack texture indices
    // Default to 0xFFFF (65535) for no texture
    const t = textureIndices.length === 6 ? textureIndices : [0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF, 0xFFFF];
    
    // Front/Back
    this.uintView[offset + 8] = (t[0] & 0xFFFF) | ((t[1] & 0xFFFF) << 16);
    // Top/Bottom
    this.uintView[offset + 9] = (t[2] & 0xFFFF) | ((t[3] & 0xFFFF) << 16);
    // Right/Left
    this.uintView[offset + 10] = (t[4] & 0xFFFF) | ((t[5] & 0xFFFF) << 16);
    // Blur mask
    this.uintView[offset + 11] = blurMask;
  }

  update(device: GPUDevice) {
    // Optimization: Only update the used portion of the buffer
    if (this.count > 0) {
      device.queue.writeBuffer(this.buffer, 0, this.data, 0, this.count * this.STRIDE * 4);
    }
  }

  clear() {
    this.count = 0;
    this.handles = [];
  }
}
