import { defineConfig } from 'vite';
import fenom from 'vite-plugin-fenom';

export default defineConfig({
    plugins: [
        fenom({
            pages: 'src/demo/pages',
            data: 'src/demo/data/**/*.json',
            root: 'src/demo',
            // debug: true
        })
    ],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: ['/src/demo/scripts/main.ts', 'src/demo/styles/style.css'],
            output: {
                entryFileNames: `js/[name][hash].js`,
                assetFileNames: `[ext]/[name][hash].[ext]`,
            }
        },
    },
});