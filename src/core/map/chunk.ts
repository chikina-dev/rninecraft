import type { BiomeType } from "src/types/map";
import { climateAt, createClimateSamplers, type ClimateTuning } from "src/functions/maps/climate";



/**
 * 単一点のバイオームスコアから最も強いバイオームを判定する
 * - 6つのバイオーム(Fire/Water/Ice/Lightning/Earth/Air)のスコアから最大値を選択
 * - Neutralは基本的に出現しない（スコアベースのため）
 */
export function determineBiome(
  seed: number,
  x: number,
  y: number,
  samplers?: ReturnType<typeof createClimateSamplers>,
  tuning?: ClimateTuning
): BiomeType {
  const scores = climateAt(samplers ?? createClimateSamplers(seed), x, y, tuning);
  const biomeScores: [BiomeType, number][] = [
    ['Fire', scores.fire],
    ['Water', scores.water],
    ['Ice', scores.ice],
    ['Lightning', scores.lightning],
    ['Earth', scores.earth],
    ['Air', scores.air],
  ];
  
  biomeScores.sort((a, b) => b[1] - a[1]);
  return biomeScores[0][0];
}

/**
 * チャンク範囲のバイオームマップを生成する
 * - Voronoiベースの均等分布
 * - 滑らかな境界遷移
 * @param seed 乱数シード
 * @param chunkX チャンクX
 * @param chunkY チャンクY
 * @param size 一辺のセル数
 */
export function generateBiomeMap(
  seed: number,
  chunkX: number,
  chunkY: number,
  size: number,
  tuning?: ClimateTuning
): BiomeType[] {
  const biomeMap: BiomeType[] = new Array(size * size);
  const samplers = createClimateSamplers(seed);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const worldX = chunkX * size + x;
      const worldY = chunkY * size + y;
      biomeMap[y * size + x] = determineBiome(seed, worldX, worldY, samplers, tuning);
    }
  }

  return biomeMap;
}
