export type Inventory = Record<string, number>;
export type Family =
  | "all"
  | "rides"
  | "animals"
  | "dinosaurs"
  | "dragons"
  | "space";
export type Shape =
  | "brick"
  | "plate"
  | "slope"
  | "round"
  | "wheel"
  | "tyre"
  | "axle";

export interface Part {
  key: string;
  part: string;
  color: number;
  name: string;
  colorName: string;
  hex: string;
  width: number;
  depth: number;
  height: number;
  shape: Shape;
  image?: string;
}
export interface Placement {
  key: string;
  x: number;
  y: number;
  z: number;
  step: number;
  rotate?: number;
}
export interface Blueprint {
  id: string;
  name: string;
  description: string;
  family: Exclude<Family, "all">;
  tags: string[];
  background: string;
  image: string;
  minutes: number;
  steps: string[];
  placements: Placement[];
  inventory: Inventory;
  modelUrl?: string;
  source?: {
    provider: "LDraw OMR" | "LEGO";
    setId: string;
    url: string;
    downloadUrl: string;
    author: string;
    license: string;
    sha256: string;
    inventoryBasis: "source-set" | "model";
    instructionsUrl: string;
    submodel?: string;
  };
}
export interface BrickSet {
  id: string;
  name: string;
  pieces: number;
  year: number;
  image: string;
  url: string;
  inventory: Inventory;
}
export interface Creation {
  id: string;
  modelId: string;
  keepBuilt: boolean;
}
export interface Collection {
  version: 1;
  sets: Record<string, { quantity: number; keepBuilt: boolean }>;
  loose: Inventory;
  creations: Creation[];
  wishlist: string[];
}
export interface Match {
  missing: Inventory;
  missingCount: number;
  ready: boolean;
  total: number;
  have: number;
}
export interface SetSuggestion {
  sets: BrickSet[];
  supplied: number;
  remaining: number;
  unlocks: number;
}
