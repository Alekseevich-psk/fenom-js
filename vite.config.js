import { defineConfig } from 'vite';
import fenom from './src/vite-plugin-fenom/vite-plugin-fenom.ts';

export default defineConfig({
    plugins: [
        fenom({
            root: 'src/demo',
            data: ['src/demo/data/**/*.json'],
            formats: ['tpl'],
            globals: {
                site: 'My Site',
                env: 'production',
            },
            minify: true,
            reload: true,
        }),
    ],
    build: {
        rollupOptions: {
            input: './src/demo/pages/index.tpl',
        },
    },
});