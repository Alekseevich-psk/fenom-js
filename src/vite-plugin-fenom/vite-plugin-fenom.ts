import type { Plugin, ResolvedConfig } from 'vite';
import { readFile, stat } from 'fs/promises';
import { resolve, basename, dirname } from 'path';
import { createAsyncLoader, compile, tokenize, parse } from 'fenom-js';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface FenomPluginOptions {
    pages?: string;
    data?: string | string[];
    root?: string;
    filters?: Record<string, Function>;
    globals?: Record<string, any>;
}

const defaultOptions: Required<FenomPluginOptions> = {
    pages: 'src/pages',
    data: 'src/data/**/*.json',
    root: 'src',
    filters: {},
    globals: {}
};

export default function fenom(userOptions: FenomPluginOptions = {}): Plugin {
    let config: ResolvedConfig;
    let options: Required<FenomPluginOptions>;
    let templateLoader: ReturnType<typeof createAsyncLoader>;

    // --- Вспомогательные функции ---

    async function resolvePagePath(url: string): Promise<string | null> {
        console.log('[Fenom] → resolvePagePath: raw URL = "%s"', url);

        // Убираем query, hash, .html
        const cleanUrl = url.split('?')[0].split('#')[0];
        console.log('[Fenom] → Clean URL = "%s"', cleanUrl);

        if (cleanUrl === '/favicon.ico') {
            console.log('[Fenom] → Favicon — skip');
            return null;
        }

        // Определяем имя страницы
        let pageName: string;
        if (cleanUrl === '/' || cleanUrl === '/index' || cleanUrl === '/index.html') {
            pageName = 'index';
        } else {
            const lastPart = cleanUrl.endsWith('/') ? cleanUrl.slice(0, -1) : cleanUrl;
            pageName = basename(lastPart);
            // Убираем .html, если есть
            if (pageName.endsWith('.html')) {
                pageName = pageName.slice(0, -5);
            }
        }

        console.log('[Fenom] → Page name = "%s"', pageName);

        const pagesDir = resolve(config.root, options.pages);
        const filePath = resolve(pagesDir, `${pageName}.tpl`);
        console.log('[Fenom] → Full path = "%s"', filePath);

        try {
            await stat(filePath);
            console.log('[Fenom] ✅ Файл найден');
            return filePath;
        } catch (err) {
            console.log('[Fenom] ❌ Файл НЕ найден:', (err as any).message);
            return null;
        }
    }

    async function loadGlobalData(context: Record<string, any>) {
        try {
            const glob = await import('fast-glob');
            const files = await glob.default(options.data, { cwd: config.root });
            console.log('[Fenom] → Загружаем данные: %o', files);

            for (const file of files) {
                const fullPath = resolve(config.root, file);
                const content = await readFile(fullPath, 'utf-8');
                const data = JSON.parse(content);
                Object.assign(context, data);
                console.log('[Fenom] → Данные загружены из:', file);
            }
        } catch (err) {
            console.warn('[Fenom] → Ошибка загрузки данных:', err);
        }
    }

    async function renderPage(filePath: string): Promise<string> {
        console.log('[Fenom] → renderPage: читаем файл:', filePath);

        try {
            const content = await readFile(filePath, 'utf-8');
            console.log('[Fenom] → Длина контента:', content.length);

            const tokens = tokenize(content);
            const ast = parse(tokens);  
            const renderFn = compile(ast, templateLoader);

            const context = { ...options.globals };
            await loadGlobalData(context);
            console.log('[Fenom] → Контекст:', Object.keys(context));

            const html = await renderFn(context, options.filters);
            console.log('[Fenom] → Rendered HTML (preview):', html.substring(0, 500));
            console.log('[Fenom] → Полная длина:', html.length);
            return html;
        } catch (err) {
            console.error('[Fenom] → Ошибка рендеринга:', err);
            return `<h1>Ошибка шаблона</h1><pre>${(err as any).stack}</pre>`;
        }
    }

    // --- Плагин ---

    return {
        name: 'vite-plugin-fenom',

        config() {
            // Никаких mimeTypes — не обязательно
        },

        configResolved(resolvedConfig) {
            config = resolvedConfig;
            options = { ...defaultOptions, ...userOptions };
            if (!options.root) options.root = config.root;
            templateLoader = createAsyncLoader(options.root);
            console.log('[Fenom] configResolved:', {
                root: config.root,
                pages: options.pages,
                command: config.command
            });
        },

        configureServer(server) {
            console.log('[Fenom] Сервер запущен — middleware активен');

            return () => {
                server.middlewares.use(async (req, res, next) => {
                    console.log('\n--- [Fenom] HTTP Request ---');
                    console.log('URL:', req.url);
                    console.log('Method:', req.method);

                    if (req.method !== 'GET') {
                        console.log('[Fenom] → Не GET — передаём дальше');
                        return next();
                    }

                    const filePath = await resolvePagePath(req.url!);
                    if (!filePath) {
                        console.log('[Fenom] → Файл не найден — передаём дальше');
                        return next();
                    }

                    try {
                        const html = await renderPage(filePath);
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'text/html; charset=utf-8');
                        res.end(html);
                        console.log('[Fenom] → Страница отдана');
                    } catch (err) {
                        console.error('[Fenom] → Ошибка при отправке:', err);
                        res.statusCode = 500;
                        res.end('<h1>500 — Ошибка сервера</h1>');
                    }
                });
            };
        },

        async buildStart() {
            if (config.command !== 'build') {
                console.log('[Fenom] → Dev mode: emitFile пропущен');
                return;
            }

            console.log('[Fenom] → Build mode: начинаем сборку');

            const pagesDir = resolve(config.root, options.pages);
            try {
                await stat(pagesDir);
            } catch {
                console.warn('[Fenom] → Папка pages не найдена:', pagesDir);
                return;
            }

            // Здесь можно добавить collectPages, если нужно
            // Пока просто логируем
            console.log('[Fenom] → BuildStart готов — emitFile будет вызван позже');
        }
    };
}
