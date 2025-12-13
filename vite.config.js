import viteFenomPlugin from './src/vite/vite-plugin-fenom';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
    const isBuild = command === 'build';

    const plugins = [
        viteFenomPlugin({
            root: './src/demo',
            dataDir: './src/demo/data',
            pagesDir: 'pages',
            scanAll: false,
            minify: isBuild
        })
    ];

    return {
        css: {
            preprocessorOptions: {
                scss: {
                    sourceMap: true,
                },
            },
        },
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'),
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
        plugins,
        build: {
            emptyOutDir: true,
            outDir: 'dist',
            rollupOptions: {
                input: 'src/main.ts'
            }
        }
    };
});
