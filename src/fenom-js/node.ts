export { FenomJs } from './engine/renderer';
export { createAsyncLoader } from './engine/loader';

// Опционально: если хочешь экспортировать больше
export type { TemplateLoader } from './types/common';
export { tokenize, parse, compile } from './index'; // или напрямую