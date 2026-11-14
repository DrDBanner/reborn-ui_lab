import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {licenseDocuments} from '../src/components/license-notices.js';
import {renderHelp} from '../src/views/management.js';
const root=new URL('../',import.meta.url);
test('offline licence bundle preserves every repository licence and attribution verbatim',()=>{
 const expected=['LICENSE','NOTICE','THIRD-PARTY-NOTICES.md',...fs.readdirSync(new URL('LICENSES/',root)).filter(name=>name.endsWith('.txt')).map(name=>'LICENSES/'+name)];
 assert.deepEqual(licenseDocuments.map(doc=>doc.path).sort(),expected.sort());
 for(const doc of licenseDocuments)assert.equal(doc.text,fs.readFileSync(new URL(doc.path,root),'utf8'),doc.path);
 assert.equal(JSON.parse(fs.readFileSync(new URL('package.json',root),'utf8')).license,'Apache-2.0');
});
test('Help exposes project author, upstream credit and full local font and icon licences',()=>{
 const html=renderHelp({});
 for(const text of ['Dr. D. Banner','https://github.com/DrDBanner','Jens Roggenfelder','Licenses and attribution','Apache License','SIL OPEN FONT LICENSE','LICENSES/streborn-NOTICE.txt'])assert(html.includes(text),text);
 assert(html.includes('<pre tabindex="0"'));
});
