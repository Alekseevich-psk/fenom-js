import viteFenomPlugin from './src/core/vite-plugin-fenom';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        viteFenomPlugin({
            root: './src/demo',
            dataDir: './src/demo/data'
        }),
    ],
    test: {
        globals: true,
        environment: 'node',
        clearMocks: true,
        setupFiles: [],
    }
});