import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

// Импортируем СОБРАННЫЙ движок
import { render } from './../dist/index.cjs'

const PORT = 4000;
const DEMO_DIR = resolve('src/demo');

const server = createServer((req, res) => {
    let url = req.url;
    if (url === '/') url = '/index.html';

    if (url.endsWith('.html')) {
        const tplPath = join(DEMO_DIR, url.replace('.html', '.tpl'));
        if (existsSync(tplPath)) {
            try {
                const content = readFileSync(tplPath, 'utf-8');
                const html = render(content, { title: 'From DIST' });
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
            } catch (err) {
                res.writeHead(500);
                res.end(`<h3>Ошибка: ${err.message}</h3>`);
            }
            return;
        }
    }

    res.writeHead(404);
    res.end('Not found');
});

server.listen(PORT, () => {
    console.log(`🔥 Demo on built core: http://localhost:${PORT}`);
});
