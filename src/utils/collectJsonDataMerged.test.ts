// src/utils/collectJsonDataMerged.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { collectJsonDataMerged } from './../core/compiler/functions';

// Мокаем fs
import fs from 'node:fs';
import path from 'node:path';

vi.mock('node:fs');
vi.mock('node:path');

beforeEach(() => {
    vi.clearAllMocks();
});

it('объединяет все JSON-файлы в один объект', () => {
    // Мокаем структуру файлов
    const mockFiles = {
        '/data/user.json': JSON.stringify({ name: 'Иван', age: 30 }),
        '/data/profile.json': JSON.stringify({ city: 'Москва', active: true }),
        '/data/config.json': JSON.stringify({ apiUrl: '/api' }),
    };

    // Мокаем fs.readdirSync и fs.readFileSync
    vi.spyOn(fs, 'readdirSync').mockImplementation((dir: string) => {
        if (dir === '/data') return ['user.json', 'profile.json', 'config.json'];
        return [];
    });

    vi.spyOn(fs, 'statSync').mockImplementation(() => ({
        isDirectory: () => false,
        isFile: () => true,
    }));

    vi.spyOn(fs, 'readFileSync').mockImplementation((file: string) => {
        return mockFiles[file];
    });

    vi.spyOn(path, 'join').mockImplementation((...parts) => parts.join('/'));
    vi.spyOn(path, 'basename').mockImplementation((file, ext) => {
        return file.replace(ext, '');
    });

    const result = collectJsonDataMerged('/data');

    expect(result).toEqual({
        name: 'Иван',
        age: 30,
        city: 'Москва',
        active: true,
        apiUrl: '/api',
    });
});

it('игнорирует не-JSON файлы', () => {
    vi.spyOn(fs, 'readdirSync').mockImplementation(() => ['data.json', 'readme.txt']);
    vi.spyOn(fs, 'statSync').mockImplementation(() => ({ isDirectory: () => false }));
    vi.spyOn(fs, 'readFileSync').mockImplementation(() => '{"ok": true}');
    vi.spyOn(path, 'join').mockImplementation((...p) => p.join('/'));

    const result = collectJsonDataMerged('/data');
    expect(result).toEqual({ ok: true });
});
