// 2D ノイズ群（Perlin / Simplex / OpenSimplex 風 / Worley）とfbm合成
// - createPerlin(seed) / createSimplex(seed) / createOpenSimplex(seed) は [0..1] を返す noise2(x,y) と fbm(...) を提供
// - createWorley(seed) は cell（ボロノイ）距離ベースの noise2(x,y) を提供（fbmは簡易）
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
  // スムージング関数（6t^5 - 15t^4 + 10t^3）
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number): number {
  // ハッシュ下位ビットから勾配方向を取り出す（簡易版）
  const h = hash & 0x3f; // 64 dirs for some variety
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
    // 点(x,y) を含むグリッドセルを特定
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    // セル内の相対座標
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    // スムージング
    const u = fade(xf);
    const v = fade(yf);

    // 4隅のハッシュ
    const aa = perm[X + perm[Y]];
    const ab = perm[X + perm[Y + 1]];
    const ba = perm[X + 1 + perm[Y]];
    const bb = perm[X + 1 + perm[Y + 1]];

    // 4隅からの寄与を線形補間で合成
    const x1 = lerp(u, grad(aa, xf, yf), grad(ba, xf - 1, yf));
    const x2 = lerp(u, grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1));
    const val = lerp(v, x1, x2);

    // [0,1] に正規化
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

  return { noise2, fbm };
}

// --- Simplex Noise 2D ------------------------------------------------------
export function createSimplex(seed: number) {
  // ベースとなるパーミュテーションテーブル
  const rng = createXorShift(seed >>> 0);
  const p: number[] = Array.from({ length: 256 }, (_, i) => i);
  shuffle(p, rng as unknown as { state: number });
  const perm = new Array<number>(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  // 勾配ベクトル
  const grad2: [number, number][] = [
    [1, 1], [-1, 1], [1, -1], [-1, -1],
    [1, 0], [-1, 0], [0, 1], [0, -1]
  ];

  // Skew/Unskew 定数
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

    // セル内での順序決定
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

    // Scale to ~[-1,1]
    const val = 70 * (n0 + n1 + n2);
    return (val + 1) / 2; // [0,1]
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

  return { noise2, fbm };
}

// --- OpenSimplex-like 2D ---------------------------------------------------
// 軽量な OpenSimplex 風 2D 実装（標準の係数・グラデーションを用いた近似）
export function createOpenSimplex(seed: number) {
  // OpenSimplex の勾配集合
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
    // ストレッチ
    const stretchOffset = (x + y) * STRETCH_CONSTANT_2D;
    const xs = x + stretchOffset;
    const ys = y + stretchOffset;

    // グリッドセル
    const xsb = Math.floor(xs);
    const ysb = Math.floor(ys);

    const squishOffset = (xsb + ysb) * SQUISH_CONSTANT_2D;
    const dx0 = x - (xsb + squishOffset);
    const dy0 = y - (ysb + squishOffset);

    // セル内での寄与
    let value = 0;

    // 3つの頂点
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

    // 中心
    let dx0c = dx0 - 0;
    let dy0c = dy0 - 0;
    let attn0 = 2 - dx0c * dx0c - dy0c * dy0c;
    if (attn0 > 0) {
      attn0 *= attn0;
      value += attn0 * attn0 * extrapolate(xsb, ysb, dx0c, dy0c);
    }

    // スケール（経験的）して [-1,1] 程度に収める
    const val = value * 45; 
    return (val + 1) / 2; // [0,1]
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

  return { noise2, fbm };
}

// --- Worley (Cellular) Noise 2D -------------------------------------------
export function createWorley(seed: number) {
  const rng = createXorShift(seed >>> 0);
  const p: number[] = Array.from({ length: 256 }, (_, i) => i);
  shuffle(p, rng as unknown as { state: number });
  const perm = new Array<number>(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  function rand2(ix: number, iy: number): [number, number] {
    const h = perm[(ix + perm[iy & 255]) & 255];
    // ハッシュから擬似乱数2つ
    const a = (h ^ 0x68) * 0x27d4eb2d;
    const b = (h ^ 0xb7) * 0x85ebca6b;
    // [0,1)
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

    // 正規化：最遠でも sqrt(2) 程度
    const norm = minDist / Math.SQRT2;
    return Math.max(0, Math.min(1, norm));
  }

  function fbm(x: number, y: number, octaves = 3, lacunarity = 2, gain = 0.5): number {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < octaves; i++) {
      // Worley は距離なので反転してコントラストを付与
      const n = 1 - noise2(x * freq, y * freq);
      sum += amp * n;
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  }

  return { noise2, fbm };
}

// 便利: 値を [0,1] に制限
export function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
