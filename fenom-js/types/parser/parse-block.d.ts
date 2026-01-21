import type { Token } from './../types/token';
import type { ASTNode } from './../types/common';
export declare function parseBlock(tokens: Token[], index: number): {
    node: ASTNode;
    nextIndex: number;
};
