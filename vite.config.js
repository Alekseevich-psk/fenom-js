import viteFenomPlugin from './src/vite-plugin-fenom/vite-plugin-fenom';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
    const isBuild = command === 'build';
    
    const plugins = [
        viteFenomPlugin({
            root: './src/demo',
            dataDir: './src/demo/data',
            pagesDir: 'pages',
            scanAll: true,
            minify: isBuild
        })
    ];

    return {
        plugins,
        build: {
            rollupOptions: {
                input: ['./src/demo/scripts/main.ts']
            }
        }
    };
});
