#!/usr/bin/env python3
"""Create a single-file preview (no npm, local server or backend needed).
For review only. The normal Vite build remains the maintained source of truth.
"""
import json,re,base64
from pathlib import Path
root=Path(__file__).resolve().parent.parent
files=['src/components/material-icons.js','src/app/model.js','src/app/store.js','src/components/shared.js','src/components/shell.js','src/components/dialog.js','src/views/device-functions.js','src/views/sessions.js','src/views/listen.js','src/views/outputs.js','src/views/management.js','src/views/lab.js','src/app/controller.js','src/main.js']
js=[]
for filename in files:
 text=(root/filename).read_text()
 text=re.sub(r'^import\s+.+?\s+from\s+[\'\"].+?[\'\"];?\s*$', '', text, flags=re.M)
 text=re.sub(r'^export\s+(?=(?:const|function|async function|class)\b)', '', text, flags=re.M)
 if re.search(r'^\s*(?:import|export)\s',text,flags=re.M):raise ValueError('Untransformed module syntax: '+filename)
 js.append('// ===== '+filename+' =====\n'+text)
alljs='\n'.join(js)
catalog=json.loads((root/'public/data/catalog.json').read_text())
index=json.loads((root/'public/data/scenario-index.json').read_text())
design=json.loads((root/'public/data/design-tokens.json').read_text())
scenarios={x['id']:json.loads((root/'public/data/scenarios'/f"{x['id']}.json").read_text()) for x in index}
fixtures={'/data/catalog.json':catalog,'/data/scenario-index.json':index,'/data/design-tokens.json':design, '/data/ui-layout.json':json.loads((root/'public/data/ui-layout.json').read_text()), '/data/variants.json':json.loads((root/'public/data/variants.json').read_text())}
fixtures.update({f'/data/scenarios/{name}.json':data for name,data in scenarios.items()})
css='\n'.join((root/f).read_text() for f in ['src/styles/fonts.css','src/styles/theme.css','src/styles/base.css'])
for font in ['InterVariable.woff2','InterVariable-Italic.woff2']:
 css=css.replace(f'../assets/fonts/{font}', 'data:font/woff2;base64,'+base64.b64encode((root/'src/assets/fonts'/font).read_bytes()).decode())
# Avoid accidental </script> breaking inline sources.
alljs=alljs.replace('</script>','<\\/script>')
fixturejson=json.dumps(fixtures,ensure_ascii=False).replace('</script>','<\\/script>')
html=f'''<!doctype html><html lang="en" data-theme="streborn-dark"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>ST Reborn — UI Lab · Single-file Review</title>
<style>{css}</style></head><body><div id="app"><div class="boot">Loading UI Lab…</div></div>
<script>window.__reviewFixtures={fixturejson};
const __realFetch=window.fetch.bind(window);
window.fetch=async function(input,...args){{const key=typeof input==='string'?input:String(input.url||input);if(Object.hasOwn(window.__reviewFixtures,key))return new Response(JSON.stringify(window.__reviewFixtures[key]),{{status:200,headers:{{'Content-Type':'application/json'}}}});return __realFetch(input,...args)}};</script>
<script>{alljs}</script></body></html>'''
output=root/'ST_Reborn_UI_Lab_Standalone.html'
output.write_text(html)
print(f'Created {output}: {output.stat().st_size:,} bytes')
