export const filters = {
    upper: (s) => String(s).toUpperCase(),
    lower: (s) => String(s).toLowerCase(),
    escape: (s) => String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;'),
    raw: (s) => s,
    length: (arr) => Array.isArray(arr)
        ? arr.length
        : typeof arr === 'object' && arr !== null
            ? Object.keys(arr).length
            : String(arr).length
};
