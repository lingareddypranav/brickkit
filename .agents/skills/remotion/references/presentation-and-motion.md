# Presentation and motion for real product footage

Use this when styling a walkthrough, creating a launch/page variant, adding requested sound, or investigating flicker. Keep actual product capture as the source of behavior. The supplied product-demo notes came from another project's recreated-UI pipeline; its filenames, commands, timings and bug workarounds are not dependencies of this repo.

## Decide the destination from context

A narrated walkthrough follows the user's script/audio. A launch edit needs a clear product promise and a finished payoff. A looping page clip needs a readable muted flow and a non-jarring seam. These are different editorial jobs, not fixed duration/aspect presets. The user's requested long film is not subject to a generic 60/90-second ceiling.

For an unscripted tour, read both the landing page and app. The site explains promises and emphasis; the app establishes real screens, actions and copy. Choose a through-line that survives cuts, such as one request and the creation it produces. Follow an existing user-supplied script rather than replacing it with marketing section order. State consequential assumptions briefly; ask only for information genuinely missing from the context.

Show the useful beat plan for a new edit before substantial rendering, then continue within the authorized scope. Do not introduce a mandatory confirmation gate for a settled script or a narrow reshoot. Do not ask a fresh questionnaire about decisions the user already made.

## One beat schedule drives the edit

Record events in composition frames alongside narration cues: focus, character run, full-text hold, pointer arrival, click, observed result, payoff hold and cut. Derive source trims, cursor keys, callouts and any sound from those events where practical. Avoid separately guessing when the state changes and when the pointer clicks.

Length follows actions plus reading time. A generic 100-frame action budget cannot substitute for the time needed to type and read the actual prompt. Where narration exists, its cues win over generic motion presets. Reserve roughly 2–3 seconds for the finished result as a starting point, adjusted for the narration; do not end at the instant the last button is pressed.

Pointer example at 30 fps, with already-measured coordinates:

```text
frame 90:  arrive at the real button centre
frame 94:  click starts; product response may begin after this
frame 102: same pointer coordinates; press/follow-through has finished
frame 122: reach the next target
```

The repeated position at frame 102 prevents interpolation from moving the pointer away while it is apparently pressing. Scale holds by fps and the actual press animation; do not copy the example's frame numbers into unrelated scenes.

## Motion and typography without changing the product

Spend attention on one focal beat per phase. Keep editorial callouts subordinate to the actual input/result. Use small, purposeful travel and restrained settling; avoid making every element bounce. Use frame-based motion helpers shared by similar editorial elements where useful.

Retain the real app's counts, native transitions, typography, colors and grouping. Instructions such as “counters count” or “stagger every arrival” from a reconstructed-UI kit do not justify changing recorded product behavior. A source-faithful animated recreation is a separate mode requiring user intent and explicit disclosure; it is not the default recording fallback.

For title/caption graphics, take palette and typography from the relevant product surface, which may differ between landing page and app. Load the actual available font asset explicitly and verify it rendered; a CSS font name alone does not supply a missing font. Keep text metrics stable while animating: change position/mask/opacity as appropriate, rather than continuously changing font size or weight and reflowing the line.

A short word-level reveal can suit a title. Per-letter animation on a long headline delays reading and can break kerning. Use titles when they help the intended edit; do not add an intro/outro to every chapter when the user is placing that footage beneath human narration.

Avoid a continuous slow scale on text-heavy UI if the encoded letters shimmer. Prefer a static readable framing, an intentional cut or focus on a model/video region. A closer view still needs enough context and source resolution to prove the interaction.

## Transitions and loops

Hard cuts are often appropriate between real app states. For a dissolve, keep the outgoing state fully present underneath an incoming phase that has its own complete background. Fading both to half-opacity exposes the stage and creates an unintended brightness dip. Transparent holes in a phase can reveal old panels until they abruptly disappear on unmount.

Keep the finished state mounted through its hold. Freeze or trim outgoing footage deliberately; do not accidentally show two independently moving copies of the same screen. Match title/scene backgrounds to the product's actual surface to avoid a white/dark flash.

For a page loop, inspect repeated playback across the last-to-first frame. Match opening/ending luminance and state, or design a deliberate reset. The matching ground can be light or dark according to this product; dark is not a universal requirement. A standalone narrated film need not loop.

Use source frame rates/timestamps correctly. Convert different source/output frame rates with intentional, time-preserving playback; do not invent a manual alternating-frame pattern or stretch the footage by treating frame counts as seconds.

## Review visual fidelity as well as technical validity

Before a full render, inspect frames at each event and shortly after it: pointer arrival, press, state change, panel entrance and maximum zoom. Compare against an unmodified capture of that actual product state: same labels, quantities, ordering, grouping, theme and payoff model. If deliberately cropping, keep the relevant evidence and avoid implying the excluded content does not exist.

Then watch the representative encoded sample at 1×. Stills expose missed targets and clipped panels; motion exposes pointer drift, rushed typing, shimmer, flicker and awkward holds. The export checker validates neither product fidelity nor editorial quality.

When flicker, texture tiling or flashing appears, preserve the previous good export and inspect source/rendered frames before blaming the encoder. Reduce render concurrency to 1 as a diagnostic when the problem points to frame capture; compare the same troublesome segment. Do not impose a single-worker requirement on every job based on an unverified bug from another pipeline. Keep the correction that actually resolves the observed defect.

Use versioned or atomic output replacement so the preview does not serve a half-written MP4. When replacing a served video, refresh/version its poster as well as its video URL; verify that the preview is showing the new file. Do not weaken an automated check to get a failing render through.

## Requested sound is a separate editorial pass

For footage intended under the user's narration, keep it silent unless sound is requested. Page autoplay variants should remain muted; an additional version can carry audio when desired. Keep the silent original and the narration intact.

Score discrete events sparingly: typing, a click, a state confirmation, a screen change. A continuously changing counter is not a reason for an effect on every frame, and a whoosh on every element arrival makes all actions sound alike. Respect the actual event schedule and dialogue intelligibility. Use appropriate licensed assets rather than assuming another kit's sound files exist here.

After audio muxing, verify duration, audio presence and video timing again. Preserving the video stream can avoid a new picture render, but does not remove the need to check the final delivered file.
