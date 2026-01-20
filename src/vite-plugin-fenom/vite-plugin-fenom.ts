import type { Plugin, ResolvedConfig } from 'vite';
import { join, relative, resolve } from 'path';

// === Импорты из fenom-js ===
import { FenomJs, createAsyncLoader } from 'fenom-js';
import type { TemplateLoader } from 'fenom-js';

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

        buildStart() {
            if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m Build started', { pages });
        },

        async generateBundle() {
            if (debug) console.log('\x1b[36m[Fenom Plugin]\x1b[0m HTML generation will be implemented later');
        },
    };
}
