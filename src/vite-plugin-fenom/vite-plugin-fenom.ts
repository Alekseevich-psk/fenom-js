import type { Plugin, ResolvedConfig } from 'vite';
import type { UserConfig, ScanOptions, ScannedAssets } from './types/common';

import fs from 'node:fs';
import { join, basename, relative, extname, dirname, resolve } from 'path';

import { collectJsonDataMerged, } from './utils/functions';
import { scanProject, escapeRegExp, getOutPath } from './utils/scan-assets';
import { createSyncLoader } from './loader/loader';

// import { FenomJs } from '../fenom-js/index';
import { FenomJs } from 'fenom-js';

export default function fenomPlugin(userOptions: UserConfig = {}): Plugin {
    const defaults = {
        root: './src',
        dataDir: './src/data',
        pagesDir: 'pages',
        scanAll: false,
        minify: false,
        assetInputs: [
            'scripts/**/*.{js,ts,mjs}',
            'styles/**/*.{css,pcss,scss,sass,less,styl,stylus}'
        ]
    };

    const options = {
        root: userOptions.root ?? defaults.root,
        dataDir: userOptions.dataDir ?? defaults.dataDir,
        pagesDir: userOptions.pagesDir ?? defaults.pagesDir,
        scanAll: userOptions.scanAll ?? defaults.scanAll,
        minify: userOptions.minify ?? defaults.minify,
        assetInputs: userOptions.assetInputs ?? defaults.assetInputs
    };

    // ✅ Вычисляем сразу
    const root = resolve(process.cwd(), options.root);
    const dataDir = resolve(process.cwd(), options.dataDir);
    const resolvedPagesDir = options.pagesDir;

    let config: ResolvedConfig;
    let minify: boolean;

    // ✅ Сканируем синхронно
    const scannedAssets = scanProject({
        root,
        pagesDir: resolvedPagesDir,
        scanAll: options.scanAll,
        assetInputs: options.assetInputs
    });

    return {
        name: 'vite-plugin-fenom',

        configResolved(resolvedConfig) {
            config = resolvedConfig;
            minify = options.minify;
        },

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

                        const html = FenomJs(content, data, {
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

        config() {
            const input: Record<string, string> = {};

            scannedAssets.assetFiles.forEach(file => {
                if (typeof file !== 'string') return;

                const normalized = file.replace(/\\/g, '/');

                // 🔥 Получаем относительный путь: scripts/main.ts
                const relPath = relative(root, file).replace(/\\/g, '/');

                // ✅ Ключ: scripts/main.ts (относительный, не абсолютный)
                input[relPath] = normalized;
            });

            if (Object.keys(input).length === 0) return {};

            return {
                build: {
                    rollupOptions: {
                        input,
                        output: {
                            entryFileNames(chunk) {
                                const id = chunk.facadeModuleId;
                                if (!id) return '[name].[hash].js';

                                const normalizedId = id.replace(/\\/g, '/');
                                const rel = relative(root, normalizedId).replace(/\\/g, '/');
                                const ext = extname(rel).toLowerCase();
                                const dir = dirname(rel);
                                const name = basename(rel, ext);

                                if (/\.(ts|js|mjs|jsx|tsx)$/.test(ext)) {
                                    return `scripts/${name}.[hash].js`;
                                }
                                if (/\.(css|scss|sass|less|styl|stylus|pcss)$/.test(ext)) {
                                    return `styles/${name}.[hash].css`;
                                }

                                return `${dir}/${name}.[hash].[ext]`.replace(/^\.\//, '');
                            },
                            chunkFileNames: 'chunks/[name].[hash].js',
                            assetFileNames: '[name].[hash].[ext]'
                        }
                    }
                }
            };
        },

        async generateBundle(_config, bundle) {
            if (config.command !== 'build') return;

            const entryToBundle = new Map<string, string>();
            const missingInBundle: string[] = [];
            const missingOnDisk: string[] = [];

            for (const [fileName, chunk] of Object.entries(bundle)) {
                if (chunk.type === 'chunk' && chunk.facadeModuleId) {
                    const id = chunk.facadeModuleId.replace(/\\/g, '/');
                    entryToBundle.set(id, fileName);
                }
                if (chunk.type === 'asset' && chunk.name) {
                    const name = chunk.name.replace(/\\/g, '/');
                    entryToBundle.set(name, fileName);
                }
            }

            for (const assetPath of scannedAssets.assetFiles) {
                const normalized = assetPath.replace(/\\/g, '/');
                if (!entryToBundle.has(normalized)) {
                    if (fs.existsSync(normalized)) {
                        missingInBundle.push(normalized);
                    } else {
                        missingOnDisk.push(normalized);
                    }
                }
            }

            if (missingOnDisk.length > 0) {
                this.warn(`[Fenom] Не найдены файлы на диске:\n  ${missingOnDisk.join('\n  ')}`);
            }

            if (missingInBundle.length > 0) {
                this.warn(`[Fenom] Ассеты не попали в бандл:\n  ${missingInBundle.join('\n  ')}`);
            }

            for (const tplPath of scannedAssets.htmlEntries) {
                try {
                    const content = fs.readFileSync(tplPath, 'utf-8');
                    const data = collectJsonDataMerged(dataDir);
                    let html = FenomJs(content, data, { root, loader: createSyncLoader(root), minify });

                    let replacementsCount = 0;

                    for (const assetPath of scannedAssets.assetFiles) {
                        const normalized = assetPath.replace(/\\/g, '/');

                        // Ищем chunk по facadeModuleId
                        const chunk = Object.values(bundle).find(
                            b => b.type === 'chunk' && b.facadeModuleId === normalized
                        );

                        if (chunk) {
                            const outputFile = chunk.fileName; // → scripts/main.abc123.js

                            html = html
                                .replace(
                                    new RegExp(`<script[^>]+src\\s*=\\s*["']${escapeRegExp('/' + relative(process.cwd(), assetPath).replace(/\\/g, '/'))}["'][^>]*>`, 'gi'),
                                    `<script src="/${outputFile}"></script>`
                                )
                                .replace(
                                    new RegExp(`<link[^>]+href\\s*=\\s*["']${escapeRegExp('/' + relative(process.cwd(), assetPath).replace(/\\/g, '/'))}["'][^>]*>`, 'gi'),
                                    `<link rel="stylesheet" href="/${outputFile}">`
                                );
                        }
                    }

                    if (replacementsCount === 0 && (/<script[^>]+src=/i).test(content)) {
                        this.warn(`[Fenom] В шаблоне "${basename(tplPath)}" есть теги <script> или <link>, но не заменены.`);
                    }

                    const outPath = getOutPath(tplPath, root, resolvedPagesDir);
                    if (!outPath) continue;

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
