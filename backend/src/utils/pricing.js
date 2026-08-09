/**
 * Unified pricing/profit calculation.
 * Used in: product listing (branch view), order creation, monthly reports.
 *
 * marginType === 'percentage': marginValue is a whole percent number (e.g. 15 means 15%)
 *                               finalPrice = basePrice * (1 + marginValue / 100)
 *                               branchProfit = basePrice * (marginValue / 100) * quantity
 * marginType === 'fixed':      marginValue is a flat amount in EGP
 *                               finalPrice = basePrice + marginValue
 *                               branchProfit = marginValue * quantity
 * hqRevenue = basePrice * quantity  (always, regardless of margin type)
 *
 * All monetary values are handled as Decimal-safe strings via Prisma Decimal,
 * but for arithmetic we convert to Number carefully at the edges. Since prices
 * are 2dp currency and margins bounded, Number arithmetic here is acceptable
 * once inputs come from Prisma Decimal (which parses exactly); for extra safety
 * we round to 2 decimals on every output.
 */

function toNumber(decimalLike) {
  if (decimalLike === null || decimalLike === undefined) return 0;
  return typeof decimalLike === 'object' && typeof decimalLike.toNumber === 'function'
    ? decimalLike.toNumber()
    : Number(decimalLike);
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * @param {number|Decimal} basePrice
 * @param {string} marginType - 'percentage' | 'fixed'
 * @param {number|Decimal} marginValue - whole percent (e.g. 15) if 'percentage', flat EGP amount if 'fixed'
 * @param {number} quantity - default 1, used for profit calculations
 */
function calculatePricing(basePrice, marginType, marginValue, quantity = 1) {
  const base = toNumber(basePrice);
  const margin = toNumber(marginValue);

  let finalPrice;
  let branchProfitPerUnit;

  if (marginType === 'percentage') {
    // marginValue comes in as a whole percent (15 => 15%), so convert to fraction
    const marginFraction = margin / 100;
    finalPrice = base + base * marginFraction;
    branchProfitPerUnit = base * marginFraction;
  } else if (marginType === 'fixed') {
    finalPrice = base + margin;
    branchProfitPerUnit = margin;
  } else {
    throw new Error(`Unknown marginType: ${marginType}`);
  }

  const branchProfit = branchProfitPerUnit * quantity;
  const hqRevenue = base * quantity;
  const totalSale = finalPrice * quantity;

  return {
    finalPrice: round2(finalPrice),
    branchProfitPerUnit: round2(branchProfitPerUnit),
    branchProfit: round2(branchProfit),
    hqRevenue: round2(hqRevenue),
    totalSale: round2(totalSale),
  };
}

module.exports = { calculatePricing, toNumber, round2 };