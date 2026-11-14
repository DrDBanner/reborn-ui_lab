#!/usr/bin/env python3
"""Vendor unmodified Inter variable fonts and their SIL Open Font License."""
from pathlib import Path
import urllib.request
ROOT=Path(__file__).resolve().parent.parent
REVISION='353b61b9f4430d5f420d56605a6e7993e0941470'
BASE=f'https://raw.githubusercontent.com/rsms/inter/{REVISION}'
if __name__=='__main__':
    assets=ROOT/'src/assets/fonts';assets.mkdir(parents=True,exist_ok=True)
    for name in ['InterVariable.woff2','InterVariable-Italic.woff2']:
        with urllib.request.urlopen(f'{BASE}/docs/font-files/{name}',timeout=30) as response:
            (assets/name).write_bytes(response.read())
    with urllib.request.urlopen(f'{BASE}/LICENSE.txt',timeout=30) as response:
        (ROOT/'LICENSES/Inter-OFL-1.1.txt').write_bytes(response.read())
    print('Vendored Inter variable fonts:',REVISION)
