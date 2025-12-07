import { createXorShift, next } from '../rng';

function shuffle<T>(arr: T[], rngState: { state: number }): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const r = Math.floor(next(rngState as any) * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[r];
    arr[r] = tmp;
  }
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 0x3f;
  const u = (h & 1) ? -x : x;
  const v = (h & 2) ? -y : y;
  return u + v;
}

export function createPerlin(seed: number) {
  const rng = createXorShift(seed >>> 0);
  const p: number[] = Array.from({ length: 256 }, (_, i) => i);
  shuffle(p, rng as unknown as { state: number });
  const perm = new Array<number>(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  function noise2(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[X + perm[Y]];
    const ab = perm[X + perm[Y + 1]];
    const ba = perm[X + 1 + perm[Y]];
    const bb = perm[X + 1 + perm[Y + 1]];
    const x1 = lerp(u, grad(aa, xf, yf), grad(ba, xf - 1, yf));
    const x2 = lerp(u, grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1));
    const val = lerp(v, x1, x2);
    return (val + 1) / 2;
  }

  function fbm(x: number, y: number, octaves = 4, lacunarity = 2, gain = 0.5): number {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * noise2(x * freq, y * freq);
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  }

  return { noise2, fbm } as const;
}
