import type { BlockDef } from "./block";
// import type { BiomeBias } from "./climate";

// // バイオーム種別（Minecraft風の簡略セット）
// export type BiomeType =
//   | 'Ocean'
//   | 'Beach'
//   | 'Plains'
//   | 'Forest'
//   | 'Desert'
//   | 'Savanna'
//   | 'Taiga'
//   | 'Snowy'
//   | 'Jungle'
//   | 'Swamp'
//   | 'Mountains'
//   | 'MushroomFields'
//   | 'Neutral';
export type BiomeType =
  | 'Fire'
  | 'Water'
  | 'Ice'
  | 'Lightning'
  | 'Earth'
  | 'Air'
  | 'Neutral';
export type CellType = 'Start' | 'Normal' | 'Elite' | 'Boss';
export type CellStatus = 'Locked' | 'Unlocked' | 'Cleared';

export interface Cell {
  biome: BiomeType;
  block: BlockDef;
  x: number;
  y: number;
  z: number;
}

export interface Chunk {
  x: number;
  y: number;
  level: number;
  cells: Cell[][][];
}

export interface World {
  loadedChunks: Map<string, Chunk>; // プレイヤーの周囲描画用
  storedChunks: Map<string, Chunk>; // マップ全体保存用
  viewDistance: number;
  cacheDistance: number;
  seed: number;
  // ViewSystem が更新する描画セルキャッシュ（React 的レンダリングへ移行するための仮想リスト）
  renderCells?: RenderCell[];
  renderRevision?: number; // 変更検知用カウンタ
}

export interface RenderCell {
  block: BlockDef;
  worldX: number;
  worldY: number;
  chunkRight: boolean;
  chunkBottom: boolean;
}