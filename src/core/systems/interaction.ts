import type { SystemSpec } from 'src/types/ecs';
import type { World as MapWorld } from 'src/types/map';
import type { InputState } from './input';
import { mat4Perspective, mat4LookAt, mat4Invert, vec3TransformMat4, vec3Subtract, vec3Normalize, vec3Scale, vec3Add, vec3Create, mat4Create, mat4Multiply } from 'src/functions/maths/math';

export interface InteractionSystemOptions {
  mapWorld: MapWorld;
  input: InputState;
}

export function createInteractionSystem(opts: InteractionSystemOptions): SystemSpec<['position', 'playerControlled']> {
  const { input } = opts;
  let cooldown = 0;

  return {
    name: 'interaction',
    deps: ['position', 'playerControlled'],
    update: (entities, _world, dt) => {
      if (cooldown > 0) {
        cooldown -= dt;
        if (!input.mouse.left && !input.mouse.right) cooldown = 0;
        return;
      }

      if (!input.mouse.left && !input.mouse.right) return;

      const player = entities.find(e => e.playerControlled);
      if (!player) return;

      const { x: px, y: py, z: pz } = player.position;

      // 1. Calculate Matrices (Must match Renderer/UniformBuffer)
      const width = input.mouse.width || window.innerWidth;
      const height = input.mouse.height || window.innerHeight;
      const aspect = width / height;

      const projection = mat4Create();
      mat4Perspective(projection, (2 * Math.PI) / 5, aspect, 1, 100.0);

      const view = mat4Create();
      const camPos = new Float32Array([px, py - 8, 12]);
      const target = new Float32Array([px, py, pz - 1]);
      const up = new Float32Array([0, 1, 0]); // Matches UniformBuffer.ts
      mat4LookAt(view, camPos, target, up);

      const viewProj = mat4Create();
      mat4Multiply(viewProj, projection, view);

      const invViewProj = mat4Create();
      if (!mat4Invert(invViewProj, viewProj)) return;

      // 2. Calculate Ray
      const ndcX = (input.mouse.x / width) * 2 - 1;
      const ndcY = 1 - (input.mouse.y / height) * 2;

      const nearPoint = new Float32Array([ndcX, ndcY, 0]);
      const farPoint = new Float32Array([ndcX, ndcY, 1]);

      const rayOrigin = vec3Create();
      vec3TransformMat4(rayOrigin, nearPoint, invViewProj);

      const rayEnd = vec3Create();
      vec3TransformMat4(rayEnd, farPoint, invViewProj);

      const rayDir = vec3Create();
      vec3Subtract(rayDir, rayEnd, rayOrigin);
      vec3Normalize(rayDir, rayDir);

      // 3. Raycast (Simple Stepping)
      let t = 0;
      const maxDist = 50;
      const step = 0.1;
      
      const currentPos = new Float32Array(rayOrigin);
      const delta = vec3Create();
      vec3Scale(delta, rayDir, step);
      
      while (t < maxDist) {
        vec3Add(currentPos, currentPos, delta);
        t += step;
      }

      // Placeholder for Attack Logic
      if (input.mouse.left) {
          // Attack logic here
          cooldown = 0.5;
      }
    }
  };
}
