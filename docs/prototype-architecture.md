# Collection prototype: replacing the visual design

The collection-aware demo lives at `/`. The previous live OMR app is preserved at `/explore`.

The demo has fourteen original illustrative mini designs: cars, a bus, a boat, animals, three dinosaurs, two dragons, two spaceships, a rocket, and a moon rover. Six real set inventory snapshots and local set imagery support the collection picker. The sample includes extra loose pieces and one protected set. The rover starts four tyres short. These recipes demonstrate the interaction; physical assembly has not been verified.

## The replacement boundary

```text
lib/demo/catalog-data.json   Offline content, not UI
lib/demo/types.ts            Public domain types
lib/demo/inventory.ts        Availability, gaps, donor sets/pairs
lib/demo/selectors.ts        Filtering and protected-piece sources
lib/demo/state.ts            Versioned storage validation
           ↓
hooks/use-brick-box.ts       Persistence and collection commands
hooks/use-build-ideas.ts     Gallery state and derived ideas
hooks/use-build-session.ts   Step progression and completion guard
           ↓
components/prototype/       Replaceable React markup, art layout, CSS, 3D view
app/page.tsx                Only mounts the chosen presentation
```

No domain module imports React components, CSS, browser storage, or a backend client. Inventory and recommendation functions are deterministic. Hooks contain no rendered elements or CSS. A redesign can replace `components/prototype/` and the root page while retaining all collection and matching behavior.

## Small example for a new design

```tsx
const box = useBrickBox();
const ideas = useBuildIdeas(box.collection);

// Render these however the new design needs:
ideas.ideas; // [{ model, match, saved }]
ideas.family;
ideas.onlyMyBricks;
box.collection.sets;
box.collection.loose;
box.collection.creations;

// Shared commands, with no dependence on today's buttons or dialogs:
box.setQuantity(setId, 2);
box.toggleSet(setId); // Keep built / ready to remix
box.adjustLoose(partColorKey, 1);
box.toggleWish(modelId);
box.saveCreation(modelId, true); // Guarded by current availability
box.toggleCreation(creationId);
ideas.setFamily("dragons");
ideas.setOnlyMyBricks(true);
```

`selectIdeas(collection, filters)` is available directly if a new UI does not need the gallery hook. `availablePieces`, `matchInventory`, `recommendSets`, and `protectedSources` can also run outside React.

## Data and inventory contracts

- The canonical inventory key is `Rebrickable part number:Rebrickable colour ID`. Quantities are integers. Colours must match exactly in this prototype.
- Sets store owned quantity and one keep-built choice for all owned copies. Available inventory includes only unlocked set copies and extra loose pieces.
- A kept-built creation subtracts its recipe's exact quantities. Remixing releases those quantities. Saving a creation requires all pieces to be available at that moment.
- The collection is saved under `brick-kit:brick-box:v1`. Stored data is validated and clamped when read. Unknown items are ignored. Malformed/old storage recovers to an empty collection. A browser storage failure falls back to the current tab with a visible note.
- A new browser starts with the sample box. Explicit sample/empty actions ask for confirmation before replacing the local box.
- Thumbnails, progressive step pictures, 3D meshes, and matching all derive from the same recipe placements. Illustrative geometry is not a physical-build guarantee.
- Shops and wishlists do not mutate ownership. The explicit “Found these pieces at home” action adds only the current deficit to extra pieces.
- Recommendations evaluate singles and pairs from the six-set catalogue. The returned remaining count is calculated, and a pair is included only if it fills more gaps than either single. No live price or stock claims are made.

## Adding another build

1. Add a recipe to `scripts/prepare-demo.py`, using explicit part/colour placements and step numbers.
2. Regenerate with the four public Rebrickable CSV downloads described in `public/demo/SOURCES.md`.
3. The generator writes the catalogue, model thumbnail, step images, and loose-piece thumbnails from that recipe.
4. Review the pictures and piece inventory together. Extend the source dimensions when introducing a new supported piece.
5. Run the tests and TypeScript check below. Choose an existing family or add the family type and picture choice in `catalog.ts`.

A redesigned presentation can instead use photos, different SVG art, a new 3D renderer, or externally supplied instruction assets; preserve the same inventory and recipe IDs. The renderer is not the source of truth for readiness.

## Checks and local use

From `brick-linkfrontend`:

```bash
npm run dev -- --hostname 127.0.0.1
npm run test:demo
npx tsc --noEmit --incremental false
```

The new demo works without the Python server. For the original `/explore` experience, also run `LDRAW_PATH=/Users/pranavlingareddy/Desktop/ldraw python3 -m src.main` from the repository root.

Browser QA should cover: strict filtering; picture categories and unknown prompts; keeping a set built; adding loose pieces; missing-piece recommendations; adding four tyres to unlock the rover; guided steps; saving a kept-built creation; remixing; persistence across reload; a narrow mobile viewport; and the optional 3D view. Printing opens the browser's print dialog with all step illustrations.

The engine tests additionally check catalogue/placement consistency, duplicate set quantities, corrupt storage, saved-only filtering, and two-set coverage. Generated runtime files from the Python app are deliberately outside the implementation commits.
