import type { ASTNode, TemplateLoader } from '../types/common';
export declare function compile(ast: ASTNode[], loader?: TemplateLoader): (context: any, filters: any) => Promise<string>;
