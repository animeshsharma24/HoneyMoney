/**
 * Centralized Global Text Normalization Utility
 * Rule: First letter of every word uppercase, remaining letters lowercase.
 * Examples:
 *   "iRaNI chai" -> "Irani Chai"
 *   "cOFFEE shop" -> "Coffee Shop"
 *   "phone pe" -> "Phone Pe"
 *   "UPI", "CREDIT_CARD", "SBI CC 5210" are protected where applicable.
 */

// Known acronyms or suffixes to preserve when capitalized
const PROTECTED_ACRONYMS = new Set([
  'ATM', 'UPI', 'CC', 'DC', 'OTP', 'POS', 'FD', 'RD', 'SIP', 'EMI', 'GST',
  'SBI', 'HDFC', 'ICICI', 'PNB', 'BOB', 'IDFC', 'KOTAK', 'AXIS', 'HSBC', 'AMEX'
]);

export function normalizeTitleCase(input: string | undefined | null): string {
  if (!input) return '';
  const trimmed = input.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  return trimmed
    .split(' ')
    .map(word => {
      // If the word contains numbers or punctuation or is an all-caps short acronym like SBI, CC, ATM
      const upperWord = word.toUpperCase();
      if (PROTECTED_ACRONYMS.has(upperWord)) {
        return upperWord;
      }
      // If it looks like card last digits or reference (e.g. 5210 or #481)
      if (/^#?\d+$/.test(word)) {
        return word;
      }
      // Standard title casing: First char upper, rest lower
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function normalizeForSearch(text: string | undefined | null): string {
  if (!text) return '';
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}
