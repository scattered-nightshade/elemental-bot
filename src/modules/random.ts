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
export function weightedRandom<T>(items: T[], weights: number[], returnOptions: WeightedRandomReturnOptions = { returnAmount: 1, removeFromWeights: true }): T[] {
    if (items.length !== weights.length) {
        throw new Error("Items and weights arrays must be the same length.");
    }

    const selectedItems: T[] = [];
    const itemsCopy = [...items];
    const weightsCopy = [...weights];

    const returnAmount = returnOptions.returnAmount || 1;
    const removeFromWeights = returnOptions.removeFromWeights === null ? true : returnOptions.removeFromWeights;

    for (let n = 0; n < returnAmount && itemsCopy.length > 0; n++) {
        const totalWeight = weightsCopy.reduce((sum, weight) => sum + weight, 0);
        let randomWeightPoint = Math.random() * totalWeight;

        for (let i = 0; i < itemsCopy.length; i++) {
            if (randomWeightPoint < weightsCopy[i]) {
                selectedItems.push(itemsCopy[i]);
                if (removeFromWeights){
                    itemsCopy.splice(i, 1);
                    weightsCopy.splice(i, 1);
                }
                break;
            }
            randomWeightPoint -= weightsCopy[i];
        }
    }

    return selectedItems;
}

export interface WeightedRandomReturnOptions {
    returnAmount?: number,
    removeFromWeights?: boolean,
}