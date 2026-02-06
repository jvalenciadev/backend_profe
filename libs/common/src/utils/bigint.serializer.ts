export function setupBigIntSerialization() {
    (BigInt.prototype as any).toJSON = function () {
        return this.toString();
    };
}
