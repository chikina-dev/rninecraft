// チャンクのセル配列を生成するメイン関数群
// 新バイオーム判定: Voronoi/Worleyベースの均等分布システム
import { BLOCK, EMPTY_BLOCK } from "src/types/block";
import type { Chunk, Cell, BiomeType } from "src/types/map";
import { CHUNK_SIZE, MIN_Z, MAX_Z } from "./constants";
import type { ClimateTuning } from "src/functions/maps/climate";
import { createClimateSamplers, climateAt } from "src/functions/maps/climate";
import { createPerlin } from "src/functions/maps/noise/perlin";

const tuning: ClimateTuning = {
  smoothness: 0.4,
  biasStrength: 1.0,
  biasFalloff: 'gaussian',
};

const heightBiasByBiome: Record<BiomeType, number> = {
  Earth: 1.5,      // 高地
  Air: 2.5,        // 天空
  Lightning: 1.0,  // 山岳
  Ice: 0.5,        // 氷原
  Fire: 0.2,       // 火山
  Neutral: 0.0,    // 平原
  Water: -1.5,     // 海/湖
};

const biomeKeys = ['fire', 'water', 'ice', 'lightning', 'earth', 'air'] as const;
const biomeTypes: Record<typeof biomeKeys[number], BiomeType> = {
    fire: 'Fire',
    water: 'Water',
    ice: 'Ice',
    lightning: 'Lightning',
    earth: 'Earth',
    air: 'Air'
};

function getRawHeight(samplers: any, heightNoise: any, wx: number, wy: number): number {
  const scores = climateAt(samplers, wx, wy, tuning);
  let blendedBias = 0;
  for (const key of biomeKeys) {
      blendedBias += (heightBiasByBiome[biomeTypes[key]] ?? 0) * scores[key];
  }
  
  const scale = 0.03;
  const n = heightNoise.noise2(wx * scale, wy * scale);
  let h = (n * 5) - 3.5 + blendedBias;

  if (Math.abs(wx) < 3 && Math.abs(wy) < 3) {
    h = -1;
  }
  return h;
}

export function calculateTerrainHeight(seed: number, wx: number, wy: number): number {
  const samplers = createClimateSamplers(seed);
  const heightNoise = createPerlin(seed + 9999);

  const c = getRawHeight(samplers, heightNoise, wx, wy);
  const u = getRawHeight(samplers, heightNoise, wx, wy - 1);
  const d = getRawHeight(samplers, heightNoise, wx, wy + 1);
  const l = getRawHeight(samplers, heightNoise, wx - 1, wy);
  const r = getRawHeight(samplers, heightNoise, wx + 1, wy);
  
  const smoothed = (c * 4 + u + d + l + r) / 8;
  let h = Math.floor(smoothed);

  if (h < -3) h = -3;
  if (h > 4) h = 4;
  
  return h;
}

/**
 * 指定チャンクのセルを決定的に生成する
 * - Voronoi/Worleyベースの均等バイオーム分布
 * - 滑らかな境界遷移
 * @param x チャンクX座標
 * @param y チャンクY座標
 * @param level レベル（将来的な用途のために確保。現在は未使用）
 * @param seed 乱数シード
 * @returns 生成されたチャンク（cells は CHUNK_SIZE^2 要素）
 */
export async function generateChunk(x: number, y: number, _level: number, seed: number): Promise<Chunk> {
  // 3D array: [x][y][z]
  // Z range: -3 to 16 (arbitrary height for now, user didn't specify max height but structures can be tall)
  // Let's use a safe range. Structures can be 7 high. Terrain is -3 to 4.
  // Let's allocate Z from -3 to 12 (16 layers).
  // Wait, array indices must be 0-based.
  // Let's map Z=-3 to index 0.
  
  const cells: Cell[][][] = [];

  const samplers = createClimateSamplers(seed);
  const heightNoise = createPerlin(seed + 9999);

  const blockByBiome: Record<BiomeType, number> = {
    Fire: 0, // Grass
    Water: 2, // Water
    Ice: 5, // Ice
    Lightning: 3, // Stone
    Earth: 1, // Dirt
    Air: 0, // Grass
    Neutral: 0, // Grass
  };

  const rawHeights = new Float32Array(18 * 18);
  for (let ly = -1; ly <= CHUNK_SIZE; ly++) {
    for (let lx = -1; lx <= CHUNK_SIZE; lx++) {
       const val = getRawHeight(samplers, heightNoise, x * CHUNK_SIZE + lx, y * CHUNK_SIZE + ly);
       rawHeights[(ly + 1) * 18 + (lx + 1)] = val;
    }
  }

  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    cells[lx] = [];
    for (let ly = 0; ly < CHUNK_SIZE; ly++) {
        cells[lx][ly] = [];
        
        const worldX = x * CHUNK_SIZE + lx;
        const worldY = y * CHUNK_SIZE + ly;

        const scores = climateAt(samplers, worldX, worldY, tuning);
        let maxScore = -1;
        let mainBiome: BiomeType = 'Neutral';
        for (const key of biomeKeys) {
            const score = scores[key];
            if (score > maxScore) {
                maxScore = score;
                mainBiome = biomeTypes[key];
            }
        }

        const blockDef = BLOCK[blockByBiome[mainBiome] ?? 0]; // Default to Grass (0) instead of Snow (6)

        // Smoothing
        const c = rawHeights[(ly + 1) * 18 + (lx + 1)];
        const u = rawHeights[(ly) * 18 + (lx + 1)];
        const d = rawHeights[(ly + 2) * 18 + (lx + 1)];
        const l = rawHeights[(ly + 1) * 18 + (lx)];
        const r = rawHeights[(ly + 1) * 18 + (lx + 2)];
        
        const smoothed = (c * 4 + u + d + l + r) / 8;
        // Shift height by +3 so min is 0
        let h = Math.floor(smoothed) + 3;
        if (h < MIN_Z) h = MIN_Z;
        if (h > 7) h = 7; // Was 4, now 4+3=7

        // Fill column
        for (let z = MIN_Z; z <= MAX_Z; z++) {
            // Map Z to array index? Or just store sparse?
            // User said Cell[][][].
            // If z <= h, it's terrain.
            // If z > h, it's air (or structure later).
            
            let b: any;
            if (z === MIN_Z) {
                // Force Bedrock at bottom layer
                b = BLOCK[3]; // Stone (using Stone as bedrock for now)
            } else {
                b = (z <= h) ? blockDef : EMPTY_BLOCK;
            }
            
            if (!b) b = EMPTY_BLOCK; // Safety

            // We push to the array. The array index 0 corresponds to MIN_Z.
            // But wait, if we want random access by Z, we need to be careful.
            // Let's just push for now.
            cells[lx][ly].push({
                x: worldX,
                y: worldY,
                z: z,
                biome: mainBiome,
                block: b
            });
        }
    }
  }

  return { x, y, level: 0, cells };
}
