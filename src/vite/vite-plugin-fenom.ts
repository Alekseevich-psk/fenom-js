// src/core/vite-plugin-fenom.ts
import type { Plugin, ResolvedConfig } from 'vite';
import type { UserConfig } from '../fenom/types/common';

import fs from 'node:fs';
import { join, basename, dirname, relative, resolve } from 'path';

import { collectJsonDataMerged } from '../fenom/compiler/functions';
import { createSyncLoader } from '../fenom/loader/loader';
import { FenomJs as render } from '../fenom/render';

export default function fenomPlugin(userOptions: UserConfig = {}): Plugin {
    const defaults = {
        root: './src/demo',
        dataDir: './src/demo/data',
        pagesDir: 'pages',
        scanAll: false,
        minify: false
    };

    const options = {
        root: userOptions.root ?? defaults.root,
        dataDir: userOptions.dataDir ?? defaults.dataDir,
        pagesDir: userOptions.pagesDir ?? defaults.pagesDir,
        scanAll: userOptions.scanAll ?? defaults.scanAll,
        minify: userOptions.minify ?? defaults.minify
    };

    let config: ResolvedConfig;
    let root: string;
    let dataDir: string;
    let minify: boolean;
    let resolvedPagesDir: string;

    return {
        name: 'vite-plugin-fenom',

        configResolved(resolvedConfig) {
            config = resolvedConfig;
            root = resolve(process.cwd(), options.root);
            dataDir = resolve(process.cwd(), options.dataDir);
            resolvedPagesDir = options.pagesDir;
            minify = options.minify;
        },

        // 🔥 Dev-режим: обслуживание .tpl из pages/
        configureServer(server) {
            const serverRoot = root;
            const serverDataDir = dataDir;
            const pagesDirName = resolvedPagesDir;

            const injectHmrScript = (html: string): string => {
                if (html.includes('</head>')) {
                    return html.replace(
                        /<\/head>/i,
                        `<script type="module" src="/@vite/client"></script></head>`
                    );
                } else if (html.includes('<head')) {
                    return html.replace(
                        /<head[\s\S]*?>/i,
                        `$&<script type="module" src="/@vite/client"></script>`
                    );
                } else if (html.includes('<body>')) {
                    return html.replace(
                        /<body>/i,
                        `<body><script type="module" src="/@vite/client"></script>`
                    );
                } else {
                    return `<script type="module" src="/@vite/client"></script>${html}`;
                }
            };

            server.middlewares.use(async (req, res, next) => {
                const url = req.url;

                if (url === '/' || url?.endsWith('.html')) {
                    const path = url === '/' ? 'index' : url.replace(/^\/|\.html$/g, '');
                    const pagesPath = join(serverRoot, pagesDirName);
                    const directPath = join(pagesPath, `${path}.tpl`);
                    const indexPath = join(pagesPath, path, 'index.tpl');

                    let tplPath = '';

                    if (fs.existsSync(directPath)) {
                        tplPath = directPath;
                    } else if (fs.existsSync(indexPath)) {
                        tplPath = indexPath;
                    }

                    if (tplPath) {
                        const content = fs.readFileSync(tplPath, 'utf-8');
                        const data = collectJsonDataMerged(serverDataDir);

                        const html = render(content, data, {
                            root: serverRoot,
                            loader: createSyncLoader(serverRoot),
                            minify
                        });

                        const htmlWithHmr = injectHmrScript(html); // ✅ Надёжно

                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(htmlWithHmr);
                        return;
                    }
                }

                next();
            });

            // HMR: перезагрузка при изменении .tpl в pages/
            server.watcher.on('change', (file) => {
                if (file.endsWith('.tpl')) {
                    console.log('🔁 Шаблон изменён — перезагрузка:', basename(file));

                    // ✅ Правильный формат
                    if (server.ws) {
                        server.ws.send({
                            type: 'full-reload',
                            path: '/' // ← клиент поймёт, что нужно перезагрузить всё
                        });
                    } else {
                        console.warn('[Fenom] WebSocket не доступен для HMR');
                    }
                }
            });
        },

        // ✅ Сборка: генерация .html
        async generateBundle() {
            if (config.command !== 'build') return;

            const pagesDir = join(root, resolvedPagesDir);

            if (!fs.existsSync(pagesDir)) {
                this.warn(`[Fenom] Папка "${resolvedPagesDir}" не найдена: ${pagesDir}`);
                return;
            }

            const tplFiles: string[] = [];

            // Собираем .tpl из pages/ (рекурсивно)
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

            walk(pagesDir);

            // Если scanAll = true → добавляем все .tpl вне pages/
            if (options.scanAll) {
                function walkAll(dir: string) {
                    if (!fs.existsSync(dir)) return;
                    for (const item of fs.readdirSync(dir)) {
                        const fullPath = join(dir, item);
                        const stat = fs.statSync(fullPath);
                        if (stat.isDirectory()) {
                            walkAll(fullPath);
                        } else if (item.endsWith('.tpl') && !fullPath.startsWith(pagesDir)) {
                            tplFiles.push(fullPath);
                        }
                    }
                }
                walkAll(root);
            }

            this.info(`[Fenom] Найдено шаблонов: ${tplFiles.length}`);

            for (const tplPath of tplFiles) {
                try {
                    const content = fs.readFileSync(tplPath, 'utf-8');
                    const data = collectJsonDataMerged(dataDir);

                    const html = render(content, data, {
                        root,
                        loader: createSyncLoader(root),
                        minify
                    });

                    // Определяем путь: относительно pagesDir (если внутри), иначе — относительно root
                    const baseDir = tplPath.startsWith(pagesDir) ? pagesDir : root;
                    const relativePath = relative(baseDir, tplPath);
                    const fileName = basename(relativePath, '.tpl');
                    const subDir = dirname(relativePath);
                    const outDir = subDir === '.' ? '' : subDir;
                    const outPath = join(outDir, `${fileName}.html`).replace(/\\/g, '/');

                    // Rollup не принимает пути с ".." или "/"
                    if (outPath.startsWith('..') || outPath.startsWith('/')) {
                        this.warn(`[Fenom] Пропущен недопустимый путь: ${outPath}`);
                        continue;
                    }

                    this.emitFile({
                        type: 'asset',
                        fileName: outPath,
                        source: html
                    });

                    this.info(`✅ Страница: ${outPath}`);
                } catch (err) {
                    this.error(`❌ Ошибка при обработке ${tplPath}: ${err}`);
                }
            }
        }
    };
}
