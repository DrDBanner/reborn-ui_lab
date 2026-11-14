# ST Reborn — UI Lab

A **JSON-driven, interactive frontend concept** for ST Reborn. It keeps the original visual direction while exploring a more scalable model for selecting sources, addressing outputs and managing N speakers, pairs, groups and independent streams.

**Technology:** Vanilla JavaScript (ES modules), Vite, Tailwind CSS 4, daisyUI 5 and Google Material Symbols Rounded. No React or Svelte required. No Go/Wails calls are made by this standalone UI Lab.

## Open and run in VS Code

1. Open the project folder `ST_Reborn_UI_Lab` in VS Code.
2. Run `npm install` (Node.js 20+ recommended).
3. Run `npm run dev`.
4. Open the URL printed by Vite, typically `http://localhost:5173`.

Or choose **Run Task → Start ST Reborn UI Lab**, then launch the browser configuration from `.vscode/launch.json`.

`npm run build` generates static assets in `dist/`. `npm test` checks the pure device/group model and renders all views under every scenario. `npm run validate` validates the JSON fixtures.

**Just want to try it?** Open `ST_Reborn_UI_Lab_Standalone.html` directly in a browser. It embeds the sample JSON and JavaScript, so no build or local server is required. This is a generated review artifact (regenerate with `python3 scripts/build-standalone.py`), not the maintained source.

**No npm available?** `preview.html` is a lightweight offline-style preview using the same JavaScript modules and handwritten component styles. Serve the project folder over HTTP, e.g. `python3 -m http.server 8765`, then visit `http://localhost:8765/preview.html`. Do **not** open the HTML directly as a `file://` URL: the UI fetches JSON fixtures.

The normal Vite version compiles Tailwind and daisyUI. `preview.html` omits these external build dependencies; it is intended only for inspecting interactions. Google Material Symbols Rounded are bundled locally as SVG paths, including in the standalone review. Icons work offline without external fonts. See `docs/MATERIAL_ICONS.md` for provenance, license and regeneration.

## What can I try?

- **The problem of N:** use the `30 speakers` scenario. Sidebar shows selected/top-level shortcuts; the shared workspace offers **Playback targets** for logical outputs and **All devices** for the complete hardware inventory.
- **Speaker placement A/B:** open **Design Lab** and switch between *A — Player panel* and *B — Sidebar*. Shared playback and group state does not reset.
- **App menu:** click the ST Reborn logo for connection status, appearance, app settings, scenarios and Design Lab.
- **Radio filters:** country, language, sorting, minimum bitrate, station health, output compatibility and genre chips all filter the sample catalog. Use the pin button to keep the controls visible while scrolling; its state is remembered.
- **Volume:** the player slider adjusts its complete output in percent. The volume icon opens individual member levels, including stereo pairs.
- **Notifications:** notes stack in the top-right corner and disappear after eight seconds; errors remain until dismissed.
- **Immediate station playback:** hover or focus station artwork to Play on the output named in the bottom player. Touch exposes the same action directly. The separate music-cast button opens output selection. In every output picker, **As member** joins the selected speaker/pair to the current player output; a different selected source applies to the whole joined output and is explained before selection; unchecked starts an independent stream.
- **Button transfer:** in the primary Button presets panel, transfer all occupied or selected Once/Twice keys to destination devices, with group selection and each device listed once. Review per-device conflicts and unsupported gestures; unselected keys remain intact. This is one-time copying, matching the verified STR APIs.
- **Device functions:** open a device for its supported button presets above the tabs; alarms remain under **Functions**. Groups and pairs expose the same panel with a device selector. Switch **Once / Twice** to configure or recall either button layer. Presets start as compact keys (at most three per row); Once/Twice and the group’s physical device selector stay directly accessible. The gear beside **Buttons on** reveals Edit assignments and Transfer buttons. The assignment editor separates keys from searchable, typed Radio / Library / Spotify / Services sources and can capture a source from an explicitly chosen playing output; the device’s own playback is preselected. **Device capabilities** demonstrates items without buttons and items with only two single-press keys.
- **Playing / Media:** the sidebar uses these names for playback sessions and source browsing. Playing and the bottom bar hide when no session is running or paused; paused sessions are explicit.
- **Independent streams:** choose `Several streams`, select a playback in the sidebar to open its output details, or open the shared Outputs workspace with Active only, or use the session selector in the bottom player; select another source and assign it to another output.
- **Groups and pairs:** use **Create group** on **Outputs & playbacks**, or **Members → Add members…** above a device’s tabs. Select outputs or enable **Stereo** and assign left/right speakers. Manage or dissolve each as one output.
- **Maintenance states:** select `Maintenance & errors` and advance firmware progress in **Updates & maintenance**.
- **First run:** select `First run` to exercise empty states and the setup wizard.
- **Live design adjustments:** edit accent, radius, density and sidebar width in **Design Lab**, then export design tokens.
- **JSON editing:** enable the scenario editor in **Design Lab**, apply edited JSON, or export your changes.

