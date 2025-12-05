// vite-plugin-fenom.js

import { relative, resolve, join } from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import lodash from 'lodash';

// 🔥 Ваш движок — после сборки tsc
import { render } from './../fenom-js/index';

const require = createRequire(import.meta.url);

const getPackageInfo = (url) => {
    return { name: 'vite-plugin-fenom' };
};

const { name } = getPackageInfo(import.meta.url);

const defaultOptions = {
    root: null,
    data: ['src/data/**/*.json'],
    formats: ['tpl'],
    globals: {},
    reload: true,
};

/**
 * Основной плагин
 */
export default function fenomPlugin(userOptions = {}) {
    let resolvedConfig;
    let root;
    let options;

    return [
        {
            name,
            configResolved(config) {
                resolvedConfig = config;
                root = options?.root ?? config.root;
                options = lodash.merge({}, defaultOptions, userOptions, { root });
            },

            /**
             * Перехват и рендер HTML
             */
            transformIndexHtml: {
                order: 'pre',
                async handler(html, { path, server }) {
                    if (!path.endsWith('.tpl')) return html;

                    const templatePath = resolve(root, '.' + path);
                    if (!fs.existsSync(templatePath)) return html;

                    const content = fs.readFileSync(templatePath, 'utf-8');
                    const data = await loadContext(options, root);

                    try {
                        return render(content, { ...data });
                    } catch (err) {
                        console.error(`[vite-plugin-fenom] Ошибка рендера ${path}:`, err);
                        return `<pre style="color:red">[FENOM] ${err.message}</pre>`;
                    }
                },
            },

            /**
             * HMR: перезагрузка при изменении .tpl или .json
             */
            handleHotUpdate(ctx) {
                const { file, server } = ctx;
                const ext = file.slice(file.lastIndexOf('.') + 1);

                if (options.formats.includes(ext) || file.endsWith('.json')) {
                    const modules = [...server.moduleGraph.getModulesByFile(file) || []];
                    modules.forEach(mod => server.moduleGraph.invalidateModule(mod));
                    return [];
                }
            },
        },

        /**
         * Middleware: /index.tpl → /index.html
         */
        {
            name: `${name}:middleware`,
            configureServer(server) {
                const re = new RegExp(`\\.(${options.formats.join('|')})$`);

                server.middlewares.use((req, res, next) => {
                    if (req.url && re.test(req.url)) {
                        req.url = req.url.replace(re, '.html');
                    }
                    next();
                });
            },
        },
    ];
}

/**
 * Загрузка данных из JSON
 */
async function loadContext(options, root) {
    const context = { ...options.globals };

    for (const pattern of options.data) {
        const files = await glob(pattern, { cwd: root });
        for (const file of files) {
            const fullPath = join(root, file);
            const key = file.replace(/\.\w+$/, '');
            const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
            lodash.merge(context, { [key]: data });
        }
    }

    return context;
}

/**
 * Простой glob (без внешних зависимостей)
 */
function glob(pattern, { cwd }) {
    return new Promise(resolve => {
        const minimatch = require('minimatch');
        const files = [];
        const baseDir = join(cwd, pattern.split('/**/')[0]);

        function walk(dir) {
            try {
                fs.readdirSync(dir).forEach(file => {
                    const path = join(dir, file);
                    const rel = path.slice(cwd.length + 1).replace(/\\/g, '/');
                    if (fs.statSync(path).isDirectory()) {
                        walk(path);
                    } else if (minimatch(rel, pattern)) {
                        files.push(rel);
                    }
                });
            } catch (e) { }
        }

        walk(baseDir);
        resolve(files);
    });
}
