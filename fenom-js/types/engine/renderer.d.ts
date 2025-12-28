import type { TemplateLoader } from '../types/common';
export declare function FenomJs(template: string, context?: Record<string, any>, options?: {
    root?: string;
    loader?: TemplateLoader;
    minify?: boolean;
}): Promise<string>;
export { filters } from '../filters/filters';
