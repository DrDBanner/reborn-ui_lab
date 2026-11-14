import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

function licenseFiles(){
  const root=new URL('./',import.meta.url);
  return {name:'license-files',generateBundle(){
    const paths=['LICENSE','NOTICE','THIRD-PARTY-NOTICES.md',...fs.readdirSync(new URL('LICENSES/',root)).filter(name=>name.endsWith('.txt')).map(name=>'LICENSES/'+name)];
    for(const fileName of paths)this.emitFile({type:'asset',fileName,source:fs.readFileSync(fileURLToPath(new URL(fileName,root)))});
  }};
}

export default defineConfig({
  plugins: [tailwindcss(),licenseFiles()],
  server: { port: 5173, strictPort: false },
  build: { outDir: 'dist', emptyOutDir: true },
});
