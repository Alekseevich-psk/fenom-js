// src/index.ts
import { FenomJs } from './engine/renderer';
import { createAsyncLoader } from './engine/loader';

// Основной API
export { FenomJs, createAsyncLoader };
export type { TemplateLoader } from './types/common';

// Advanced API — для плагинов, тестов, инструментов
export { tokenize } from './lexer/tokenize';
export { parse } from './parser/parser';
export { compile } from './compiler/compiler';