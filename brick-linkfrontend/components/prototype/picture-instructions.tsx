"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import type { PictureGuide } from "@/lib/demo/instructions";

export function PictureInstructions({
  guide,
  name,
  background,
  step,
  onStep,
}: {
  guide: PictureGuide;
  name: string;
  background: string;
  step: number;
  onStep: (step: number) => void;
}) {
  const current = guide.steps[step];
  const last = step === guide.steps.length - 1;
  return (
    <section
      className="picture-instructions"
      aria-label={`${name} instructions`}
    >
      <div
        className="picture-progress"
        role="progressbar"
        aria-label="Building progress"
        aria-valuemin={1}
        aria-valuemax={guide.steps.length}
        aria-valuenow={step + 1}
      >
        <span
          style={{ width: `${((step + 1) / guide.steps.length) * 100}%` }}
        />
      </div>
      <div className="guide-title" aria-live="polite" aria-atomic="true">
        <div>
          <span className="kit-eyebrow">
            STEP {step + 1} OF {guide.steps.length}
          </span>
          <h3>{current.title}</h3>
        </div>
      </div>
      <div className="guide-stage" style={{ background }}>
        <img
          src={current.image}
          alt={`${name}, step ${step + 1}: ${current.title}`}
        />
      </div>
      <div className="step-pieces">
        <h4>Find these pieces</h4>
        <div>
          {current.pieces.map((piece) => (
            <div
              className="step-piece"
              key={piece.id}
              title={`${piece.count} × ${piece.color} ${piece.name}`}
            >
              <img src={piece.image} alt={`${piece.color} ${piece.name}`} />
              <span>{piece.count} ×</span>
            </div>
          ))}
        </div>
      </div>
      <nav className="picture-navigation" aria-label="Instruction steps">
        <button
          className="kit-button kit-button-outline"
          disabled={step === 0}
          onClick={() => onStep(step - 1)}
        >
          <ArrowLeft size={20} /> Back
        </button>
        <span>
          {step + 1} / {guide.steps.length}
        </span>
        <button
          className="kit-button kit-button-dark"
          disabled={last}
          onClick={() => onStep(step + 1)}
        >
          Next step <ArrowRight size={20} />
        </button>
      </nav>
    </section>
  );
}
