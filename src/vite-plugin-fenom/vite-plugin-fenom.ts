import type { Plugin, ResolvedConfig } from 'vite';
import { join, relative, resolve, extname, basename } from 'path';
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
                const templateFiles = await fastGlob(pattern);
                if (debug) console.log('[Fenom Plugin] Found templates:', templateFiles);

                // === Сбор всех выходных файлов ===
                const emittedJs: Record<string, string> = {};     // relative moduleId → /out.js
                const emittedCss: Record<string, string> = {};    // input basename → /out.css

                for (const [fileName, file] of Object.entries(bundle)) {
                    const publicPath = `/${fileName}`;

                    if (file.type === 'chunk' && file.facadeModuleId) {
                        const moduleId = relative(config.root, file.facadeModuleId).replace(/\\/g, '/');
                        emittedJs[moduleId] = publicPath;
                    }

                    if (file.type === 'asset' && fileName.endsWith('.css')) {
                        // Сохраняем по базовому имени (без хеша)
                        const baseName = fileName.replace(/\.[^.]+\.css$/, '.css'); // main.hash.css → main.css
                        const keyName = baseName === fileName ? basename(fileName, '.css') : baseName.replace('.css', '');
                        emittedCss[keyName] = publicPath;
                    }
                }

                // === Получаем все входы как массив строк ===
                const inputEntries = config.build.rollupOptions.input;
                const inputPaths: string[] = [];

                if (Array.isArray(inputEntries)) {
                    inputPaths.push(...inputEntries);
                } else if (typeof inputEntries === 'object' && inputEntries !== null) {
                    inputPaths.push(...Object.values(inputEntries));
                } else if (typeof inputEntries === 'string') {
                    inputPaths.push(inputEntries);
                }

                // Нормализуем: приводим к абсолютному пути, затем к относительному от корня
                const normalizedInputs = inputPaths.map((input) => {
                    // Если путь абсолютный (начинается с /), считаем его относительно корня
                    const absolute = input.startsWith('/')
                        ? resolve(config.root, '.' + input)  // /src/main.ts → root/src/main.ts
                        : resolve(config.root, input);       // src/main.ts → root/src/main.ts
                    return relative(config.root, absolute).replace(/\\/g, '/');
                });

                // === Карта замены: исходный путь (в шаблоне) → выходной ассет ===
                const replacementMap = new Map<string, { type: 'js' | 'css'; path: string; }>();

                for (const input of normalizedInputs) {
                    const ext = extname(input).toLowerCase();
                    const baseInputName = basename(input, ext);

                    if (ext === '.ts' || ext === '.js') {
                        if (emittedJs[input]) {
                            // Прямое совпадение
                            replacementMap.set(`/${input}`, { type: 'js', path: emittedJs[input] });
                        }
                    }

                    if (ext === '.scss' || ext === '.css') {
                        // Ищем CSS-файл по базовому имени
                        const matchedCss = Object.keys(emittedCss).find(key =>
                            key === baseInputName ||
                            key === basename(input) ||
                            key.includes(baseInputName)
                        );
                        if (matchedCss) {
                            replacementMap.set(`/${input}`, { type: 'css', path: emittedCss[matchedCss] });
                        }
                    }
                }

                // === Генерация HTML ===
                for (const file of templateFiles) {
                    const pageName = basename(file, '.tpl');
                    const outputFileName = pageName === 'index' ? 'index.html' : `${pageName}.html`;

                    const source = await fs.readFile(file, 'utf-8');
                    const context = {
                        title: `${pageName.charAt(0).toUpperCase() + pageName.slice(1)} Page`,
                        debug: false,
                        url: '/' + (pageName === 'index' ? '' : pageName),
                        ...globalData,
                    };

                    let html = await FenomJs(source, {
                        context,
                        loader: templateLoader,
                        minify: minifyHtml,
                    });

                    // === Замена тегов: поддержка путей с / и без / ===
                    for (const [devPath, { type, path }] of replacementMap) {
                        // devPath уже с `/` в начале: `/src/main.ts`
                        const escaped = devPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                        if (type === 'js') {
                            const scriptRegex = new RegExp(`<script[^>]+src=["']${escaped}["'][^>]*/?>`, 'gi');
                            html = html.replace(scriptRegex, `<script type="module" src="${path}"></script>`);
                        }

                        if (type === 'css') {
                            const linkRegex = new RegExp(`<link[^>]+href=["']${escaped}["'][^>]*/?>`, 'gi');
                            html = html.replace(linkRegex, `<link rel="stylesheet" href="${path}">`);
                        }
                    }

                    // Минификация
                    if (minifyHtml) {
                        html = html.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
                    }

                    this.emitFile({
                        type: 'asset',
                        fileName: outputFileName,
                        source: html,
                    });

                    if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Generated:', outputFileName);
                }
            } catch (err) {
                console.error('\x1b[31m[Fenom Plugin]\x1b[0m Build error:', err);
            }
        }
        ,
    };
}
