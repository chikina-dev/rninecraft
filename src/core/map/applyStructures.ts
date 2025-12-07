// 生成された構造物のパターンをチャンクのセルに適用する
import { BLOCK, EMPTY_BLOCK } from "src/types/block";
import type { Chunk } from "src/types/map";
import { STRUCTURES } from "src/types/structure";
import type { generateStructures } from "./structure";
import { CHUNK_SIZE, MIN_Z } from "./constants";
import { calculateTerrainHeight } from "./generator";

/**
 * 構造物パターンをチャンクへ適用する
 * - 構造物のZ座標を地形の高さに合わせて決定し、chunk.cells にブロック情報を追加する
 */
export function applyStructuresToChunk(chunk: Chunk, structures: ReturnType<typeof generateStructures>, seed: number): void {
  const size = CHUNK_SIZE;

  for (const s of structures) {
    const def = STRUCTURES[s.id];
    if (!def) continue;

    // 構造物の基準位置（左下）
    const localX = s.x - chunk.x * size;
    const localY = s.y - chunk.y * size;

    // 構造物の中心付近の高さを取得して、配置高さ(Z)を決める
    // チャンク境界を跨ぐ場合でも一貫した高さを得るため、ワールド座標で地形高さを再計算する
    const centerX = s.x + Math.floor(def.width / 2);
    const centerY = s.y + Math.floor(def.height / 2);
    
    // 地形高さを計算（+3 offset is from generator logic）
    const h = calculateTerrainHeight(seed, centerX, centerY);
    // generator.ts logic: let h = Math.floor(smoothed) + 3;
    // calculateTerrainHeight returns Math.floor(smoothed). So we add 3.
    const baseZ = h + 3;

    // 構造物の範囲を走査
    for (let dy = 0; dy < def.height; dy++) {
      for (let dx = 0; dx < def.width; dx++) {
        const tx = localX + dx;
        const ty = localY + dy;

        // チャンク外は無視
        if (tx < 0 || ty < 0 || tx >= size || ty >= size) continue;

        const targetColumn = chunk.cells[tx][ty];

        // Y軸反転（構造物の前後を正しくする）
        // patternY = 0 が構造物の「奥（北）」、patternY = height-1 が「手前（南）」
        // dy = 0 は localY の最小値（南端）。
        // なので dy=0 のとき patternY は「手前」であるべき。
        // 配列のインデックスが大きい方が「手前」なら、patternY = dy でいいのでは？
        // 通常、2D配列は row 0 が上（奥）。
        // なので dy=0 (南) は row (height-1) に対応すべき。
        // patternY = def.height - 1 - dy; これは正しい。
        const patternY = def.height - 1 - dy;

        // Apply structure blocks
        for (let z = 0; z < def.top; z++) {
             if (z >= def.pattern.length) continue;
             const layer = def.pattern[z];
             if (patternY < 0 || patternY >= layer.length) continue;
             const row = layer[patternY];
             if (dx >= row.length) continue;
             
             const bId = row[dx];
             if (bId !== 0) {
                 const targetZ = baseZ + z + 1;
                 const b = BLOCK[bId] || EMPTY_BLOCK;
                 
                 // Find if we have a cell at this Z, or need to add/overwrite
                 // Our array is likely sorted by Z or just indexed.
                 // In generator, we pushed from MIN_Z to MAX_Z.
                 // So index = z - MIN_Z.
                 const arrayIdx = targetZ - MIN_Z;
                 
                 if (arrayIdx >= 0 && arrayIdx < targetColumn.length) {
                     targetColumn[arrayIdx].block = b;
                 } else if (arrayIdx >= targetColumn.length) {
                    // 配列が足りない場合は拡張する（空中の構造物など）
                    // ただし、間の空間を埋める必要がある
                    while (targetColumn.length < arrayIdx) {
                        targetColumn.push({
                            x: chunk.x * size + tx,
                            y: chunk.y * size + ty,
                            z: MIN_Z + targetColumn.length,
                            biome: 'Neutral',
                            block: EMPTY_BLOCK
                        });
                    }
                    targetColumn.push({
                        x: chunk.x * size + tx,
                        y: chunk.y * size + ty,
                        z: targetZ,
                        biome: 'Neutral',
                        block: b
                    });
                 }
             }
        }
      }
    }
  }
}
