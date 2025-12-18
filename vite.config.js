import viteFenomPlugin from './src/vite-plugin-fenom/vite-plugin-fenom';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
    const isBuild = command === 'build';
    
    const plugins = [
        viteFenomPlugin({
            root: './src/demo',
            dataDir: './src/demo/data',
            pagesDir: 'pages',
            minify: isBuild
        })
    ];

    return {
        plugins,
    };
});
