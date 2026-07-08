const { formatMoney } = require("../utils/calculations");

// Spare parts catalog with allowed unit price (TTC) ranges, as specified by
// the business rules. All prices are whole integers (formatted with ".00").
const CATALOG = [
  { name: "Tete cardan", min: 300, max: 500 },
  { name: "Amortisseur av / arr.", min: 1000, max: 2500 },
  { name: "Huile moteur", min: 250, max: 450 },
  { name: "Filter huile", min: 50, max: 100 },
  { name: "Filter air", min: 100, max: 200 },
  { name: "Filter gazoil", min: 200, max: 400 },
  { name: "Disque frein", min: 600, max: 1400 },
  { name: "Plaquette frein", min: 250, max: 450 },
  { name: "Colier", min: 1, max: 10 },
  { name: "Thermostat", min: 200, max: 590 },
  { name: "Pompe eau", min: 350, max: 560 },
  { name: "Kit embrayage", min: 2500, max: 6000 },
  { name: "Volant moteur", min: 5000, max: 7000 },
  { name: "Courroie distribution", min: 300, max: 500 },
  { name: "Support cardan", min: 200, max: 500 },
  { name: "Support moteur", min: 300, max: 500 },
];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Rounds a price to the nearest multiple of 10 (or 1 for very cheap parts
 * whose whole range is under 10), then clamps it back inside [min, max].
 */
function roundPrice(value, min, max) {
  const step = max - min < 20 ? 1 : 10;
  let rounded = Math.round(value / step) * step;
  if (rounded < min) rounded = min;
  if (rounded > max) rounded = max;
  return rounded;
}

/**
 * Attempts to build a set of 4-6 invoice lines whose TTC totals sum exactly
 * to `totalTTC`. Retries with different random selections until it finds an
 * exact match, then falls back to a guaranteed exact single line as a last
 * resort so the invoice is never wrong.
 */
function generateInvoiceLines(totalTTC) {
  const target = Math.round(totalTTC); // whole dirhams, since all prices are integers
  const MAX_ATTEMPTS = 20000;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const count = randomInt(4, 6);

    // Bias toward parts that can plausibly fit the per-line budget so small
    // totals don't waste attempts on combinations that can never fit.
    const perLineBudget = target / count;
    let pool = CATALOG.filter((p) => p.min <= perLineBudget * 3);
    if (pool.length < count) pool = CATALOG;

    const parts = shuffle(pool).slice(0, count);

    const lines = [];
    let remaining = target;
    let ok = true;

    for (let i = 0; i < count - 1; i++) {
      const part = parts[i];
      const qty = randomInt(1, 4);
      const rawPrice = randomInt(part.min, part.max);
      const price = roundPrice(rawPrice, part.min, part.max);
      const lineTotal = qty * price;

      if (lineTotal >= remaining) {
        ok = false;
        break;
      }

      lines.push({
        description: part.name,
        quantity: qty,
        unit_price: price,
        line_total: lineTotal,
      });
      remaining -= lineTotal;
    }

    if (!ok || remaining <= 0) continue;

    // Solve the last line so the grand total matches exactly.
    const lastPart = parts[count - 1];
    let solved = false;

    for (let qty = 1; qty <= 6 && !solved; qty++) {
      if (remaining % qty !== 0) continue;
      const price = remaining / qty;
      if (price >= lastPart.min && price <= lastPart.max) {
        lines.push({
          description: lastPart.name,
          quantity: qty,
          unit_price: price,
          line_total: qty * price,
        });
        solved = true;
      }
    }

    if (solved) {
      const sum = lines.reduce((s, l) => s + l.line_total, 0);
      if (sum === target) {
        return formatLines(lines);
      }
    }
  }

  // Fallback (should be extremely rare given the generous price ranges):
  // guarantee an exact total with a single catch-all line.
  return formatLines([
    {
      description: "Pièces détachées diverses",
      quantity: 1,
      unit_price: target,
      line_total: target,
    },
  ]);
}

function formatLines(lines) {
  return lines.map((l) => ({
    description: l.description,
    quantity: l.quantity,
    unit_price: formatMoney(l.unit_price),
    line_total: formatMoney(l.line_total),
  }));
}

module.exports = { generateInvoiceLines, CATALOG };
