# ST Reborn — UI Lab

Interactive frontend for managing audio sources, devices, stereo pairs, groups and concurrent playback. Built with JavaScript modules, Vite, Tailwind CSS and daisyUI. Inter and Google Material Symbols are bundled locally.

## Run

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Device and source data comes from JSON fixtures; actions update the local simulation. Scenario changes and appearance settings persist in browser `localStorage`.

| Command | Purpose |
|---|---|
| `npm test` | Model, view and standalone integration tests |
| `npm run validate` | Validate scenario fixtures |
| `npm run build` | Build production assets into `dist/` |
| `python3 scripts/build-standalone.py` | Generate `ST_Reborn_UI_Lab_Standalone.html` for offline review |

Open the standalone HTML directly in a browser. For the module preview, serve the repository over HTTP and open `preview.html`.

## Scenarios

Select a scenario through the logo menu or Design Lab. Reset reloads its shipped fixture.

| Scenario | Data and behavior |
|---|---|
| Everyday use | Seven devices, a stereo pair, a group and two streams |
| Problem of N · 50 devices | 50 physical devices, 38 playback targets, search and filters |
| Several streams | Four concurrent playback sessions |
| Maintenance & errors | Updating, offline and setup states |
| Device capabilities | Different key counts, gesture layers and device functions |
| First run | Empty inventory and speaker setup |
| Update notifications | Desktop and device update reports with a linked toast |

Design Lab also provides navigation variants, appearance controls, JSON editing and export.

## Source

| Location | Responsibility |
|---|---|
| `src/app/` | Model, state, persistence and actions |
| `src/components/` | Navigation, player, dialogs and shared controls |
| `src/views/` | Media, outputs, item details, maintenance and Design Lab |
| `src/styles/` | Theme, layout and control styling |
| `src/assets/` | Local fonts and branding |
| `public/data/` | Scenarios, sources and UI configuration |
| `tests/` | Automated checks |
| `scripts/` | Asset generation, validation and browser checks |

## Documentation

- [Interaction model](docs/INFORMATION_ARCHITECTURE.md)
- [Device capabilities](docs/DEVICE_CAPABILITIES.md)
- [View coverage](docs/VIEW_COVERAGE.md)
- [Backend integration plan](docs/WAILS_INTEGRATION.md)
- [Fonts](docs/FONTS.md), [icons](docs/MATERIAL_ICONS.md) and [branding](docs/BRANDING.md)
