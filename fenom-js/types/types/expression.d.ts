export type ExpressionNode = {
    type: 'literal';
    value: string | number | boolean;
} | {
    type: 'variable';
    path: string;
} | {
    type: 'unary';
    operator: '!' | '+' | '-';
    argument: ExpressionNode;
} | {
    type: 'binary';
    operator: BinaryOperator;
    left: ExpressionNode;
    right: ExpressionNode;
} | {
    type: 'conditional';
    test: ExpressionNode;
    consequent: ExpressionNode;
    alternate: ExpressionNode;
} | {
    type: 'filter';
    expression: ExpressionNode;
    filter: string;
    args: ExpressionNode[];
};
export type BinaryOperator = '+' | '-' | '*' | '/' | '%' | '==' | '!=' | '<' | '<=' | '>' | '>=' | '&&' | '||' | '~';
