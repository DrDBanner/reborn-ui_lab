# Coverage against the original 34-page concept

**Interactive** means actions modify simulated JSON state. **Navigable** means a view or dialog is reachable but some hardware-specific operations are illustrative.

| Original page | UI Lab |
|---|---|
| R01 Radio presets and discovery | **Interactive:** radio browsing, favorites and source/output assignment; device keys appear above the detail tabs and in group/pair details |
| R02 Radio search | **Interactive:** live filtering |
| R03 Favorites | **Interactive:** add/remove and favorites tab |
| R04 Station details/filter/missing station | **Interactive** details and genre filters; station-submission form not implemented |
| Q01 Preset management | **Interactive** capability-driven key count, independent Once/Twice assignments, device-bound editing and recall; actual device transfer requires backend |
| M01 Media sources | **Interactive** media server selection; mock folder contents |
| M02 Library items | **Interactive** sample tracks/collections; actual network browsing is placeholder |
| H01 Recently played | **Interactive** history |
| S01/S02 Spotify | **Interactive** simulated connected/disconnected state; no actual OAuth |
| P01 Player | **Interactive** play/pause/stop, session selection, volume |
| O01/O03 Output selection | **Interactive** source-to-output assignment, independent sessions |
| O02 Groups/pairs | **Interactive** creation, membership, persistence and dissolution |
| E01 General settings | **Interactive** app settings, appearance |
| E02 Speaker overview list | **Interactive** N-device search/filter/details |
| E03 Speaker details | **Interactive** state; remote endpoint and QR generation placeholders |
| E04 Sound | **Interactive** bass and startup volume |
| E05/E08 Network / Wi-Fi | **Interactive** simulated SSID change; no real provisioning |
| E06 Advanced | **Navigable** alarms, button actions, maintenance actions |
| E07 Automation details | **Navigable** placeholder, no real scheduler |
| W01/W02 Setup wizard | **Interactive** discovery choice, simulated device creation |
| I01/I02 Help and feedback | **Navigable** entry points and links |
| D01/D02 Maintenance | **Interactive** firmware progression and backup export; restart/reset mock dialogs |
| Z01 States and errors | **Interactive** first-run, offline, updating, needs-setup, 50-device stress cases |
| SYS/MAP/BASIS | **Documented** architecture, tests and design tokens |

**Added for the current discussion:** 50-device stress scenario, independent streams, player-vs-sidebar A/B variant, collapsible categories, source-first output selection, JSON scenario editing, design token editor, overlap constraints and single-row composites.

These are testable UI behaviors, not claims of live hardware compatibility. All original 34 document pages and 51 detail SVGs are preserved in `reference/original/`.
