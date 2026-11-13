# Stillwater audio — first beta

## Included sounds and rights
The effects and environmental ambience are original procedural synthesis in
`audio.js`, authored for Stillwater, with no third-party samples. They may be used,
modified and distributed with Stillwater, including commercial releases. They are
stylized synthesized sounds, **not woodland field recordings**.

The six music recordings were supplied by the user as original WAV files created
with **Stable Audio (stableaudio.com)**. The user confirmed that their license
permits commercial use and distribution in Stillwater. This is user-confirmed
provenance, not independent verification of the user's account or plan. No additional
credit requirements were supplied. The game credits Stable Audio. Retain the original
generation records and applicable plan/license terms with the project's rights records.
Do not describe these recordings as CC0, royalty-free stock, or public domain.

Included: wooden thud, stone/gravel settle, leafy rustle, small splash, removal,
undo, muted menu swishes and a discovery-only chime. Random pitch/filter/timing
variations keep ordinary interactions non-melodic. Woodland events include brief
bird calls, cricket pulses, distant cicada swells, soft tree wind, stream/river
flow, lake laps and campfire crackles. Events have 6–13 seconds of silence between
them. Only existing water/fire tiles emit those sounds; gain follows camera distance.
There is no continuously looping noise bed. Voices are capped at 32 and disconnected
on completion. One shared noise buffer is generated after user interaction.

## Included soundtrack
Each source WAV is 60 seconds, stereo, 44.1 kHz / 16-bit. Titles below are friendly
in-game labels; original filenames and SHA-256 fingerprints are in `sources.json`.

| Title | File | User-supplied musical description |
| --- | --- | --- |
| Quiet Horizon | `quiet-horizon.mp3` | Ambient post-rock |
| Porchlight | `porchlight.mp3` | Cozy lo-fi |
| Woodland Folk | `woodland-folk.mp3` | Indie folk |
| Cozy Chillhop | `cozy-chillhop.mp3` | Cozy lo-fi chillhop |
| Appalachian Morning | `appalachian-morning.mp3` | Modern Appalachian folk |
| Forest Drift | `forest-drift.mp3` | Alternative lo-fi chillhop |

The recordings are encoded as stereo 160 kbps MP3s after two-pass loudness
normalization targeting −18 LUFS integrated and −1.5 dBTP. `sources.json` records
measured encoded-file loudness/peaks and checksums. Original WAVs remain outside
the repository; keep the user's masters as the source archive. No music is generated
at runtime. No vocals, instruments or musical content were added during processing.

The player loads one track at a time only after user interaction, fades in over
0.8 seconds/out over 1.2 seconds, repeats each track three times with a 0.25-second
replay gap, then advances with a 1-second gap (plus up to 0.5 seconds scheduler latency), and pauses
when hidden, muted or music volume is zero. A complete cycle contains 18 minutes
of music plus short gaps. These are short supplied tracks, not extended 3–5 minute versions.
The existing music slider controls them independently of ambience/effects.

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
`check-mobile.mjs` and `check-soundtrack.mjs` use an external Playwright installation via `PLAYWRIGHT_MODULE`
and the local server via `STILLWATER_URL`. The music check generates short test tones
in mocked HTTP responses only; no test recording is deployed. Browser checks cover
user activation, signal output, saved controls, suspension, confirmation behavior,
small screens and playlist gaps/rotation. Physical iPhone/Safari listening remains
part of beta acceptance; synthesized ambience is an initial artistic treatment.

### Browser activation recovery
Music playback is requested synchronously during pointer/click/key activation,
before awaiting the AudioContext. If a browser denies playback, the player reports
“Click or tap anywhere to start music” and retries on the next interaction rather
than repeatedly retrying a blocked timer. Zero master/music volume is also reported.
`scripts/check-audio-activation.mjs` simulates a denied media play with an already
running audio context and checks recovery on a later real click.

The first click/tap can be on a menu; construction is not required. Saved mute
and zero-volume preferences remain respected. `check-anywhere-audio.mjs` checks
first menu activation on desktop and touch without changing the village.

### iPhone output activation
Every accepted gesture may retry AudioContext.resume(), even if an earlier resume
promise is still pending. Touchend is included explicitly. A suspended/interrupted
context reports “Tap again to enable audio” instead of claiming music is playing.
Where supported, Safari's Audio Session API requests the playback category.
`check-iphone-audio.mjs` simulates the pending-resume failure in Chromium; it is not
a substitute for a physical iPhone/Safari listening test.
