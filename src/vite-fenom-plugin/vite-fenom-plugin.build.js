import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, './vite-fenom-plugin.ts'),
            name: 'vite-fenom-plugin',
            formats: ['es', 'cjs'],
            fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`
        },
        outDir: 'vite-fenom-plugin',
        emptyOutDir: false,
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
