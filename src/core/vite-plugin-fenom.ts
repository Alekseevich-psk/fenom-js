import type { ViteDevServer } from 'vite';
import type { UserConfig } from './types/common';

import fs from 'node:fs';
import { collectJsonDataMerged } from './compiler/functions';

export default function fenomPlugin(userOptions: UserConfig) {
    const defaults = {
        root: './src',
        dataDir: './src'
    };

    const options = { ...defaults, ...userOptions };

    return {
        name: 'vite-plugin-fenom',

        configResolved() {},

        configureServer(server: ViteDevServer) {
            const { root } = options;

            server.middlewares.use(async (req, res, next) => {
                const url = req.url;

                // Обрабатываем / и .html
                if (url === '/' || url?.endsWith('.html')) {
                    const tplPath =
                        url === '/'
                            ? `${root}/index.tpl`
                            : `${root}/${url.replace('.html', '.tpl')}`;

                    if (fs.existsSync(tplPath)) {
                        const content = fs.readFileSync(tplPath, 'utf-8');
                        const { render } = await import('./index');
                        const html = render(content, collectJsonDataMerged(options.dataDir));

                        // 🔥 Вставляем HMR-клиент вручную
                        const htmlWithHmr = html.replace(
                            /<\/head>/i,
                            `<script type="module" src="/@vite/client"></script></head>`
                        );

                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(htmlWithHmr);
                        return;
                    }
                }

                next();
            });

            // 🔁 HMR
            server.watcher.on('change', (file) => {
                if (file.endsWith('.tpl')) {
                    console.log('🔁 .tpl изменён — перезагрузка:', file);
                    server.ws.send({ type: 'full-reload' });
                }

                console.log('🔁Изменён — перезагрузка:', file);
            });
        },
    };
}