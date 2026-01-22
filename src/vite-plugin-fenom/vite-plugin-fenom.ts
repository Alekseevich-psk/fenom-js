import type { Plugin, ResolvedConfig } from 'vite';
import { join, relative, resolve, dirname, basename } from 'path';
import * as fs from 'fs/promises';

import { FenomJs, createAsyncLoader } from 'fenom-js';
import type { TemplateLoader } from 'fenom-js';

// === Опции плагина ===
export interface FenomPluginOptions {
    pages?: string;
    data?: string;
    root?: string;
    minifyHtml?: boolean,
    debug?: boolean;
}

/**
 * Vite-плагин для рендеринга .tpl шаблонов через fenom-js
 */
export default function fenomPlugin(options: FenomPluginOptions = {}): Plugin {
    const {
        pages = 'src/pages',
        data = 'src/data/**/*.json',
        root = 'src',
        minifyHtml = true,
        debug = false,
    } = options;

    let config: ResolvedConfig;
    let templateLoader: TemplateLoader;
    let globalData: Record<string, any> = {}; // ← храним глобальные данные

    // === Функция загрузки глобальных JSON-данных ===
    async function loadGlobalData(rootDir: string) {
        const { default: fastGlob } = await import('fast-glob');

        const dataGlob = data;
        let baseDir = dataGlob;

        if (baseDir.includes('**')) {
            baseDir = baseDir.substring(0, baseDir.indexOf('**')).replace(/[/\\]+$/, '');
        }

        const fullPath = resolve(rootDir, baseDir);
        const globPattern = dataGlob.replace(baseDir, '').replace(/^\//, ''); // → **/*.json

        console.log('[Fenom Plugin] Base dir:', fullPath);
        console.log('[Fenom Plugin] Glob pattern:', globPattern);

        try {
            await fs.access(fullPath);
        } catch {
            console.warn(`[Fenom Plugin] Data directory not found: ${fullPath}`);
            return {};
        }

        const files = await fastGlob(globPattern, {
            cwd: fullPath,
            absolute: true,
            onlyFiles: true,
            dot: true,
        });

        console.log('Found JSON files:', files);

        const jsonData: Record<string, any> = {};

        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf-8');
                const parsed = JSON.parse(content);
                const fileName = basename(file, '.json');
                jsonData[fileName] = parsed;
            } catch (err) {
                console.warn(`[Fenom Plugin] Failed to load: ${file}`, err);
            }
        }

        if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Loaded data keys:', Object.keys(jsonData));
        return jsonData;
    }


    return {
        name: 'vite-plugin-fenom',

        async configResolved(resolvedConfig) {
            config = resolvedConfig;

            if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Config resolved', {
                mode: config.mode,
                command: config.command,
                root: config.root,
            });

            // === Загружаем глобальные данные при старте ===
            try {
                globalData = await loadGlobalData(config.root);
            } catch (err) {
                console.error('\x1b[31m[Fenom Plugin]\x1b[0m Failed to load global data:', err);
            }
        },

        configureServer(server) {
            if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Dev server setup started...');

            templateLoader = createAsyncLoader(root);
            if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Template loader created for root:', root);

            server.watcher.on('change', (filePath) => {
                if (filePath.endsWith('.tpl')) {
                    if (debug) console.log('[Fenom Plugin] 🔄 Full reload triggered:', filePath);
                    server.ws.send({ type: 'full-reload' });
                }
            });

            // === Перезагрузка данных при изменении JSON ===
            server.watcher.add(resolve(config.root, data));
            server.watcher.on('change', async (filePath) => {
                if (filePath.endsWith('.json')) {
                    try {
                        const reloaded = await loadGlobalData(config.root);
                        globalData = reloaded;
                        if (debug) console.log('\x1b[33m[Fenom Plugin]\x1b[0m Global data reloaded:', Object.keys(globalData));
                    } catch (err) {
                        console.warn('[Fenom Plugin] Failed to reload JSON data');
                    }
                }
            });

            const handlePageRequest = async (req: any, res: any, next: () => void) => {
                const url = req.url;

                if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Incoming request:', url);

                if (
                    !url ||
                    url.startsWith('/assets/') ||
                    url.startsWith('/@') ||
                    url.startsWith('/src/') ||
                    url.startsWith('/node_modules/') ||
                    url.startsWith('/favicon.ico') ||
                    (url.includes('.') && !url.endsWith('/')) ||
                    (url.includes('?') && url.includes('.'))
                ) {
                    return next();
                }

                let pageName = 'index';
                if (url !== '/') {
                    pageName = url.split('?')[0].split('#')[0].replace(/^\/|\/$/g, '');
                }

                const templatePath = join(pages, `${pageName}.tpl`);
                const relativePath = relative(root, templatePath);

                try {
                    const source = await templateLoader(relativePath);

                    // === Формируем контекст: глобальные данные + мета ===
                    const context = {
                        title: `${pageName.charAt(0).toUpperCase() + pageName.slice(1)} Page`,
                        debug,
                        url,
                        ...globalData, // ← все JSON-файлы в context
                    };

                    let html = await FenomJs(source, context, {
                        loader: templateLoader,
                        root,
                        minify: minifyHtml,
                    });

                    if (config.mode === 'development') {
                        const hmrScript = `
                            <script type="module">
                            import "/@vite/client";
                            </script>`;

                        if (html.includes('</head>')) {
                            html = html.replace('</head>', hmrScript + '\n</head>');
                        } else if (html.includes('<body>')) {
                            html = html.replace('<body>', '<body>\n' + hmrScript);
                        } else {
                            html = hmrScript + html;
                        }
                    }

                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.end(html);

                    if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Page sent:', url);
                } catch (err: any) {
                    if (err.message.includes('Template not found')) {
                        return next();
                    }

                    console.error('\x1b[36m[Fenom Plugin]\x1b[0m Rendering error:', err.message);
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.end(`
                        <h1>🔧 Ошибка рендеринга</h1>
                        <p><strong>${err.message}</strong></p>
                        <pre>${err.stack}</pre>
                    `);
                }
            };

            server.middlewares.stack.unshift({ route: '', handle: handlePageRequest });
            if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Middleware inserted at top of stack');
        },

        async buildStart() {
            if (config.command !== 'build') return;
            if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Build started');

            // === Загружаем данные перед сборкой ===
            try {
                globalData = await loadGlobalData(config.root);
            } catch (err) {
                console.error('\x1b[31m[Fenom Plugin]\x1b[0m Failed to load data on build start:', err);
            }
        },

        async generateBundle(_options, bundle) {
            if (config.command !== 'build') return;

            if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Generating HTML files...');

            const { default: fastGlob } = await import('fast-glob');
            templateLoader = createAsyncLoader(root);

            const searchPath = resolve(config.root, pages);
            const pattern = join(searchPath, '**/*.tpl').replace(/\\/g, '/');

            try {
                const files = await fastGlob(pattern);
                if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Found templates:', files);

                // === Анализ входов и ассетов — как было ===
                const inputEntries = config.build.rollupOptions.input;
                let inputFiles: string[] = [];

                if (Array.isArray(inputEntries)) {
                    inputFiles = inputEntries;
                } else if (typeof inputEntries === 'object' && inputEntries !== null) {
                    inputFiles = Object.values(inputEntries);
                } else if (typeof inputEntries === 'string') {
                    inputFiles = [inputEntries];
                }

                let jsChunk = '';
                const cssAssets: string[] = [];

                for (const [fileName, file] of Object.entries(bundle)) {
                    if (file.type === 'chunk' && /\.(js|ts)$/.test(fileName)) {
                        jsChunk = `/${fileName}`;
                    }
                    if (file.type === 'asset' && fileName.endsWith('.css')) {
                        cssAssets.push(`/${fileName}`);
                    }
                }

                const replacementMap = new Map<string, string>();
                for (const input of inputFiles) {
                    if (/\.(ts|js)$/.test(input) && jsChunk) {
                        replacementMap.set(input, jsChunk);
                    }
                    if (/\.css$/.test(input) && cssAssets.length > 0) {
                        replacementMap.set(input, cssAssets[0]);
                    }
                }

                // === Генерация HTML ===
                for (const file of files) {
                    const fileName = basename(file, '.tpl');
                    const outputFileName = fileName === 'index' ? 'index.html' : `${fileName}.html`;

                    try {
                        const source = await fs.readFile(file, 'utf-8');

                        const context = {
                            title: `${fileName.charAt(0).toUpperCase() + fileName.slice(1)} Page`,
                            debug: false,
                            url: '/' + (fileName === 'index' ? '' : fileName),
                            ...globalData, // ← все данные из data/**/*.json
                        };

                        let html = await FenomJs(source, context, {
                            loader: templateLoader,
                            root,
                            minify: minifyHtml,
                        });

                        for (const [devPath, prodPath] of replacementMap) {
                            const fullDevPath = '/' + devPath;
                            const escaped = fullDevPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                            const scriptRegex = new RegExp(`<script[^>]+src=["']${escaped}["'][^>]*>`, 'gi');
                            if (scriptRegex.test(html)) {
                                html = html.replace(scriptRegex, `<script type="module" src="${prodPath}"></script>`);
                            }

                            const linkRegex = new RegExp(`<link[^>]+href=["']${escaped}["'][^>]*>`, 'gi');
                            if (linkRegex.test(html)) {
                                html = html.replace(linkRegex, `<link rel="stylesheet" href="${prodPath}">`);
                            }
                        }

                        this.emitFile({
                            type: 'asset',
                            fileName: outputFileName,
                            source: html,
                        });

                        if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Generated:', outputFileName);
                    } catch (err) {
                        console.error('\x1b[31m[Fenom Plugin]\x1b[0m Error rendering:', file);
                    }
                }
            } catch (err) {
                console.error('\x1b[31m[Fenom Plugin]\x1b[0m glob error:', err);
            }
        },
    };
}
