export interface TokenPattern {
    type: string;
    regex: RegExp;
    process?: (match: RegExpMatchArray) => Record<string, any>;
}

export interface Token {
    type: string;
    [key: string]: any;
}