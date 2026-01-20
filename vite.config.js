import { defineConfig } from 'vite';
import fenom from 'vite-plugin-fenom';

export default defineConfig({
    server: {
        port: 5173,
    },
    plugins: [
        fenom({
            pages: 'src/demo/pages',
            data: 'src/demo/data/**/*.json',
            root: 'src/demo',
            debug: true
        })
    ]
});