import type { BiomeType } from "src/types/map";

// マップ生成に関する定数を集約
// 変更頻度の高いパラメータはここで一元管理する

// チャンクの一辺のサイズ（セル数）
export const CHUNK_SIZE = 16 as const;

// バイオームノイズのスケール（小さいほど大きな領域）
export const BIOME_SCALE = 0.008;    // より大きな領域を作るため値を小さく

// Z軸の範囲
export const MIN_Z = 0;
export const MAX_Z = 15;
export const Z_LAYERS = MAX_Z - MIN_Z + 1;

// 構造物生成の確率
export const STRUCTURE_CHANCE = 0.05; // 5%の確率でチャンクに構造物が発生
export const DETAIL_SCALE = 0.08;    // 微細ノイズ（小地形）のスケール（現在未使用）
export const TEMP_SCALE = 0.02;      // 気温ノイズのスケール（現在未使用）

export const BIOME_COLORS: Record<BiomeType, string> = {
  Fire: "#91BD59",
  Water: "#91BD59",
  Ice: "#91BD59",
  Lightning: "#91BD59",
  Earth: "#91BD59",
  Air: "#91BD59",
  Neutral: "#91BD59",
};

// export const BIOME_COLORS: Record<BiomeType, string> = {
//   Fire: "#FF4500",
//   Water: "#1E90FF",
//   Ice: "#ADD8E6",
//   Lightning: "#FFFF00",
//   Earth: "#8B4513",
//   Air: "#D3D3D3",
//   Neutral: "#91BD59",
// };