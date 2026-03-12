# Vimeo Video Embed Playbook (Evident Implementation)

This document captures the full setup used in this project to embed and customize a Vimeo video block with custom overlay controls.

Use this as a repeatable guide for similar landing pages.

## Goal

Implement a Vimeo video section that:

- loads fast
- autoplays muted on page load
- loops continuously
- uses custom UI overlay (not native Vimeo controls for interaction)
- supports click-anywhere play/pause
- has a desktop progress scrubber and a right-side volume icon button
- opens a vertical volume slider when clicking the volume icon
- supports a mobile mode with tap-anywhere play/pause, volume button, and fullscreen button

## Files Involved

- `index.html`
- `styles.css`
- `scripts.js`

## 1) Head-Level Performance and Vimeo API Setup

In `index.html` `<head>`, add connection warmups and preload:

- `preconnect`:
  - `https://player.vimeo.com`
  - `https://i.vimeocdn.com`
  - `https://f.vimeocdn.com`
- `dns-prefetch` for the same domains
- preload Vimeo API script:
  - `https://player.vimeo.com/api/player.js`

Also include:

- `<meta name="referrer" content="origin-when-cross-origin" />`

At end of `body`, before `scripts.js`:

```html
<script src="https://player.vimeo.com/api/player.js"></script>
<script src="scripts.js"></script>
```

## 2) HTML Structure (Video Section)

Current section location: directly below hero and above platform section.

Core structure:

- `.video-shell` container
- `.video-frame` media frame
- poster image (`.video-poster`)
- Vimeo iframe
- `.video-overlay` custom control layer
  - center paused indicator (`.video-center-indicator`)
  - fullscreen button (`[data-video-fullscreen]`)
  - bottom controls bar (`.video-bottom-bar`)
    - timeline range (`[data-video-progress]`)
    - time readout (`[data-video-time]`)
    - right volume control (`[data-video-volume-toggle]`)
    - vertical volume panel (`[data-video-volume-panel]`) with range (`[data-video-volume]`)

### Vimeo iframe URL parameters in use

```text
https://player.vimeo.com/video/1172864455?title=0&byline=0&portrait=0&badge=0&controls=0&muted=1&autopause=0
```

Meaning:

- `title=0`, `byline=0`, `portrait=0`, `badge=0`: reduce Vimeo chrome
- `controls=0`: hide native controls
- `muted=1`: required for reliable autoplay
- `autopause=0`: avoid Vimeo pausing itself when multiple players exist

## 3) CSS System

### Visual container and frame

- `.video-shell`: glass-like card, border, shadow
- `.video-frame`: fixed aspect ratio (`3378 / 2124`), rounded corners, overflow hidden
- iframe uses a tuned crop fix to remove top/edge artifacts:

```css
.video-frame iframe {
  top: -3px;
  left: -2px;
  width: calc(100% + 4px);
  height: calc(100% + 5px);
}
```

### Poster behavior

- Poster sits above iframe (`z-index: 2`)
- On `.video-frame.is-playing`, poster fades out

### Overlay behavior

- `.video-overlay` sits above media and captures clicks
- center indicator appears only while paused
- bottom bar appears on hover or when paused

### Bottom bar layout

- Grid columns: timeline, time, volume button
- timeline vertically centered in bar (`align-items: center`)

### Fullscreen button

- `.video-fullscreen-btn` sits in the overlay and calls Vimeo fullscreen
- click handler uses `event.stopPropagation()` so fullscreen click does not toggle play/pause

### Mobile controls mode (`max-width: 640px`)

- keep click-anywhere play/pause
- keep center pause indicator visually centered in the video
- hide timeline and time readout (`.video-progress-wrap`, `.video-time`)
- keep volume button available
- show fullscreen button (`.video-fullscreen-btn`)
- place mobile control cluster at bottom-right using absolute positioning so it does not shift center alignment

### Volume control styling

- `.video-volume-btn`: icon-only circular button
- two SVGs inside button:
  - `.icon-volume`
  - `.icon-muted`
- button class `.is-muted` toggles which icon is visible

