export function setupBigIntSerialization() {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  // Support for Prisma Decimal
  try {
    const Decimal = require('decimal.js');
    if (Decimal) {
      Decimal.prototype.toJSON = function () {
        return this.toString();
      };
    }
  } catch (e) {
    // decimal.js might not be directly available or needed
  }
}
