# Capture real UI actions

## Source and setup

Verify the running product's version and origin, then rehearse the requested journey before filming. Prepare deterministic demo state through the app or an explicitly supported fixture mechanism. Never paint counts or replies into captures.

Record viewport CSS dimensions and source pixel dimensions; they may differ. A high-resolution render cannot recover missing source detail. Where permitted and available, use native 1920×1080 source for 1080p delivery. If the available capture is smaller, preserve its aspect ratio and restrain zoom. Respect the current environment's viewport/browser-control rules.

Test a short moving/typing capture first. If it produces an error, black frames, frozen content or no file, use a supported alternative after a bounded diagnosis. Do not spend the session building a recorder while footage remains unmade. Disclose a screenshot-based fallback; for an explicit native-video requirement, explain the blocker and continue independent preparation.

## Visible typing

For a video take:

1. Establish the empty input and enough surrounding UI to locate it.
2. Move to and focus the input; keep it in view.
3. Send actual paced keystrokes with the permitted browser tool. **6–10 characters/second** is a useful starting pace, tuned to the script and final playback.
4. Hold the completed text approximately **0.8–1.2 seconds** as a starting point. Viewers must read it before submission.
5. Move to the real Send control, click, then show the real response. If using Enter, show that submission rather than inventing a mouse click.

For screenshot-based footage, acquire **every successive prefix in the actual input**, including the focused empty state and the complete text. Record prefixes and acquisition timestamps, then intentionally pace them in Remotion. Do not cover the app with a fabricated textbox or animate replacement text over an existing prompt. Two or three sampled prefixes create visible jumps and are insufficient for a featured typing shot.

The edit must satisfy:

```text
focus < first character < final character
final character + reading hold <= submission
submission <= resulting UI
```

A 25-character prompt at 8 characters/second needs about 3.1 seconds for typing alone. Add reading, pointer travel, submission and result time. A two-second scene cannot show this whole journey well: reallocate time or use a shorter appropriate prompt instead of making words pop in.

For search inputs, capture real changing results and layout. Record deliberate corrections; otherwise redo a clean take. Watch the exported typing at normal speed to catch skipped prefixes, disappearing carets, hidden input text and premature submission.

## Coordinates and causality

Store a compact capture-log entry per action:

```json
{
  "shot": "spaceship-request",
  "sourceCommit": "actual-commit-for-this-take",
  "method": "video",
  "viewportCss": {"width": 1920, "height": 1080},
  "sourcePixels": {"width": 1920, "height": 1080},
  "action": "submit prompt",
  "target": "Send idea",
  "targetCenterCss": [1188, 242],
  "beforeAsset": "request-complete.png",
  "afterAsset": "spaceship-results.png"
}
```

This illustrates a format, **not coordinates to reuse**. Add timestamps/prefixes or source-video in/out points. Read bounds immediately before the action and retain screenshot/DOM context connecting them to that capture. Native video can retain its real cursor. An editorial cursor must share the image's coordinate transform, avoid a duplicate recorded cursor and leave text readable.

Scrolling, modals, automatic chat scrolling, browser chrome and viewport changes can invalidate coordinates. Re-measure after changes. Two filters need off/off → on/off → on/on with their actual clicks. Multiple added pieces need increments or an honest before/after cut; one click must not apparently add three pieces.

Keep a ledger of ownership and reserved pieces with the shot plan. Film follow-on actions using the preceding state, or establish a clear editorial reset. Do not show an old higher-inventory result after locking its pieces unless it is explicitly an earlier-state comparison.

## Actual readiness and motion

Observe UI readiness with the supported browser interface. A click on “Spin in 3D” does not prove its canvas rendered. Wait for the visible usable model/guide/PDF. Capture actual rotation when claiming rotation; a sequence of identical frames is a still.

Separate acquisition and edit timing. A rapid loop of 48 screenshots did not necessarily record 48/30 seconds. Retain acquisition timestamps for motion sequences and use actual timing or deliberate retiming. Reading pauses belong in the edit; blind UI sleeps do not replace readiness checks.
