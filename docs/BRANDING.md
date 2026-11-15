# ST Reborn branding

The logo uses the ST Reborn mark from [JRpersonal/streborn](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/desktop-app/frontend/public/logo.svg), revision `6c874ee11bd89175427ef65be56eeeeb33317cd9`, under the [Apache-2.0 license](../LICENSES/streborn-Apache-2.0.txt).

`src/assets/brand/st-reborn-original.svg` stores the source asset. `src/components/brand.js` embeds its geometry and red pulse, with neutral strokes using `currentColor` for both themes. The named logo-menu button supplies the accessible label.

Regenerate with `python3 scripts/vendor-brand.py`, then rebuild the standalone review. The app, HTTP preview and standalone HTML render the bundled mark.

## Service and manufacturer marks

Spotify, Bose and GitHub use local monochrome SVGs from theSVG. [Brand notices and pinned sources](../BRAND-NOTICES.md) record their origin, the collection's asset licence and the brands' ownership.

Run `python3 scripts/vendor-service-brands.py` to regenerate the inline paths in `src/components/service-brands.js`. Spotify identifies its navigation, source choices and player artwork. Bose identifies the manufacturer in Device identity. GitHub identifies repository and sponsor links in Help & info. Brand notices appear in Help & info and are bundled into production and standalone builds.
