
import { FenomJs, createAsyncLoader } from 'fenom-js';
import { resolve } from 'path';
import { readFile, writeFile } from 'fs/promises';

// Корневая папка шаблонов
const root = resolve('./src/demo');

// Создаём асинхронный загрузчик
const loader = createAsyncLoader(root);

// Читаем данные
async function run() {
    try {
        const dataPath = resolve('./src/demo/data/data.json');
        const rawData = await readFile(dataPath, 'utf-8');
        const data = JSON.parse(rawData);

        // Добавим дату в контекст
        data.date = Math.floor(Date.now() / 1000);

        // Читаем шаблон
        const templatePath = resolve('./src/demo/pages/index.tpl');
        const template = await readFile(templatePath, 'utf-8');
        // console.log('📄 Шаблон загружен:', template); // ← добавь это

        const html = await FenomJs(template, data, { loader, root, minify: false });

        // console.log('📏 Длина результата:', html.length); // ←
        // console.log('🔤 HTML:', html || '(пусто)');

        // (Опционально) записать в файл
        await writeFile('example/index.html', html, 'utf-8');
        // console.log('\n📜 Сохранено в example/index.html');
    } catch (err) {
        console.error('❌ Ошибка рендеринга:', err);
    }
}

run();
