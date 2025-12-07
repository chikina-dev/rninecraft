import type { SystemSpec } from 'src/types/ecs';

// 移動システム: velocity を正規化しスピードを適用、重力を適用し、位置を更新する
export function createMovementSystem(speedPerSecond: number): SystemSpec<['position','velocity']> {
  const GRAVITY = 20.0;

  return {
    name: 'movement',
    deps: ['position','velocity'],
    update: (entities, _world, dt) => {
      if (dt <= 0) return;
      for (const e of entities) {
        const position = e.position;
        const velocity = e.velocity;
        
        // Horizontal movement normalization and speed application
        // Input system sets vx/vy to -1, 0, or 1. We scale this to actual speed.
        if (velocity.vx !== 0 || velocity.vy !== 0) {
          const len = Math.hypot(velocity.vx, velocity.vy);
          // Avoid dividing by zero or very small numbers
          if (len > 0.001) {
             // Normalize and scale
             const scale = speedPerSecond / len;
             velocity.vx *= scale;
             velocity.vy *= scale;
          }
        }
        
        // Apply Gravity
        velocity.vz -= GRAVITY * dt;

        // Apply Velocity to Position
        position.x += velocity.vx * dt;
        position.y += velocity.vy * dt;
        position.z += velocity.vz * dt;
      }
    }
  };
}
