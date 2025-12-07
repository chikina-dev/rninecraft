/** @jsxImportSource @jsx-webgpu */
import { useState, useEffect, useRendererState } from '@jsx-webgpu/jsx';
import { VoxelWorld } from './VoxelWorld';
import { GameWebGPU } from 'src/core/game';
import type { Chunk } from 'src/types/map';

interface GameControllerProps {
  seed: number;
  initialChunks: Chunk[][];
}

export function GameController({ seed, initialChunks }: GameControllerProps) {
  const rendererState = useRendererState();
  const [state, setState] = useState({
    playerX: 0,
    playerY: 0,
    playerZ: 0,
    chunks: [] as Chunk[],
    entities: [] as any[],
    mapRevision: -1,
  });

  useEffect(() => {
    if (!rendererState) return;

    const canvas = document.querySelector('#game-canvas') as HTMLElement;
    const game = new GameWebGPU({
      seed,
      chunks: initialChunks,
      viewDistanceChunks: 2,
      cameraRadiusBlocks: 0.49,
      inputTarget: canvas,
    });

    let lastTime = performance.now();
    let running = true;

    const loop = (now: number) => {
      if (!running) return;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const newState = game.update(dt);
      
      setState(prev => ({
        playerX: newState.playerX,
        playerY: newState.playerY,
        playerZ: newState.playerZ,
        chunks: newState.chunks ?? prev.chunks,
        entities: newState.entities,
        mapRevision: newState.mapRevision,
      }));
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);

    return () => {
      running = false;
      game.cleanup();
    };
  }, [rendererState]); // Re-run if rendererState becomes available

  return (
      <VoxelWorld
        chunks={state.chunks}
        playerX={state.playerX}
        playerY={state.playerY}
        playerZ={state.playerZ}
        entities={state.entities}
        cellSize={1}
        mapRevision={state.mapRevision}
      />
  );
}
