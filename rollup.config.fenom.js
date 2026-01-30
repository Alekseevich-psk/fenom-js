import { defineConfig } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

export default defineConfig([
    {
        input: 'src/fenom-js/index.ts',
        output: [
            {
                dir: 'fenom-js',
                format: 'esm',
                entryFileNames: 'fenom-js.mjs',
                sourcemap: true
            },
            {
                dir: 'fenom-js',
                format: 'cjs',
                entryFileNames: 'fenom-js.cjs',
                sourcemap: true,
                exports: 'named'
            }
        ],
        external: [
            'vite',
            'fs',
            'fs/promises',
            'path',
            'util',
            'glob',
            'node:url',
            'node:fs/promises'
        ],
        plugins: [
            resolve({ browser: false, preferBuiltins: true }),
            commonjs(),
            typescript({
                tsconfig: './src/fenom-js/tsconfig.json',
                declaration: true,
                declarationDir: 'fenom-js',
                emitDeclarationOnly: true
            })
        ],
        preserveEntrySignatures: 'exports-only'
    },
    {
        input: 'src/fenom-js/node.ts',
        output: [
            {
                dir: 'fenom-js',
                format: 'esm',
                entryFileNames: 'node.mjs',
                sourcemap: true
            },
            {
                dir: 'fenom-js',
                format: 'cjs',
                entryFileNames: 'node.cjs',
                sourcemap: true,
                exports: 'named'
            }
        ],
        external: [
            'vite',
            'util',
            'glob'
            // 'fs', 'path' — убрали из external → Rollup включит их как runtime deps
        ],
        plugins: [
            resolve({ browser: false, preferBuiltins: true }),
            commonjs(),
            typescript({
                tsconfig: './src/fenom-js/tsconfig.json'
                // dts уже сделан в первом билде
            })
        ],
        preserveEntrySignatures: 'exports-only'
    }
]);