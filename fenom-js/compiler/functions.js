export const contextPath = (expr) => {
    // Пока: просто поддержим ?: и !: одинаково
    expr = expr.replace(/(\$[a-zA-Z_]\w*(?:\.\w+)*)\s*[\?:!]\s*:/g, '$1 ? $1 : ');
    return expr.replace(/\$([a-zA-Z_]\w*(?:\.\w+)*)/g, 'context.$1');
};
export const parseValue = (value) => {
    value = value.trim();
    if (value === 'true')
        return 'true';
    if (value === 'false')
        return 'false';
    if (value === 'null')
        return 'null';
    if (value === 'undefined')
        return 'undefined';
    if (!isNaN(Number(value)) && !value.includes(' ')) {
        return value;
    }
    // Массив или объект
    if ((value.startsWith('[') && value.endsWith(']')) ||
        (value.startsWith('{') && value.endsWith('}'))) {
        return value;
    }
    // Переменная: $var → context.var
    if (value.startsWith('$')) {
        return transformExpression(value); // → context.var
    }
    // Строка
    return JSON.stringify(value);
};
export const transformExpression = (expr) => {
    expr = expr.replace(/(\$[a-zA-Z_]\w*(?:\.\w+)*)\s*[\?:!]\s*:/g, '$1 ? $1 : ');
    return expr.replace(/\$([a-zA-Z_]\w*(?:\.\w+)*)/g, 'context.$1');
};
// export const getAllTpls = (dir: string) => {
//     const results: string[] = [];
//     try {
//         const list = readdirSync(dir);
//         list.forEach((file) => {
//             const filePath = join(dir, file);
//             const stat = fs.statSync(filePath);
//             if (stat.isDirectory()) {
//                 results.push(...getAllTpls(filePath));
//             } else if (extname(file) === '.tpl') {
//                 results.push(filePath);
//             }
//         });
//     } catch (e) { }
//     return results;
// };
