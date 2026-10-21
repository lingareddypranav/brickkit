# Timing, framing and exports

## Match the current narration

When narration is supplied, listen and place markers at the phrases introducing the action and explaining its outcome. Preserve pauses and speaker changes. Show evidence while its claim is spoken. Do not use a word-count estimate instead of the actual performance.

With text only, roughly 125–150 words/minute is a starting estimate, not final timing. Also budget actual typing, travel, reading holds and state changes. Say where time zero begins, especially if a live-action opening comes first. Keep timings provisional until the spoken track exists.

Use a compact plan:

| Cue | Visible action/proof | Planned timing | Source | Status |
| --- | --- | --- | --- | --- |
| “Ask for a spaceship” | Empty input → all typed characters → readable prompt | Allow actual typing time | Take in/out or prefix sequence | Captured / reviewed |
| “Use my bricks” | Click switch → selected state | At the spoken cue | Before/click/after | Captured / reviewed |
| “No new brick” | Ready result from current available inventory | Readable outcome hold | Actual result | Captured / reviewed |

Sum shot frame lengths and start the next chapter on the following frame. Distinguish narration timing from source-video in/out points. Do not hardcode the previous film's 221 seconds or chapter count into a new job.

## Camera versus source clock

Use camera movement to direct attention while preserving evidence. Derive placement from source dimensions and the relevant content bounds. Check endpoints, not just starts. Keeping the image inside the canvas does **not** keep its headings visible: the earlier edit clipped creation titles and the first letters of “Space Shuttle Explorer.”

Letterbox or intentionally crop different aspect ratios; never stretch screens. Avoid extreme zoom into small screenshots. Do not transition through a loading model/empty canvas. Re-measure pointer coordinates when camera/viewport/scroll context changes.

Source playback should be linear unless intentionally retimed. Easing the camera is fine; selecting source frames with that eased progress creates unwanted slow/fast playback and uneven typing. Keep source time separate, using acquisition timestamps for irregular frame sequences.

Make independently editable chapters explicit authored composition/timeline entries, reusing capture/cursor components. Check installed APIs before copying a newer Remotion example. Use deterministic frame/fps-based animation rather than CSS/wall-clock animation, random state or live network dependencies in the final render.

## Sample before the full render

Render an 8–15 second representative journey with the final capture method/resolution. Include progressive typing, full-text reading time, accurate pointer placement, a click followed by its result and the most aggressive camera framing. Watch it at **1×**.

Correct systemic problems before the full edit. A logo still, endpoint scrub or contact sheet cannot test typing/click causality. Proceed with routine authorized edits; only surface material constraints or genuine choices.

## Runtime and timestamp pitfalls

Inspect current `demo-video/package.json` and lockfile. On the original machine, Node 20.16 failed the installed Remotion engine requirement and Node 22 worked. Use a supported installed runtime or reputable package-runner equivalent; do not assume the historical versions remain current. The existing export script contains the old chapter map and source commit: update them for the new job.

Render a master and exact chapter cuts, or render chapters then assemble a master. Avoid stream-copy cuts at arbitrary non-keyframes. Preserve supplied audio; strip it only for an intentionally silent export.

Before stream-copy concatenation, inspect codec, dimensions, frame rate and `time_base`. Normalize track time bases or re-encode to one consistent output. The earlier job combined MP4 tracks at **1/15360** and **1/90000**, causing thousands of non-monotonic DTS warnings and an approximately 18-minute master from a planned 3:41 film. Do not suppress warnings and ship. Rendering the master directly avoids this particular concat issue.

Some bundled macOS FFmpeg/FFprobe binaries require their compositor directory prepended to `DYLD_LIBRARY_PATH`. The checker handles the bundled binary's library path. Do not hardcode the author's home directory. A platform-version warning alone does not prove failure; decoded playable output is the evidence.

Use the repo-local verifier with the **planned** duration/format, substituting current values:

```sh
python3 .agents/skills/remotion/scripts/check_video.py \
  demo-video/out/Blueprint-Scenes-01-26.mp4 \
  --expected-seconds 221 --fps 30 --width 1920 --height 1080 --silent
```

Use `--audio` for narration. `--ffprobe /path/to/ffprobe` overrides discovery; `--report /path/to/report.json` saves a compact report. Check every chapter against its own planned length. For a continuous master, their frame counts should sum to the master's. Review encoder logs as well.

## Final playback and delivery

Watch typing and key transitions at normal speed. Check first/last frames, both sides of every chapter join, maximum zoom and PDF handoffs. Look for outcomes preceding clicks, results preceding submission, unintended freezes, cropped labels, missing models and wrong instructions. Metadata cannot judge these.

Validate the master after any concat/re-encode. Ensure the package contains final files, not older drafts. Open the final browser preview: verify duration, resolution, no media error and time advancing during playback. Do not promise downloads of files still being written.

Deliver the master, grouped clips, timing map, capture method/source commit and editable source. Identify silent/provisional timing and physical-footage edit points. Keep large exports/dependencies out of version control unless asked; exclude unrelated generated model files from video/skill commits.
