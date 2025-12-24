import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        outDir: 'fenom-js',
        emptyOutDir: false,
        minify: 'terser',
        lib: {
            entry: resolve(__dirname, 'index.ts'),
            name: 'fenomJs',
            formats: ['es', 'cjs'],
            fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
        },
        target: 'node16',
        rollupOptions: {
            external: [
                'path',
                'fs',
                'fs/promises',
            ],
        },
    },
    ssr: {
        external: ['path', 'fs'],
    },
    esbuild: {
        logLevel: 'info',
    },
});
