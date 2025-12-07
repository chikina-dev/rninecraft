export type BiasFalloff = 'linear' | 'smoothstep' | 'gaussian';

export interface BiomeBias {
  nearestBiome: 'Fire' | 'Water' | 'Ice' | 'Lightning' | 'Earth' | 'Air' | 'Neutral';

  distanceToCenter: number;
  interior: number;

  radial: number;

  temperature: number;
  moisture: number;
  elevation: number;
  variability: number;
}
