export declare const contextPath: (expr: string) => string;
export declare const parseValue: (value: string) => string;
export declare function transformExpression(expr: string): string;
export declare function isVariable(str: string): boolean;
/**
 * Рекурсивно читает все .json файлы в папке и строит вложенный объект
 * по структуре папок и имён файлов.
 *
 * Пример:
 *   /data/user.json              → { user: { ... } }
 *   /data/api/profile.json       → { api: { profile: { ... } } }
 *   /data/api/stats/count.json   → { api: { stats: { count: { ... } } } }
 */
export declare function collectJsonDataMerged(dir: string): Record<string, any>;
export declare function warnFilter<T extends (...args: any[]) => any>(name: string, expected: 'array' | 'string' | 'object' | 'number', fn: T): T;
export declare function transformCondition(condition: string): string;
export declare function minifyHTML(html: string): string;
