# Backend integration plan

The UI Lab runs through a JSON-backed model. A Wails adapter connects its actions and state to the ST Reborn backend.

```text
Views and UI variants
        |
Shared state and actions
        |
Wails adapter
        |
Generated Go bindings and device events
        |
ST Reborn backend
```

`src/app/controller.js` handles UI actions. `src/app/model.js` provides selectors and local state transforms. The adapter owns backend calls, device events and acknowledgement handling.

## Adapter responsibilities

- Map action payloads to verified Go method signatures and event shapes.
- Supply discovery, identity (including reported MAC and all IPv4/IPv6 addresses), capabilities, availability, membership and playback state.
- Apply confirmed values after acknowledgement and surface failures per target.
- Identify desktop updates, speaker agent software and device firmware separately.
- Validate membership, pairing compatibility and physical session overlap.
- Expand logical groups into the backend's physical membership contract.
- Preserve typed preset payloads, source metadata, accounts and transfer results. Explicit overwrite requires a reviewed relocation plan, refreshed destination state and acknowledged moves/replacements per device.
- Reconcile saved group templates, live membership and recovery events.
- Provide network, remote, provisioning, scheduling and maintenance operations.
- Index library titles with stable server/track IDs, search and resolve saved queue contents, and confirm queue playback on the selected output. The UI Lab persists queue definitions with its scenarios and projects them as library sources.
- Integrate translations, RTL layouts, keyboard focus and native window conventions.

Future manufacturer adapters use the same source, membership and playback model. They report device functions and interoperability, including the combinations that support synchronized playback. [Product direction](PRODUCT_DIRECTION.md) describes the intended lifecycle.

Manufacturer protocols belong to backend adapters. Views consume the shared model and reported capabilities. Design Lab provides scenario-driven review of the same UI actions.

STR payload mappings and pinned source references are documented in [Device capabilities](DEVICE_CAPABILITIES.md).

## Release notes

Application updates provide `appUpdate.releaseNotes`; firmware reports provide `device.firmwareReleaseNotes`. Each accepts one record or an array of records with `version`, optional plain-text `body`, `changes` string array, `publishedAt` and HTTP(S) `url`. The lightbox matches the selected reported version and identifies application versus physical device. Missing notes produce an explicit empty state. Reading notes does not install software.

## Device identification

Adapters report supported location signals through `capabilities.identification` and implement device-scoped start/stop operations with the requested bounded duration (30 seconds by default, configurable from 1 to 300 seconds in App settings). Enforce the timeout on the device/backend, acknowledge the running signal and report completion or failure. Starting another identification or cancelling stops the previous signal. Identification must preserve active playback and volume; advertise only signals for which that behavior is supported. The UI Lab supplies the countdown and simulated state.

## Current track and station playlists

Playback sessions can supply `nowPlaying: {title, artist, album, trackId}`. These are optional plain-text fields belonging to that session, updated or cleared when its track changes. A stable `trackId` can resolve library metadata; a collection or queue alone does not identify its currently playing title. Starting another source creates a fresh session.

Radio sources can supply `stationPlaylist: {tracks: [{title, artist, album, playedAt}], sample?}`. Keep the provided order and use `playedAt` as a display label. The playlist button appears when the source supplies entries and opens a source-bound lightbox without changing playback. The adapter owns fetching and refreshing station data. The catalog includes an explicitly marked sample playlist for review.

A library playback reports its current `trackId` (or `nowPlaying.trackId`) and optional `queueTrackIds` in playback order. The playlist lightbox resolves known tracks with title, artist, album and duration in seconds. Queue transport commands target the selected session; queue order commands retain its current track. In the lab, newly started library queues select the first known title, and transport updates the simulated track. A live adapter supplies actual device progress and command results.

Received title changes append to scenario `listeningHistory` with `sourceId`, `targetId`, `sessionId`, `title`, `artist`, `album` and `playedAt`. Repeated state renders preserve a single observation until metadata changes. Source history remains the destination for restarting live radio.

Manual library entries with `sourceKind: "playlist"` retain `address` and `playlistFormat` (`m3u`, `m3u8`, `pls`, `xspf`, or `auto`). Their source projection carries `type: "library"`, `kind: "playlist"` and `playlistUrl`; the backend fetches and parses the document, resolves relative entries, and reports content and device compatibility. Spotify playlist links are stored in `spotifyPlaylists` and projected with `type: "spotify"` and their canonical `playlistUrl`, for the Spotify connector. The lab validates and persists links without fetching remote playlists.
