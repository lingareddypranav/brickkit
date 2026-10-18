import data from "./catalog-data.json";
import type { Blueprint, BrickSet, Collection, Family, Part } from "./types";

export const parts = data.parts as Part[];
// Generated catalogue is checked by scripts/demo.test.cjs at the JSON boundary.
export const sets = data.sets as unknown as BrickSet[];
export const models = data.models as unknown as Blueprint[];
export const partByKey = Object.fromEntries(
  parts.map((part) => [part.key, part]),
);
export const modelById = Object.fromEntries(
  // Existing saved creations keep their original inventory reservations.
  [...(data.legacyModels as unknown as Blueprint[]), ...models].map((model) => [
    model.id,
    model,
  ]),
);
export const setById = Object.fromEntries(sets.map((set) => [set.id, set]));
export const sampleCollection = data.sample as Collection;
export const emptyCollection: Collection = {
  version: 1,
  sets: {},
  loose: {},
  creations: [],
  wishlist: [],
};
export const families: {
  id: Family;
  label: string;
  model: string;
  image?: string;
  background?: string;
}[] = [
  {
    id: "all",
    label: "Surprise me",
    model: "blue-racer",
    image: "/demo/models/surprise-present.svg",
    background: "#E8D4C4",
  },
  { id: "rides", label: "Things that go", model: "blue-racer" },
  { id: "animals", label: "Animal friends", model: "cute-pug" },
  { id: "dinosaurs", label: "Dinosaurs", model: "apatosaurus" },
  { id: "dragons", label: "Dragons", model: "dragon-friend" },
  { id: "space", label: "Out of this world", model: "shuttle-explorer" },
];

export function findFamily(prompt: string): Family | null {
  const words = prompt.toLowerCase().match(/[a-z]+/g) ?? [];
  const aliases: Record<string, Family> = {
    car: "rides",
    cars: "rides",
    race: "rides",
    racer: "rides",
    truck: "rides",
    boat: "rides",
    bus: "rides",
    vehicle: "rides",
    animal: "animals",
    animals: "animals",
    duck: "animals",
    ducks: "animals",
    dog: "animals",
    cat: "animals",
    bird: "animals",
    dinosaur: "dinosaurs",
    dinosaurs: "dinosaurs",
    dinasour: "dinosaurs",
    dinasours: "dinosaurs",
    dino: "dinosaurs",
    trex: "dinosaurs",
    triceratops: "dinosaurs",
    dragon: "dragons",
    dragons: "dragons",
    space: "space",
    rocket: "space",
    rockets: "space",
    spaceship: "space",
    spaceships: "space",
    shuttle: "space",
    rover: "space",
    moon: "space",
    astronaut: "space",
  };
  return words.map((word) => aliases[word]).find(Boolean) ?? null;
}
