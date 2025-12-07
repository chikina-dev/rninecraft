import { clamp01, createOpenSimplex, createSimplex } from 'src/functions/maps/noise/index';
import type { BiomeBias, BiasFalloff } from 'src/types/climate';

// ハッシュ関数（座標からバイオームを決定的に選択）
function hash2D(x: number, y: number, seed: number): number {
  let h = seed;
  h = Math.imul(h ^ x, 0x85ebca6b);
  h = Math.imul(h ^ y, 0xc2b2ae35);
  h = h ^ (h >>> 13);
  h = Math.imul(h, 0x27d4eb2d);
  h = h ^ (h >>> 15);
  return ((h >>> 0) / 0x100000000); // 0-1の範囲
}

export function createClimateSamplers(seed: number) {
  return {
    biomeNoise: createOpenSimplex(seed),
    blendNoise1: createSimplex(seed ^ 0x1111),
    blendNoise2: createOpenSimplex(seed ^ 0x2222),
    detail: createSimplex(seed ^ 0x3333),
    seed,
  } as const;
}

export type ClimateSamplers = ReturnType<typeof createClimateSamplers>;

export type ClimateTuning = {
  // Voronoi境界の滑らかさ (0=急峻, 1=非常に滑らか)
  smoothness?: number;
  // 中心からのバイアス強度（0=無効, 1=標準, >1=強め）
  biasStrength?: number;
  // バイアスの減衰関数
  biasFalloff?: BiasFalloff;
};

/**
 * ハッシュ + ノイズによる均等バイオーム分布
 * - ハッシュで大きな領域ごとにバイオームを均等に割り当て
 * - 複数のノイズ層で波のある自然な境界を作成
 */
export function climateAt(s: ClimateSamplers, x: number, y: number, tuning?: ClimateTuning) {
  const smoothness = tuning?.smoothness ?? 0.5;
  
  // バイオームの基本サイズ（大きくする）
  const regionSize = 60; 

  // ドメインワーピング（座標の歪み）
  // 飛び地を防ぐため、周波数を下げ（Scaleを小さく）、強度（Strength）をセルサイズ未満に抑える
  const warpScale = 0.005;
  const warpStrength = 25; 

  // FBMノイズで座標をずらす
  const warpX = s.biomeNoise.fbm(x * warpScale, y * warpScale, 2, 2.0, 0.5) * warpStrength;
  const warpY = s.biomeNoise.fbm(x * warpScale + 123.45, y * warpScale + 678.90, 2, 2.0, 0.5) * warpStrength;
  
  const warpedX = x + warpX;
  const warpedY = y + warpY;
  
  // 領域単位でハッシュ（Voronoiセル）
  const rx = Math.floor(warpedX / regionSize);
  const ry = Math.floor(warpedY / regionSize);
  
  // 周囲の領域のハッシュ値
  const centers: Array<{ biome: number; dist: number }> = [];
  
  // 3x3近傍探索
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      // グリッド座標
      const cx = rx + dx;
      const cy = ry + dy;
      
      // このセルのバイオーム決定（ハッシュ）
      const h = hash2D(cx, cy, s.seed);
      const biome = Math.floor(h * 6); // 0-5
      
      // セル内の中心点（ジッター）
      const jx = hash2D(cx, cy, s.seed + 123);
      const jy = hash2D(cx, cy, s.seed + 456);
      
      // 中心座標: グリッド中心 + ジッター(-0.4 ~ 0.4 * regionSize)
      const centerX = (cx + 0.5 + (jx - 0.5) * 0.8) * regionSize;
      const centerY = (cy + 0.5 + (jy - 0.5) * 0.8) * regionSize;
      
      const distX = warpedX - centerX;
      const distY = warpedY - centerY;
      const dist = Math.sqrt(distX * distX + distY * distY);
      
      centers.push({ biome, dist });
    }
  }
  
  // 距離でソート
  centers.sort((a, b) => a.dist - b.dist);
  
  // 最も近い2つのバイオームをブレンド（スムーズな遷移）
  const scores = {
    fire: 0,
    water: 0,
    ice: 0,
    lightning: 0,
    earth: 0,
    air: 0,
  };
  
  const biomes = ['fire', 'water', 'ice', 'lightning', 'earth', 'air'] as const;
  
  // 距離ベースのブレンド重み
  const c1 = centers[0];
  const c2 = centers[1];
  
  const distDiff = c2.dist - c1.dist;
  const blendWidth = regionSize * 0.2 * smoothness; // ブレンド幅
  
  // 第1バイオームの重み (0.5 ~ 1.0)
  let w1 = 0.5 + 0.5 * (distDiff / (blendWidth + 0.001));
  if (w1 > 1) w1 = 1;
  
  const w2 = 1 - w1;
  
  scores[biomes[c1.biome]] += w1;
  scores[biomes[c2.biome]] += w2;
  
  // 細かいディテールノイズ（境界を少し荒らす）
  const detailNoise = (s.detail.fbm(x * 0.1, y * 0.1, 2, 2.0, 0.5) - 0.5) * 0.1;
  for (const biome of biomes) {
    if (scores[biome] > 0) {
      scores[biome] = clamp01(scores[biome] + detailNoise);
    }
  }
  
  // 再正規化
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total > 0) {
    for (const biome of biomes) {
      scores[biome] /= total;
    }
  } else {
    scores[biomes[c1.biome]] = 1;
  }
  
  return scores;
}

