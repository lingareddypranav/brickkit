# Collection prototype and real OMR catalogue

The redesigned app at `/` uses 23 real LDraw OMR models, including alternate
builds, three dinosaurs, dragons, animals, cars, and spacecraft. The original
live prompt → OMR search → download → LeoCAD flow is accessible at `/explore`.
The homepage catalogue is cached and deterministic; it needs no AI backend.
In the product story, these are the AI-generated blueprints. OMR is the source of
convincing models behind that simulation. Shopping recommendations are separate:
existing real retail sets are added to the child's available inventory and ranked
by how much of the generated build's deficit they cover. The direct “Find missing
pieces” action opens those suggestions; there is no parent-gating button.

## Replace the visual design without replacing the behaviour

```text
scripts/omr-models.json      Curated source URLs, names, families, render cameras
scripts/prepare-omr.py       Imports OMR files + Rebrickable retail inventories
lib/demo/catalog-data.json  Cached domain data, no UI
lib/demo/types.ts           Blueprint, source, inventory, collection contracts
lib/demo/inventory.ts       Available pieces, exact-colour gaps, donor sets/pairs
lib/demo/selectors.ts       Strict/family/saved filtering and protected sources
lib/demo/state.ts           Storage validation
lib/demo/chat-script.ts     Catalogue-derived scripted choices
          ↓
hooks/use-brick-box.ts      Persistence and guarded collection commands
hooks/use-build-ideas.ts    Filters and derived gallery state
          ↓
components/prototype/      Replaceable React markup, CSS, gallery and builder
```

Domain modules import no React components, CSS, browser storage, or backend
clients. A new design can keep the same hooks and deterministic functions:

```tsx
const box = useBrickBox();
const ideas = useBuildIdeas(box.collection);
ideas.ideas;                          // [{ model, match, saved }]
ideas.setOnlyMyBricks(true);          // Only currently available builds
box.setQuantity(setId, 2);
box.toggleSet(setId);                 // Protect / release all copies
box.adjustLoose(partColorKey, 1);
box.toggleWish(modelId);
box.saveCreation(modelId, true);      // Guarded by availability
box.toggleCreation(creationId);       // Reserve / release its inventory
```

`selectIdeas`, `availablePieces`, `matchInventory`, `recommendSets`, and
`protectedSources` also work outside React. Gallery cards and chat both respect
strict filtering. Chat is scripted, not an LLM or a live OMR search.

## Inventory contract and the deliberate shortcut

- Keys are `Rebrickable part number:Rebrickable colour ID`. Quantities must match
  exactly. No LDraw-to-Rebrickable colour or assembly equivalence is assumed.
- A model uses its **entire source set's version-1 retail inventory**, excluding
  spares. This is a conservative requirement that can overstate what alternate
  builds need. Castle Dragon uses
  an explicitly checked eight-piece assembly inventory (`inventoryBasis = "model"`).
  `source.inventoryBasis = "source-set"` makes that limitation explicit.
- Keeping a creation built reserves that whole inventory. Completing a model
  requires its current availability; remixing releases the reservation.
- All set cards, the add-set picker, matching and recommendations share one
  catalogue. There are no visual-only sets that disappear on reload.
- Suggestions evaluate one or two real catalogue sets. Pairs must improve on
  either single. Complete options take priority when available. No live price,
  stock, or purchase integration is claimed.
- Shop visits and wishlist changes do not add ownership. The explicit “Found
  these pieces at home” action adds only the current deficit.
- The existing storage key `brick-kit:brick-box:v1` is preserved. `legacyModels`
  retains old saved creations and their original reservations, but those recipes
  do not appear in the gallery. Existing collections are not reset or silently
  given new sets. A fresh browser gets a sample box; replacing a collection with
  that sample requires the existing confirmation UI.
- Browse mode starts with all real builds visible. “Use my bricks” enables
  strict filtering; models needing more pieces have explicit deficit badges.

## Geometry, previews and instructions

The importer caches the original MPDs and renders transparent 1000×800 PNGs with
LeoCAD. Every model retains author/licence headers and an OMR source link.
`public/demo/omr/SOURCES.md` and the adjacent licence files document redistribution.
Castle Dragon adds a root selecting the original Dragon Wagon assembly, retaining
all original submodels and headers. Other files keep the original model content.

The optional `model-scene.tsx` loads the real MPD with Three.js's LDraw loader and
conditional-line material. It normalizes embedded Windows subpart headers in
memory (`lib/ldraw.ts`) and fits the actual geometry to the camera. It needs an
LDraw parts library, served by `/ldraw/...`; previews remain available if 3D fails.
Set `LDRAW_DIR` to your local library. This machine already has one configured.

No invented progressive pictures or assembly instructions are attached to OMR
models. The builder links to LEGO's official instructions lookup, lets the child
inspect the model in 3D, and preserves the completion / keep-built / remix flow.
Some old booklets may be unavailable. Time estimates are approximate and some
models need adult help; they are not official age ratings. The legacy guide and
old SVGs remain only to support previously saved prototype creations.

## Import another real build

1. Choose a real model/variant on https://library.ldraw.org/omr/sets and add its
   observed source/download URLs to `scripts/omr-models.json`.
2. Download Rebrickable's `sets.csv.gz`, `inventories.csv.gz`,
   `inventory_parts.csv.gz`, `parts.csv.gz`, and `colors.csv.gz` into a local data
   directory. Bulk datasets and credentials are not committed.
3. From `brick-linkfrontend`, run:

   ```bash
   python3 scripts/prepare-omr.py --data-dir /path/to/csvs --ldraw /path/to/ldraw
   ```

4. Inspect the render/camera and source model. Review source inventory and
   licensing. A new import automatically feeds the gallery, chat choices, set
   picker and recommendations. Use `--cache` to reuse downloads; remove just a
   model's generated PNG when intentionally changing its camera.
5. Run `npm run test:demo` and `npx tsc --noEmit --incremental false`.

`prepare-demo.py` is the archived original illustrative recipe generator and
refuses to overwrite the OMR catalogue. Do not use it to add new homepage builds.

## Local verification

`npm run dev -- --hostname 127.0.0.1` runs the homepage. The API is only needed for
`/explore`; start it from the repository root with `LDRAW_PATH=/path/to/ldraw
python3 -m src.main`. The live explorer's availability also depends on OMR and
the configured model provider.

Engine tests cover source/asset integrity, retail inventory agreement, exact
colour gaps, strict mode, protected sets and creations, pair recommendations,
catalogue-derived chat, old/new storage compatibility and embedded MPD paths.
Browser QA covers real previews, categories, 3D, adding a real set, reload,
strict filtering, parent suggestions, completion/reservation/remix, chat, and a
narrow viewport. Generated outputs from the live Python app are excluded from
the implementation commits.
