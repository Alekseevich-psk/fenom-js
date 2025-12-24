export interface PluginUserConfig {
    root?: string;
    include?: string[];
    exclude?: string[];
    data?: string[];
    formats?: string[];
    ignoredPaths?: string[];
    minify?: boolean;
}
