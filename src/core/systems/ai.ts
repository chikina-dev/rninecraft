import type { SystemSpec } from 'src/types/ecs';

export function createAISystem(): SystemSpec<['position', 'velocity', 'enemy']> {
  return {
    name: 'ai',
    deps: ['position', 'velocity', 'enemy'],
    update: (entities, world) => {
      // Find player position (inefficient to do every frame if many entities, but fine for now)
      // We can't easily query *other* entities inside the loop without a separate query or caching.
      // But `world` is available.
      // Let's just find the player from the world components directly or assume we pass it in options?
      // Or just iterate all entities to find player first.
      
      // Actually, we can query for playerControlled in the world.
      // But `world` access is raw.
      // Let's just iterate the `entities` passed to update? No, `entities` only has 'enemy' components.
      // Player doesn't have 'enemy'.
      
      // We can use `world.components.playerControlled` to find the player entity ID.
      let playerPos: { x: number, y: number, z: number } | null = null;
      for (const [id, _] of world.components.playerControlled) {
        const pos = world.components.position.get(id);
        if (pos) {
          playerPos = pos;
          break;
        }
      }

      if (!playerPos) return;

      for (const e of entities) {
        const { position, velocity } = e;
        
        // Simple chase logic
        const dx = playerPos.x - position.x;
        const dy = playerPos.y - position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 1.0 && dist < 20.0) { // Chase if within range but not too close
           const speed = 2.0; // Slower than player
           velocity.vx = (dx / dist) * speed;
           velocity.vy = (dy / dist) * speed;
           
           // Jump if blocked? (Simple auto-jump check could be added here or in movement)
           // For now, just move horizontally.
           // If we want them to jump, we need to check walls.
           // But let's start with sliding.
        } else {
           velocity.vx = 0;
           velocity.vy = 0;
        }
      }
    }
  };
}
