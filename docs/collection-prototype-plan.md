# Brick Kit: collection-aware prototype

Audience: children aged 5–7, with a grown-up helping manage sets and shopping.
Purpose: a design challenge prototype. This document specifies proposed work; the new flows are not implemented yet.

## Product promise

“Find something wonderful to make with the bricks in your box.”

Make the inventory and its effect on results believable. Curate the models, recommendations, and shopping destinations. A small library whose state changes consistently will demonstrate the idea better than an unrestricted prompt that sometimes returns the wrong model.

The main child-facing choices are **My brick box**, **What shall we make?**, and **Use my bricks**. Avoid exposing terms such as inventory, strict mode, part IDs, or optimization.

## The experience

1. **Start making.** Show three large picture choices: vehicles, animals, and space. A text prompt remains available for a grown-up. Offer “Try a brick box” so cataloguing is not a prerequisite to seeing the product.
2. **My brick box.** Sets appear as large box-art tiles, with a clear selected state. A grown-up can search a small supported catalogue by set name or number, and increase set quantity. Selecting a set adds its pieces automatically.
3. **Extra pieces.** A second tab shows a deliberately small picture catalogue of supported shapes. Choose shape, colour, and quantity with large plus/minus controls. Label these as extra pieces, so the same bricks are not counted both as a set and as loose pieces.
4. **Available bricks.** Each owned set has a simple “Keep this built” choice. A kept-built set stays in the collection but contributes no available pieces. For the prototype, reserve entire sets rather than implementing arbitrary partial reservations.
5. **Results.** Show at most three clear choices, with a large preview, a short name, and either “Ready to build” or “Need 4 pieces.” Use my bricks is on by default and shows only complete matches. Turning it off exposes a few curated larger or more detailed ideas.
6. **Make it.** Ready builds open the existing 3D viewer with large next/back step buttons, the current pieces to find, and optional adult PDF download. Start with small models and a handful of clear, manually checked steps. The current PDF workflow is an adult fallback, not the main experience for early readers.
7. **Dreams.** A model needing pieces offers “Save for later” and “Show a grown-up.” Always keep an immediately buildable choice visible when one exists. A dream model is previewable but is not labelled ready.
8. **Grown-up view.** Compare “Just the missing pieces” with “A set that helps.” Include a second set only when the first still leaves gaps. Show exactly which gaps each suggestion fills and any remaining pieces. Link to checked product/catalogue pages; do not imply a filled cart or available stock. Opening a shop never changes ownership.

Prefer positive, readable choices over long explanations. The constrained build should feel intentional and appealing. Buying more must not be presented as the only way to get a good result.

## What to curate and what to calculate

| Element | Prototype implementation |
| --- | --- |
| Sets | 6–10 real sets selected to support the demo, with cached thumbnails and checked inventories |
| Loose pieces | 12–20 visual part/colour entries, including all pieces needed for the demo's missing-piece moment |
| Models | 6–9 checked blueprints across three prompt families, including small complete matches and near matches |
| Input | Picture choices plus keyword aliases into those families; unmatched prompts offer nearby choices honestly |
| Collection | Real local state persisted in localStorage, with a deliberate reset-to-sample action |
| Buildability | Real quantity subtraction in the browser, keyed by normalized part and colour |
| Recommendations | Curated candidate parts and donor sets; calculate the gaps each candidate actually fills |
| 3D and instructions | Local MPD files and pre-rendered, checked instruction assets |
| Shopping | Checked external links from a grown-up view; no live checkout or stock promises |
| AI | Optional wording or family classification later; the challenge demo requires no runtime AI call |

This does not require a new backend or database. Keep the existing live retrieval path available as a separate exploration feature, but use the curated catalogue for the collection-aware demo. An unknown live result must not inherit a “Ready” badge without a checked inventory.

## Build the demo backwards from the models

1. Choose the hero models first. Prefer small, recognizable builds made from common pieces. Avoid giant display sets and models dependent on rare printed parts.
2. Keep their original source, author, and per-file licence information. OMR contains models of official sets; looking one up is retrieval, not evidence of novel generation.
3. Generate a bill of materials once, then manually normalize it into the demo catalogue. Compare that list with the actual model. Do not build a general LDraw-to-retail-parts converter for this challenge.
4. Select real donor sets whose inventories make the desired demonstration possible. Cache a small snapshot of those inventories. If no real set fits the story, change the story or hero model rather than attach a fictional inventory to a real set.
5. Define a starter collection that can make an attractive small build and is a few clearly identifiable pieces short of a dream build. Verify this using the same calculation that drives the UI.
6. Prepare a loose-piece action that closes that exact gap, and a checked donor-set recommendation that closes it too. A larger-dream branch can demonstrate a two-set recommendation when necessary.
7. Pre-render images and instructions. The presentation should not depend on external search selectors, API credentials, or LeoCAD completing during judging.

OMR is particularly useful because one MPD can contain several named submodels. Some are recognizable vehicles or characters; others are assemblies or geometry, so extraction needs visual review. The existing local spaceship file contains a `kitty.ldr` submodel that is worth inspecting as a potential animal asset. It is a candidate, not yet a verified independent build. Official alternative models are another useful source when available. Small authored recolourings or variants can broaden the library, but every rendered variant must have its own matching inventory and instructions.

