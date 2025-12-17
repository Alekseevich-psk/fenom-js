export declare const contextPath: (expr: string) => string;
export declare const parseValue: (value: string) => string;
export declare function transformExpression(expr: string): string;
export declare function isVariable(str: string): boolean;
export declare function warnFilter<T extends (...args: any[]) => any>(name: string, expected: 'array' | 'string' | 'object' | 'number', fn: T): T;
export declare function transformCondition(condition: string): string;
export declare function minifyHTML(html: string): string;
