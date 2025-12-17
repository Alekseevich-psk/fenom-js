export interface UserConfig {
    root?: string;
    dataDir?: string;
    pagesDir?: string;
    scanAll?: boolean;
    minify?: boolean;
}
export type TemplateLoader = (file: string) => string;
