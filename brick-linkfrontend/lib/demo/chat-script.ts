import { findFamily, modelById } from "./catalog";
import type { Family } from "./types";

export type ChatChoice = {
  id: string;
  label: string;
  family?: Exclude<Family, "all">;
  models?: string[];
};

export type AssistantReply = {
  text: string;
  choices?: ChatChoice[];
  results?: string[];
};

const FAMILY_CHOICES: ChatChoice[] = [
  { id: "family-dragons", label: "A dragon", family: "dragons" },
  { id: "family-space", label: "Something from space", family: "space" },
  { id: "family-rides", label: "Something that goes", family: "rides" },
  { id: "family-dinos", label: "A dinosaur", family: "dinosaurs" },
  { id: "family-animals", label: "An animal friend", family: "animals" },
];

const SCRIPT: Record<
  Exclude<Family, "all">,
  { question: string; choices: ChatChoice[] }
> = {
  dragons: {
    question:
      "A dragon! I can already see little wings and a long tail hiding in your brick box. What kind of dragon?",
    choices: [
      { id: "dragon-cute", label: "Tiny and cute", models: ["pocket-dragon"] },
      {
        id: "dragon-fire",
        label: "Big and fire-breathing",
        models: ["ember-dragon"],
      },
      {
        id: "dragon-both",
        label: "Show me both",
        models: ["pocket-dragon", "ember-dragon"],
      },
    ],
  },
  space: {
    question:
      "Outer space it is. Which mission should we blueprint with the bricks you already have?",
    choices: [
      { id: "space-rocket", label: "A little rocket", models: ["little-rocket"] },
      { id: "space-rover", label: "A moon rover", models: ["moon-rover"] },
      {
        id: "space-skimmer",
        label: "A star skimmer",
        models: ["star-skimmer"],
      },
      {
        id: "space-few",
        label: "Show me a few",
        models: ["little-rocket", "moon-rover", "star-skimmer", "moon-shuttle"],
      },
    ],
  },
  rides: {
    question: "Something that goes! What kind of ride sounds fun?",
    choices: [
      { id: "ride-racer", label: "A fast racer", models: ["pocket-racer"] },
      { id: "ride-bus", label: "A sunshine bus", models: ["little-bus"] },
      { id: "ride-tug", label: "A tiny tugboat", models: ["tiny-tug"] },
      {
        id: "ride-few",
        label: "Show me a few",
        models: ["pocket-racer", "little-bus", "tiny-tug"],
      },
    ],
  },
  dinosaurs: {
    question: "Dinosaurs are a great pick. Who should stomp into the story?",
    choices: [
      { id: "dino-neck", label: "A long-neck", models: ["long-neck"] },
      { id: "dino-little", label: "A little dino", models: ["little-dino"] },
      {
        id: "dino-tri",
        label: "A triceratops",
        models: ["triceratops"],
      },
      {
        id: "dino-few",
        label: "Show me a few",
        models: ["long-neck", "little-dino", "triceratops"],
      },
    ],
  },
  animals: {
    question: "An animal friend! Who should we build?",
    choices: [
      { id: "animal-duck", label: "A sunny duck", models: ["sunny-duck"] },
      { id: "animal-pup", label: "A little puppy", models: ["little-pup"] },
      {
        id: "animal-both",
        label: "Show me both",
        models: ["sunny-duck", "little-pup"],
      },
    ],
  },
};

function matchChoice(text: string, choices?: ChatChoice[]) {
  const needle = text.trim().toLowerCase();
  if (!needle || !choices?.length) return undefined;
  return choices.find(
    (choice) =>
      choice.label.toLowerCase() === needle ||
      needle.includes(choice.label.toLowerCase()) ||
      choice.label.toLowerCase().includes(needle),
  );
}

function otherFamilies(family?: Exclude<Family, "all">) {
  return FAMILY_CHOICES.filter((choice) => choice.family !== family);
}

function resultReply(
  modelsIds: string[],
  family?: Exclude<Family, "all">,
): AssistantReply {
  return {
    text: "Here are some blueprints from your box. Tap one to see how to build it.",
    results: modelsIds,
    choices: otherFamilies(family),
  };
}

export function buildAssistantReply(
  text: string,
  choice: ChatChoice | undefined,
  history: { role: "user" | "assistant"; choices?: ChatChoice[] }[],
): AssistantReply {
  const lastAssistant = [...history]
    .reverse()
    .find((message) => message.role === "assistant");
  const picked = choice ?? matchChoice(text, lastAssistant?.choices);

  if (picked?.models?.length) {
    const fromModel = picked.models
      .map((id) => modelById[id]?.family)
      .find(Boolean);
    return resultReply(picked.models, picked.family ?? fromModel);
  }

  if (picked?.family) {
    const script = SCRIPT[picked.family];
    return { text: script.question, choices: script.choices };
  }

  const family = findFamily(text);
  if (family && family !== "all") {
    const script = SCRIPT[family];
    return { text: script.question, choices: script.choices };
  }

  return {
    text: "I like that idea. Pick a kind of build and I’ll find blueprints in your box.",
    choices: FAMILY_CHOICES,
  };
}

