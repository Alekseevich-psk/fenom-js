import { FenomJs, createAsyncLoader } from 'fenom-js/node';
import { resolve } from 'path';
import { readFile, writeFile } from 'fs/promises';

// Корневая папка шаблонов
const root = resolve('./src/demo');

// Читаем данные
async function run() {
    try {
        const dataPath = resolve('./src/demo/data/cat.json');
        const rawData = await readFile(dataPath, 'utf-8');
        const data = JSON.parse(rawData);
        
        // Читаем шаблон
        const templatePath = resolve('./src/demo/pages/test.tpl');
        const template = await readFile(templatePath, 'utf-8');
        // console.log('📄 Шаблон загружен:', template); // ← добавь это

        const html = await FenomJs(template, {
            context: data,
            loader: createAsyncLoader(root)
        });

        // (Опционально) записать в файл
        await writeFile('example/index.html', html, 'utf-8');
        // console.log('\n📜 Сохранено в example/index.html');
    } catch (err) {
        console.error('❌ Ошибка рендеринга:', err);
    }
}

run();
