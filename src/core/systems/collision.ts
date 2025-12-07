import type { SystemSpec } from 'src/types/ecs';
import type { Entity } from 'src/types/component';
import { boxCollidesWithWorld } from 'src/core/map/index';
import type { World as MapWorld } from 'src/types/map';

export interface CollisionSystemOptions {
  mapWorld: MapWorld;            // タイル/ワールド構造
  radius: number;                // 当たり判定円半径（ブロック単位）
  stepSize?: number;             // 逐次前進ステップサイズ
  maxSteps?: number;             // 安全上限ステップ数
  onEntityMoved?: (entity: Entity, x: number, y: number) => void; // 位置が補正された際のコールバック
}

export function createCollisionSystem(opts: CollisionSystemOptions): SystemSpec<['position', 'velocity']> {
  const { mapWorld, radius = 0.49, stepSize = 0.1, onEntityMoved } = opts;
  const size = radius * 2;
  const height = 1.8; // Player height
  
  const prevPos = new Map<Entity, { x: number; y: number; z: number }>();

  return {
    name: 'collision',
    deps: ['position', 'velocity'],
    update: (entities) => {
      for (const e of entities) {
        const pos = e.position;
        const vel = e.velocity;
        
        // Initialize prevPos if missing
        let prev = prevPos.get(e.entity);
        if (!prev) {
            prev = { x: pos.x, y: pos.y, z: pos.z };
            prevPos.set(e.entity, prev);
        }
        
        // Reset grounded state
        vel.grounded = false;

        // Helper to check collision at specific coords
        const check = (x: number, y: number, z: number) => 
            boxCollidesWithWorld(mapWorld, x, y, size, size, z, height);

        // --- Z-Axis Collision (Gravity/Jump) ---
        const dz = pos.z - prev.z;
        if (Math.abs(dz) > 0.0001) {
            // Optimization: If movement is small (< 1 block), check destination first.
            // If destination is safe, we assume no tunneling occurred (since blocks are 1x1).
            if (Math.abs(dz) < 0.9 && !check(prev.x, prev.y, pos.z)) {
                // Fast path: Destination is safe
            } else {
                // Slow path: Stepping or Collision occurred
                const sign = Math.sign(dz);
                let remaining = Math.abs(dz);
                let curZ = prev.z;
                let loop = 0;
                
                while (remaining > 0.0001 && loop < 20) {
                    loop++;
                    const step = Math.min(remaining, stepSize);
                    const nextZ = curZ + sign * step;
                    
                    if (check(prev.x, prev.y, nextZ)) {
                        // Collision detected!
                        if (sign < 0) {
                            // Falling: Hit ground
                            vel.grounded = true;
                            vel.vz = 0;
                        } else {
                            // Jumping: Hit ceiling
                            vel.vz = 0;
                        }
                        remaining = 0; // Stop processing Z
                    } else {
                        curZ = nextZ;
                        remaining -= step;
                    }
                }
                pos.z = curZ;
            }
        } else {
            // Not moving Z, but check if we are grounded
            if (check(prev.x, prev.y, pos.z - 0.05)) {
                vel.grounded = true;
            }
        }

        // --- X-Axis Collision ---
        const dx = pos.x - prev.x;
        if (Math.abs(dx) > 0.0001) {
            if (Math.abs(dx) < 0.9 && !check(pos.x, prev.y, pos.z)) {
                // Fast path
            } else {
                const sign = Math.sign(dx);
                let remaining = Math.abs(dx);
                let curX = prev.x;
                let loop = 0;
                while (remaining > 0.0001 && loop < 20) {
                    loop++;
                    const step = Math.min(remaining, stepSize);
                    const nextX = curX + sign * step;
                    
                    if (check(nextX, prev.y, pos.z)) {
                       remaining = 0;
                    } else {
                       curX = nextX;
                       remaining -= step;
                    }
                }
                pos.x = curX;
            }
        }

        // --- Y-Axis Collision ---
        const dy = pos.y - prev.y;
        if (Math.abs(dy) > 0.0001) {
            if (Math.abs(dy) < 0.9 && !check(pos.x, pos.y, pos.z)) {
                // Fast path
            } else {
                const sign = Math.sign(dy);
                let remaining = Math.abs(dy);
                let curY = prev.y;
                let loop = 0;
                while (remaining > 0.0001 && loop < 20) {
                    loop++;
                    const step = Math.min(remaining, stepSize);
                    const nextY = curY + sign * step;
                    
                    if (check(pos.x, nextY, pos.z)) {
                       remaining = 0;
                    } else {
                       curY = nextY;
                       remaining -= step;
                    }
                }
                pos.y = curY;
            }
        }

        // 位置確定 & コールバック
        if (pos.x !== prev.x || pos.y !== prev.y) {
          if (onEntityMoved) onEntityMoved(e.entity, pos.x, pos.y);
        }
        prev.x = pos.x;
        prev.y = pos.y;
        prev.z = pos.z;
      }
    }
  };
}
