import { defineConfig } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

export default defineConfig({
    // Входной файл
    input: 'src/vite-plugin-fenom/vite-plugin-fenom.ts',

    // ✅ Используем `dir`, а не `file`
    output: [
        {
            dir: 'vite-plugin-fenom',                  
            format: 'cjs',
            entryFileNames: 'vite-plugin-fenom.cjs',    
            sourcemap: true,
            exports: 'named'
        },
        {
            dir: 'vite-plugin-fenom',                   
            format: 'esm',
            entryFileNames: 'vite-plugin-fenom.mjs',  
            sourcemap: true
        }
    ],

    // Не упаковываем эти модули
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

    // Плагины
    plugins: [
        resolve({
            browser: false,
            preferBuiltins: true
        }),
        commonjs(),
        typescript({
            tsconfig: './src/vite-plugin-fenom/tsconfig.json',
            declaration: true,
            declarationDir: 'vite-plugin-fenom',
            emitDeclarationOnly: true
        })
    ]
});
