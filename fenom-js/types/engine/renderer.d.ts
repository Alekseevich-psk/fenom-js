import type { TemplateLoader } from '../types/common';
export declare function FenomJs(template: string, options?: {
    context?: Record<string, any>;
    loader?: TemplateLoader;
    minify?: boolean;
}): Promise<string>;
export { filters } from '../filters/filters';
