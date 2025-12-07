import { createXorShift, next } from '../rng';

function shuffle<T>(arr: T[], rngState: { state: number }): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const r = Math.floor(next(rngState as any) * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[r];
    arr[r] = tmp;
  }
}

export function createSimplex(seed: number) {
  const rng = createXorShift(seed >>> 0);
  const p: number[] = Array.from({ length: 256 }, (_, i) => i);
  shuffle(p, rng as unknown as { state: number });
  const perm = new Array<number>(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  const grad2: [number, number][] = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1]
  ];

  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;

  function dot(g: [number, number], x: number, y: number) {
    return g[0] * x + g[1] * y;
  }

  function noise2(xin: number, yin: number): number {
    let n0 = 0, n1 = 0, n2 = 0;

    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    const gi0 = perm[ii + perm[jj]] % 8;
    const gi1 = perm[ii + i1 + perm[jj + j1]] % 8;
    const gi2 = perm[ii + 1 + perm[jj + 1]] % 8;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0; else {
      t0 *= t0;
      n0 = t0 * t0 * dot(grad2[gi0], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0; else {
      t1 *= t1;
      n1 = t1 * t1 * dot(grad2[gi1], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0; else {
      t2 *= t2;
      n2 = t2 * t2 * dot(grad2[gi2], x2, y2);
    }

    const val = 70 * (n0 + n1 + n2);
    return (val + 1) / 2;
  }

  function fbm(x: number, y: number, octaves = 4, lacunarity = 2, gain = 0.5): number {
    let amp = 1, freq = 1, sum = 0, norm = 0;
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
