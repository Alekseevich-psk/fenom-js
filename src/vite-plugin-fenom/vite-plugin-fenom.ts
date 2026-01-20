import type { Plugin, ResolvedConfig } from 'vite';
import { join, relative, resolve, dirname, basename } from 'path';
import * as fs from 'fs/promises';

import { FenomJs, createAsyncLoader } from 'fenom-js';
import type { TemplateLoader } from 'fenom-js';

import glob from 'fast-glob';

// === Опции плагина ===
export interface FenomPluginOptions {
    /**
     * Папка с шаблонами страниц
     * @default 'src/pages'
     */
    pages?: string;

    data?: string;

    /**
     * Корневая директория проекта
     * @default 'src'
     */
    root?: string;

    /**
     * Режим отладки
     * @default false
     */
    debug?: boolean;
}

/**
 * Vite-плагин для рендеринга .tpl шаблонов через fenom-js.
 *
 * Особенности:
 * - Поддержка /about → about.tpl
 * - Автозагрузка через createAsyncLoader
 * - Надёжный HMR: перезагрузка при изменении .tpl
 * - Работает независимо от import.meta.hot
 */
export default function fenomPlugin(options: FenomPluginOptions = {}): Plugin {
    const {
        pages = 'src/pages',
        data = 'src/data/**/*.json',
        root = 'src',
        debug = false,
    } = options;

    let config: ResolvedConfig;
    let templateLoader: TemplateLoader;
    let port = 5173; // будет обновлён в configureServer

    if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Plugin initialized', { pages, data, root });

    return {
        name: 'vite-plugin-fenom',

        configResolved(resolvedConfig) {
            config = resolvedConfig;
            port = resolvedConfig.server.port || 5173;
            if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Config resolved', {
                mode: config.mode,
                command: config.command,
                root: config.root,
                port,
            });
        },

        configureServer(server) {
            if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Dev server setup started...');

            // Создаём загрузчик шаблонов
            templateLoader = createAsyncLoader(root);
            if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Template loader created for root:', root);

            // Наблюдаем за .tpl файлами
            server.watcher.on('change', (filePath) => {
                if (filePath.endsWith('.tpl')) {
                    if (debug) console.log('[Fenom Plugin] 🔄 Full reload triggered:', filePath);
                    server.ws.send({ type: 'full-reload' });
                }
            });

            // Обработчик запросов
            const handlePageRequest = async (req: any, res: any, next: () => void) => {
                const url = req.url;

                if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Incoming request:', url);

                // Пропускаем статику, API, системные пути
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

                // Определяем имя страницы
                let pageName = 'index';
                if (url !== '/') {
                    pageName = url.split('?')[0].split('#')[0].replace(/^\/|\/$/g, '');
                }

                const templatePath = join(pages, `${pageName}.tpl`);
                const relativePath = relative(root, templatePath);

                try {
                    if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Rendering page:', { pageName, templatePath });

                    const source = await templateLoader(relativePath);

                    const context = {
                        title: `${pageName.charAt(0).toUpperCase() + pageName.slice(1)} Page`,
                        debug,
                        url,
                    };

                    // Рендерим через FenomJs
                    let html = await FenomJs(source, context, {
                        loader: templateLoader,
                        root,
                        minify: config.mode === 'production',
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

                    // Отправляем ответ
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.end(html);

                    if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Page sent:', url);
                } catch (err: any) {
                    if (err.message.includes('Template not found')) {
                        return next();
                    }

                    console.error('\x1b[36m[Fenom Plugin]\x1b[0m Rendering error:', err.message);
                    console.error(err);

                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'text/html; charset=utf-8');
                    res.end(`
            <h1>🔧 Ошибка рендеринга</h1>
            <p><strong>${err.message}</strong></p>
            <pre>${err.stack}</pre>
          `);
                }
            };

            // Вставляем middleware в начало стека
            server.middlewares.stack.unshift({
                route: '',
                handle: handlePageRequest,
            });

            if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Middleware inserted at top of stack');
            if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Watching .tpl files for HMR');
        },

        async buildStart() {
            if (config.command !== 'build') return;
            if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Build started');
        },

        async generateBundle() {
            if (config.command !== 'build') return;

            if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Generating HTML files...');

            const { default: fastGlob } = await import('fast-glob');
            templateLoader = createAsyncLoader(root);

            const searchPath = resolve(config.root, pages);
            const pattern = join(searchPath, '**/*.tpl').replace(/\\/g, '/');

            try {
                const files = await fastGlob(pattern);
                if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Found templates:', files);

                for (const file of files) {
                    const fileName = basename(file, '.tpl');
                    const outputFileName = fileName === 'index' ? 'index.html' : `${fileName}.html`;

                    try {
                        const source = await fs.readFile(file, 'utf-8');

                        // JSON-данные
                        const jsonDataPath = file.replace(/\.tpl$/, '.json');
                        let extraContext = {};
                        try {
                            const data = await fs.readFile(jsonDataPath, 'utf-8');
                            extraContext = JSON.parse(data);
                        } catch { }

                        const context = {
                            title: `${fileName.charAt(0).toUpperCase() + fileName.slice(1)} Page`,
                            debug: false,
                            url: '/' + (fileName === 'index' ? '' : fileName),
                            ...extraContext,
                        };

                        const html = await FenomJs(source, context, {
                            loader: templateLoader,
                            root,
                            minify: true,
                        });

                        // ✅ Добавляем файл в бандл через this.emitFile
                        this.emitFile({
                            type: 'asset',
                            fileName: outputFileName,
                            source: html,
                        });

                        if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Added to bundle:', outputFileName);
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
