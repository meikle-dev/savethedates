# Launch film source

Source for `../../savethedates-launch-film-1080p.mp4` (1920×1080, 60 fps, 59.4 seconds).

The film is an HTML page animated with GSAP. A script steps through it frame by frame in the project's Playwright Chromium and encodes the frames with ffmpeg. The music and sound effects are synthesised by `score.mjs` and timed from cue points that the page exports, so they stay in sync with the picture.

## Rebuild

Run the project's `npm ci` first, because the scripts use its Playwright and sharp. Then, from this folder:

1. `npm install`
2. `npm run build`

The build takes about 6 minutes. It writes three files to `docs/marketing-material/marketing-videos/`:

- `savethedates-launch-film-1080p.mp4`: the film with music
- `savethedates-launch-film-1080p-no-music.mp4`: the same film with no audio
- `savethedates-launch-film-1080p-poster.jpg`: a still taken at 8 seconds

## Editing

- **Copy, timing and layout:** `index.html`. Each scene is marked with a `SCENE n` comment. Times are written at full speed, on a 96 BPM grid (one bar is 2.5 s).
- **Playback speed:** `SPEED` near the top of `index.html`. It's set to `0.8`, so the film plays 20% slower (59.4 s) and the music is rebuilt at 76.8 BPM to match. Set it to `1` for the original 47.5 s cut.
- **Music and sound effects:** `score.mjs`.
- **Screenshots:** `prep.mjs` copies them from `docs/marketing-material/marketing-context/images/`. If you re-capture the screenshots, rebuild the film.
- **Previewing frames:** `node render.mjs stills out 7.5 20 45` saves PNG frames at those times without rendering the whole film.

## Content notes

- Olivia & James, Grace Murphy and Charlotte Reid are the fictional showcase names from the screenshot guide. The film labels them "Example wedding · fictional names".
- The botanical artwork in the guest-page screenshots doesn't have a recorded licence yet. Confirm it before using the film in paid advertising. See section 10 of `../../../marketing-context/marketing-docs/app-features-and-screenshots-guide.md`.
- The music is original and synthesised in `score.mjs`, so it contains no third-party audio.
