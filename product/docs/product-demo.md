# Blueprint demo preparation

## Instructions that are ready now

The dragon demo now uses **Red Dragon (31145)** and **Fire Dragon (31102)**.
Both build the body, head and wings from separate bricks. Their original LEGO
booklets have been checked at the opening construction pages: both start with
ordinary small pieces. The first PDF for each set is the dragon; the other PDFs
are alternate models and are deliberately not selected.

| Model ID | Build | Instructions | Availability |
| --- | --- | --- | --- |
| `brick-dragon` | Red Dragon | Original 68-page LEGO booklet, ages 6+ | Direct LEGO CDN link |
| `fire-dragon` | Fire Dragon | Original 56-page LEGO booklet, ages 7+ | Direct LEGO CDN link |
| `green-dinosaur` | Green Dinosaur | 11 cached picture steps and PDF | Bundled with frontend |
| `mini-shuttle` | Mini Space Shuttle | 29 cached OMR picture steps and PDF | Bundled with frontend |
| `shuttle-explorer` | Space Shuttle Explorer | 33 cached OMR picture steps and PDF | Bundled with frontend |
| `space-transport` | Space Transport | 13 cached OMR picture steps and PDF | Bundled with frontend |

Open a prepared model, choose **View instructions**, then **Open building booklet**
for the dragons or step through the cached diagrams for the other builds.
The original dragon PDFs require internet access. They are linked from LEGO,
not redistributed or relabelled as our generated booklets. There is no downloaded
CAD model for these two replacements and no 3D-spin button is offered for them.

The eight-piece molded-body Castle Dragon and Dragon Wagon have been removed
from suggestions. Their IDs and inventories remain in legacy data solely to keep
existing saved creations and reservations intact. The misleading seven-step dragon
guide and PDF have been withdrawn. They must not be used in the demo.

The dinosaur and spaceships are separate builds. **We have not verified that this
dinosaur fits on either spaceship.** Physically fit-test the carrier before filming
that story beat. The siblings are film characters, not app profiles or sharing.

Kids can view instructions without owning every piece. Saving a creation still
requires available inventory; **Keep it built** retains the reservation behavior.
For original booklets the app does not track the child's position inside the PDF.

## Rebuild or add a guide

The independent guide contract and lookup live in
`product/brick-linkfrontend/lib/demo/instructions.ts`. Its data is generated in
`instructions-data.json`. Presentation lives in `picture-instructions.tsx` and
`build-guide.tsx`; replacing those components does not change the assets or collection
rules. The catalogue generator does not overwrite the separate instruction index.

Refresh booklet-backed catalogue entries with:

```sh
python3 product/brick-linkfrontend/scripts/prepare-booklet-models.py --data-dir /path/to/rebrickable-csvs --cache /private/tmp/brickkit-booklets
```

This checks the original PDF's SHA-256 in a private cache and imports real retail
inventories. `scripts/booklet-models.json` records the reviewed source URLs,
hashes, page counts and age recommendations. The common instruction contract is
a discriminated union of `pictures` and `booklet`, independent of presentation.

After refreshing the OMR models, run from the repository root:

```sh
python3 product/brick-linkfrontend/scripts/prepare-instructions.py --ldraw "$LDRAW_PATH"
python3 -B product/brick-linkfrontend/scripts/test-instructions.py
npm --prefix product/brick-linkfrontend run test:demo
```

Requires LeoCAD, Pillow and ReportLab on the preparation machine, none in the deployed
app. The command also rebuilds the PDFs. To reformat existing diagrams without
re-rendering in LeoCAD, run `python3 product/brick-linkfrontend/scripts/prepare-instruction-pdfs.py`.
Pass `--leocad` if the executable is outside the default macOS application path.
The script caches assets by model, retains credits/licences and embedded definitions,
and checks curated placement coverage. It flattens nested model transforms and
inherited colours while retaining STEP/ROTSTEP boundaries. Rotation instructions
are presented from a fixed camera; these are picture guides, not official LEGO
booklets. Check assembly visibility and order before adding another model to the
demo list, especially subassemblies and mirrored connections.

