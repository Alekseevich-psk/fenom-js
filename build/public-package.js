import fs from 'node:fs';
import path from 'node:path';

const srcFenom = path.resolve('./src/packages/fenom/package.json');
const destFenom = path.resolve('./fenom/package.json');

const srcFenomVitePlugin = path.resolve('./src/packages/fenom/package.json');
const destFenomVitePlugin = path.resolve('./fenom/package.json');

fs.copyFileSync(srcFenom, destFenom);
console.log(`✅ package.json скопирован в ${destFenom}`);

fs.copyFileSync(srcFenomVitePlugin, destFenomVitePlugin);
console.log(`✅ package.json скопирован в ${destFenomVitePlugin}`);