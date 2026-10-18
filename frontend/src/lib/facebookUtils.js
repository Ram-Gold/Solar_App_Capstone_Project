/**
 * Utilities for cleaning, parsing, and normalizing Facebook links and handles.
 * Ensures consistent visual prefixing and standardized backend storage (https://facebook.com/...).
 */

/**
 * Extracts the Facebook username, profile slug, or profile ID query from any input.
 * Handles:
 * - 'juandelacruz' -> 'juandelacruz'
 * - '@juandelacruz' -> 'juandelacruz'
 * - 'facebook.com/juandelacruz' -> 'juandelacruz'
 * - 'https://www.facebook.com/juandelacruz' -> 'juandelacruz'
 * - 'https://m.facebook.com/profile.php?id=123456' -> 'profile.php?id=123456'
 * - 'https://facebook.com/groups/12345' -> 'groups/12345'
 */
export function extractFacebookHandle(rawInput = '') {
  if (!rawInput) return ''
  let cleaned = String(rawInput).trim()

  // Remove leading @ if typed
  if (cleaned.startsWith('@')) {
    cleaned = cleaned.slice(1).trim()
  }

  // Remove protocol
  cleaned = cleaned.replace(/^https?:\/\//i, '')

  // Remove any www., m., web., mobile. subdomain variations
  cleaned = cleaned.replace(/^(www\.|m\.|web\.|mobile\.)/i, '')

  // Remove fb.com, fb.me, or facebook.com domain
  cleaned = cleaned.replace(/^(facebook\.com|fb\.com|fb\.me)\/?/i, '')

  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, '')

  return cleaned
}

/**
 * Normalizes input to a full canonical HTTPS Facebook profile URL.
 * Example: 'juandelacruz' -> 'https://facebook.com/juandelacruz'
 */
export function formatFacebookUrl(rawInput = '') {
  const handle = extractFacebookHandle(rawInput)
  if (!handle) return ''
  return `https://facebook.com/${handle}`
}

/**
 * Basic validator for Facebook handle/profile inputs.
 */
export function isValidFacebookInput(rawInput = '') {
  const handle = extractFacebookHandle(rawInput)
  if (!handle || handle.length < 2) return false
  return true
}
