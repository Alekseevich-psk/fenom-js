export interface ASTNode {
    type: string;
    [key: string]: any;
}
export interface UserConfig {
    root?: string;
    dataDir?: string;
    pagesDir?: string;
    scanAll?: boolean;
    minify?: boolean;
}
export type TemplateLoader = (file: string) => Promise<string>;
export interface FenomOptions {
    context?: Record<string, any>;
    loader?: TemplateLoader;
    minify?: boolean;
    debug?: boolean;
}
