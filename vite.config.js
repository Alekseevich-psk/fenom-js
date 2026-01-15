import { defineConfig } from 'vite';
import fenom from 'vite-plugin-fenom';

export default defineConfig({
    plugins: [
        fenom({
            pages: 'src/demo/pages',
            data: 'src/demo/data/**/*.json',
            root: 'src/demo',
            globals: {
                siteName: 'Fenom Demo'
            }
        })
    ],
    clearScreen: false
});