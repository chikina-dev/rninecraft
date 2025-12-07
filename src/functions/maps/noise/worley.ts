import { createXorShift, next } from '../rng';

function shuffle<T>(arr: T[], rngState: { state: number }): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const r = Math.floor(next(rngState as any) * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[r];
    arr[r] = tmp;
  }
}

export function createWorley(seed: number) {
  const rng = createXorShift(seed >>> 0);
  const p: number[] = Array.from({ length: 256 }, (_, i) => i);
  shuffle(p, rng as unknown as { state: number });
  const perm = new Array<number>(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  function rand2(ix: number, iy: number): [number, number] {
    const h = perm[(ix + perm[iy & 255]) & 255];
    const a = (h ^ 0x68) * 0x27d4eb2d;
    const b = (h ^ 0xb7) * 0x85ebca6b;
    const u = ((a >>> 0) & 0xffff) / 0x10000;
    const v = ((b >>> 0) & 0xffff) / 0x10000;
    return [u, v];
  }

  function noise2(x: number, y: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    let minDist = Infinity;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = xi + dx;
        const cy = yi + dy;
        const [rx, ry] = rand2(cx, cy);
        const fx = cx + rx;
        const fy = cy + ry;
        const ddx = fx - x;
        const ddy = fy - y;
        const d = Math.hypot(ddx, ddy);
        if (d < minDist) minDist = d;
      }
    }
    const norm = minDist / Math.SQRT2;
    return norm < 0 ? 0 : norm > 1 ? 1 : norm;
  }

  function fbm(x: number, y: number, octaves = 3, lacunarity = 2, gain = 0.5): number {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < octaves; i++) {
      const n = 1 - noise2(x * freq, y * freq);
      sum += amp * n;
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  }

  return { noise2, fbm } as const;
}