Tests check transforms, colour inheritance, curated piece coverage, original-source
hashes, local assets and distinct step pictures. After refreshing source models,
the hash check deliberately fails until matching guide assets are regenerated.
Active builds use conservative source-set counts. The retired eight-piece dragon
inventory remains only for saved-creation compatibility.

## Agent-assisted product video workflow

Reviewed on 2026-10-17: Remotion's official
[Agent Skills](https://www.remotion.dev/docs/ai/skills) and
[skill repository](https://github.com/remotion-dev/skills).
The useful skills for this challenge are:

- `remotion-create`: scaffold a separate video project and compose scenes.
- `remotion-markup`: frame-driven animation, image/video/audio assets and timing.
- `remotion-captions`: speech captions/subtitles.
- `remotion-studio`: editable browser preview for review.
- `remotion-render`: reproducible video/still exports.

The official installer is `npx skills add remotion-dev/skills`. These skills have
been read for planning; no global skill installation or video dependency has been
added to the product app. When video work starts, scaffold a sibling `demo-video/`
project and add the official skills there. Keep its dependencies and asset copies
separate from Next.js.

Use two stages:

1. **Capture actual app states.** Drive the browser through collection, a spaceship
   request, inventory match, picture steps, keep-built, and optional missing-piece
   shopping. Save screenshots/clips at stable states after loading completes. Use a
   dedicated demo collection and freeze it before capture. Do not fake successful
   inventory states in a composited screenshot.
2. **Compose and edit with Remotion.** Import those captures, filmed sibling footage,
   model PNGs and narration as local assets. Sequence the scenes, add camera crops,
   pointer/callout overlays, titles and captions. Review in Studio and export after
   approval. Remotion animates/edits the captures; browser control performs the real
   app interactions.

Remotion's current guidance uses `useCurrentFrame()` plus `interpolate()` for
animation, `useVideoConfig().fps` for time conversion, and `staticFile()` for bundled
assets. CSS transitions and animations are not reliable video timing. Give scenes
separate authored JSX nodes so Studio can edit each independently. Preview the
composition before exporting; inspect key frames, clipped text and audio sync.

Suggested five-minute structure (300 seconds):

| Time | Scene | Evidence/assets |
| --- | --- | --- |
| 0:00-0:35 | Siblings: flying fire-breathing dragon versus dinosaur | Filmed play and imagination sequence |
| 0:35-1:00 | New idea: the dinosaur needs a spaceship | Story setup; fit-tested carrier required |
| 1:00-1:30 | Founders and the problem | Camera/narration; imagination from existing bricks |
| 1:30-2:10 | Show the collection and protected builds | Actual collection UI; explain keep-built briefly |
| 2:10-2:55 | Request a spaceship using available bricks | Actual chat and inventory-backed result |
| 2:55-3:35 | Follow picture instructions and save the creation | Prepared guide, next/back and keep-built |
| 3:35-4:05 | Optional bigger idea and shopping | Real retail sets supplement existing inventory |
| 4:05-4:40 | Why we built it; business model and creative freedom | Founders/narration; blueprint as a starting point |
| 4:40-5:00 | Return to play with the new spaceship | Sibling footage and closing line |

This is a proposed production plan. No demo video has been filmed, composed or
rendered yet. OMR-backed builds stand in for AI output in the prototype; retail
recommendations remain real purchasable sets. Do not imply general generation,
automatic fit verification, or working retailer checkout in the challenge demo.

Useful official references:
[coding-agent workflow](https://www.remotion.dev/docs/ai/coding-agents),
[composition registration](https://www.remotion.dev/docs/composition),
[CLI render](https://www.remotion.dev/docs/cli/render).
