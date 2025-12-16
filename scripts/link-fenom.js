import fs from 'node:fs';
import path from 'node:path';

const source = path.resolve('fenom-js');
const target = path.resolve('node_modules/fenom-js');

if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
}

fs.symlinkSync(source, target, 'dir');
console.log('✅ Символическая ссылка создана: node_modules/fenom-js → src/fenom-js');

// Проверим тип
const stat = fs.lstatSync(target);
console.log('👉 lstat.isSymbolicLink():', stat.isSymbolicLink()); // Должно быть: true