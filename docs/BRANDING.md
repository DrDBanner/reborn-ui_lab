# ST Reborn branding

The logo uses the ST Reborn mark from [JRpersonal/streborn](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/desktop-app/frontend/public/logo.svg), revision `6c874ee11bd89175427ef65be56eeeeb33317cd9`, under the [Apache-2.0 license](../LICENSES/streborn-Apache-2.0.txt).

`src/assets/brand/st-reborn-original.svg` stores the source asset. `src/components/brand.js` embeds its geometry and red pulse, with neutral strokes using `currentColor` for both themes. The named logo-menu button supplies the accessible label.

Regenerate with `python3 scripts/vendor-brand.py`, then rebuild the standalone review. The app, HTTP preview and standalone HTML render the bundled mark.
