"use client";

import { useState } from "react";
import { availablePieces, matchInventory } from "@/lib/demo/inventory";
import type { Blueprint, Collection } from "@/lib/demo/types";

/** Step progression and completion guards stay reusable when the builder is reskinned. */
export function useBuildSession(model: Blueprint, collection: Collection) {
  const [step, setStep] = useState(0);
  const [keepBuilt, setKeepBuilt] = useState(true);
  const [saved, setSaved] = useState(false);
  const ready = matchInventory(
    model.inventory,
    availablePieces(collection),
  ).ready;
  const pieces = model.placements
    .filter((piece) => piece.step === step + 1)
    .reduce<Record<string, number>>((counts, piece) => {
      counts[piece.key] = (counts[piece.key] ?? 0) + 1;
      return counts;
    }, {});
  return {
    step,
    keepBuilt,
    setKeepBuilt,
    saved,
    setSaved,
    ready,
    pieces,
    lastStep: step === model.steps.length - 1,
    next: () =>
      setStep((current) => Math.min(model.steps.length - 1, current + 1)),
    back: () => setStep((current) => Math.max(0, current - 1)),
  };
}
