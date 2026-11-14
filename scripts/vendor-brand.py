#!/usr/bin/env python3
"""Vendor the original ST Reborn mark and emit its theme-aware inline version."""
from pathlib import Path
import json
import urllib.request
ROOT=Path(__file__).resolve().parent.parent
REVISION='6c874ee11bd89175427ef65be56eeeeb33317cd9'
BASE=f'https://raw.githubusercontent.com/JRpersonal/streborn/{REVISION}'
if __name__=='__main__':
    folder=ROOT/'src/assets/brand';folder.mkdir(parents=True,exist_ok=True)
    with urllib.request.urlopen(f'{BASE}/desktop-app/frontend/public/logo.svg',timeout=30) as response:
        original=response.read()
    (folder/'st-reborn-original.svg').write_bytes(original)
    inline=original.decode().replace('#000000','currentColor').replace('role="img" aria-label="STR SoundTouch Reborn"','class="brand-mark" aria-hidden="true" focusable="false"')
    (ROOT/'src/components/brand.js').write_text('// Modified for UI Lab: theme-aware neutral strokes and accessible control wrapper.\n// Source and license: docs/BRANDING.md\nexport const brandMark=()=>'+json.dumps(inline)+';\n')
    with urllib.request.urlopen(f'{BASE}/LICENSE',timeout=30) as response:
        (ROOT/'LICENSES/streborn-Apache-2.0.txt').write_bytes(response.read())
    with urllib.request.urlopen(f"{BASE}/NOTICE",timeout=30) as response:
        (ROOT/'LICENSES/streborn-NOTICE.txt').write_bytes(response.read())
    print('Vendored original ST Reborn logo:',REVISION)
