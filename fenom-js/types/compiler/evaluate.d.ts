import type { ExpressionNode } from '../types/expression';
export declare function evaluate(node: ExpressionNode, context: any, filters: Record<string, Function>): any;
