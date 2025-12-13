import viteFenomPlugin from './src/core/vite-plugin-fenom';
import { defineConfig } from 'vite';

export default defineConfig(({ command, mode, isSsrBuild, isPreview }) => {

    const plugins = [
        viteFenomPlugin({
            root: './src/demo',
            dataDir: './src/demo/data',
            pagesDir: 'pages',
            scanAll: false,
            minify: true
        }),
    ];

    const buildOptions = {
        emptyOutDir: true,
        outDir: 'dist',
        rollupOptions: {
            input: 'src/main.ts' // ← ключевая строка
        }
    };

    return {
        css: {
            preprocessorOptions: {
                scss: {
                    sourceMap: true,
                },
            },
        },
        server: {
            watch: {
                additionalPaths: (watcher) => {
                    watcher.add("src/**");
                },
            },
        },
        base: './',
        plugins: plugins,
        build: buildOptions,
    };
});