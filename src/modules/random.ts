export function randomHexColour(): number {
    const hex: number = Math.floor(Math.random() * 0xFFFFFF);
    return hex;
}
export function randomInt(max: number): number {
    return Math.floor(Math.random() * max);
}
export function randomIntInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function randomInRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}
