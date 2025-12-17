import fs from 'node:fs';
import path from 'node:path';

const folders = ['fenom-js', 'vite-plugin-fenom'];

folders.forEach(folder => {
    const folderPath = path.resolve(folder);

    if (fs.existsSync(folderPath)) {
        console.log(`Удаляем папку: ${folderPath}`);
        fs.rmSync(folderPath, { recursive: true, force: true });
        console.log(`✅ Успешно удалено: ${folder}`);
    } else {
        console.log(`❌ Папка не найдена: ${folder}`);
    }
});

console.log('Очистка завершена.');
