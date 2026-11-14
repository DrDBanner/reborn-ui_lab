# Original ST Reborn mark

The logo uses the original ST Reborn icon from [JRpersonal/streborn](https://github.com/JRpersonal/streborn/blob/6c874ee11bd89175427ef65be56eeeeb33317cd9/desktop-app/frontend/public/logo.svg), revision `6c874ee11bd89175427ef65be56eeeeb33317cd9`, under the upstream [Apache-2.0 license](../LICENSES/streborn-Apache-2.0.txt).

`src/assets/brand/st-reborn-original.svg` is an unchanged copy. `src/components/brand.js` embeds the same geometry and red pulse accent, with black neutral strokes changed to `currentColor` so the mark remains readable in both themes. The icon is decorative within the named ST Reborn menu button. It is not a Material icon.

Regenerate with `python3 scripts/vendor-brand.py`. The generated inline mark works in the normal app, plain preview and standalone review without network access. Functional stream/casting indicators use Google Material `music_cast` independently of the product mark.
