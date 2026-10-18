# Blueprint demo preparation

## Picture instructions that are ready now

Open a model marked **Picture instructions ready**, then choose **View instructions**
(or **Let's build** when the collection has the pieces). Every picture, piece
thumbnail and printable PDF booklet is bundled with the frontend. Choose **Open PDF
booklet** inside the guide to read or print the book. These guides do not call the Python API,
search OMR, generate images, or depend on an external instruction website at runtime.

| Model ID | Build | Steps | Construction order |
| --- | --- | ---: | --- |
| `dragon-friend` | Castle Dragon | 7 | Curated assembly of the eight source pieces |
| `green-dinosaur` | Green Dinosaur | 11 | Curated groups using every original placement once |
| `mini-shuttle` | Mini Space Shuttle | 29 | Original OMR step order |
| `space-transport` | Space Transport | 13 | Original OMR step order, including nested assemblies |

The dragon has red wings and a flame piece. The dinosaur and spaceships are separate
builds. **We have not verified that this dinosaur fits on either spaceship.** Select
and physically fit-test the carrier before promising that story beat in the video.
The siblings are characters in the film; they do not require app profiles or sharing.

Kids can inspect the whole guide without owning the pieces. **I made it!** appears
on the last step and requires available inventory. **Keep it built** retains the
existing reservation behavior. The remaining gallery models keep their external
instruction lookup; they are not labelled as having a prepared picture guide.

## Rebuild or add a guide

The independent guide contract and lookup live in
`brick-linkfrontend/lib/demo/instructions.ts`. Its data is generated in
`instructions-data.json`. Presentation lives in `picture-instructions.tsx` and
`build-guide.tsx`; replacing those components does not change the assets or collection
rules. The catalogue generator does not overwrite the separate instruction index.

After refreshing the OMR models, run from the repository root:

```sh
python3 brick-linkfrontend/scripts/prepare-instructions.py --ldraw "$LDRAW_PATH"
python3 -B brick-linkfrontend/scripts/test-instructions.py
npm --prefix brick-linkfrontend run test:demo
```

Requires LeoCAD, Pillow and ReportLab on the preparation machine, none in the deployed
app. The command also rebuilds the PDFs. To reformat existing diagrams without
re-rendering in LeoCAD, run `python3 brick-linkfrontend/scripts/prepare-instruction-pdfs.py`.
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
Source inventories still use the documented conservative source-set counts except
the checked eight-piece dragon assembly.

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
