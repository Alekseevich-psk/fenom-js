import viteFenomPlugin from './src/vite-plugin-fenom/vite-plugin-fenom';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
    const isBuild = command === 'build';

    return {
        plugins: [
            viteFenomPlugin({
                root: './src/demo',
                dataDir: './src/demo/data',
                pagesDir: 'pages',
                scanAll: true,
                minify: isBuild,
                useRelativePaths: true,
                entryNaming: {
                    js: '[name].[hash].js',
                    css: '[name].[hash].css'
                }
            })
        ]
    };
});