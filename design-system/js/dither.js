/**
 * Ordered dither matching the Figma compute shader (Bayer / blue noise / threshold).
 * Defaults: Bayer 16×16, size 2, 3 levels, brightness 100, contrast 1, color (not mono).
 */

export const FIGMA_DEFAULTS = {
  algorithm: "Bayer 16x16",
  pixelSize: 2,
  levels: 3,
  brightness: 100,
  contrast: 1,
  mono: false,
  monoColor: { r: 1, g: 1, b: 1 },
};

const TILE_NAME = {
  "Bayer 2x2": "bayer2",
  "Bayer 4x4": "bayer4",
  "Bayer 8x8": "bayer8",
  "Bayer 16x16": "bayer16",
  "Blue Noise": "bluenoise",
  Threshold: "threshold",
};

function bayerMatrix(N) {
  if (N === 1) return [[0]];
  const small = bayerMatrix(N / 2);
  const m = N / 2;
  const out = [];
  for (let y = 0; y < N; y++) {
    out[y] = new Array(N);
    for (let x = 0; x < N; x++) {
      const v = small[y % m][x % m] * 4;
      const qx = Math.floor(x / m);
      const qy = Math.floor(y / m);
      const qoff =
        qy === 0 && qx === 0 ? 0 : qy === 0 && qx === 1 ? 2 : qy === 1 && qx === 0 ? 3 : 1;
      out[y][x] = v + qoff;
    }
  }
  return out;
}

function flattenBayer(N) {
  const m = bayerMatrix(N);
  const data = new Float32Array(N * N);
  const denom = N * N;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      data[y * N + x] = (m[y][x] + 0.5) / denom;
    }
  }
  return { data, size: N };
}

function rankOrderTile(buf, N) {
  const idx = [];
  for (let i = 0; i < buf.length; i++) idx.push(i);
  idx.sort((a, b) => buf[a] - buf[b]);
  const out = new Float32Array(buf.length);
  for (let rank = 0; rank < idx.length; rank++) {
    out[idx[rank]] = (rank + 0.5) / buf.length;
  }
  return { data: out, size: N };
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeBlueNoiseTile(N) {
  const rnd = mulberry32(0x9e3779b9);
  const buf = new Float32Array(N * N);
  for (let i = 0; i < buf.length; i++) buf[i] = rnd();
  const tmp = new Float32Array(buf.length);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        let s = 0;
        let c = 0;
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const xx = (x + dx + N) % N;
            const yy = (y + dy + N) % N;
            s += buf[yy * N + xx];
            c++;
          }
        }
        tmp[y * N + x] = s / c;
      }
    }
    for (let j = 0; j < buf.length; j++) buf[j] = buf[j] - 0.5 * tmp[j];
  }
  return rankOrderTile(buf, N);
}

export function getTile(name) {
  switch (name) {
    case "bayer2":
      return flattenBayer(2);
    case "bayer4":
      return flattenBayer(4);
    case "bayer8":
      return flattenBayer(8);
    case "bayer16":
      return flattenBayer(16);
    case "bluenoise":
      return makeBlueNoiseTile(64);
    case "threshold":
      return { data: new Float32Array([0.5]), size: 1 };
    default:
      return flattenBayer(4);
  }
}

function quantize(c, t, levels) {
  const L = levels - 1;
  const off = (t - 0.5) / L;
  return Math.min(1, Math.max(0, Math.round((c + off) * L) / L));
}

function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}

function adjust(c, contrast, bright) {
  return Math.min(1, Math.max(0, (c - 0.5) * contrast + 0.5 + bright));
}

