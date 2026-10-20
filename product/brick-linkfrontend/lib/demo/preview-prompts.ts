import { findFamily, models } from "./catalog";
import type { Family } from "./types";

type BuildFamily = Exclude<Family, "all">;
export type PreviewRequest =
  | { kind: "build"; modelIds: string[] }
  | { kind: "family"; family: BuildFamily }
  | { kind: "explore" }
  | { kind: "outside-preview"; family?: BuildFamily };

// Prepared capabilities belong here, independently of the chat layout. Matching
// the whole request prevents "a spaceship with a swimming pool" from being
// presented as something the preview actually generated.
const FILLER = new Set([
  "a", "an", "the", "i", "id", "we", "wed", "you", "please", "can", "could",
  "would", "like", "want", "wanna", "love", "to", "build", "make", "create",
  "show", "me", "us", "some", "lets", "let", "lego", "bricks", "brick",
  "cool", "fun", "awesome", "idea", "ideas", "hi", "hello", "hey",
]);

export function previewPromptKey(text: string): string {
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ")
    .trim().split(/\s+/).filter(word => !FILLER.has(word)).join(" ");
}

const FAMILY_REQUESTS: Record<string, BuildFamily> = {
  dragon: "dragons", dragons: "dragons", "flying dragon": "dragons",
  dinosaur: "dinosaurs", dinosaurs: "dinosaurs", dinasour: "dinosaurs",
  dinasours: "dinosaurs", dino: "dinosaurs", dinos: "dinosaurs",
  space: "space", spaceship: "space", spaceships: "space", spacecraft: "space",
  animal: "animals", animals: "animals", pet: "animals", pets: "animals",
  ride: "rides", rides: "rides", car: "rides", cars: "rides", vehicle: "rides",
  vehicles: "rides", racecar: "rides", racecars: "rides", "things that go": "rides",
  "animal friends": "animals",
};

const MODEL_ALIASES: Record<string, string[]> = {
  pug: ["cute-pug"], puppy: ["cute-pug"], dog: ["cute-pug"], dogs: ["cute-pug"],
  shark: ["shark"], crab: ["shark"], koala: ["koala"], turkey: ["turkey"],
  racer: ["blue-racer"], buggy: ["blue-kart"], "dune buggy": ["blue-kart"],
  jet: ["mini-jet"], speedboat: ["speedboat"], boat: ["speedboat"],
  shuttle: ["mini-shuttle", "shuttle-explorer"], "space shuttle": ["mini-shuttle", "shuttle-explorer"],
  rover: ["space-rover"], "moon base": ["moon-base"], squid: ["squid"], whale: ["whale"],
  "angler fish": ["angler-fish"], apatosaurus: ["apatosaurus"], pteranodon: ["pteranodon"],
  "flying dinosaur": ["pteranodon"], "fire breathing dragon": ["fire-dragon"],
};

const BUILD_REQUESTS = new Map([
  ...Object.entries(MODEL_ALIASES),
  ...models.map(model => [previewPromptKey(model.name), [model.id]] as [string, string[]]),
]);
const EXPLORE_REQUESTS = new Set(["", "surprise", "surprise me", "anything", "something", "help", "dont know", "not sure", "all", "all of them"]);
const PREVIEW_FAVORITES = ["green-dinosaur", "mini-shuttle", "fire-dragon"];

function familyHint(text: string): BuildFamily | undefined {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  // In a request for a dinosaur-carrying spaceship, offer spacecraft without
  // claiming the prepared build has room for the dinosaur.
  if (words.some(word => /^(space|spaceship|spaceships|spacecraft|shuttle|rocket|ufo)$/.test(word))) return "space";
  const found = findFamily(text);
  if (found && found !== "all") return found;
  if (words.some(word => /^(unicorn|unicorns|horse|pony|cat|cats|kitten|lion|bunny|rabbit|tiger)$/.test(word))) return "animals";
  if (words.some(word => /^(castle|wizard|magic|princess)$/.test(word))) return "dragons";
  return undefined;
}

export function classifyPreviewRequest(text: string, contextFamily?: BuildFamily): PreviewRequest {
  const key = previewPromptKey(text);
  const modelIds = BUILD_REQUESTS.get(key)?.filter(id => models.some(model => model.id === id));
  if (modelIds?.length) return { kind: "build", modelIds };
  const family = Object.hasOwn(FAMILY_REQUESTS, key) ? FAMILY_REQUESTS[key] : undefined;
  if (family) return { kind: "family", family };
  if (EXPLORE_REQUESTS.has(key)) return { kind: "explore" };
  return { kind: "outside-preview", family: familyHint(text) ?? contextFamily };
}

/** Only current catalogue IDs are returned, and supplied filters are never relaxed. */
export function previewSuggestions(family?: BuildFamily, allowedModelIds?: readonly string[]): string[] {
  const allowed = allowedModelIds ? new Set(allowedModelIds) : null;
  const eligible = models.filter(model => !allowed || allowed.has(model.id));
  const ranked = [
    ...eligible.filter(model => model.family === family),
    ...PREVIEW_FAVORITES.flatMap(id => eligible.filter(model => model.id === id)),
    ...eligible,
  ];
  return [...new Set(ranked.map(model => model.id))].slice(0, 3);
}
