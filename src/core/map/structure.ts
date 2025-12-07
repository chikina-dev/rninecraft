// 構造物（木・井戸・遺跡など）の生成
// バイオームごとの出現確率と大きさを考慮して、チャンク内にアンカー座標を決める。
import { createXorShift, next } from "src/functions/maps/rng";
import { CHUNK_SIZE } from "./constants";
import { STRUCTURES } from "src/types/structure";
import { determineBiome } from "./chunk";
import { BalancedTuning } from "src/functions/maps/climate/config";
import { createClimateSamplers } from "src/functions/maps/climate";

/**
 * チャンク内に構造物を確率的に配置する
 * - allowedBiomes に一致する地点のみ候補
 * - 各構造物の chance に従って抽選
 * - アンカーは構造物中心がなるべくチャンク内に収まるよう補正
 */
export function generateStructures(seed: number, chunkX: number, chunkY: number): { id: string, x: number, y: number }[] {
  const rng = createXorShift(seed ^ (chunkX * 2654435761) ^ (chunkY * 1597334677));
  const instances: { id: string, x: number, y: number }[] = [];
  const samplers = createClimateSamplers(seed);

  const tries = 8; // 試行回数を少し増やす
  for (let i = 0; i < tries; i++) {
    const localX = Math.floor(next(rng) * CHUNK_SIZE);
    const localY = Math.floor(next(rng) * CHUNK_SIZE);
    const worldX = chunkX * CHUNK_SIZE + localX;
    const worldY = chunkY * CHUNK_SIZE + localY;
    const biome = determineBiome(seed, worldX, worldY, samplers, BalancedTuning);

    for (const def of Object.values(STRUCTURES)) {
      if (def.allowedBiomes && !def.allowedBiomes.includes(biome)) continue;
      const chance = def.chance ?? 0.03;
      if (next(rng) < chance) {
        const anchorX = worldX - Math.floor(def.width / 2);
        const anchorY = worldY - Math.floor(def.height / 2);

        // 既存の構造物との衝突判定
        let overlap = false;
        for (const inst of instances) {
          const instDef = STRUCTURES[inst.id];
          // 簡易的な矩形衝突判定 (マージンを少し持たせる)
          if (
            anchorX < inst.x + instDef.width &&
            anchorX + def.width > inst.x &&
            anchorY < inst.y + instDef.height &&
            anchorY + def.height > inst.y
          ) {
            overlap = true;
            break;
          }
        }

        if (!overlap) {
          instances.push({ id: def.id, x: anchorX, y: anchorY });
        }
        // 1回の試行で1つの構造物まで（あるいは確率で複数もありだが、今回はbreakして次の位置試行へ）
        break; 
      }
    }
  }

  return instances;
}