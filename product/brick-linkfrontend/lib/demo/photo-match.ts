import { partByKey, parts, sets } from "./catalog";
import type { BrickSet, Shape } from "./types";

export type ColorBucket = {
  r: number;
  g: number;
  b: number;
  count: number;
};

export type PieceGuess = {
  key: string;
  quantity: number;
};

type Rgb = { r: number; g: number; b: number };

const MAX_EDGE = 160;
const COLOR_MATCH = 140;
const PART_MATCH = 80;
const NEAR_TIE = 18;
const MAX_PER_PART = 12;
const MAX_TOTAL = 40;
const SET_SCORE = 0.22;

const colorById = new Map<number, Rgb>();
for (const part of parts) colorById.set(part.color, hexToRgb(part.hex));

const setColors = sets.map((set) => ({
  set,
  colors: inventoryColors(set),
}));

export async function samplePhotoColors(file: Blob): Promise<ColorBucket[]> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return [];
    context.drawImage(image, 0, 0, width, height);
    const data = context.getImageData(0, 0, width, height).data;
    const background = borderColor(data, width, height);
    const bins = new Map<string, { r: number; g: number; b: number; count: number }>();
    let colored = 0;

    for (let index = 0; index < data.length; index += 4) {
      const pixel = {
        r: data[index],
        g: data[index + 1],
        b: data[index + 2],
      };
      if (data[index + 3] < 128) continue;
      if (isNearWhite(pixel)) continue;
      if (background && colorDistance(pixel, background) < 32) continue;
      colored += 1;
      const key = `${pixel.r >> 5},${pixel.g >> 5},${pixel.b >> 5}`;
      const bin = bins.get(key) ?? { r: 0, g: 0, b: 0, count: 0 };
      bin.r += pixel.r;
      bin.g += pixel.g;
      bin.b += pixel.b;
      bin.count += 1;
      bins.set(key, bin);
    }

    const minimum = Math.max(8, colored * 0.015);
    return [...bins.values()]
      .filter((bin) => bin.count >= minimum)
      .map((bin) => ({
        r: Math.round(bin.r / bin.count),
        g: Math.round(bin.g / bin.count),
        b: Math.round(bin.b / bin.count),
        count: bin.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function matchSets(buckets: ColorBucket[], limit = 3): BrickSet[] {
  if (!buckets.length) return [];
  return setColors
    .map(({ set, colors }) => ({ set, score: scoreSet(buckets, colors) }))
    .filter((item) => item.score >= SET_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.set);
}

export function guessPieces(buckets: ColorBucket[]): PieceGuess[] {
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  if (!total) return [];
  const merged = new Map<string, number>();

  for (const bucket of buckets) {
    const ranked = parts
      .map((part) => ({
        part,
        distance: colorDistance(hexToRgb(part.hex), bucket),
      }))
      .filter((item) => item.distance <= PART_MATCH)
      .sort((a, b) => a.distance - b.distance);
    const closest = ranked[0];
    if (!closest) continue;
    const near = ranked.filter(
      (item) => item.distance <= closest.distance + NEAR_TIE,
    );
    const chosen =
      near.find((item) => item.part.shape === "brick") ??
      near.find((item) => item.part.shape === "plate") ??
      closest;
    const share = bucket.count / total;
    const quantity = Math.min(
      MAX_PER_PART,
      Math.max(1, Math.round(share * 24)),
    );
    merged.set(chosen.part.key, (merged.get(chosen.part.key) ?? 0) + quantity);
  }

  let guesses = [...merged.entries()].map(([key, quantity]) => ({
    key,
    quantity: Math.min(MAX_PER_PART, quantity),
  }));
  let sum = guesses.reduce((count, guess) => count + guess.quantity, 0);
  if (sum > MAX_TOTAL) {
    const scale = MAX_TOTAL / sum;
    guesses = guesses.map((guess) => ({
      ...guess,
      quantity: Math.max(1, Math.round(guess.quantity * scale)),
    }));
    sum = guesses.reduce((count, guess) => count + guess.quantity, 0);
    while (sum > MAX_TOTAL) {
      const largest = guesses.reduce((best, guess) =>
        guess.quantity > best.quantity ? guess : best,
      );
      if (largest.quantity <= 1) break;
      largest.quantity -= 1;
      sum -= 1;
    }
  }
  return guesses;
}

function inventoryColors(set: BrickSet): { rgb: Rgb; weight: number }[] {
  const merged = new Map<string, { rgb: Rgb; weight: number }>();
  for (const [key, quantity] of Object.entries(set.inventory)) {
    const rgb = rgbForKey(key);
    if (!rgb || quantity <= 0) continue;
    const id = `${rgb.r},${rgb.g},${rgb.b}`;
    const current = merged.get(id) ?? { rgb, weight: 0 };
    current.weight += quantity;
    merged.set(id, current);
  }
  return [...merged.values()];
}

function rgbForKey(key: string): Rgb | null {
  const known = partByKey[key];
  if (known) return hexToRgb(known.hex);
  const colorId = Number(key.split(":")[1]);
  return colorById.get(colorId) ?? null;
}

function scoreSet(
  buckets: ColorBucket[],
  colors: { rgb: Rgb; weight: number }[],
): number {
  const photoTotal = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const setTotal = colors.reduce((sum, color) => sum + color.weight, 0);
  if (!photoTotal || !setTotal) return 0;
  let score = 0;
  for (const bucket of buckets) {
    const share = bucket.count / photoTotal;
    let best = 0;
    for (const color of colors) {
      const similarity = Math.max(
        0,
        1 - colorDistance(bucket, color.rgb) / COLOR_MATCH,
      );
      const presence = Math.min(
        1,
        color.weight / setTotal / Math.max(share, 0.05),
      );
      best = Math.max(best, similarity * (0.35 + 0.65 * presence));
    }
    score += share * best;
  }
  return score;
}

function borderColor(data: Uint8ClampedArray, width: number, height: number): Rgb | null {
  const samples: Rgb[] = [];
  const push = (offset: number) => {
    samples.push({
      r: data[offset],
      g: data[offset + 1],
      b: data[offset + 2],
    });
  };
  for (let x = 0; x < width; x += 1) {
    push(x * 4);
    push(((height - 1) * width + x) * 4);
  }
  for (let y = 0; y < height; y += 1) {
    push(y * width * 4);
    push((y * width + width - 1) * 4);
  }
  const average = {
    r: Math.round(samples.reduce((sum, pixel) => sum + pixel.r, 0) / samples.length),
    g: Math.round(samples.reduce((sum, pixel) => sum + pixel.g, 0) / samples.length),
    b: Math.round(samples.reduce((sum, pixel) => sum + pixel.b, 0) / samples.length),
  };
  const spread =
    samples.reduce((sum, pixel) => sum + colorDistance(pixel, average), 0) /
    samples.length;
  return spread > 36 ? null : average;
}

function isNearWhite(pixel: Rgb) {
  return pixel.r > 242 && pixel.g > 242 && pixel.b > 242;
}

function colorDistance(a: Rgb, b: Rgb) {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read that image"));
    image.src = url;
  });
}

export const shapeOrder: Shape[] = [
  "brick",
  "plate",
  "slope",
  "round",
  "wheel",
  "tyre",
  "axle",
];
