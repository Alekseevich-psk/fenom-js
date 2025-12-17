import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        outDir: 'fenom-js',
        emptyOutDir: false,
        minify: "terser",
        lib: {
            entry: resolve(__dirname, './index.ts'),
            name: 'fenom-js',
            formats: ['es', 'cjs'],
            fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
        },
    }
});
