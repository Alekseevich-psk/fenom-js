// Основной API
export { FenomJs } from './engine/renderer';
export type { TemplateLoader } from './types/common';

// Advanced API — для плагинов, тестов, инструментов
export { tokenize } from './lexer/tokenize';
export { parse } from './parser/parser';
export { compile } from './compiler/compiler';