// 後方互換性のためのダミー関数
export function climateBaseAt(s: ClimateSamplers, x: number, y: number) {
  const scores = climateAt(s, x, y);
  return {
    elevation: (scores.earth + scores.air) / 2,
    temperature: (scores.fire - scores.ice + 1) / 2,
    moisture: (scores.water + scores.ice) / 2,
  };
}

/**
 * 内部利用: Voronoi近傍（最短距離順の3サイト）を取得
 */
function nearestVoronoiCenters(
  s: ClimateSamplers,
  x: number,
  y: number,
  smoothness: number
) {
  // climateAt と同じパラメータを使用
  const regionSize = 60; 
  const warpScale = 0.005;
  const warpStrength = 25; 

  const warpX = s.biomeNoise.fbm(x * warpScale, y * warpScale, 2, 2.0, 0.5) * warpStrength;
  const warpY = s.biomeNoise.fbm(x * warpScale + 123.45, y * warpScale + 678.90, 2, 2.0, 0.5) * warpStrength;
  
  const warpedX = x + warpX;
  const warpedY = y + warpY;
  
  const rx = Math.floor(warpedX / regionSize);
  const ry = Math.floor(warpedY / regionSize);
  
  const centers: Array<{ biome: number; dist: number }> = [];
  
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = rx + dx;
      const cy = ry + dy;
      
      const h = hash2D(cx, cy, s.seed);
      const biome = Math.floor(h * 6); // 0-5
      
      const jx = hash2D(cx, cy, s.seed + 123);
      const jy = hash2D(cx, cy, s.seed + 456);
      
      const centerX = (cx + 0.5 + (jx - 0.5) * 0.8) * regionSize;
      const centerY = (cy + 0.5 + (jy - 0.5) * 0.8) * regionSize;
      
      const distX = warpedX - centerX;
      const distY = warpedY - centerY;
      const dist = Math.sqrt(distX * distX + distY * distY);
      
      centers.push({ biome, dist });
    }
  }
  
  centers.sort((a, b) => a.dist - b.dist);
  
  const blendRadius = regionSize * (0.5 + smoothness * 0.4);
  return { centers, blendRadius } as const;
}

/**
 * バイオーム中心点からの距離に基づく各種パラメータのバイアスを算出
 * - radial: 中心=1, 境界=0 の強度
 * - interior: d2-d1 を用いた「境界からの余裕」指標
 */
export function biomeBiasAt(
  s: ClimateSamplers,
  x: number,
  y: number,
  tuning?: ClimateTuning
): BiomeBias {
  const smoothness = tuning?.smoothness ?? 0.4;
  const biasStrength = tuning?.biasStrength ?? 1.0;
  const falloff: BiasFalloff = tuning?.biasFalloff ?? 'gaussian';

  const { centers, blendRadius } = nearestVoronoiCenters(s, x, y, smoothness);
  const c1 = centers[0];
  const c2 = centers[1] ?? centers[0];

  // interior: d2 - d1 が大きいほど内部（0〜1に正規化）
  const interior = clamp01((c2.dist - c1.dist) / (blendRadius * 0.8));

  // radial: 中心からの距離に応じて 1→0
  const t = clamp01(c1.dist / blendRadius);
  let radial: number;
  switch (falloff) {
    case 'linear':
      radial = 1 - t;
      break;
    case 'smoothstep':
      // 1 - smoothstep(0,1,t)
      radial = 1 - (t * t * (3 - 2 * t));
      break;
    case 'gaussian':
    default:
      // e^{- (t / 0.6)^2}
      const sigma = 0.6;
      radial = Math.exp(-Math.pow(t / sigma, 2));
      break;
  }

  // バイオームごとの係数
  // 値は [-1,1] 程度で解釈、最後に biasStrength と radial を乗算
  const perBiome = [
    // 0 Fire, 1 Water, 2 Ice, 3 Lightning, 4 Earth, 5 Air
    { temp: +0.8, moist: -0.3, elev: +0.05, var_: +0.15 },
    { temp: -0.2, moist: +0.8, elev: -0.15, var_: -0.05 },
    { temp: -0.8, moist: +0.2, elev: +0.1,  var_: -0.05 },
    { temp: +0.1, moist: -0.1, elev:  0.0,  var_: +0.8  },
    { temp:  0.0, moist:  0.0, elev: +0.7,  var_: -0.1  },
    { temp: +0.05,moist: -0.1, elev: -0.4,  var_: +0.4  },
  ] as const;

  const p = perBiome[c1.biome] ?? { temp: 0, moist: 0, elev: 0, var_: 0 };
  const k = biasStrength * radial;

  // 返却（nearestBiome はラベル化）
  const nearestBiome = (['Fire','Water','Ice','Lightning','Earth','Air'] as const)[c1.biome] ?? 'Neutral';
  return {
    nearestBiome,
    distanceToCenter: c1.dist,
    interior,
    radial,
    temperature: p.temp * k,
    moisture: p.moist * k,
    elevation: p.elev * k,
    variability: p.var_ * k,
  };
}




