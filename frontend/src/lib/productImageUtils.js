import { supabase } from './supabaseClient'

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif']
const EXT_REGEX = new RegExp(`\\.(${IMAGE_EXTENSIONS.join('|')})$`, 'i')

/**
 * Extracts a clean array of image URLs from any product image_url representation.
 * Supports:
 * - Array of URLs: ['url1', 'url2']
 * - Comma-separated URLs: 'url1, url2'
 * - Newline-separated URLs: 'url1\nurl2'
 * - JSON string array: '["url1", "url2"]'
 * - Single URL string: 'url1'
 * 
 * @param {string|string[]|null|undefined} input
 * @returns {string[]} Array of unique image URLs
 */
export function parseProductImages(input) {
  if (!input) return []

  let list = []

  if (Array.isArray(input)) {
    list = input
  } else if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed) return []

    // Try parsing JSON array format
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          list = parsed
        }
      } catch {
        // Fall back to comma or newline splitting
      }
    }

    if (list.length === 0) {
      if (trimmed.includes('\n')) {
        list = trimmed.split('\n')
      } else if (trimmed.includes(',')) {
        list = trimmed.split(',')
      } else {
        list = [trimmed]
      }
    }
  }

  // Sanitize, trim and deduplicate preserving order
  const cleaned = []
  const seen = new Set()

  for (const item of list) {
    if (typeof item !== 'string') continue
    const url = item.trim()
    if (!url) continue
    if (!seen.has(url)) {
      seen.add(url)
      cleaned.push(url)
    }
  }

  return cleaned
}

/**
 * Extracts the primary (first) display image for a product.
 * Returns empty string if no valid image exists.
 * 
 * @param {object|string|string[]|null|undefined} productOrImages
 * @returns {string} Primary image URL or empty string
 */
export function getMainProductImage(productOrImages) {
  if (!productOrImages) return ''

  if (typeof productOrImages === 'object' && !Array.isArray(productOrImages)) {
    const raw = productOrImages.image_url || productOrImages.product_image || productOrImages.images
    const parsed = parseProductImages(raw)
    return parsed[0] || ''
  }

  const parsed = parseProductImages(productOrImages)
  return parsed[0] || ''
}

/**
 * Serializes an array of image URLs into a string format suitable for database storage.
 * If 0 items, returns null.
 * If 1 item, returns single URL string.
 * If multiple items, returns comma-separated URLs.
 * 
 * @param {string[]} images
 * @returns {string|null}
 */
export function serializeProductImages(images) {
  const parsed = parseProductImages(images)
  if (parsed.length === 0) return null
  if (parsed.length === 1) return parsed[0]
  return parsed.join(', ')
}

/**
 * Extracts the base file name (without extension or path) from a URL or file path.
 * E.g., 'https://.../product-images/BGZ048_500.webp' -> 'BGZ048_500'
 * 
 * @param {string} urlOrFilename
 * @returns {string}
 */
export function extractStorageBaseName(urlOrFilename) {
  if (!urlOrFilename || typeof urlOrFilename !== 'string') return ''
  try {
    const cleaned = urlOrFilename.split('?')[0].split('#')[0]
    const filename = cleaned.split('/').pop() || ''
    return filename.replace(EXT_REGEX, '')
  } catch {
    return ''
  }
}

/**
 * Dynamically discovers all pictures for a product.
 * Combines explicit pictures from the product record with any additional pictures
 * uploaded to Supabase Storage that share the same equipment/model base name prefix
 * (e.g. BGZ048_500 -> BGZ048_500_(2).png, BGZ048_500_2.jpg, etc.).
 * 
 * @param {object} product - Product record containing image_url or id
 * @param {object} [client] - Supabase client instance (defaults to app client)
 * @returns {Promise<string[]>} List of all discovered picture URLs
 */
export async function fetchDynamicProductImages(product, client = supabase) {
  if (!product) return []

  const explicitImages = parseProductImages(product.image_url || product.images)
  const result = [...explicitImages]
  const seenUrls = new Set(explicitImages)
  const seenBaseNames = new Set()

  // Track existing base names to avoid adding duplicate format variants (e.g., .webp vs .png)
  for (const imgUrl of explicitImages) {
    const b = extractStorageBaseName(imgUrl).toLowerCase()
    if (b) seenBaseNames.add(b)
  }

  // If no primary image to infer base name from, return existing explicit images
  const primaryUrl = explicitImages[0]
  if (!primaryUrl) return result

  const rawBase = extractStorageBaseName(primaryUrl)
  if (!rawBase) return result

  try {
    const bucketName = 'product-images'
    const { data: files, error } = await client.storage
      .from(bucketName)
      .list('', {
        limit: 100,
        search: rawBase
      })

    if (error || !files || files.length === 0) {
      return result
    }

    const escaped = rawBase.toLowerCase().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
    // Matches rawBase + separator + number/tag (e.g. BGZ048_500_(2), BGZ048_500_2, BGZ048_500-2, BGZ048_500 (2))
    const relatedPattern = new RegExp(`^${escaped}(_|-|\\s|\\()`, 'i')

    for (const file of files) {
      if (!file?.name || file.name.endsWith('.emptyFolderPlaceholder') || file.name.endsWith('.txt')) {
        continue
      }

      const fBase = extractStorageBaseName(file.name).toLowerCase()
      if (!fBase) continue

      // Include files matching the related multi-picture pattern
      const isRelated = relatedPattern.test(fBase)

      if (isRelated && !seenBaseNames.has(fBase)) {
        seenBaseNames.add(fBase)
        const { data: pubData } = client.storage.from(bucketName).getPublicUrl(file.name)
        if (pubData?.publicUrl && !seenUrls.has(pubData.publicUrl)) {
          seenUrls.add(pubData.publicUrl)
          result.push(pubData.publicUrl)
        }
      }
    }
  } catch (err) {
    console.warn('Failed to dynamically fetch storage pictures for product:', err)
  }

  return result
}
