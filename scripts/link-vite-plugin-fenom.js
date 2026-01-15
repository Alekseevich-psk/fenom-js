import fs from 'node:fs';
import path from 'node:path';

const source = path.resolve('vite-plugin-fenom');
const target = path.resolve('node_modules/vite-plugin-fenom');

if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
}

fs.symlinkSync(source, target, 'dir');
console.log('✅ Символическая ссылка создана: node_modules/vite-plugin-fenom → src/vite-plugin-fenom');

// Проверим тип
const stat = fs.lstatSync(target);
console.log('👉 lstat.isSymbolicLink():', stat.isSymbolicLink()); // Должно быть: true