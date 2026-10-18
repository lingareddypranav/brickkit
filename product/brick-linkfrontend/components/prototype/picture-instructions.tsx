"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, CheckCheck } from "lucide-react";
import type { PictureGuide } from "@/lib/demo/instructions";

type ContentBox = { x: number; y: number; w: number; h: number };

const contentBoxes = new Map<string, ContentBox | null>();

function contentBox(image: HTMLImageElement) {
  const key = `${image.currentSrc}|${image.naturalWidth}x${image.naturalHeight}`;
  if (contentBoxes.has(key)) return contentBoxes.get(key) ?? null;
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (pixels[(y * width + x) * 4 + 3] <= 16) continue;
      found = true;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const box = found
    ? { x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) }
    : null;
  contentBoxes.set(key, box);
  return box;
}

function sharpen(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  const width = canvas.width;
  const height = canvas.height;
  const frame = context.getImageData(0, 0, width, height);
  const source = frame.data;
  const output = new Uint8ClampedArray(source);
  const amount = 0.35;
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = (y * width + x) * 4;
      if (source[index + 3] < 20) continue;
      for (let channel = 0; channel < 3; channel += 1) {
        const center = source[index + channel];
        const neighbors =
          source[index - 4 + channel] +
          source[index + 4 + channel] +
          source[index - width * 4 + channel] +
          source[index + width * 4 + channel];
        const value = center + (center - neighbors / 4) * amount;
        output[index + channel] = Math.max(0, Math.min(255, value));
      }
    }
  }
  frame.data.set(output);
  context.putImageData(frame, 0, 0);
}

function drawStepImage(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  stage: HTMLElement,
  fill = 1,
) {
  const box = contentBox(image);
  const context = canvas.getContext("2d");
  if (!context || !box || stage.clientWidth === 0 || stage.clientHeight === 0) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const sourceX = Math.max(0, box.x - 2);
  const sourceY = Math.max(0, box.y - 2);
  const sourceW = Math.min(image.naturalWidth - sourceX, box.w + box.x - sourceX + 2);
  const sourceH = Math.min(image.naturalHeight - sourceY, box.h + box.y - sourceY + 2);
  const pad = Math.min(64, Math.max(40, Math.round(Math.min(width, height) * 0.12)));
  const scale =
    Math.min((width - pad * 2) / sourceW, (height - pad * 2) / sourceH) * fill;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceW,
    sourceH,
    (width - sourceW * scale) / 2,
    (height - sourceH * scale) / 2,
    sourceW * scale,
    sourceH * scale,
  );
  context.setTransform(1, 0, 0, 1, 0, 0);
  sharpen(context, canvas);
}

export function PictureInstructions({
  guide,
  name,
  background,
  step,
  onStep,
  onFinish,
  canFinish = true,
}: {
  guide: PictureGuide;
  name: string;
  background: string;
  step: number;
  onStep: (step: number) => void;
  onFinish?: () => void;
  canFinish?: boolean;
}) {
  const current = guide.steps[step];
  const last = step === guide.steps.length - 1;
  const alone =
    guide.steps
      .slice(0, step + 1)
      .reduce(
        (total, item) => total + item.pieces.reduce((count, piece) => count + piece.count, 0),
        0,
      ) === 1;
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !image || !canvas) return;
    const place = () => {
      if (image.naturalWidth) drawStepImage(image, canvas, stage, alone ? 0.68 : 1);
    };
    if (image.complete) place();
    image.addEventListener("load", place);
    const observer = new ResizeObserver(place);
    observer.observe(stage);
    return () => {
      image.removeEventListener("load", place);
      observer.disconnect();
    };
  }, [alone, current.image]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.metaKey || event.ctrlKey) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select"))
      ) {
        return;
      }
      if (event.key === "ArrowLeft" && step > 0) {
        event.preventDefault();
        onStep(step - 1);
      } else if (event.key === "ArrowRight" && step < guide.steps.length - 1) {
        event.preventDefault();
        onStep(step + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guide.steps.length, onStep, step]);

  return (
    <section
      className="picture-instructions"
      aria-label={`${name} instructions`}
    >
      <div className="guide-stage" ref={stageRef} style={{ background }}>
        <img ref={imageRef} src={current.image} alt="" />
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`${name}, step ${step + 1}: ${current.title}`}
        />
      </div>
      {current.pieces.length > 0 && (
        <div className="step-pieces">
          {current.pieces.map((piece) => (
            <div
              className="step-piece"
              key={piece.id}
              title={`${piece.count} × ${piece.color} ${piece.name}`}
            >
              <img src={piece.image} alt={`${piece.color} ${piece.name}`} />
              <span>×{piece.count}</span>
            </div>
          ))}
        </div>
      )}
      <nav className="picture-navigation" aria-label="Instruction steps">
        <button
          className="kit-button kit-button-dark step-arrow"
          disabled={step === 0}
          aria-label="Back"
          onClick={() => onStep(step - 1)}
        >
          <ArrowLeft size={20} />
        </button>
        <span>
          {step + 1} / {guide.steps.length}
        </span>
        {last ? (
          <button
            className="kit-button kit-button-dark step-arrow"
            disabled={!canFinish}
            aria-label="I made it"
            onClick={onFinish}
          >
            <CheckCheck size={20} />
          </button>
        ) : (
          <button
            className="kit-button kit-button-dark step-arrow"
            aria-label="Next step"
            onClick={() => onStep(step + 1)}
          >
            <ArrowRight size={20} />
          </button>
        )}
      </nav>
    </section>
  );
}