## The small amount of logic worth implementing

Use one canonical part/colour key inside the demo. Store explicit mappings to LDraw and store identifiers only for the curated items. These identifier systems are not interchangeable.

```text
available[part, colour] =
  sum(available set quantity × that set's piece quantity)
  + extra loose pieces

missing[part, colour] = max(required - available, 0)
ready = every missing quantity is zero
```

The primary badge follows the missing quantity, not a rounded percentage. Being 99% complete does not make a build possible when the missing item is an axle.

For a recommended set or set pair:

```text
new gaps = max(required - available - candidate inventories, 0)
```

Only say “Unlocks this build” when every new gap is zero. Otherwise show the remaining gaps. Enumerate singles and pairs from the tiny donor catalogue; no complex optimization is needed. If price is unavailable, use a curated ranking or number of pieces supplied and avoid a “cheapest” claim. Rebrickable's API does not supply store pricing.

Treat colour flexibility separately from missing-piece tolerance. A possible later control is “Any colour is okay,” backed by a prevalidated recoloured model. Do not simply ignore colours in the matcher while leaving an impossible colour scheme in the preview. Different shapes also remain different parts unless a substitution is explicitly curated.

Store sets and loose extras as the sources of truth; derive the available inventory and results from them. Do not hardcode independent badge percentages, missing-piece labels, and recommendation outcomes.

## A convincing presentation sequence

The numbers below describe a target fixture, not the contents of a particular LEGO set. Final counts must come from the chosen checked assets.

1. Open the sample brick box. Show two owned sets and a handful of extra pieces.
2. Pick the car picture with Use my bricks on. An attractive small car is ready.
3. Turn off Use my bricks. A more elaborate car appears, needing four wheels. Highlight the exact missing pieces and optionally their locations in the model.
4. Show a grown-up. Compare four individual wheels with a preselected real donor set. Explain that the set also supplies parts for additional checked catalogue builds.
5. Return to My brick box and add four loose wheels, as pieces already owned. The dream build immediately becomes ready. This is the main demonstration of the product's intelligence.
6. Open the model, advance through a few clear steps, and reach the finished-build celebration.

A second optional branch can show a kept-built set being excluded, then made available again. Reversibility makes the demo feel like a product rather than a slideshow.

## Boundaries to preserve

- Empty collection: offer the sample box and a first-set action; do not show arbitrary builds as owned-piece matches.
- An unfamiliar set: say it is outside this demo catalogue. Do not assign a random inventory.
- Unsupported prompt: show picture choices or explicitly labelled closest matches; a spaceship prompt must not silently become a race car.
- Missing pieces: never mark the model ready until quantities and supported colour rules pass.
- Repeated sets: multiply inventory by the owned quantity.
- Loose pieces: represent extras, not a second count of the selected sets' contents.
- Keep built: exclude the set's pieces from availability without deleting the set from ownership.
- Shop links and wishlists: do not add anything to the owned collection.
- Physical construction: a matching inventory is necessary, but model and step quality still require manual review. Rendered geometry alone is not proof that an authored modification is structurally buildable.
- Source data: check printed-part, minifigure/assembly, spare-piece, and colour mappings for the curated fixtures. A LDraw reference count can differ from a retail inventory count.

## Suggested project shape

```text
brick-linkfrontend/lib/demo/catalog.ts       # checked sets, parts, models, mappings, sources
brick-linkfrontend/lib/demo/inventory.ts     # availability and missing quantities
brick-linkfrontend/lib/demo/recommend.ts     # score curated donor sets and pairs
brick-linkfrontend/hooks/use-brick-box.ts    # persisted collection and availability choices
brick-linkfrontend/components/brick-box/     # set and extra-piece picker
brick-linkfrontend/components/build-ideas/   # picture prompts and result choices
brick-linkfrontend/components/grown-up/      # missing pieces and shopping handoff
brick-linkfrontend/public/demo/              # local previews, MPDs, steps, PDFs
```

Keep the catalogue, matcher, and visual components separate. That permits a future backend to replace the data source without changing the child's core journey. This is a proposed structure, not an implementation already in the repository.

First implementation priority: one polished collection → buildable result → near match → add missing pieces → build journey. Expand the catalogue only after that journey behaves consistently. No accounts, scanning, unrestricted piece recognition, live pricing, or arbitrary 3D generation are required for the challenge.

## Source checks

- OMR specification: models of official sets, MPD packaging, named submodels, possible substitutions, and author/licence headers. <https://library.ldraw.org/documentation/official-model-repository-omr-standards/official-model-repository-omr-specification>
- Rebrickable v3 API: official set/part inventories, external identifiers, authenticated API access, limits, and lack of pricing/general MOC inventory support. Use a small prepared snapshot rather than a live dependency. <https://rebrickable.com/api/v3/docs/>
- LDraw format: type-1 references, nested subfiles, inherited colour 16, and STEP metadata. These explain why naive line-counting is not a reliable general inventory conversion. <https://www.ldraw.org/article/218.html>
- BrickLink: parts lists can be represented as Wanted List XML. An export is an optional grown-up feature; automatically creating a live list or cart is outside the prototype. <https://www.bricklink.com/help.asp?helpID=207&viewType=shop>
