// FIX: Removed reference to vite/client to resolve a type definition error
// in environments where tsconfig.json might be misconfigured.

// Declare exceljs module to satisfy TypeScript when using import maps
declare module 'exceljs';
