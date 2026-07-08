/**
 * Converts a numeric amount into French words, formatted for a Moroccan
 * invoice ("Dirhams" / "centimes").
 *
 * Examples:
 *   1700.00  -> "mille sept cents DHs."
 *   10280.00 -> "dix mille deux cent quatre-vingts DHs."
 *   1250.00  -> "mille deux cent cinquante DHs."
 *   1250.50  -> "mille deux cent cinquante dirhams et cinquante centimes."
 */

const UNITS = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf",
];

const TENS = {
  20: "vingt",
  30: "trente",
  40: "quarante",
  50: "cinquante",
  60: "soixante",
};

// Handles the 70-79 special case (soixante-dix, soixante et onze, soixante-douze...)
function convertTens70to79(n) {
  const rest = n - 60; // 10..19
  if (rest === 11) return "soixante et onze";
  return `soixante-${UNITS[rest]}`;
}

function convertBelow100Fixed(n) {
  if (n < 17) return UNITS[n];
  if (n < 20) return UNITS[n];
  if (n >= 20 && n < 70) {
    const tensDigit = Math.floor(n / 10) * 10;
    const unit = n % 10;
    const tensWord = TENS[tensDigit];
    if (unit === 0) return tensWord;
    if (unit === 1) return `${tensWord} et un`;
    return `${tensWord}-${UNITS[unit]}`;
  }
  if (n >= 70 && n < 80) return convertTens70to79(n);
  if (n >= 80 && n < 100) {
    const rest = n - 80;
    if (rest === 0) return "quatre-vingts";
    return `quatre-vingt-${UNITS[rest]}`;
  }
  return String(n);
}

/**
 * Converts a number from 0 to 999 into French words.
 * `isFinalGroup` controls whether a bare multiple of 100 gets a trailing "s"
 * (only correct when nothing follows it in the full number).
 */
function convertHundreds(n, isFinalGroup) {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  let words = "";
  if (hundreds > 0) {
    words += hundreds === 1 ? "cent" : `${UNITS[hundreds]} cent`;
    if (rest === 0 && hundreds > 1 && isFinalGroup) words += "s";
  }
  if (rest > 0) {
    if (words) words += " ";
    words += convertBelow100Fixed(rest);
  }
  return words;
}

/**
 * Converts an integer (0 to 999,999,999) into French words.
 */
function convertIntegerToWords(num) {
  if (num === 0) return "zéro";

  const billions = Math.floor(num / 1_000_000_000);
  const millions = Math.floor((num % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((num % 1_000_000) / 1_000);
  const remainder = num % 1_000;

  const parts = [];

  if (billions > 0) {
    parts.push(`${billions === 1 ? "un" : convertBelow100Fixed(billions)} milliard${billions > 1 ? "s" : ""}`);
  }
  if (millions > 0) {
    parts.push(`${millions === 1 ? "un" : convertHundreds(millions, true)} million${millions > 1 ? "s" : ""}`);
  }
  if (thousands > 0) {
    if (thousands === 1) {
      parts.push("mille");
    } else {
      parts.push(`${convertHundreds(thousands, true)} mille`);
    }
  }
  if (remainder > 0 || parts.length === 0) {
    const isFinal = true;
    parts.push(convertHundreds(remainder, isFinal));
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/**
 * Converts a monetary amount (Moroccan Dirhams) into a full French sentence
 * ready to be inserted at the bottom of the invoice.
 *
 * @param {number} amount - The total amount (e.g. 1250.50)
 * @returns {string} The amount spelled out in French.
 */
function amountToFrenchWords(amount) {
  const rounded = Math.round(amount * 100) / 100;
  const dirhams = Math.floor(rounded);
  const centimes = Math.round((rounded - dirhams) * 100);

  const dirhamsWords = convertIntegerToWords(dirhams);

  if (centimes === 0) {
    return `${dirhamsWords}`;
  }

  const centimesWords = convertIntegerToWords(centimes);
  return `${dirhamsWords} dirhams et ${centimesWords} centimes.`;
}

module.exports = { amountToFrenchWords, convertIntegerToWords };
