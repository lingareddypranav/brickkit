---
name: remotion
description: Record and edit real Blueprint product walkthroughs with Remotion, including visible typing, narration-based timing, continuous product flows, and verified MP4 exports. Use when asked to use the repo's Remotion skill, record a product demo, or revise walkthrough footage; not for unrelated product UI changes.
---

# Remotion product walkthroughs

Make footage that proves the narrated product behavior and is easy to edit into the user's film. A screenshot montage with a moving pointer does not by itself demonstrate typing or a continuous interaction.

## Establish the recording contract

- Read the current script and scene range. Group connected actions into natural journeys; do not automatically make one clip per sentence or reuse the previous seven-chapter split.
- Establish whether this is a narrated walkthrough, a launch edit or a looping page clip from the request/context. For a new unscripted tour, compare the landing-page promises with the actual app; use the user's brief as the authority. Do not infer the story from sidebar order alone. A reshoot with an agreed flow does not need a new briefing/approval cycle.
- Record the source branch/commit and relevant dirty files. If asked for the latest push, fetch and inspect the intended branch before capture. Preserve unrelated work. Verify the running app was built from that source.
- Inspect `demo-video/` and `product/brick-linkfrontend/`. Derive commands, Node requirements, asset paths and ports from the current checkout. Do not freeze the previous commit, inventory, viewport or duration into a new demo.
- Treat **1920×1080** as the minimum delivery resolution for every exported MP4 (master, chapters, samples and looping variants). Capture and compose at native **1920×1080** unless the user explicitly requests a higher resolution; never ship below **1920×1080** by upscaling, padding or stretching.
- Write a shot plan: script cue, narration start/end, visible starting state, action, visible outcome, source asset and chapter. Time to actual narration audio when supplied. With text only, state that timings are provisional; do not call them synchronized.
- Prepare a separate demo origin/profile/collection. Keep ownership, filters, locked creations and counts consistent across connected shots without disturbing the user's normal app state.

## Capture interactions, not just endpoints

Read [references/capture.md](references/capture.md) before browser work. Use the browser/recording interfaces permitted in the current environment; this skill does not authorize a different automation channel.

1. Prove the capture method with a **3–5 second** test containing changing pixels and typing. Inspect its file. A successful API call or many identical screenshots is not evidence of usable motion. Bound troubleshooting instead of repeatedly retrying an unsupported recorder.
2. Prefer real video for continuous typing, scrolling, transitions, celebrations and 3D interaction. Remotion edits that source. If only screenshots are available, disclose the fallback and capture actual intermediate states. For an explicit continuous-recording requirement, do not silently substitute a montage.
3. Featured text entry must show **empty/focused input → progressive character entry → readable completed text → submission → result**. Two snapshots of a partial and completed prompt do not meet this bar.
4. Preserve causality: **before state → pointer reaches the real control → click → changed state → readable hold**. A toggle cannot change before its click. Capture separate intermediate states for separate toggles or increments.
5. Measure pointer coordinates in the current full-resolution screen/DOM and record them with the capture. Never guess from a contact sheet or borrow coordinates from another scroll position, modal or viewport.

## Time and compose deliberately

Read [references/editing-and-verification.md](references/editing-and-verification.md) for timing, framing, export and known runtime pitfalls.

- Narration cues govern timing. Budget typing, pointer travel and reading holds. If the flow cannot fit, shorten an appropriate prompt, find a natural split or revise provisional timing; do not rush it to satisfy an arbitrary old timestamp.
- Keep connected flows together. Trim dead time and use deliberate time jumps, such as early instruction steps to the final step. Avoid repeated resets or retyping merely to fill narration.
- Keep input text, control labels, instructions and the claim's evidence in frame. Check zoom endpoints. Upscaling a small capture does not make it native 1080p detail and does not satisfy the minimum resolution rule.
- Set Remotion composition and render output to at least **1920×1080**. Letterbox or crop when source aspect differs; do not stretch. Higher-resolution masters are allowed when requested; downscale only with an explicit editorial reason, never below **1920×1080**.
- Keep the pointer stationary through the press and its brief follow-through; use repeated position keys before moving to the next target. Arriving on the right coordinate is not enough if interpolation carries it away during the click.
- Make editable chapters separate authored Remotion timeline/composition entries. Use deterministic frame-based animation and supported installed APIs. Keep source playback/typing timing independent of eased camera movement.
- Existing `demo-video/src/Walkthrough.tsx` and the export script are material to inspect, **not a quality-approved template**: the first edit had sparse typing captures, guessed coordinates and provisional timing. Reuse structure only after checking it against this workflow.
- Render and watch a representative short journey at **1×** before the full export. Include typing, a click, its outcome and a zoom. Fix systemic issues there; an unrelated successful still is insufficient.

For editorial motion, titles, looping variants, sound or flicker troubleshooting, read [references/presentation-and-motion.md](references/presentation-and-motion.md). Its guidance applies to the edit and editorial graphics; it is not permission to invent or reanimate the product's UI behavior.

## Deliver verified files

- Run applicable lint/type checks. Export a master and the requested grouped clips with a scene/cue timing map. Preserve supplied narration; otherwise label the footage silent.
- Watch encoded typing and key actions at 1×, not only contact sheets. Inspect cuts, chapter boundaries, first/last frames, labels at maximum zoom, and real PDF/build content.
- Run [scripts/check_video.py](scripts/check_video.py) on the master and each chapter with the **planned** duration/fps. It checks decoded frames, **minimum** width/height (default **1920×1080**), cadence and the requested audio state. It cannot judge pacing or replace watching. Reject any export narrower than 1920 or shorter than 1080.
- Reject non-monotonic timestamp warnings, duration drift, unintended blank/loading frames, incorrect typing or outcomes preceding clicks. Fix and re-check the **final packaged files**, not earlier drafts.
- Open the final MP4/gallery and verify playback. Provide working absolute file links and the local preview URL when useful. Distinguish rendering drafts from finished exports; include editable source and physical-footage edit points.

## Blueprint-specific truthfulness

Show capabilities present in the chosen checkout. Curated models stand in for generated ideas; ownership and locking must match the app's calculations. Show the actual prepared guide/PDF for the chosen model. Do not imply an arbitrary dinosaur-carrying spaceship, geometry editor or sibling accounts exists without verifying it.

Keep optional shopping footage on Blueprint's missing-parts/retail-set recommendation screen. Reading a store link's destination is enough to verify the handoff; opening an external shop is not part of the default recording. For creative remix/play scenes, use supplied physical footage or mark product coverage as an edit point. Do not manufacture a physical result or unsupported feature to fill a shot.
