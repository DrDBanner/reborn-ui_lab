# Inter fonts

The UI and form controls use Inter. Normal and italic variable WOFF2 files live in `src/assets/fonts/`. Vite packages them into the production build, the HTTP preview loads them locally, and the standalone review embeds them as data URLs. The JSON editor uses a monospace face.

Source: [rsms/inter](https://github.com/rsms/inter/tree/353b61b9f4430d5f420d56605a6e7993e0941470/docs/font-files), revision `353b61b9f4430d5f420d56605a6e7993e0941470`. Copyright Rasmus Andersson; [SIL Open Font License 1.1](../LICENSES/Inter-OFL-1.1.txt).

Regenerate with `python3 scripts/vendor-inter.py`, then rebuild the standalone review.
