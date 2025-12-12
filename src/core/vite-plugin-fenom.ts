// src/core/vite-plugin-fenom.ts
import type { Plugin, ResolvedConfig } from 'vite';
import type { UserConfig } from './types/common';

import fs from 'node:fs';
import { join, basename, dirname, relative } from 'path';

import { collectJsonDataMerged } from './compiler/functions';
import { createSyncLoader } from './loader/loader';
import { render } from './render';

export default function fenomPlugin(userOptions: UserConfig): Plugin {
    const defaults = { root: './src/demo', dataDir: './src/demo/data', minify: true };

    const options = {
        root: userOptions?.root ?? defaults.root,
        dataDir: userOptions?.dataDir ?? defaults.dataDir,
        minify: userOptions?.minify ?? defaults.minify
    };

    let config: ResolvedConfig;
    let root: string;
    let dataDir: string;
    let minify: boolean;

    return {
        name: 'vite-plugin-fenom',

        configResolved(resolvedConfig) {
            config = resolvedConfig;
            root = join(process.cwd(), options.root);
            dataDir = join(process.cwd(), options.dataDir);
            minify = options.minify;
        },

        // 🔥 Dev-режим: обработка запросов
        configureServer(server) {
            const serverRoot = root;
            const serverDataDir = dataDir;

            server.middlewares.use(async (req, res, next) => {
                const url = req.url;

                // Поддержка: / → index.tpl, /about → about.tpl
                if (url === '/' || url?.endsWith('.html')) {
                    const fileName = url === '/' ? 'index' : url.replace(/\.html$/, '');
                    const tplPath = join(serverRoot, `${fileName}.tpl`);

                    if (fs.existsSync(tplPath)) {
                        const content = fs.readFileSync(tplPath, 'utf-8');
                        const data = collectJsonDataMerged(serverDataDir);

                        const html = render(content, data, {
                            root,
                            loader: createSyncLoader(serverRoot),
                            minify
                        });

                        // Добавляем HMR-скрипт в dev
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

            // HMR при изменении .tpl
            server.watcher.on('change', (file) => {
                if (file.endsWith('.tpl')) {
                    console.log('🔁 Шаблон изменён — перезагрузка:', file);
                    server.ws.send({ type: 'full-reload' });
                }
            });
        },

        // ✅ Сборка: генерация .html из .tpl
        async generateBundle(options, bundle) {
            if (config.command !== 'build') return;

            const tplFiles: string[] = [];

            // Рекурсивный поиск .tpl в root
            function walk(dir: string) {
                if (!fs.existsSync(dir)) return;
                for (const item of fs.readdirSync(dir)) {
                    const fullPath = join(dir, item);
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        walk(fullPath);
                    } else if (item.endsWith('.tpl')) {
                        tplFiles.push(fullPath);
                    }
                }
            }

            walk(root);

            this.info(`[Fenom] Найдено .tpl файлов: ${tplFiles.length}`);

            for (const tplPath of tplFiles) {
                try {
                    const content = fs.readFileSync(tplPath, 'utf-8');
                    const data = collectJsonDataMerged(dataDir);

                    const html = render(content, data, {
                        root,
                        loader: createSyncLoader(root),
                        minify
                    });

                    // Вычисляем путь внутри dist (сохраняем структуру)
                    const relativeDir = relative(root, dirname(tplPath));
                    const fileName = basename(tplPath, '.tpl');
                    const outPath = join(relativeDir, `${fileName}.html`).replace(/^\.\./, '').replace(/^\//, '');

                    // Добавляем в бандл
                    this.emitFile({
                        type: 'asset',
                        fileName: outPath,
                        source: html
                    });

                    this.info(`✅ Сгенерирован: ${outPath}`);
                } catch (err) {
                    this.error(`❌ Ошибка при компиляции ${tplPath}: ${err}`);
                }
            }
        }
    };
}
