import { models, modelById, sets } from "./catalog";
import { addInventory, availablePieces, matchInventory } from "./inventory";
import { instructionsFor } from "./instructions";
import type { Blueprint, Collection, Family } from "./types";

export interface IdeaFilters {
  family: Family;
  onlyMyBricks: boolean;
  onlyInstructions?: boolean;
  savedOnly: boolean;
}

/** Presentation-independent view model. Any new design can consume these selectors. */
export function selectIdeas(collection: Collection, filters: IdeaFilters) {
  const available = availablePieces(collection);
  return models
    .filter(
      (model) => filters.family === "all" || model.family === filters.family,
    )
    .filter(
      (model) => !filters.savedOnly || collection.wishlist.includes(model.id),
    )
    .map((model) => ({
      model,
      match: matchInventory(model.inventory, available),
      saved: collection.wishlist.includes(model.id),
    }))
    .filter((idea) => !filters.onlyMyBricks || idea.match.ready)
    .filter(
      (idea) => !filters.onlyInstructions || Boolean(instructionsFor(idea.model.id)),
    )
    .sort((a, b) => Number(b.match.ready) - Number(a.match.ready));
}

export function protectedSources(model: Blueprint, collection: Collection) {
  const available = availablePieces(collection);
  const before = matchInventory(model.inventory, available).missingCount;
  if (!before) return [];
  const sources = [
    ...sets
      .filter((set) => collection.sets[set.id]?.keepBuilt)
      .map((set) => ({
        id: set.id,
        kind: "set" as const,
        name: set.name,
        inventory: set.inventory,
        quantity: collection.sets[set.id].quantity,
      })),
    ...collection.creations
      .filter((creation) => creation.keepBuilt)
      .map((creation) => ({
        id: creation.id,
        kind: "creation" as const,
        name: modelById[creation.modelId].name,
        inventory: modelById[creation.modelId].inventory,
        quantity: 1,
      })),
  ];
  return sources
    .map((source) => ({
      ...source,
      remaining: matchInventory(
        model.inventory,
        addInventory({ ...available }, source.inventory, source.quantity),
      ).missingCount,
    }))
    .filter((source) => source.remaining < before);
}
