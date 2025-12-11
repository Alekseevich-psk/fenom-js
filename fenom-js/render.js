import { parse } from './parser/parser';
import { compile } from './compiler/compiler';
import { tokenize } from "./lexer/tokenize";
import { filters } from "./filters/filters";
import { createLoader } from './loader/loader';
export function render(template, context, root) {
    const loader = createLoader(root);
    try {
        console.log('📊 Переданный контекст:', context); // Добавлено для отладки
        const tokens = tokenize(template);
        console.log('Tokens:', tokens);
        const ast = parse(tokens);
        const compiled = compile(ast, loader);
        return compiled(context, filters);
    }
    catch (err) {
        console.error('Template error:', err);
        return `<span style="color:red">[Ошибка шаблона: ${err.message}]</span>`;
    }
}
