// Avoid replaceAll to support older lib targets
export const csvEscape = (s: string) => '"' + String(s).split('"').join('""') + '"'