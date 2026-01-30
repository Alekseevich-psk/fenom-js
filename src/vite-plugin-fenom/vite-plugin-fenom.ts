import type { Plugin, ResolvedConfig } from 'vite';
import { join, relative, resolve, dirname, basename } from 'path';
import * as fs from 'fs/promises';

import { FenomJs } from 'fenom-js';
import { createAsyncLoader } from 'fenom-js/node';
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

        if (debug) {
            console.log('[Fenom Plugin] Base dir:', fullPath);
            console.log('[Fenom Plugin] Glob pattern:', globPattern);
        }

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

        if (debug) {
            console.log('Found JSON files:', files);
        }

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
        if (debug) console.log(jsonData);
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

            // === Добавляем отслеживание ===
            const tplDir = resolve(config.root, pages);
            const dataDir = resolve(config.root, data.split('**')[0]);

            server.watcher.add(tplDir);
            server.watcher.add(dataDir);

            if (debug) {
                console.log('[Fenom Plugin] 📂 Watching TPL:', tplDir);
                console.log('[Fenom Plugin] 📂 Watching DATA:', dataDir);
            }

            // === ЕДИНСТВЕННЫЙ обработчик ===
            server.watcher.on('change', async (filePath) => {
                const normalizedPath = filePath.replace(/\\/g, '/');

                if (filePath.endsWith('.tpl')) {
                    if (debug) console.log('[Fenom Plugin] 🔄 TPL changed:', filePath);
                    server.ws.send({ type: 'full-reload' });
                    return;
                }

                if (normalizedPath.endsWith('.json') && normalizedPath.includes(dataDir.replace(/\\/g, '/'))) {
                    if (debug) console.log('[Fenom Plugin] 📄 JSON changed:', filePath);

                    try {
                        const newData = await loadGlobalData(config.root);
                        globalData = newData;
                        if (debug) console.log('\x1b[33m[Fenom Plugin]\x1b[0m Global data reloaded:', Object.keys(newData));
                    } catch (err) {
                        console.warn('[Fenom Plugin] Failed to reload JSON data:', err);
                    } finally {
                        server.ws.send({ type: 'full-reload' });
                    }
                }
            });

            // === handlePageRequest ===
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

                    const context = {
                        title: `${pageName.charAt(0).toUpperCase() + pageName.slice(1)} Page`,
                        debug,
                        url,
                        ...globalData,
                    };

                    let html = await FenomJs(source, {
                        context: context,
                        loader: templateLoader,
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
                    res.end(`<h1>🔧 Ошибка</h1><pre>${err.stack}</pre>`);
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

                // === Сбор информации о выходных файлах ===
                const entryChunks: Record<string, string> = {}; // inputPath → /out/path.js
                const cssAssets: Record<string, string> = {};   // inputPath → /out/path.css

                for (const [fileName, file] of Object.entries(bundle)) {
                    const outFile = `/${fileName}`;

                    if (file.type === 'chunk' && file.facadeModuleId) {
                        // Это JS-чанк, сопоставим с входом
                        const inputPath = relative(config.root, file.facadeModuleId).replace(/\\/g, '/');
                        entryChunks[inputPath] = outFile;
                    }

                    if (file.type === 'asset' && fileName.endsWith('.css')) {
                        // Это CSS-ассет. Попробуем найти, из какого входа.
                        // Vite не всегда хранит source, но имя может помочь
                        if (file.name && file.name.endsWith('.css')) {
                            // Пример: file.name = 'style.css' или 'style-hash.css'
                            const baseName = basename(file.name, '.css');
                            // Пока просто запоминаем — уточним позже
                            cssAssets[file.name] = outFile;
                        }
                    }
                }

                // === Анализ входов ===
                const inputEntries = config.build.rollupOptions.input;
                const inputs: string[] = [];

                if (Array.isArray(inputEntries)) {
                    inputs.push(...inputEntries.filter((i): i is string => typeof i === 'string'));
                } else if (typeof inputEntries === 'object' && inputEntries !== null) {
                    inputs.push(...Object.values(inputEntries).filter((i): i is string => typeof i === 'string'));
                } else if (typeof inputEntries === 'string') {
                    inputs.push(inputEntries);
                }

                // === Карта замены: исходный путь → собранный файл ===
                const replacementMap = new Map<string, string>();

                for (const input of inputs) {
                    if (!input.endsWith('.js') && !input.endsWith('.ts') && !input.endsWith('.css')) continue;

                    const normalizedInput = resolve(input).replace(/\\/g, '/');
                    const relativeInput = relative(config.root, normalizedInput).replace(/\\/g, '/');

                    if (input.endsWith('.ts') || input.endsWith('.js')) {
                        const moduleId = relative(config.root, normalizedInput).replace(/\\/g, '/');
                        if (entryChunks[moduleId]) {
                            replacementMap.set(relativeInput, entryChunks[moduleId]);
                        }
                    }

                    if (input.endsWith('.css')) {
                        const cssFileName = basename(input);
                        // Ищем ассет, содержащий имя файла
                        const matchedCss = Object.keys(cssAssets).find(name =>
                            name === cssFileName || name.startsWith(basename(cssFileName, '.css'))
                        );
                        if (matchedCss) {
                            replacementMap.set(relativeInput, cssAssets[matchedCss]);
                        }
                    }
                }

                // === Генерация HTML ===
                for (const file of files) {
                    const fileName = basename(file, '.tpl');
                    const outputFileName = fileName === 'index' ? 'index.html' : `${fileName}.html`;

                    const source = await fs.readFile(file, 'utf-8');
                    const context = {
                        title: `${fileName.charAt(0).toUpperCase() + fileName.slice(1)} Page`,
                        debug: false,
                        url: '/' + (fileName === 'index' ? '' : fileName),
                        ...globalData,
                    };
                    
                    let html = await FenomJs(source, {
                        context: context,
                        loader: templateLoader,
                        minify: minifyHtml,
                    });

                    // === Замена путей ===
                    for (const [devPath, prodPath] of replacementMap) {
                        const fullDevPath = '/' + devPath;
                        const escaped = fullDevPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                        const scriptRegex = new RegExp(`<script[^>]+src=["']${escaped}["'][^>]*/?>`, 'gi');
                        if (scriptRegex.test(html)) {
                            html = html.replace(scriptRegex, `<script type="module" src="${prodPath}"></script>`);
                        }

                        const linkRegex = new RegExp(`<link[^>]+href=["']${escaped}["'][^>]*/?>`, 'gi');
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
                }
            } catch (err) {
                console.error('\x1b[31m[Fenom Plugin]\x1b[0m Error during HTML generation:', err);
            }
        },
    };
}
