import { models, modelById, sets, setById } from "./catalog";
import type {
  Blueprint,
  Collection,
  Inventory,
  Match,
  SetSuggestion,
} from "./types";

export const countPieces = (inventory: Inventory) =>
  Object.values(inventory).reduce((sum, n) => sum + n, 0);

export function addInventory(
  target: Inventory,
  source: Inventory,
  quantity = 1,
): Inventory {
  for (const [key, count] of Object.entries(source))
    target[key] = (target[key] ?? 0) + count * quantity;
  return target;
}

export function availablePieces(
  collection: Collection,
  includeProtected = false,
): Inventory {
  const inventory = { ...collection.loose };
  for (const [id, owned] of Object.entries(collection.sets)) {
    if (setById[id] && (includeProtected || !owned.keepBuilt))
      addInventory(inventory, setById[id].inventory, owned.quantity);
  }
  if (!includeProtected) {
    for (const creation of collection.creations) {
      if (creation.keepBuilt && modelById[creation.modelId])
        addInventory(inventory, modelById[creation.modelId].inventory, -1);
    }
  }
  return Object.fromEntries(
    Object.entries(inventory).map(([key, n]) => [key, Math.max(0, n)]),
  );
}

export function matchInventory(
  required: Inventory,
  available: Inventory,
): Match {
  const missing = Object.fromEntries(
    Object.entries(required)
      .map(([key, count]) => [key, Math.max(0, count - (available[key] ?? 0))])
      .filter(([, n]) => Number(n) > 0),
  );
  const total = countPieces(required);
  const missingCount = countPieces(missing);
  return {
    missing,
    missingCount,
    ready: missingCount === 0,
    total,
    have: total - missingCount,
  };
}

export function recommendSets(
  model: Blueprint,
  available: Inventory,
): SetSuggestion[] {
  const initial = matchInventory(model.inventory, available);
  if (initial.ready) return [];
  const useful = sets.filter((set) =>
    Object.keys(initial.missing).some((key) => (set.inventory[key] ?? 0) > 0),
  );
  const groups = useful.flatMap((set, i) => [
    [set],
    ...useful.slice(i + 1).map((other) => [set, other]),
  ]);
  const suggestions = groups
    .map((group) => {
      const next = { ...available };
      group.forEach((set) => addInventory(next, set.inventory));
      const remaining = matchInventory(model.inventory, next).missingCount;
      return {
        sets: group,
        supplied: initial.missingCount - remaining,
        remaining,
        unlocks: models.filter(
          (idea) =>
            !matchInventory(idea.inventory, available).ready &&
            matchInventory(idea.inventory, next).ready,
        ).length,
      };
    })
    .filter((item) => item.supplied > 0);
  suggestions.sort(
    (a, b) =>
      a.remaining - b.remaining ||
      a.sets.length - b.sets.length ||
      b.unlocks - a.unlocks ||
      a.sets.reduce((s, x) => s + x.pieces, 0) -
        b.sets.reduce((s, x) => s + x.pieces, 0),
  );
  // A pair earns a place only when it closes a gap that either single leaves.
  return suggestions
    .filter(
      (item) =>
        item.sets.length === 1 ||
        item.sets.every(
          (set) =>
            matchInventory(
              model.inventory,
              addInventory({ ...available }, set.inventory),
            ).missingCount > item.remaining,
        ),
    )
    .slice(0, 2);
}
