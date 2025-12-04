import fs from 'node:fs';
import { join, extname, relative } from 'path';
import chokidar from 'chokidar'; // ✅ Надёжный watcher

import { render } from './../fenom-js/index';

export default function fenomPlugin(options = {}) {
    const {
        templatesDir = './src/demo',
        data = {},
        includeSubDirs = false,
    } = options;

    return {
        name: 'vite-plugin-fenom',

        configureServer(server) {
            const projectRoot = server.config.root;
            const templatesPath = join(projectRoot, templatesDir);

            console.log('📁 Папка шаблонов:', templatesPath);

            let tplCache = {};

            function getAllTpls(dir) {
                const results = [];
                try {
                    const list = fs.readdirSync(dir);
                    list.forEach(file => {
                        const filePath = join(dir, file);
                        const stat = fs.statSync(filePath);
                        if (stat.isDirectory()) {
                            results.push(...getAllTpls(filePath));
                        } else if (extname(file) === '.tpl') {
                            results.push(filePath);
                        }
                    });
                } catch (e) { }
                return results;
            }

            function loadTemplates() {
                tplCache = {};
                const files = getAllTpls(templatesPath);
                files.forEach(file => {
                    const content = fs.readFileSync(file, 'utf-8');
                    const route = '/' + relative(templatesPath, file)
                        .replace(/\\/g, '/')
                        .replace(/\.tpl$/, '.html');
                    tplCache[route] = content;
                    console.log('📄 Кэшировано:', route);
                });
            }

            loadTemplates();

            // ✅ Используем chokidar — надёжнее
            const pattern = includeSubDirs ? '**/*.tpl' : '*.tpl';
            const watcher = chokidar.watch(join(templatesPath, pattern), {
                ignoreInitial: true,
                cwd: projectRoot,
            });

            const reload = () => {
                console.log('🔄 Шаблоны обновлены — перезагрузка...');
                loadTemplates();
                server.ws.send({ type: 'full-reload' });
            };

            watcher.on('add', reload);
            watcher.on('change', reload);
            watcher.on('unlink', reload);

            // 🔥 Middleware
            return () => {
                server.middlewares.use((req, res, next) => {
                    let url = req.url;

                    if (url === '/') url = '/index.html';

                    if (url.endsWith('.html')) {
                        const template = tplCache[url];
                        if (template) {
                            try {
                                const html = render(template, data);
                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                                res.end(html);
                                return;
                            } catch (err) {
                                res.statusCode = 500;
                                res.end(`<h3>Ошибка: ${err.message}</h3>`);
                                return;
                            }
                        }
                    }

                    next();
                });
            };
        },
    };
}