The prototype stores per-scenario changes and visual tokens in browser `localStorage`. Reset a scenario in **Design Lab** to load the original JSON fixture.

## Where to edit

| File / folder | Purpose |
|---|---|
| `src/components/shell.js` | Sidebar sections, pinned active output, player and top bar |
| `src/views/listen.js` | Radio, library, history and Spotify |
| `src/views/device-functions.js` | Capability-driven functions and per-device button layers |
| `src/views/sessions.js` | Compatibility route into the shared outputs/playbacks workspace |
| `src/views/outputs.js` | N devices, pair/group cards, group details |
| `src/views/management.js` | Speaker settings, firmware, diagnostics, setup and app settings |
| `src/views/lab.js` | A/B variants, scenario selection and design tokens |
| `src/components/dialog.js` | Source/output picker and editing dialogs |
| `src/app/model.js` | Pure selectors and rules for speakers, groups and playback sessions |
| `src/app/controller.js` | UI actions and state updates (mock boundary) |
| `src/app/store.js` | Shared state, scenario loading, persistence |
| `public/data/scenarios/*.json` | Complete editable scenarios, including 30-speaker case |
| `public/data/catalog.json` | Example radio stations, playlists and music servers |
| `public/data/design-tokens.json` | Default visual tokens |
| `public/data/ui-layout.json` | Sidebar navigation, category titles and route metadata |
| `public/data/variants.json` | Configurable A/B speaker layout choices |
| `src/styles/theme.css` | All color, density, type and layout design tokens |
| `src/styles/base.css` | ST Reborn component styling; Tailwind/daisyUI supplement this |
| `src/styles/tailwind.css` | Official Tailwind 4 / daisyUI 5 Vite plugin configuration |
| `reference/original/` | **Unchanged SVGs** from the previous 34-page concept + detail views |

## Deliberate boundaries

- **This is a functional UX simulator, not a hardware controller.** Playback, firmware, discovery, network switching, backups, pairing and setup affect mock data; no commands reach a real speaker.
- **No automatic Wails integration is claimed.** The frontend shape is designed for an adapter to existing backend bindings. Confirm actual operation contracts before attempting integration.
- **No new Bose backend, manufacturer adapters or Zones module.** These remain independent product/architecture questions.
- **Not all hardware-specific dialogs are implemented in depth.** Rare workflows such as alarm editing, remote QR generation and actual media server browsing have navigable simulation placeholders. See `docs/VIEW_COVERAGE.md` for an explicit map.
- **13-language localization is not included.** English demo strings are UI placeholders, not replacement translations for the existing project.

## Original concept

The full earlier concept is retained in `reference/original/svg/` and `reference/original/views/`. This lab modifies the **interaction and information architecture for output management** rather than discarding the original radio, library, settings or maintenance screens.

Typography uses locally bundled Inter variable fonts; see `docs/FONTS.md`. Device identity and capability contracts are in `docs/DEVICE_CAPABILITIES.md`.

See `docs/INFORMATION_ARCHITECTURE.md`, `docs/WAILS_INTEGRATION.md`, and `docs/VIEW_COVERAGE.md`.

The screenshot-based feature gap inventory is maintained in [project/feature-coverage](../project/feature-coverage/coverage.md); it preserves this interaction model while recording missing upstream capabilities.

**Group settings:** use the gear beside Group Members → Add members for the main speaker, Keep group together and supported thumbs-up/down remote group buttons. Remote templates are separate from Once/Twice source presets. Temporary groups and pairs also have a title pencil for renaming. All effects remain local simulation; verified STR mappings and remaining integration work are documented in `docs/DEVICE_CAPABILITIES.md`.

**Update notifications scenario:** select it in Design Lab to report example desktop and speaker updates. A single toast names targets/versions and links to Updates & maintenance, expires after eight seconds, and does not repeat for the same reports when checking again or navigating. Reset the scenario to replay the event. This is simulated availability, with no update service or installation started by the link.
