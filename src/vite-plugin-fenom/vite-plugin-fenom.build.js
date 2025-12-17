import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, './vite-plugin-fenom.ts'),
            name: 'vite-plugin-fenom',
            formats: ['es', 'cjs'],
            fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`
        },
        outDir: 'vite-plugin-fenom',
        emptyOutDir: false,
        minify: "terser",
        rollupOptions: {
            external: [
                'fenom',
                'vite',
                'node:fs',
                'node:path',
                'fs',
                'path'
            ],
            output: {
                globals: {
                    fenom: 'Fenom',
                    vite: 'Vite'
                }
            }
        }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    }
});
