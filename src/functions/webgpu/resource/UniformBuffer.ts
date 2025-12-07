import { mat4Create, mat4LookAt, mat4Perspective, vec3Create, vec3Set } from '../../maths/math';

export class UniformBuffer {
  buffer: GPUBuffer;
  data: Float32Array;
  
  // Matrices
  modelMatrix: Float32Array;
  viewMatrix: Float32Array;
  projectionMatrix: Float32Array;
  cameraPosition: Float32Array;

  constructor(device: GPUDevice) {
    // View(64) + Proj(64) + Model(64) + CamPos(16) = 208 bytes
    const size = 64 + 64 + 64 + 16;
    this.buffer = device.createBuffer({
      size: size,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.data = new Float32Array(size / 4);
    
    this.modelMatrix = mat4Create();
    this.viewMatrix = mat4Create();
    this.projectionMatrix = mat4Create();
    this.cameraPosition = vec3Create();
  }

  update(device: GPUDevice, canvasWidth: number, canvasHeight: number, cameraConfig?: { position: [number, number, number], target: [number, number, number] }) {
    let camX, camY, camZ;
    let targetX, targetY, targetZ;

    if (cameraConfig) {
      [camX, camY, camZ] = cameraConfig.position;
      [targetX, targetY, targetZ] = cameraConfig.target;
    } else {
      const centerX = 2.5;
      const centerY = 2.5;
      const centerZ = 2.5;
      
      const radius = 15;
      camX = centerX + radius * 0.7;
      camZ = centerZ + radius * 0.7;
      camY = centerY + 10;
      targetX = centerX;
      targetY = centerY;
      targetZ = centerZ;
    }
    
    vec3Set(this.cameraPosition, camX, camY, camZ);
    mat4LookAt(this.viewMatrix, this.cameraPosition, [targetX, targetY, targetZ], [0, 0, 1]);
    
    const aspect = canvasWidth / canvasHeight;
    mat4Perspective(this.projectionMatrix, (2 * Math.PI) / 5, aspect, 1, 100.0);
    
    // View Matrix at offset 0
    this.data.set(this.viewMatrix, 0);
    // Projection Matrix at offset 16
    this.data.set(this.projectionMatrix, 16);
    // Model Matrix at offset 32
    this.data.set(this.modelMatrix, 32);
    // Camera Position at offset 48
    this.data.set([camX, camY, camZ, 1.0], 48);
    
    device.queue.writeBuffer(this.buffer, 0, this.data.buffer, 0, this.data.byteLength);
  }
}
