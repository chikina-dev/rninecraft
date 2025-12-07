import { createXorShift, next } from '../rng';

function shuffle<T>(arr: T[], rngState: { state: number }): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const r = Math.floor(next(rngState as any) * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[r];
    arr[r] = tmp;
  }
}

export function createOpenSimplex(seed: number) {
  const STRETCH_CONSTANT_2D = -0.211324865405187; // (1/Math.sqrt(2+1)-1)/2
  const SQUISH_CONSTANT_2D = 0.366025403784439;   // (Math.sqrt(2+1)-1)/2

  const gradients2D = [
    5,  2,  2,  5,
   -5,  2, -2,  5,
    5, -2,  2, -5,
   -5, -2, -2, -5,
  ];

  const rng = createXorShift(seed >>> 0);
  const p: number[] = Array.from({ length: 256 }, (_, i) => i);
  shuffle(p, rng as unknown as { state: number });
  const perm = new Array<number>(256);
  const permGradIndex2D = new Array<number>(256);
  for (let i = 0; i < 256; i++) {
    const v = p[i];
    perm[i] = v;
    permGradIndex2D[i] = (v % (gradients2D.length / 2)) * 2;
  }

  function extrapolate(xsb: number, ysb: number, dx: number, dy: number): number {
    const index = permGradIndex2D[(perm[xsb & 0xff] + ysb) & 0xff];
    return gradients2D[index] * dx + gradients2D[index + 1] * dy;
  }

  function noise2(x: number, y: number): number {
    const stretchOffset = (x + y) * STRETCH_CONSTANT_2D;
    const xs = x + stretchOffset;
    const ys = y + stretchOffset;

    const xsb = Math.floor(xs);
    const ysb = Math.floor(ys);

    const squishOffset = (xsb + ysb) * SQUISH_CONSTANT_2D;
    const dx0 = x - (xsb + squishOffset);
    const dy0 = y - (ysb + squishOffset);

    let value = 0;

    let dx1 = dx0 - 1 - SQUISH_CONSTANT_2D;
    let dy1 = dy0 - 0 - SQUISH_CONSTANT_2D;
    let attn1 = 2 - dx1 * dx1 - dy1 * dy1;
    if (attn1 > 0) {
      attn1 *= attn1;
      value += attn1 * attn1 * extrapolate(xsb + 1, ysb + 0, dx1, dy1);
    }

    let dx2 = dx0 - 0 - SQUISH_CONSTANT_2D;
    let dy2 = dy0 - 1 - SQUISH_CONSTANT_2D;
    let attn2 = 2 - dx2 * dx2 - dy2 * dy2;
    if (attn2 > 0) {
      attn2 *= attn2;
      value += attn2 * attn2 * extrapolate(xsb + 0, ysb + 1, dx2, dy2);
    }

    let dx0c = dx0 - 0;
    let dy0c = dy0 - 0;
    let attn0 = 2 - dx0c * dx0c - dy0c * dy0c;
    if (attn0 > 0) {
      attn0 *= attn0;
      value += attn0 * attn0 * extrapolate(xsb, ysb, dx0c, dy0c);
    }

  // Scale conservatively and clamp to [-1,1], then map to [0,1]
  // Avoid over-amplifying which can create plateaus and visible seams.
  const val = Math.max(-1, Math.min(1, value));
  return (val + 1) / 2;
  }

  function fbm(x: number, y: number, octaves = 5, lacunarity = 2, gain = 0.5): number {
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
