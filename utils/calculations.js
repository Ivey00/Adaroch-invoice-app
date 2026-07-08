const TVA_RATE = 1.20; // 20% VAT, standard Moroccan rate used by this shop

/**
 * Rounds a number to 2 decimal places (standard monetary rounding).
 */
function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Given a TTC (tax included) total, computes HT (tax excluded) and TVA (tax amount).
 * HT = TTC / 1.20
 * TVA = TTC - HT
 */
function computeHtTva(ttc) {
  const ht = round2(ttc / TVA_RATE);
  const tva = round2(ttc - ht);
  return { ht, tva, ttc: round2(ttc) };
}

/**
 * Formats a number as a monetary string always ending in ".00"-style two decimals.
 * Per the business rules, all unit prices/totals used in this app are whole
 * integers, so this simply guarantees the ".00" suffix formatting.
 */
function formatMoney(value) {
  return Number(value).toFixed(2);
}

module.exports = { computeHtTva, formatMoney, round2, TVA_RATE };
