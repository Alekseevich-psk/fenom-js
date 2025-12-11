import fs from 'node:fs';
import { join } from 'path';
import { collectJsonDataMerged } from './compiler/functions';
import { render } from './render';
export default function fenomPlugin(userOptions) {
    const defaults = { root: './src', dataDir: './src' };
    const options = { ...defaults, ...userOptions };
    return {
        name: 'vite-plugin-fenom',
        configureServer(server) {
            const root = join(process.cwd(), options.root);
            const dataDir = join(process.cwd(), options.dataDir);
            server.middlewares.use(async (req, res, next) => {
                const url = req.url;
                // Поддержка / → index.tpl, /about → about.tpl
                if (url === '/' || url?.endsWith('.html')) {
                    const fileName = url === '/' ? 'index' : url.replace('.html', '');
                    const tplPath = join(root, `${fileName}.tpl`);
                    if (fs.existsSync(tplPath)) {
                        const content = fs.readFileSync(tplPath, 'utf-8');
                        const data = collectJsonDataMerged(dataDir);
                        const html = render(content, data, root);
                        const htmlWithHmr = html.replace(/<\/head>/i, `<script type="module" src="/@vite/client"></script></head>`);
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(htmlWithHmr);
                        return;
                    }
                }
                next();
            });
            // HMR при изменении .tpl
            server.watcher.on('change', (file) => {
                if (file.endsWith('.tpl')) {
                    console.log('🔁 Шаблон изменён — перезагрузка:', file);
                    server.ws.send({ type: 'full-reload' });
                }
            });
        },
        // Опционально: поддержка сборки (buildStart + transform)
        buildStart() {
            console.log('[Fenom] Сборка шаблонов...');
        },
    };
}
