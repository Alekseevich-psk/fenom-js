// types.ts
import type { Plugin } from 'vite';

export interface PluginUserConfig {
    reload?: boolean;
    root?: string;
    filters?: Record<string, Function>;
    globals?: Record<string, any>;
    data?: string | string[];
    formats?: string[];
    ignoredPaths?: string[];
    options?: Record<string, any>;
}

export type PluginConfig = PluginUserConfig & {
    root: string;
    data: string[];
    formats: string[];
    ignoredPaths: string[];
};

export interface TransformContext {
    path: string;
    filename: string;
    server: any;
    config: PluginConfig;
    resolvedConfig: any;
}
