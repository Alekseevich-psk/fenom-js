export const filters = {
    upper: (s: string) => String(s).toUpperCase(),
    lower: (s: string) => String(s).toLowerCase(),
    escape: (s: string) => String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;'),
    raw: (s: string) => s,
    length: (arr: any) => Array.isArray(arr)
        ? arr.length
        : typeof arr === 'object' && arr !== null
            ? Object.keys(arr).length
            : String(arr).length
};