export interface ASTNode {
    type: string;
    [key: string]: any;
}

export interface UserConfig {
    root: string;
    dataDir: string;
}

export type TemplateLoader = (file: string) => string;