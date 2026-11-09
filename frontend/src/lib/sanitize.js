/**
 * Centralized Input Sanitization & Normalization Utilities
 * Protects against XSS, input bloat, invalid characters, and malformed data.
 * All functions are pure, deterministic, and safe for client-side execution.
 */

import { normalizePhMobile, isValidPhMobile } from './phoneUtils.js'

/**
 * Strips HTML tags, script injections, zero-width characters, and normalizes whitespace.
 *
 * @param {string} input - Raw user input text
 * @param {Object} [options]
 * @param {number} [options.maxLength] - Maximum allowed character length
 * @param {boolean} [options.allowMultiline=false] - Whether to preserve clean newlines
 * @returns {string} Sanitized clean string
 */
export function sanitizeText(input, options = {}) {
  if (input === null || input === undefined) return ''

  const { maxLength = 1000, allowMultiline = false } = options

  // Convert to string
  let text = String(input)

  // Remove zero-width characters and invisible control characters
  text = text.replace(/[\u200B-\u200D\uFEFF\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')

  // Strip full <script>...</script> and <style>...</style> blocks including inner content
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  // Strip remaining HTML / XML tags
  text = text.replace(/<[^>]*>/g, '')

  // Encode residual dangerous characters for defense-in-depth
  text = text
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '')

  if (allowMultiline) {
    // Normalize line breaks to \n and collapse excessive consecutive blank lines (max 2)
    text = text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .split('\n')
      .map(line => line.trim())
      .join('\n')
  } else {
    // Collapse all whitespace (tabs, newlines, multiple spaces) into a single space
    text = text.replace(/\s+/g, ' ')
  }

  // Trim edges
  text = text.trim()

  // Enforce max length
  if (typeof maxLength === 'number' && maxLength > 0 && text.length > maxLength) {
    text = text.slice(0, maxLength)
  }

  return text
}

/**
 * Sanitizes and normalizes Philippine mobile phone numbers.
 * Delegates to phoneUtils: digits only, maximum 11 digits, standard 09 prefix.
 *
 * @param {string|number} input
 * @returns {string} Normalized 11-digit string or valid prefix
 */
export function sanitizePhone(input) {
  return normalizePhMobile(input)
}

/**
 * Validates whether a phone number is a complete, valid 11-digit Philippine mobile number.
 *
 * @param {string|number} input
 * @returns {boolean}
 */
export function isValidPhone(input) {
  return isValidPhMobile(input)
}

/**
 * Sanitizes and normalizes an email address.
 * Strips whitespace, converts to lowercase, and removes unsafe characters.
 *
 * @param {string} input
 * @param {number} [maxLength=254]
 * @returns {string} Sanitized email string
 */
export function sanitizeEmail(input, maxLength = 254) {
  if (!input) return ''
  let email = String(input).trim().toLowerCase()
  // Remove whitespace and dangerous quotes/tags
  email = email.replace(/[\s<>"'\\;]/g, '')
  if (email.length > maxLength) {
    email = email.slice(0, maxLength)
  }
  return email
}

/**
 * Validates basic email format structure.
 *
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email) return false
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/
  return emailRegex.test(String(email).trim())
}

/**
 * Sanitizes a numeric value within constraints (min, max, integer).
 *
 * @param {any} input
 * @param {Object} [options]
 * @param {number} [options.min] - Minimum allowed value
 * @param {number} [options.max] - Maximum allowed value
 * @param {boolean} [options.integer=false] - Whether to parse as integer
 * @param {number} [options.fallback=0] - Fallback value if input is not a number
 * @returns {number} Sanitized clamped number
 */
export function sanitizeNumber(input, options = {}) {
  const { min, max, integer = false, fallback = 0 } = options

  let val = integer ? parseInt(input, 10) : parseFloat(input)
  if (Number.isNaN(val)) {
    val = fallback
  }

  if (typeof min === 'number' && val < min) val = min
  if (typeof max === 'number' && val > max) val = max

  return val
}

/**
 * Sanitizes hardware serial numbers or system reference codes.
 * Restricts to uppercase alphanumeric characters, dashes, and underscores.
 *
 * @param {string} input
 * @param {number} [maxLength=64]
 * @returns {string}
 */
export function sanitizeSerialNumber(input, maxLength = 64) {
  if (!input) return ''
  let cleaned = String(input)
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .toUpperCase()
    .trim()
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength)
  }
  return cleaned
}
