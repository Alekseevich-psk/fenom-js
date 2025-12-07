import viteFenomPlugin from './dist/vite-plugin-fenom';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        viteFenomPlugin(),
    ],
});