### Vertical slider panel

- `.video-volume-panel` opens above right button
- slider is vertical using:

```css
.video-volume-panel .video-range {
  height: 120px;
  writing-mode: bt-lr;
  -webkit-appearance: slider-vertical;
}
```

## 4) JavaScript Control Logic (`wireVimeoPlaybackOnView`)

Main flow in `scripts.js`:

1. Select all control elements
2. Initialize Vimeo player:
   - `const player = new window.Vimeo.Player(iframe);`
3. In `player.ready()`:
   - mute + volume 0
   - enable loop (`setLoop(true)`)
   - initialize duration/time UI
   - autoplay immediately (`player.play()`)

### State helpers

- `setPauseUi(isPaused)` toggles `.is-paused` on frame
- `setVolumeUi(volume, isMuted)`:
  - syncs slider value
  - toggles mute/volume icon by adding/removing `.is-muted` on the volume button

### Playback interaction

- Click-anywhere on overlay toggles play/pause
- Exception logic:
  - if click target is slider or volume button, ignore overlay toggle
  - if click target is fullscreen button, ignore overlay toggle
  - if volume panel is open, first click outside controls closes panel only

### Volume interaction

- Clicking volume button:
  - if muted/volume 0: unmute and set volume to `0.3`
  - toggle panel open/closed
- Moving slider:
  - set player volume
  - set muted true if slider at `0`

### Timeline interaction

- `timeupdate` updates slider + time text
- slider input seeks player time
- scrubbing guard prevents UI jitter while dragging

### Keyboard

- `Space` on focused frame toggles play/pause
- `Escape` closes volume panel

### Fullscreen interaction

- fullscreen button calls `player.requestFullscreen()`
- fallback to `iframe.requestFullscreen()` when needed

## 5) Current UX Rules (as implemented)

- Video autoplays on page load (muted)
- Video loops continuously
- Scrolling does not pause video
- Only user click/toggle pauses playback
- Center pause indicator visible only when paused
- Volume icon reflects muted/unmuted state
- First click outside while volume panel open closes panel (no pause)
- On mobile, timeline/time are hidden and fullscreen button is shown

## 6) Known Constraints and Caveats

1. Vimeo iframe is cross-origin:
   - cannot fully control internal rendering surfaces
   - some branded/black states can still appear depending on Vimeo behavior

2. Poster source quality matters:
   - current poster uses `https://vumbnail.com/1172864455.jpg`
   - for maximum reliability and brand consistency, prefer a local poster image in `static/`

3. Browser autoplay policy:
   - autoplay is most reliable when muted

4. `controls=0` tradeoff:
   - cleaner embed
   - can make debugging Vimeo internal paused surfaces harder

## 7) Reuse Checklist for Another Project

1. Copy HTML video block from `index.html` (`#overview-video` section)
2. Copy all `.video-*` CSS rules from `styles.css`
3. Copy `wireVimeoPlaybackOnView()` from `scripts.js`
4. Update Vimeo video ID in iframe URL
5. Update poster image URL
6. Ensure Vimeo API script is loaded before `scripts.js`
7. Ensure head preconnect/dns-prefetch/preload tags are present
8. Validate:
   - autoplay on load
   - loop
   - click-anywhere play/pause
   - vertical volume slider behavior
   - panel-close-first click behavior

## 8) Quick Customization Points

- Aspect ratio: `.video-frame { aspect-ratio: ... }`
- Default unmute volume: `const defaultVolume = 0.3;`
- Vertical slider height: `.video-volume-panel .video-range { height: ... }`
- Hover/paused visibility behavior: `.video-frame:hover ...` and `.video-frame.is-paused ...`
- Timeline sensitivity: `step` on `[data-video-progress]`

## 9) Troubleshooting

### Video does not autoplay

- confirm muted startup (`muted=1`, `setMuted(true)`, `setVolume(0)`)
- ensure Vimeo API script loaded
- test in normal browser window (not restrictive extension profile)

### Clicks don’t toggle playback

