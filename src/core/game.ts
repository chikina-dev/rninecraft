import { createWorld as createECSWorld, createEntity, addComponent, registerSystem, step as ecsStep, getComponent, query } from 'src/core/ecs';
import { createInputSystem, attachInput, type InputState } from 'src/core/systems/input';
import { createMovementSystem } from 'src/core/systems/movement';
import { createCollisionSystem } from 'src/core/systems/collision';
import { createChunkLoadingSystem } from 'src/core/systems/chunkLoading';
import { createInteractionSystem } from 'src/core/systems/interaction';
import { createAISystem } from 'src/core/systems/ai';
import type { Chunk, World } from 'src/types/map';

export interface GameConfig {
  seed: number;
  chunks: Chunk[][];
  viewDistanceChunks: number;
  cameraRadiusBlocks: number;
  inputTarget?: HTMLElement;
}

export class GameWebGPU {
  private cleanupInput: () => void;
  private inputState: InputState = {
    pressed: new Set(),
    mouse: { x: 0, y: 0, left: false, right: false, width: 0, height: 0 }
  };
  private ecsWorld: any;
  private mapWorld: World;
  private playerEntity: number;

  constructor(config: GameConfig) {
    const { seed, chunks, viewDistanceChunks, cameraRadiusBlocks, inputTarget } = config;
    this.cleanupInput = attachInput(this.inputState, inputTarget || window);

    // Map World Init
    const region = { minX: -1, maxX: 0, minY: -1, maxY: 0 };
    this.mapWorld = {
      loadedChunks: new Map(),
      storedChunks: new Map(),
      viewDistance: viewDistanceChunks,
      cacheDistance: 0,
      seed,
      renderRevision: 0,
    };

    // Initial Chunks
    for (let j = 0; j < chunks.length; j++) {
      for (let i = 0; i < chunks[j].length; i++) {
        const cx = region.minX + i;
        const cy = region.minY + j;
        const key = `${cx},${cy}`;
        this.mapWorld.loadedChunks.set(key, chunks[j][i]);
        this.mapWorld.storedChunks.set(key, chunks[j][i]);
      }
    }

    // ECS Init
    this.ecsWorld = createECSWorld();
    this.playerEntity = createEntity(this.ecsWorld);
    
    // Initial Z will be corrected by collision system
    // Spawn higher to avoid being stuck in ground (Ground max is ~7)
    addComponent(this.ecsWorld, this.playerEntity, { _type: 'component', name: 'position', x: 0, y: 0, z: 10 });
    addComponent(this.ecsWorld, this.playerEntity, { _type: 'component', name: 'velocity', vx: 0, vy: 0, vz: 0 });
    addComponent(this.ecsWorld, this.playerEntity, { _type: 'component', name: 'playerControlled' });

    // Spawn Enemy
    const enemyEntity = createEntity(this.ecsWorld);
    addComponent(this.ecsWorld, enemyEntity, { _type: 'component', name: 'position', x: 5, y: 5, z: 10 });
    addComponent(this.ecsWorld, enemyEntity, { _type: 'component', name: 'velocity', vx: 0, vy: 0, vz: 0 });
    addComponent(this.ecsWorld, enemyEntity, { _type: 'component', name: 'enemy' });
    addComponent(this.ecsWorld, enemyEntity, { _type: 'component', name: 'render', color: '#00ff00', radius: 0.5 });

    // Systems
    const inputSystem = createInputSystem({ input: this.inputState });
    const movementSystem = createMovementSystem(10);
    const collisionSystem = createCollisionSystem({
      mapWorld: this.mapWorld,
      radius: cameraRadiusBlocks,
      onEntityMoved: () => {}
    });
    const chunkLoadingSystem = createChunkLoadingSystem({ mapWorld: this.mapWorld, region, playerEntity: this.playerEntity, seed });
    const interactionSystem = createInteractionSystem({ mapWorld: this.mapWorld, input: this.inputState });
    const aiSystem = createAISystem();

    inputSystem.priority = 0;
    aiSystem.priority = 5;
    movementSystem.priority = 10;
    collisionSystem.priority = 20;
    chunkLoadingSystem.priority = 30;
    interactionSystem.priority = 40;

    registerSystem(this.ecsWorld, inputSystem);
    registerSystem(this.ecsWorld, aiSystem);
    registerSystem(this.ecsWorld, movementSystem);
    registerSystem(this.ecsWorld, collisionSystem);
    registerSystem(this.ecsWorld, chunkLoadingSystem);
    registerSystem(this.ecsWorld, interactionSystem);

  }
  private lastRenderRevision = -1;
  private logTimer = 0;

  update(dt: number) {
    ecsStep(this.ecsWorld, dt);

    // Debug Logging
    this.logTimer += dt;
    if (this.logTimer >= 1.0) {
      this.logTimer = 0;
      const pos = getComponent(this.ecsWorld, this.playerEntity, 'position');
      if (pos) {
        console.log(`Player Pos: (${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}, ${pos.z.toFixed(0)})`);
      }
    }
    
    // Extract state
    const playerPos = getComponent(this.ecsWorld, this.playerEntity, 'position');
    
    let chunks: Chunk[] | undefined;
    const currentRevision = this.mapWorld.renderRevision ?? 0;
    
    if (currentRevision !== this.lastRenderRevision) {
      chunks = Array.from(this.mapWorld.loadedChunks.values());
      this.lastRenderRevision = currentRevision;
    }
    
    // Extract renderable entities
    const renderables = query(this.ecsWorld, ['position', 'render']).map(r => ({
      id: r.entity,
      x: r.components.position.x,
      y: r.components.position.y,
      z: r.components.position.z,
      color: r.components.render.color
    }));

    return {
      playerX: playerPos?.x ?? 0,
      playerY: playerPos?.y ?? 0,
      playerZ: playerPos?.z ?? 0,
      chunks,
      entities: renderables,
      mapRevision: currentRevision
    };
  }
  cleanup() {
    this.cleanupInput();
  }
}
