// マップ生成APIの集約（バレル）
// - チャンク単体生成 + 構造物適用
// - チャンクグリッド生成
import type { Chunk, World } from 'src/types/map';
import type { Cell } from 'src/types/map';
import type { BlockDef } from 'src/types/block';
import { ALL_BLOCKS } from 'src/types/block';
import { generateChunk } from './generator';
import { generateStructures } from './structure';
import { applyStructuresToChunk } from './applyStructures';
import { CHUNK_SIZE, MIN_Z, MAX_Z } from './constants';

export { generateChunk, generateStructures, applyStructuresToChunk };
export { CHUNK_SIZE, MIN_Z, MAX_Z } from './constants';

export type { Chunk } from 'src/types/map';

/**
 * シードとチャンク座標から、構造物込みのチャンクを決定的に生成
 */
export async function generateChunkWithStructures(seed: number, chunkX: number, chunkY: number, level = 0): Promise<Chunk> {
  const base = await generateChunk(chunkX, chunkY, level, seed);
  
  // 周囲のチャンクも含めて構造物を生成し、現在のチャンクにはみ出しているものを適用する
  // 構造物がチャンク境界を跨ぐ場合に切れないようにするため
  const structs: { id: string, x: number, y: number }[] = [];
  
  // 3x3の範囲をチェック（構造物が巨大な場合は範囲を広げる必要がある）
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const s = generateStructures(seed, chunkX + dx, chunkY + dy);
      structs.push(...s);
    }
  }

  applyStructuresToChunk(base, structs, seed);
  return base;
}

/**
 * 構造物込みのチャンクをグリッド生成
 * 返り値は [row][col] の2次元配列（height x width）
 */
export async function generateChunkGridWithStructures(
  seed: number,
  startChunkX: number,
  startChunkY: number,
  width: number,
  height: number,
  level = 0
): Promise<Chunk[][]> {
  const rows: Chunk[][] = [];
  for (let cy = 0; cy < height; cy++) {
    const row: Chunk[] = [];
    for (let cx = 0; cx < width; cx++) {
      // eslint-disable-next-line no-await-in-loop
      const ch = await generateChunkWithStructures(seed, startChunkX + cx, startChunkY + cy, level);
      row.push(ch);
    }
    rows.push(row);
  }
  return rows;
}

/**
 * チャンク内のローカル座標にブロックを配置する（同期）
 * @param chunk 対象チャンク
 * @param localX チャンク内X（0..CHUNK_SIZE-1）
 * @param localY チャンク内Y（0..CHUNK_SIZE-1）
 * @param block 置くブロック（BlockDef または ブロックID）
 * @returns 成功したら true（範囲外や不明IDなら false）
 */
let __blockById: Map<number, BlockDef> | null = null;
const getBlockById = (id: number): BlockDef | undefined => {
  if (!__blockById) {
    __blockById = new Map<number, BlockDef>();
    for (const b of ALL_BLOCKS) __blockById.set(b.id, b);
  }
  return __blockById.get(id);
};

export function setBlockInChunk(
  chunk: Chunk,
  localX: number,
  localY: number,
  localZ: number,
  blockId: number,
): boolean {
  const size = CHUNK_SIZE;
  if (localX < 0 || localY < 0 || localX >= size || localY >= size) return false;
  
  // Check Z bounds
  if (localZ < MIN_Z || localZ > MAX_Z) return false;

  const blockDef = getBlockById(blockId);
  if (!blockDef) return false;

  // 3D array access
  // cells[x][y][z_index]
  const zIndex = localZ - MIN_Z;
  if (zIndex < 0 || zIndex >= chunk.cells[localX][localY].length) return false;

  chunk.cells[localX][localY][zIndex].block = blockDef;
  return true;
}

/**
 * ワールド座標 (x, y) にブロックを配置する（同期）。
 * - 対象のチャンクが loaded も stored にも存在しない場合は何もせず false を返す。
 * - 負の座標にも対応。
 */
export function setBlockAt(
  world: World,
  x: number,
  y: number,
  z: number,
  blockId: number,
): boolean {
  const size = CHUNK_SIZE;
  const floorDiv = (n: number, d: number) => Math.floor(n / d);
  const posMod = (n: number, m: number) => {
    const r = n % m;
    return r < 0 ? r + m : r;
  };

  const cx = floorDiv(x, size);
  const cy = floorDiv(y, size);
  const lx = posMod(x, size);
  const ly = posMod(y, size);

  const key = `${cx},${cy}` as const;
  const ch = world.loadedChunks.get(key) ?? world.storedChunks.get(key);
  if (!ch) return false;

  return setBlockInChunk(ch, lx, ly, z, blockId);
}

/**
 * ワールド座標 (x, y) のセルを取得（存在しなければ null）
 */