- verify overlay has `pointer-events: auto`
- verify overlay click handler in `scripts.js`
- check for overlapping elements with higher `z-index`

### Volume button not updating icon

- verify `.is-muted` class is being toggled on `[data-video-volume-toggle]`
- verify icon CSS selectors:
  - `.video-volume-btn.is-muted .icon-muted`
  - `.video-volume-btn.is-muted .icon-volume`

### Edge line artifacts on top/left

- keep tuned iframe crop offset (`top -3px`, `left -2px`, size `calc(100% + 4px)` / `calc(100% + 5px)`)

## 10) Snag Log (What Broke and Why)

This section is the practical record of issues encountered in this project and the final rule used to avoid each one.

1. YouTube embed errors (`153`) and unstable identity/referrer behavior:
   - Problem: YouTube embed intermittently failed and required fallback links.
   - Resolution: Switched to Vimeo for better control and fewer identity/referrer failures in this use case.

2. `file://` local preview behavior mismatch:
   - Problem: embed/player behavior differed from hosted/local-server behavior.
   - Resolution: test only on `http://localhost` or deployed HTTPS when validating playback behavior.

3. Black/Vimeo splash on paused/reset states:
   - Problem: iframe sometimes showed black/logo paused surface.
   - Resolution: avoid special auto-pause/reset sequences that differ from normal user pause semantics. Use one pause path and keep interaction consistent.

4. Scroll observer overriding intended playback:
   - Problem: viewport observer restarted/paused at wrong times.
   - Resolution: removed observer-based pause/resume in final setup; playback is looped and user-controlled by click.

5. Overlay click conflicts with controls:
   - Problem: click-anywhere toggle conflicted with sliders and volume controls.
   - Resolution: click filtering for `input[type=\"range\"]` and volume button; when volume panel is open, first outside click closes panel only.

6. Volume UX mismatch (text button vs icon state):
   - Problem: text button did not communicate mute state clearly.
   - Resolution: icon button with `.is-muted` visual state and aria-label updates.

7. Timeline/control-bar alignment drift:
   - Problem: controls not vertically centered.
   - Resolution: enforce `align-items: center` on `.video-bottom-bar`.

8. Edge artifacts persisted after 1px crop:
   - Problem: thin black line remained on top/left in iframe render.
   - Resolution: increased crop to `top -3px`, `left -2px`, with matching width/height expansion.

9. Mobile controls felt crowded:
   - Problem: desktop controls (timeline/time) degraded mobile usability.
   - Resolution: mobile mode keeps only volume + fullscreen buttons, while retaining tap-anywhere play/pause.

10. Mobile pause indicator drifted off true center:
   - Problem: control layout influenced centered pause indicator placement.
   - Resolution: mobile control cluster absolutely positioned in bottom-right and overlay set to single-row center layout.

## 11) One-Shot Implementation Contract

If you want this integrated in one pass on a new project, use this contract:

1. Place section directly after hero (before the next content section).
2. Use Vimeo iframe with muted autoplay and `controls=0`.
3. Add poster + custom overlay controls.
4. Do not add observer-based pause-on-scroll logic unless explicitly requested.
5. Start playback in `player.ready()` and set `setLoop(true)`.
6. Use icon-based volume button with vertical slider panel.
7. Ensure first click outside open volume panel closes panel only.
8. Apply tuned iframe crop fix (`top -3px`, `left -2px`, expanded width/height).
9. Add mobile control mode (volume + fullscreen; hide timeline/time).
10. Validate on localhost/HTTPS only.

Acceptance checks:

- On reload, video starts muted automatically.
- Video loops continuously.
- Scrolling off-screen does not pause.
- Click/tap on overlay toggles play/pause.
- While volume panel is open, one outside click closes panel (no playback toggle).
- Volume icon switches correctly between muted/unmuted states.
- No top/left edge artifact line.
- On mobile, timeline/time are hidden but volume and fullscreen remain accessible.

---

If you replicate this in another project, apply sections in this order:

1. `index.html` structure + script includes
2. CSS block
3. JS behavior
4. Video ID/poster swap
5. Validate checklist
