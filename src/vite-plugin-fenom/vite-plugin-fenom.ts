import type { Plugin, ResolvedConfig } from 'vite';
import type { UserConfig } from './types/common';

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
        assetInputs: userOptions.assetInputs ?? defaults.assetInputs,
        useRelativePaths: userOptions.useRelativePaths ?? false,
        entryNaming: userOptions.entryNaming ?? null
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
                const relPath = relative(root, file).replace(/\\/g, '/');
                input[relPath] = normalized;
            });

            if (Object.keys(input).length === 0) return {};

            // 🔥 Опции по умолчанию
            const naming = {
                js: options.entryNaming?.js ?? '[name].[hash].js',
                css: options.entryNaming?.css ?? '[name].[hash].css',
                asset: options.entryNaming?.asset ?? '[name].[hash].[ext]'
            };

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
                                    return `scripts/${naming.js.replace('[name]', name)}`;
                                }

                                if (/\.(css|scss|sass|less|styl|stylus|pcss)$/.test(ext)) {
                                    return `styles/${naming.css.replace('[name]', name)}`;
                                }

                                return `${dir}/${naming.asset.replace('[name]', name).replace('[ext]', ext)}`;
                            },
                            chunkFileNames: `chunks/${naming.js.replace('[name]', 'chunk-[name]')}`,
                            assetFileNames: naming.asset
                        }
                    }
                }
            };
        },

        async generateBundle(_config, bundle) {
            if (config.command !== 'build') return;

            // Карта: facadeModuleId → fileName
            const entryToBundle = new Map<string, string>();

            for (const [fileName, chunk] of Object.entries(bundle)) {
                if (chunk.type === 'chunk') {
                    if (chunk.facadeModuleId) {
                        const id = chunk.facadeModuleId.replace(/\\/g, '/');
                        entryToBundle.set(id, fileName);
                    }
                }
            }

            for (const tplPath of scannedAssets.htmlEntries) {
                try {
                    const content = fs.readFileSync(tplPath, 'utf-8');
                    const data = collectJsonDataMerged(dataDir);
                    let html = FenomJs(content, data, { root, loader: createSyncLoader(root), minify });

                    let replacementsCount = 0;

                    for (const assetPath of scannedAssets.assetFiles) {
                        const normalized = assetPath.replace(/\\/g, '/');
                        const outputFile = entryToBundle.get(normalized);
                        if (!outputFile) continue;

                        const relFromRoot = relative(root, assetPath).replace(/\\/g, '/');
                        const virtualPath = '/' + relFromRoot; // → /scripts/main.ts

                        const basePath = options.useRelativePaths ? './' : '/';

                        const scriptTag = `<script src="${basePath}${outputFile}"></script>`;
                        const linkTag = `<link rel="stylesheet" href="${basePath}${outputFile}">`;

                        html = html.replace(
                            new RegExp(`<script[^>]+src\\s*=\\s*["']${escapeRegExp(virtualPath)}["'][^>]*>`, 'gi'),
                            scriptTag
                        );

                        const variants = [
                            `<link rel="stylesheet" href="${virtualPath}">`,
                            `<link href="${virtualPath}" rel="stylesheet">`,
                            `<link rel='stylesheet' href='${virtualPath}'>`,
                            `<link href='${virtualPath}' rel='stylesheet'>`,
                            `<link rel="stylesheet" href="${virtualPath}" />`,
                            `<link href="${virtualPath}" rel="stylesheet" />`
                        ];

                        let replaced = false;

                        for (const variant of variants) {
                            if (html.includes(variant)) {
                                html = html.replace(variant, linkTag);
                                replaced = true;
                                console.log('✅ Заменён:', variant);
                                break;
                            }
                        }
                    }

                    const outPath = getOutPath(tplPath, root, resolvedPagesDir);

                    if (!outPath) {
                        console.warn('⚠️ outPath == null для:', tplPath);
                        continue;
                    }

                    this.emitFile({
                        type: 'asset',
                        fileName: outPath,
                        source: html
                    });
                } catch (err) {
                    console.error('❌ Ошибка:', err);
                }
            }
        }
    };
}
