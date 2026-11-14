# View coverage

Actions operate on local JSON simulation state. The table describes the behavior available in each view.

| View | Behavior |
|---|---|
| Radio | Search, favorites, country/language/genre/bitrate/health/compatibility filters, sorting, pinned controls and output selection |
| Library | Server selection, manual sources, server-scoped collections, title search and saved queues with multi-target assignment and editing |
| Recently Played | Source history, favorites and playback/output selection |
| Spotify | Simulated connection state and source selection |
| Player | Concurrent session selection, Play/Pause/Stop, output selection and volume |
| Outputs & playbacks | Target/device projections, search, type/active filters, source state and member details |
| Device, pair and group details | Identity, renaming, capability-specific tabs, presets and membership |
| Button presets | Physical owner, Once/Twice banks, typed source drafts, playback capture, recall and transfer review |
| Group settings | Main speaker, persistence and receiver-specific remote group templates |
| Sound | Bass, startup volume, overall and individual levels according to item capabilities |
| Network | Reported network state and simulated SSID change |
| Functions | Capability-based alarm information for devices and the physical members of pairs/groups |
| Set up speaker | Candidate selection, configuration and simulated device creation |
| Updates & maintenance | Availability, individual/bulk simulated firmware progress, diagnostics and settings export |
| App settings | Language selection, session restoration, appearance and update preferences |
| Help | Information and feedback links |
| Design Lab | Scenario selection/reset, navigation variants, tokens, JSON editing and export |

## Scenario data

Eight scenarios cover everyday use, nested groups, 50 devices, concurrent streams, maintenance states, varied capabilities, first run and update notifications. [Nested groups](GROUP_NESTING.md) demonstrates named floors sharing Whole home playback alongside an independent terrace stream. The 50-device scenario provides 38 playback targets after grouping and pairing.

## Integration plan

The backend adapter supplies discovery, device events, network media browsing, source metadata, remote endpoints/QR data, scheduling, provisioning and update execution. Per-device Spotify account/source state and reported pairing compatibility provide the input for their respective controls. [Device capabilities](DEVICE_CAPABILITIES.md) describes the data contract; [Backend integration](WAILS_INTEGRATION.md) assigns responsibilities.
