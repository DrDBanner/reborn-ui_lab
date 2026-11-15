# Material icons

Interface actions use Google's **Material Symbols Rounded**, 24px. SVG paths are bundled in `src/components/material-icons.js` and rendered by the shared `icon()` helper. Symbols inherit their control's color and size. Icon-only buttons provide accessible labels; decorative SVGs use `aria-hidden`.

Source: [google/material-design-icons](https://github.com/google/material-design-icons/tree/10ecc14790612ca8fd164e3f4ffe9c16fc50d5b7/symbols/web), revision `10ecc14790612ca8fd164e3f4ffe9c16fc50d5b7`. Copyright Google; [Apache License 2.0](../LICENSES/material-symbols-Apache-2.0.txt).

Run `python3 scripts/vendor-material-icons.py` to regenerate assets and resolve symbol aliases. Add a symbol's official name to that script, regenerate the module, then rebuild the standalone HTML. Vite, the HTTP preview and the standalone review render the local SVG data.

| Symbol | Use |
|---|---|
| `speaker` / `speaker_group` | Device and stereo pair types |
| `lan` | Group type and Add to existing group |
| `play_circle` / `pause_circle` | Immediate playback actions |
| `music_cast` | Output selection and stream indicators |
| `read_more` | Open the current player's media view |
| `format_list_bulleted` | View a supplied station playlist |
| `track_changes` | Radio station supports track information |
| `search_insights` | Radio station information |
| `add_link` | One-time button-assignment transfer |
| `open_in_new` | Explicit member-detail navigation |
| `favorite` | Saved favorite; filled pink-red heart |
| `favorite_border` | Favorite action; pink-red on hover/focus |
| `expand_more` | Select arrow |
| `check_circle` / `release_alert` | Firmware current / update available, with tooltip and accessible label |

The select arrow uses the local SVG path through `src/styles/selects.css`; padding reserves its space and centers it vertically. Member Open actions appear on row hover or keyboard focus and stay visible on touch. Remove uses a separate control.

The bottom player retains the Material Play/Pause center glyph and renders its circular outline as an SVG stroke with the same bounds and weight. On playback-context changes, a gap travels around that ring before it returns to a complete circle. Clicks briefly pulse only the ring. Reduced-motion preferences keep the outline still.
