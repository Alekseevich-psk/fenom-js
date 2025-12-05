// vite.config.js
import { render } from './src/core/index.ts';
import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import fs from 'node:fs';

export default defineConfig({

    server: {
        port: 3000,
        open: '/index.html', // можно оставить — будет /index.html → index.tpl
    },

    plugins: [
        {
            name: 'fenom-dev-server',
            configureServer(server) {
                const demoDir = resolve('src/demo'); // папка с .tpl
                const publicDir = resolve('public'); // если есть статика

                server.middlewares.use(async (req, res, next) => {
                    const url = req.url;

                    // 🟢 Обрабатываем только .html и /
                    if (url === '/' || url.endsWith('.html')) {
                        // Преобразуем /about.html → /about.tpl
                        const tplPath = url === '/'
                            ? resolve(demoDir, 'index.tpl')
                            : resolve(demoDir, '.' + url.replace('.html', '.tpl'));

                        console.log('🔍 Ищем шаблон:', tplPath);

                        if (fs.existsSync(tplPath)) {
                            console.log('✅ Найден — рендерим:', tplPath);

                            try {
                                const content = fs.readFileSync(tplPath, 'utf-8');

                                if (!render) {
                                    res.statusCode = 500;
                                    res.end('<h3>❌ Ошибка: движок не загружен</h3>');
                                    return;
                                }

                                const html = render(content, {
                                    title: 'Dev Mode',
                                    url: url,
                                });

                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                                res.end(html);
                                return;
                            } catch (err) {
                                console.error('❌ Ошибка рендера:', err);
                                res.statusCode = 500;
                                res.end(`<h3>Ошибка: ${err.message}</h3>`);
                                return;
                            }
                        } else {
                            console.log('❌ Шаблон не найден — передаём дальше');
                        }
                    }

                    // Если не .html или не наш .tpl — передаём дальше (например, статика)
                    next();
                });

                // 🔁 HMR: при изменении .tpl или .ts
                server.watcher.add('src/demo/**/*.tpl');
                server.watcher.add('src/core/**/*.{ts,js}');

                server.watcher.on('change', (file) => {
                    console.log('🔁 Изменён:', file);
                    server.ws.send({ type: 'full-reload' });
                });
            },
        },
    ],
});