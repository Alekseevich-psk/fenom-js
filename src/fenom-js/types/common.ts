export interface ASTNode {
    type: string;
    [key: string]: any;
}

export interface UserConfig {
    root?: string;           // корень проекта
    dataDir?: string;        // где лежат JSON
    pagesDir?: string;       // папка с "страницами" → по умолчанию "pages"
    scanAll?: boolean;       // true → все .tpl → .html, false → только из pagesDir
    minify?: boolean;
}

export type TemplateLoader = (file: string) => Promise<string>;