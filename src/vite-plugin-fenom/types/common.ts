export interface UserConfig {
    root?: string;           // корень проекта
    dataDir?: string;        // где лежат JSON
    pagesDir?: string;       // папка с "страницами" → по умолчанию "pages"
    scanAll?: boolean;       // true → все .tpl → .html, false → только из pagesDir
    minify?: boolean;        // минифицировать ли HTML
    assetInputs?: string[];  // например: ['src/styles/**/*.{css,scss}', 'src/scripts/**/*.ts']
}

export type TemplateLoader = (file: string) => string;

export interface ScanOptions {
    root: string;
    pagesDir: string;
    scanAll?: boolean;
    assetInputs?: string[]; // например: ['src/styles/**/*.{css,scss}', 'src/scripts/**/*.ts']
}

export interface ScannedAssets {
    htmlEntries: string[];     // .tpl файлы
    assetFiles: string[];      // найденные ассеты (js, css)
}