export function getCellAt(world: World, x: number, y: number, z: number): Cell | null {
  const size = CHUNK_SIZE;
  const floorDiv = (n: number, d: number) => Math.floor(n / d);
  const posMod = (n: number, m: number) => {
    const r = n % m;
    return r < 0 ? r + m : r;
  };

  const cx = floorDiv(x, size);
  const cy = floorDiv(y, size);
  const lx = posMod(x, size);
  const ly = posMod(y, size);

  const key = `${cx},${cy}` as const;
  const ch = world.loadedChunks.get(key) ?? world.storedChunks.get(key);
  if (!ch) return null;
  
  const zIndex = z - MIN_Z;
  if (zIndex < 0) return null;
  
  const column = ch.cells[lx][ly];
  if (!column || zIndex >= column.length) return null;
  
  return column[zIndex] ?? null;
}

/**
 * 指定座標のチャンクがロードされているか確認
 */
export function isChunkLoaded(world: World, x: number, y: number): boolean {
  const size = CHUNK_SIZE;
  const floorDiv = (n: number, d: number) => Math.floor(n / d);
  const cx = floorDiv(x, size);
  const cy = floorDiv(y, size);
  const key = `${cx},${cy}` as const;
  return world.loadedChunks.has(key) || world.storedChunks.has(key);
}

/**
 * タイル座標 (tx, ty) が衝突ブロックかを返す。
 * チャンク未ロードの場合は false を返す（非衝突扱い）。
 */
export function isSolidAt(world: World, tx: number, ty: number, z: number): boolean {
  // Treat void below MIN_Z as solid bedrock to prevent falling
  if (z < MIN_Z) return true;

  // Round z to nearest integer or floor?
  // Usually voxel coordinates are floored.
  const iz = Math.floor(z);
  const cell = getCellAt(world, tx, ty, iz);
  if (!cell) return false;
  
  // Debug specific coordinate if needed
  // if (tx === 0 && ty === 0 && iz === 5) {
  //   console.log(`Check Solid: ${tx},${ty},${iz} -> ${cell.block.name} (${cell.block.collision})`);
  // }

  // Check if block is solid (not air/empty)
  // Assuming empty block has collision=false
  return cell.block.collision;
}

/**
 * 円（中心 (cx, cy), 半径 r [ブロック単位]）が衝突ブロックと交差するか。
 * 円とタイルAABBの距離判定で検出。
 */
export function circleCollidesWithWorld(world: World, cx: number, cy: number, r: number, feetZ: number, heightZ: number = 1.8): boolean {
  const minTX = Math.floor(cx - r);
  const maxTX = Math.floor(cx + r);
  const minTY = Math.floor(cy - r);
  const maxTY = Math.floor(cy + r);
  
  const minZ = Math.floor(feetZ);
  const maxZ = Math.floor(feetZ + heightZ);

  const r2 = r * r;
  const intersectsTile = (tx: number, ty: number): boolean => {
    const left = tx;
    const right = tx + 1;
    const top = ty;
    const bottom = ty + 1;
    const closestX = cx < left ? left : cx > right ? right : cx;
    const closestY = cy < top ? top : cy > bottom ? bottom : cy;
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy <= r2;
  };

  for (let ty = minTY; ty <= maxTY; ty++) {
    for (let tx = minTX; tx <= maxTX; tx++) {
      // Treat unloaded chunks as solid walls to prevent clipping/falling into void
      if (!isChunkLoaded(world, tx, ty)) return true;

      if (intersectsTile(tx, ty)) {
         for (let z = minZ; z <= maxZ; z++) {
            if (isSolidAt(world, tx, ty, z)) return true;
         }
      }
    }
  }
  return false;
}

/**
 * AABB（中心 (cx, cy), サイズ (w, h)）が衝突ブロックと交差するか。
 */
export function boxCollidesWithWorld(world: World, cx: number, cy: number, w: number, h: number, feetZ: number, heightZ: number = 1.8): boolean {
  const halfW = w / 2;
  const halfH = h / 2;
  const minX = cx - halfW;
  const maxX = cx + halfW;
  const minY = cy - halfH;
  const maxY = cy + halfH;

  const minTX = Math.floor(minX);
  const maxTX = Math.floor(maxX);
  const minTY = Math.floor(minY);
  const maxTY = Math.floor(maxY);
  
  const minZ = Math.floor(feetZ);
  const maxZ = Math.floor(feetZ + heightZ);

  for (let ty = minTY; ty <= maxTY; ty++) {
    for (let tx = minTX; tx <= maxTX; tx++) {
      // Treat unloaded chunks as solid walls
      if (!isChunkLoaded(world, tx, ty)) return true;

      for (let z = minZ; z <= maxZ; z++) {
        if (isSolidAt(world, tx, ty, z)) {
          return true;
        }
      }
    }
  }
  return false;
}
