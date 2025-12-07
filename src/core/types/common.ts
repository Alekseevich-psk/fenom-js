export interface ASTNode {
    type: string;
    [key: string]: any;
}

export interface UserConfig {
    root: string;
    dataDir: string;
}