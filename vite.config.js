// vite.config.js
import { defineConfig } from 'vite';
import fenomPlugin from './src/vite-plugin-fenom';
import path from 'path';

const templateData = {
    title: 'Главная',
};

export default defineConfig({
    plugins: [
        fenomPlugin({
            templatesDir: './src/demo',
            outputDir: 'dist',
            data: {
                title: 'Мой сайт',
            },
            includeSubDirs: true,
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        extensions: ['.js', '.ts', '.json', '.mjs']
    },

    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: './src/core/index.ts', // ← ваша точка входа
        },
    },
});
