export declare function contextPath(path: string): string;
export declare function parseValue(value: string): any;
export declare function transformExpression(exp: string): string;
export declare function isVariable(str: string): boolean;
export declare function warnFilter(name: string, expected: 'array' | 'string' | 'object', fn: (...args: any[]) => any): (...args: any[]) => any;
export declare function transformCondition(cond: string): string;
export declare function minifyHTML(html: string): string;
export declare function getFromContext(path: string, context: any): any;
export declare function applyFilters(value: any, filterList: string[], context: any, filters: any): any;
