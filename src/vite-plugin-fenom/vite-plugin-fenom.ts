import type { PluginUserConfig } from './types/common';
import type { Plugin } from 'vite';
import { resolve, relative } from 'path';
import { createAsyncLoader } from 'fenom-js';
import { FenomJs } from 'fenom-js';
import { merge, processData } from './utils/common';
import { renameBuildEnd, renameBuildStart } from './utils/build';

const name = 'vite-plugin-fenom';

const defaultOptions: PluginUserConfig = {
    reload: true,
    root: null,
    data: ['src/data/**/*.json'],
    formats: ['tpl'],
    ignoredPaths: [],
    globals: {},
    minify: false,
    loader: undefined,
};

/**
 * Плагин для Vite + Vituum
 */
const plugin = (options: PluginUserConfig = {}): Plugin[] => {
    let resolvedConfig: any;
    let userEnv: any;

    options = merge(defaultOptions, options);

    return [
        {
            name,
            config(config, env) {
                userEnv = env;
            },
            configResolved(config) {
                resolvedConfig = config;
                if (!options.root) {
                    options.root = config.root;
                }
            },
            buildStart: async () => {
                if (userEnv.command !== 'build' || !resolvedConfig.build.rollupOptions.input) return;
                await renameBuildStart(resolvedConfig.build.rollupOptions.input, options.formats);
            },
            buildEnd: async () => {
                if (userEnv.command !== 'build' || !resolvedConfig.build.rollupOptions.input) return;
                await renameBuildEnd(resolvedConfig.build.rollupOptions.input, options.formats);
            },
            transformIndexHtml: {
                order: 'pre',
                async handler(html, { path, filename, server }) {
                    if (!filename || !options.formats.some(fmt => filename.endsWith(`.${fmt}`))) {
                        return html;
                    }

                    const context = options.data
                        ? await processData({ paths: options.data, root: resolvedConfig.root }, options.globals)
                        : options.globals;

                    const loader = options.loader || createAsyncLoader(options.root);

                    try {
                        const content = await server?.transformRequest(path, { ssr: true });
                        const result = await FenomJs(content, context, {
                            root: options.root,
                            loader,
                            minify: options.minify,
                        });
                        return result;
                    } catch (err) {
                        console.error(`[vite-plugin-fenom] Ошибка рендеринга ${filename}:`, err);
                        return `<pre style="color:red">${(err as Error).message}</pre>`;
                    }
                },
            },
            handleHotUpdate(ctx) {
                if (options.ignoredPaths?.some(p => ctx.file.includes(p))) return;

                const isTpl = options.formats.some(fmt => ctx.file.endsWith(`.${fmt}`));
                const isJson = ctx.file.endsWith('.json');

                if ((isTpl || isJson) && ctx.server) {
                    ctx.server.ws.send({
                        type: 'full-reload',
                        path: '*',
                    });
                }
            },
        } as Plugin,
    ];
};

export default plugin;
