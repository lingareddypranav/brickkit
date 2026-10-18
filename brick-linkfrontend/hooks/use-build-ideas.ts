"use client";

import { useState } from "react";
import { findFamily, models } from "@/lib/demo/catalog";
import { availablePieces, matchInventory } from "@/lib/demo/inventory";
import { selectIdeas } from "@/lib/demo/selectors";
import type { Collection, Family } from "@/lib/demo/types";

/** UI-independent state for a collection-aware gallery. Contains no markup or styles. */
export function useBuildIdeas(collection: Collection) {
  const [family, setFamily] = useState<Family>("all");
  const [onlyMyBricks, setOnlyMyBricks] = useState(true);
  const [savedOnly, setSavedOnly] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [promptMessage, setPromptMessage] = useState("");
  const available = availablePieces(collection);
  const ideas = selectIdeas(collection, { family, onlyMyBricks, savedOnly });
  const readyCount = models.filter(
    (model) => matchInventory(model.inventory, available).ready,
  ).length;

  function submitPrompt() {
    if (!prompt.trim()) return;
    const found = findFamily(prompt);
    if (found) {
      setFamily(found);
      setSavedOnly(false);
      setPromptMessage(
        `Here are some ${found === "rides" ? "things that go" : found === "space" ? "space ideas" : found} to try.`,
      );
    } else
      setPromptMessage(
        "We haven’t made that little idea yet. Pick a picture below to try cars, animals, dinosaurs, dragons, or space.",
      );
  }
  return {
    family,
    setFamily,
    onlyMyBricks,
    setOnlyMyBricks,
    savedOnly,
    setSavedOnly,
    prompt,
    setPrompt,
    promptMessage,
    submitPrompt,
    ideas,
    available,
    readyCount,
  };
}