export function ditherSolidToCanvas(hex, options = {}) {
  const params = { ...FIGMA_DEFAULTS, ...options };
  const tileName = TILE_NAME[params.algorithm] || "bayer16";
  const tile = getTile(tileName);
  const pixelSize = Math.max(1, params.pixelSize | 0);
  const W = tile.size;
  const H = tile.size;
  const bright = (params.brightness - 100) / 200;
  const rgb = hexToRgb(hex);
  const low = document.createElement("canvas");
  low.width = W;
  low.height = H;
  const ctx = low.getContext("2d");
  const img = ctx.createImageData(W, H);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const th = tile.data[(y % tile.size) * tile.size + (x % tile.size)];
      let r = adjust(rgb.r, params.contrast, bright);
      let g = adjust(rgb.g, params.contrast, bright);
      let b = adjust(rgb.b, params.contrast, bright);
      if (params.mono) {
        const q = quantize(luma(r, g, b), th, params.levels);
        r = params.monoColor.r * q;
        g = params.monoColor.g * q;
        b = params.monoColor.b * q;
      } else {
        r = quantize(r, th, params.levels);
        g = quantize(g, th, params.levels);
        b = quantize(b, th, params.levels);
      }
      const i = (y * W + x) * 4;
      img.data[i] = Math.round(r * 255);
      img.data[i + 1] = Math.round(g * 255);
      img.data[i + 2] = Math.round(b * 255);
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const out = document.createElement("canvas");
  out.width = W * pixelSize;
  out.height = H * pixelSize;
  const octx = out.getContext("2d");
  octx.imageSmoothingEnabled = false;
  octx.drawImage(low, 0, 0, out.width, out.height);
  return out;
}

export function ditherSolidToUrl(hex, options = {}) {
  return ditherSolidToCanvas(hex, options).toDataURL("image/png");
}

export function ditherImageData(src, options = {}) {
  const params = { ...FIGMA_DEFAULTS, ...options };
  const tileName = TILE_NAME[params.algorithm] || "bayer16";
  const tile = getTile(tileName);
  const pixelSize = Math.max(1, params.pixelSize | 0);
  const bright = (params.brightness - 100) / 200;
  const W = Math.max(1, Math.ceil(src.width / pixelSize));
  const H = Math.max(1, Math.ceil(src.height / pixelSize));
  const out = new ImageData(src.width, src.height);

  for (let cy = 0; cy < H; cy++) {
    for (let cx = 0; cx < W; cx++) {
      const sx = Math.min(src.width - 1, Math.floor((cx + 0.5) * pixelSize));
      const sy = Math.min(src.height - 1, Math.floor((cy + 0.5) * pixelSize));
      const si = (sy * src.width + sx) * 4;
      const a = src.data[si + 3] / 255;
      let r = a > 0 ? src.data[si] / 255 / a : 0;
      let g = a > 0 ? src.data[si + 1] / 255 / a : 0;
      let b = a > 0 ? src.data[si + 2] / 255 / a : 0;
      r = adjust(r, params.contrast, bright);
      g = adjust(g, params.contrast, bright);
      b = adjust(b, params.contrast, bright);
      const th = tile.data[(cy % tile.size) * tile.size + (cx % tile.size)];
      if (params.mono) {
        const q = quantize(luma(r, g, b), th, params.levels);
        r = params.monoColor.r * q;
        g = params.monoColor.g * q;
        b = params.monoColor.b * q;
      } else {
        r = quantize(r, th, params.levels);
        g = quantize(g, th, params.levels);
        b = quantize(b, th, params.levels);
      }
      for (let oy = 0; oy < pixelSize; oy++) {
        for (let ox = 0; ox < pixelSize; ox++) {
          const x = cx * pixelSize + ox;
          const y = cy * pixelSize + oy;
          if (x >= src.width || y >= src.height) continue;
          const i = (y * src.width + x) * 4;
          out.data[i] = Math.round(r * 255 * a);
          out.data[i + 1] = Math.round(g * 255 * a);
          out.data[i + 2] = Math.round(b * 255 * a);
          out.data[i + 3] = Math.round(a * 255);
        }
      }
    }
  }
  return out;
}
