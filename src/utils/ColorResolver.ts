import colors from 'tailwindcss/colors';

// Helper to convert Hex to RGB string "255, 255, 255"
function hexToRgbString(hex: string): string {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
}

// 1. The Resolver Function
function getRgbFromTailwindClass(className: string): string {
    // Handle arbitrary values like "bg-[#123456]"
    if (className.includes('[#')) {
        const match = className.match(/\[#(.*?)\]/);
        return match ? hexToRgbString(match[1]) : '255, 255, 255';
    }

    // Strip "bg-" prefix
    const rawParams = className.replace('bg-', '').split('-');
    
    // Handle cases like "bg-black" or "bg-white" (no shade)
    if (rawParams.length === 1) {
        const colorName = rawParams[0];
        // @ts-ignore - Tailwind types can be tricky to map dynamically
        const colorVal = colors[colorName];
        return typeof colorVal === 'string' ? hexToRgbString(colorVal) : '255, 255, 255';
    }

    // Handle standard colors like "bg-sky-500"
    const [colorName, shade] = rawParams;
    
    // @ts-ignore
    const colorHex = colors[colorName]?.[shade];

    if (!colorHex) {
        console.warn(`Could not resolve tailwind color: ${className}`);
        return '255, 255, 255'; // Fallback to white
    }

    return hexToRgbString(colorHex);
}

// 2. The Style Generator
export function getColor(tailwindClass: string): { [key: string]: string } {
    const rgbValue = getRgbFromTailwindClass(tailwindClass);
    return {
        '--accent-rgb': rgbValue, '--bg-color': rgbValue
    };
}