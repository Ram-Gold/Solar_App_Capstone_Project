import { describe, it, expect, vi } from 'vitest'
import {
  parseProductImages,
  getMainProductImage,
  serializeProductImages,
  extractStorageBaseName,
  fetchDynamicProductImages
} from '../productImageUtils'

describe('productImageUtils', () => {
  describe('parseProductImages', () => {
    it('handles empty, null, or undefined values safely', () => {
      expect(parseProductImages(null)).toEqual([])
      expect(parseProductImages(undefined)).toEqual([])
      expect(parseProductImages('')).toEqual([])
      expect(parseProductImages('   ')).toEqual([])
    })

    it('parses single URL strings', () => {
      const url = 'https://example.com/storage/product-images/lamp.webp'
      expect(parseProductImages(url)).toEqual([url])
    })

    it('parses comma-separated URLs', () => {
      const input = 'https://example.com/img1.webp, https://example.com/img2.webp ,https://example.com/img3.webp'
      expect(parseProductImages(input)).toEqual([
        'https://example.com/img1.webp',
        'https://example.com/img2.webp',
        'https://example.com/img3.webp'
      ])
    })

    it('parses newline-separated URLs', () => {
      const input = 'https://example.com/img1.webp\nhttps://example.com/img2.webp'
      expect(parseProductImages(input)).toEqual([
        'https://example.com/img1.webp',
        'https://example.com/img2.webp'
      ])
    })

    it('parses JSON string array', () => {
      const input = JSON.stringify([
        'https://example.com/img1.webp',
        'https://example.com/img2.webp'
      ])
      expect(parseProductImages(input)).toEqual([
        'https://example.com/img1.webp',
        'https://example.com/img2.webp'
      ])
    })

    it('deduplicates repeating URLs', () => {
      const input = 'https://example.com/img1.webp, https://example.com/img1.webp, https://example.com/img2.webp'
      expect(parseProductImages(input)).toEqual([
        'https://example.com/img1.webp',
        'https://example.com/img2.webp'
      ])
    })
  })

  describe('getMainProductImage', () => {
    it('returns empty string if product has no images', () => {
      expect(getMainProductImage(null)).toBe('')
      expect(getMainProductImage({})).toBe('')
      expect(getMainProductImage({ image_url: '' })).toBe('')
    })

    it('extracts first image from product object with image_url', () => {
      const product = { image_url: 'https://example.com/img1.webp, https://example.com/img2.webp' }
      expect(getMainProductImage(product)).toBe('https://example.com/img1.webp')
    })

    it('extracts first image from direct string or array input', () => {
      expect(getMainProductImage('https://example.com/single.webp')).toBe('https://example.com/single.webp')
      expect(getMainProductImage(['https://example.com/first.webp', 'https://example.com/second.webp'])).toBe('https://example.com/first.webp')
    })
  })

  describe('serializeProductImages', () => {
    it('returns null for empty lists', () => {
      expect(serializeProductImages([])).toBeNull()
      expect(serializeProductImages(null)).toBeNull()
    })

    it('returns single URL string when 1 image is provided', () => {
      expect(serializeProductImages(['https://example.com/img1.webp'])).toBe('https://example.com/img1.webp')
    })

    it('returns comma-separated string when multiple images are provided', () => {
      expect(serializeProductImages([
        'https://example.com/img1.webp',
        'https://example.com/img2.webp'
      ])).toBe('https://example.com/img1.webp, https://example.com/img2.webp')
    })
  })

  describe('extractStorageBaseName', () => {
    it('extracts clean base name without extension', () => {
      expect(extractStorageBaseName('https://storage.supabase.co/product-images/BGZ048_500.webp')).toBe('BGZ048_500')
      expect(extractStorageBaseName('BGZ048_500_(2).png')).toBe('BGZ048_500_(2)')
      expect(extractStorageBaseName('https://storage.supabase.co/img.jpg?token=123')).toBe('img')
    })
  })

  describe('fetchDynamicProductImages', () => {
    it('returns explicit images when no storage client or search matches are found', async () => {
      const mockClient = {
        storage: {
          from: vi.fn().mockReturnValue({
            list: vi.fn().mockResolvedValue({ data: [], error: null })
          })
        }
      }

      const product = {
        id: 1,
        image_url: 'https://storage.supabase.co/product-images/BGZ048_200.webp'
      }

      const images = await fetchDynamicProductImages(product, mockClient)
      expect(images).toEqual(['https://storage.supabase.co/product-images/BGZ048_200.webp'])
    })

    it('dynamically appends related multi-picture files uploaded to storage', async () => {
      const mockClient = {
        storage: {
          from: vi.fn().mockReturnValue({
            list: vi.fn().mockResolvedValue({
              data: [
                { name: 'BGZ048_500.png' },
                { name: 'BGZ048_500.webp' },
                { name: 'BGZ048_500_(2).png' },
                { name: 'BGZ048_500_3.jpg' }
              ],
              error: null
            }),
            getPublicUrl: vi.fn((name) => ({
              data: { publicUrl: `https://storage.supabase.co/product-images/${name}` }
            }))
          })
        }
      }

      const product = {
        id: 4,
        image_url: 'https://storage.supabase.co/product-images/BGZ048_500.webp'
      }

      const images = await fetchDynamicProductImages(product, mockClient)
      expect(images).toEqual([
        'https://storage.supabase.co/product-images/BGZ048_500.webp',
        'https://storage.supabase.co/product-images/BGZ048_500_(2).png',
        'https://storage.supabase.co/product-images/BGZ048_500_3.jpg'
      ])
    })
  })
})
