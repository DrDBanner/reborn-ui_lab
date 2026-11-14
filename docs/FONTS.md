# Local Inter fonts

The entire application UI uses Inter, including form controls. The normal and italic variable WOFF2 fonts are local assets under `src/assets/fonts/`. Vite packages them into the production build; the plain HTTP preview uses the same files. The standalone review embeds both fonts as data URLs and works offline.

Source: [rsms/inter](https://github.com/rsms/inter/tree/353b61b9f4430d5f420d56605a6e7993e0941470/docs/font-files), revision `353b61b9f4430d5f420d56605a6e7993e0941470`. Copyright Rasmus Andersson. Unmodified fonts, redistributed under the [SIL Open Font License 1.1](../LICENSES/Inter-OFL-1.1.txt).

Regenerate with `python3 scripts/vendor-inter.py`, then rebuild the standalone review. No font CDN is contacted at runtime. The JSON editor retains a monospace face for editing code.
