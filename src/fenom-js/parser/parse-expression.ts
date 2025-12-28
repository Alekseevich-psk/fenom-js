import type { ExpressionNode, BinaryOperator } from './../types/expression';

function tokenizeExpression(expr: string): Array<{ type: 'op' | 'var' | 'num' | 'str' | 'filter', value: string; }> {
    const tokens: Array<{ type: 'op' | 'var' | 'num' | 'str' | 'filter', value: string; }> = [];
    const re = /(\s+|[$a-zA-Z_]\w*(?:\.\w+)*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\d+(?:\.\d+)?|[-+*/%<>=!&|?:(){}[\]~]+|[\w-]+:)/g;
    let match;

    const isOperator = (val: string): val is BinaryOperator => {
        return [
            '+', '-', '*', '/', '%',
            '==', '!=', '<', '<=', '>', '>=',
            '&&', '||', '!', '(', ')', '?', ':',
            '~'  // ← добавили
        ].includes(val);
    };

    while ((match = re.exec(expr)) !== null) {
        const val = match[0].trim();
        if (!val) continue;

        if (isOperator(val)) {
            tokens.push({ type: 'op', value: val });
        } else if (val === '|') {
            tokens.push({ type: 'filter', value: val });
        } else if (val.startsWith('$')) {
            tokens.push({ type: 'var', value: val });
        } else if (/^["']/.test(val)) {
            const str = val.slice(1, -1).replace(/\\(.)/g, '$1');
            tokens.push({ type: 'str', value: str });
        } else if (!isNaN(+val)) {
            tokens.push({ type: 'num', value: val });
        } else {
            tokens.push({ type: 'str', value: val });
        }
    }

    return tokens;
}

// Основная функция — только один раз
export function parseExpression(expr: string): ExpressionNode {
    const tokens = tokenizeExpression(expr);
    let pos = 0;

    function parseTernary(): ExpressionNode {
        const test = parseLogical();
        if (pos < tokens.length && tokens[pos].value === '?') {
            pos++;
            const consequent = parseExpressionInternal(); // ✅ Используем внутреннюю
            if (pos < tokens.length && tokens[pos].value === ':') pos++;
            const alternate = parseTernary();
            return { type: 'conditional', test, consequent, alternate };
        }
        return test;
    }

    function parseLogical(): ExpressionNode {
        return parseBinary(() => parseEquality(), ['||', '&&']);
    }

    function parseEquality(): ExpressionNode {
        return parseBinary(() => parseRelational(), ['==', '!=']);
    }

    function parseRelational(): ExpressionNode {
        return parseBinary(() => parseAdditive(), ['<', '<=', '>', '>=']);
    }

    function parseAdditive(): ExpressionNode {
        return parseBinary(() => parseMultiplicative(), ['+', '-', '~']);
    }

    function parseMultiplicative(): ExpressionNode {
        return parseBinary(() => parseUnary(), ['*', '/', '%']);
    }

    function parseUnary(): ExpressionNode {
        if (pos < tokens.length && ['!', '+', '-'].includes(tokens[pos].value)) {
            const op = tokens[pos].value as '!' | '+' | '-';
            pos++;
            return { type: 'unary', operator: op, argument: parseUnary() };
        }
        return parsePrimary();
    }

    function parsePrimary(): ExpressionNode {
        const token = tokens[pos];
        if (!token) throw new Error('Unexpected end of expression');

        if (token.type === 'num') {
            pos++;
            return { type: 'literal', value: +token.value };
        }
        if (token.type === 'str') {
            pos++;
            return { type: 'literal', value: token.value };
        }
        if (token.type === 'var') {
            pos++;
            return { type: 'variable', path: token.value.slice(1) };
        }
        if (token.value === '(') {
            pos++;
            const expr = parseTernary();
            if (pos >= tokens.length || tokens[pos].value !== ')') {
                throw new Error('Expected )');
            }
            pos++;
            return expr;
        }

        throw new Error(`Unexpected token: ${token.value}`);
    }

    function parseBinary(
        parseLeft: () => ExpressionNode,
        operators: string[]
    ): ExpressionNode {
        let left = parseLeft();
        while (pos < tokens.length && operators.includes(tokens[pos].value)) {
            const op = tokens[pos].value as BinaryOperator;
            pos++;
            const right = parseLeft();
            left = { type: 'binary', operator: op, left, right };
        }
        return left;
    }

    function parseExpressionInternal(): ExpressionNode {
        return parseTernary();
    }

    return parseTernary();
}
