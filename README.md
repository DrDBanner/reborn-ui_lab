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

The normal Vite version compiles Tailwind and daisyUI. `preview.html` omits these external build dependencies; it is intended only for inspecting interactions. Google Material Symbols are fetched from Google Fonts in the normal build, with Unicode fallbacks when unavailable. **No font files are bundled.**

## What can I try?

- **The problem of N:** use the `30 speakers` scenario. Sidebar shows selected/top-level shortcuts; the main **Outputs & groups** workspace filters and manages the full list.
- **Speaker placement A/B:** open **Design Lab** and switch between *A — Player panel* and *B — Sidebar*. Shared playback and group state does not reset.
- **Independent streams:** choose `Several streams`, use the session selector in the bottom player; select another source and assign it to another output.
- **Groups and pairs:** select available items on **Outputs & groups**, then **Create group** or **Stereo pair**. Manage or dissolve each as one output.
- **Maintenance states:** select `Maintenance & errors` and advance firmware progress in **Updates & maintenance**.
- **First run:** select `First run` to exercise empty states and the setup wizard.
- **Live design adjustments:** edit accent, radius, density and sidebar width in **Design Lab**, then export design tokens.
- **JSON editing:** enable the scenario editor in **Design Lab**, apply edited JSON, or export your changes.

The prototype stores per-scenario changes and visual tokens in browser `localStorage`. Reset a scenario in **Design Lab** to load the original JSON fixture.

## Where to edit

| File / folder | Purpose |
|---|---|
| `src/components/shell.js` | Sidebar sections, pinned active output, player and top bar |
| `src/views/listen.js` | Radio, presets, library, history and Spotify |
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

See `docs/INFORMATION_ARCHITECTURE.md`, `docs/WAILS_INTEGRATION.md`, and `docs/VIEW_COVERAGE.md`.
