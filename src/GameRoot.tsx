/** @jsxImportSource @jsx-webgpu */
import { render } from '@jsx-webgpu/jsx';
import { GameController } from './components/GameController';
import { type Chunk } from 'src/core/map/index';

export function renderGame(canvas: HTMLCanvasElement, chunks: Chunk[][], seed: number) {
   render(canvas, <GameController seed={seed} initialChunks={chunks} />);
}
