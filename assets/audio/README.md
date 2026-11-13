# Stillwater soundtrack and environmental audio

## Recordings and provenance
The creator supplied twelve original instrumental WAV recordings for Stillwater,
each 180 seconds, stereo 44.1 kHz / 16-bit. Original names, source and encoded-file
SHA-256 hashes, measured loudness, peaks and playback offsets are in `sources.json`.
These recordings replace the previous six one-minute tracks; none of those old
recordings is included in the current game assets. They are not represented as
public-domain or Creative Commons stock. Retain the original generation/license
records with the project's rights records. No additional credits were requested;
the game identifies the soundtrack as original music supplied for Stillwater.

| In-game title | Playback file |
| --- | --- |
| Lakeside Haze | lakeside-haze.mp3 |
| Pine & Sky | pine-and-sky.mp3 |
| Distant Shores | distant-shores.mp3 |
| Porch Café | porch-cafe.mp3 |
| Golden Afternoon | golden-afternoon.mp3 |
| Woodland Wander | woodland-wander.mp3 |
| Fireside Jazz | fireside-jazz.mp3 |
| Slow Current | slow-current.mp3 |
| Moss & Rain | moss-and-rain.mp3 |
| Cedar Trail | cedar-trail.mp3 |
| Open Clearing | open-clearing.mp3 |
| Evening Reflections | evening-reflections.mp3 |

Friendly titles label the uploaded recordings; the music itself was not rearranged.
The original WAVs remain untouched outside the repository. Playback copies use
160 kbps stereo MP3, two-pass normalization targeting −18 LUFS / −1.5 dBTP.
The twelve copies total about 43.2 MB. Only two streaming elements are retained,
not twelve fully decoded buffers. Upcoming music preloads while the current song
plays; the complete soundtrack is not downloaded on page load.

## Player
`music-player.js` owns a shuffled sequence and two streaming decks, connected to
the existing music gain bus. Automatic transitions overlap for seven seconds;
manual changes overlap for one second. Linear complementary gain ramps avoid a
zero-gain gap. Late loading keeps the outgoing song playing while the incoming
song starts; a stalled network or denied browser playback can still interrupt sound.
At most two songs overlap, and playback controls briefly disable skipping during
a transition so rapid clicks cannot accumulate audio players.

Every song plays once before reshuffling. A new cycle cannot begin with the last
song of the preceding cycle. Previous follows actual playback history; Next follows
that history forward before drawing a new shuffled song. Explicit previous-track
navigation can naturally replay a song. There is no automatic three-play repeat.

Measured edge silence below −55 dB is bypassed with `start`/`end` playback offsets
and 80 ms padding. These offsets never rewrite the originals or truncate the encoded
copies. Fades begin relative to the audible end offset rather than the file ending.

Music Play/Pause pauses only the soundtrack. Existing master/music/ambience/effect
volume preferences and mute retain their storage key and values. Music pause is
session state, independent of global mute or temporarily hiding the tab. Foreground
resume preserves the song and any in-progress crossfade. Browsers still require a
user gesture; both decks are primed at zero gain during initial interaction for iOS.
The existing touch-end AudioContext recovery and supported Safari playback audio
session are retained.

## Environmental sounds and effects
All environmental and building effects remain the original procedural synthesis
in `audio.js`, with no third-party samples. They may be used, modified and distributed
with Stillwater, including commercial releases. They are stylized synthesis, not
field recordings. Birds, crickets, cicadas, intermittent wind, distance-sensitive
streams/rivers/lakes and fire crackles still have their own ambience bus and timing.
Wood, stone, trees, water, removal, Undo, menus and discovery chimes still use the
separate effects bus. Pausing music never suspends the context or ambience scheduler.
Music retains its conservative output level so the existing ambience balance is kept.

## Validation
- `npm run check` and `npm test`: syntax, game regressions, track integrity and
  measured levels, shuffle uniqueness across cycles, history and silence offsets.
- `scripts/check-crossfade.mjs`: all twelve real MP3s, seven-second overlap with
  nonzero combined gain, preloading, previous/next, cycle boundaries, music-only
  pause with ongoing woodland events, lifecycle and 44px mobile controls.
- Existing `check-audio`, `check-mobile`, `check-anywhere-audio`, `check-iphone-audio`
  and `check-audio-activation` scripts cover settings, effects, building controls
  and gesture recovery. `check-music`/`check-soundtrack` alias the new crossfade check.
- Browser scripts use external Playwright through `PLAYWRIGHT_MODULE` and a running
  server at `STILLWATER_URL`, without adding a shipped dependency.

Chromium desktop/touch checks do not establish physical iPhone/Android behavior.
The WebKit browser download was blocked by the cloud network policy; physical
Safari listening, especially automatic transitions after the first gesture,
remains a beta acceptance check.
