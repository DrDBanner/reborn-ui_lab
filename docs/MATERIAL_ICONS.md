# Material icons

All interface icons use Google's **Material Symbols Rounded**, 24px, default unfilled variant. SVG path data is bundled locally in `src/components/material-icons.js` and rendered by the shared `icon()` helper. Icons inherit their control's color and size and are hidden from assistive technology; icon-only buttons provide accessible labels.

Source: [google/material-design-icons](https://github.com/google/material-design-icons/tree/10ecc14790612ca8fd164e3f4ffe9c16fc50d5b7/symbols/web), revision `10ecc14790612ca8fd164e3f4ffe9c16fc50d5b7`. Copyright Google; [Apache License 2.0](../LICENSES/material-symbols-Apache-2.0.txt). SVG paths are unmodified. Legacy names are mapped to their current symbol equivalents by the vendor script.

Run `python3 scripts/vendor-material-icons.py` to regenerate the selected assets from that pinned revision. Normal development, production builds, the plain preview and the generated standalone review need no network access for icons. No icon font or font fallback is used.

When adding a symbol, add its official name to the vendor script, regenerate the module, then rebuild the standalone review. Keep action icons semantically appropriate: speakers for outputs, a hub for multiroom groups, a phone for remote control, and standard playback/navigation symbols for their actions.
