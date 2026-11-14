/**
 * Utility functions for validating and normalizing Philippine mobile phone numbers.
 * Standards:
 * - Must be an 11-digit mobile number.
 * - Must start with '09' (e.g., 09171234567).
 * - Converts country codes (+639 / 639) or numbers missing leading 0 (9XXXXXXXXX) into 09XXXXXXXXX.
 */

/**
 * Normalizes user input into a clean 11-digit Philippine mobile format (09XXXXXXXXX).
 * Restricts input to digits only, converts prefixes, and caps length at 11.
 *
 * @param {string|number} input
 * @returns {string} Normalized 11-digit number or partial valid prefix
 */
export function normalizePhMobile(input) {
  if (!input) return ''

  // Strip all non-digit characters
  let digits = String(input).replace(/\D/g, '')
  if (!digits) return ''

  // Convert +639 or 639 prefix to 09
  if (digits.startsWith('639')) {
    digits = '0' + digits.slice(2)
  } else if (digits.startsWith('9')) {
    // If entered without leading 0 (e.g. 9171234567)
    digits = '0' + digits
  }

  // Enforce starting with 09
  if (digits.length === 1) {
    if (digits !== '0') return ''
  } else if (digits.length >= 2) {
    if (!digits.startsWith('09')) {
      return digits.startsWith('0') ? '0' : ''
    }
  }

  // Cap at 11 digits
  return digits.slice(0, 11)
}

/**
 * Checks whether the given phone number is a valid 11-digit Philippine mobile number starting with 09.
 *
 * @param {string|number} number
 * @returns {boolean}
 */
export function isValidPhMobile(number) {
  if (!number) return false
  return /^09\d{9}$/.test(String(number).trim())
}
