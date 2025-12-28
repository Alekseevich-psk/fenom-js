import type { ExpressionNode } from '../types/expression';
import { getFromContext } from './functions';

export function evaluate(
    node: ExpressionNode,
    context: any,
    filters: Record<string, Function>
): any {
    switch (node.type) {

        case 'literal':
            return node.value;

        case 'variable':
            return getFromContext(node.path, context) ?? '';

        case 'unary':
            const arg = evaluate(node.argument, context, filters);
            switch (node.operator) {
                case '!': return !arg;
                case '+': return +arg;
                case '-': return -arg;
            }
            break;

        case 'binary': {
            const left = evaluate(node.left, context, filters);
            const right = evaluate(node.right, context, filters);

            switch (node.operator) {
                case '+': return left + right;
                case '-': return left - right;
                case '*': return left * right;
                case '/': return left / right;
                case '%': return left % right;
                case '==': return left == right;
                case '!=': return left != right;
                case '<': return left < right;
                case '<=': return left <= right;
                case '>': return left > right;
                case '>=': return left >= right;
                case '&&': return left && right;
                case '||': return left || right;
                case '~': return String(left) + String(right);
            }
            break;
        }

        case 'conditional':
            const test = evaluate(node.test, context, filters);
            return test
                ? evaluate(node.consequent, context, filters)
                : evaluate(node.alternate, context, filters);

        case 'filter': {
            const input = evaluate(node.expression, context, filters);
            const args = node.args.map(arg => evaluate(arg, context, filters));
            const filterFn = filters[node.filter];
            if (typeof filterFn === 'function') {
                return filterFn(input, ...args);
            }
            return input;
        }
    }

    return '';
}