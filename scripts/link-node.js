import fs from 'node:fs';
import path from 'node:path';

const buildFolders = ["fenom-js", "vite-plugin-fenom"];

buildFolders.forEach(folder => {
    const source = path.resolve(`build/${folder}`);
    const target = path.resolve(`node_modules/${folder}`);

    if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
    }

    fs.symlinkSync(source, target, 'junction');
    console.log(`✅ Символическая ссылка создана: node_modules/${folder} → src/${folder}`);

    // Проверим тип
    const stat = fs.lstatSync(target);
    console.log('👉 lstat.isSymbolicLink():', stat.isSymbolicLink()); // Должно быть: true
});