# Stillwater audio — first beta

## Included sounds and rights
All shipped sounds are original procedural synthesis in `audio.js`, authored for
Stillwater. No third-party recordings, samples, compositions, or audio libraries
are included. The synthesis implementation and resulting sounds may be used,
modified and distributed with Stillwater, including commercial releases; no
third-party attribution or royalty obligation applies to these original sounds.
They are stylized synthesized sounds, **not woodland field recordings**.

Included: wooden thud, stone/gravel settle, leafy rustle, small splash, removal,
undo, muted menu swishes and a discovery-only chime. Random pitch/filter/timing
variations keep ordinary interactions non-melodic. Woodland events include brief
bird calls, cricket pulses, distant cicada swells, soft tree wind, stream/river
flow, lake laps and campfire crackles. Events have 6–13 seconds of silence between
them. Only existing water/fire tiles emit those sounds; gain follows camera distance.
There is no continuously looping noise bed. Voices are capped at 32 and disconnected
on completion. One shared noise buffer is generated after user interaction.

## Music assets required — no placeholder music shipped
The streaming player is ready; `MUSIC_TRACKS` is deliberately empty. Commission
original tracks or acquire licenses explicitly covering commercial games, browser
streaming and iOS/Android distribution. Keep the license and composer attribution
here before enabling each entry. Do not assume a download being free means it is
licensed for a paid game.

| Suggested file | Brief |
| --- | --- |
| `porch-light.mp3` | 3–5 min, ~68 BPM: very mellow ambient piano and soft pads, minimal percussion |
| `woodland-afternoon.mp3` | 3–5 min, ~76 BPM: warm piano, gentle bass, restrained kick/snare/hats, cozy lo-fi |
| `lakeside-ramble.mp3` | 3–5 min, ~84 BPM: mellow guitar-led chillhop, lightly upbeat, soft drums |

Deliver stereo MP3 (160–192 kbps, 44.1 kHz), instrumental, consistent comfortable
loudness around −18 LUFS integrated and ≤ −1 dBTP, with natural beginnings/endings.
Avoid over-compression, conspicuous vinyl hiss and sharp percussion. Retain lossless
masters outside the game deployment. These are briefs, not actual track titles or
claims that recordings exist.

Place files in `assets/audio/`, and populate `MUSIC_TRACKS` with
`{title:'...',src:'./assets/audio/filename.mp3',credit:'...',license:'...'}` entries.
Add those exact paths to the development server allowlist with `audio/mpeg` MIME.
The beta staging script already includes assets. The player streams one track at a
time, fades in over 3 seconds/out over 4 seconds, rotates the list with 8–16 second
quiet gaps, skips failed assets and pauses when hidden, muted or music volume is zero.
No empty-manifest audio requests are issued. Revalidate real track transitions,
levels and licensing when the finished masters arrive.

## Controls / lifecycle
Independent master/music/ambience/effects gains and mute are stored separately
from villages. Beta staging isolates the preference key too. Audio starts after
an interaction, never on page load. Tab hiding, focus loss and page navigation stop
short voices, pause music and suspend the context; foreground interaction can
resume it if the browser requires a fresh gesture. No sound is essential to play.
Soundscape profiles live in `SOUNDSCAPES` for future environment-specific content.

## Validation
`npm run check` and `npm test` include audio preferences, state-change cues and
camera attenuation. Optional `scripts/check-audio.mjs`, `check-music.mjs`, and
`check-mobile.mjs` use an external Playwright installation via `PLAYWRIGHT_MODULE`
and the local server via `STILLWATER_URL`. The music check generates short test tones
in mocked HTTP responses only; no test recording is deployed. Browser checks cover
user activation, signal output, saved controls, suspension, confirmation behavior,
small screens and playlist gaps/rotation. Physical iPhone/Safari listening remains
part of beta acceptance; synthesized ambience is an initial artistic treatment.
