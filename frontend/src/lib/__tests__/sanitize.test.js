import { describe, it, expect } from 'vitest'
import {
  sanitizeText,
  sanitizePhone,
  isValidPhone,
  sanitizeEmail,
  isValidEmail,
  sanitizeNumber,
  sanitizeSerialNumber,
} from '../sanitize'

describe('sanitize utilities', () => {
  it('strips HTML, script/style blocks, event handlers, and dangerous URIs', () => {
    const dirty = '<script>alert(1)</script><style>body{}</style><b onclick="evil()">Hello</b> javascript:bad()'
    const clean = sanitizeText(dirty)
    expect(clean).not.toContain('<script>')
    expect(clean).not.toContain('alert(1)')
    expect(clean).not.toContain('onclick=')
    expect(clean).not.toContain('javascript:')
    expect(clean).toContain('Hello')
  })

  it('respects maxLength, allowMultiline, and trim: false', () => {
    expect(sanitizeText('  abc  ', { trim: false })).toBe(' abc ')
    expect(sanitizeText('abcdef', { maxLength: 3 })).toBe('abc')
    expect(sanitizeText('line1\n\n\n\nline2', { allowMultiline: true })).toBe('line1\n\nline2')
    expect(sanitizeText(null)).toBe('')
  })

  it('normalizes and validates Philippine mobile numbers', () => {
    expect(sanitizePhone('0917-123-4567')).toBe('09171234567')
    expect(isValidPhone('09171234567')).toBe(true)
    expect(isValidPhone('08171234567')).toBe(false)
    expect(isValidPhone('0917123')).toBe(false)
  })

  it('sanitizes and validates email addresses', () => {
    expect(sanitizeEmail('  User@Example.COM "<> ')).toBe('user@example.com')
    expect(isValidEmail('user@example.com')).toBe(true)
    expect(isValidEmail('invalid-email')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })

  it('clamps numbers and formats serial numbers', () => {
    expect(sanitizeNumber('42.7', { integer: true, min: 1, max: 100 })).toBe(42)
    expect(sanitizeNumber('999', { max: 50 })).toBe(50)
    expect(sanitizeNumber('abc', { fallback: 10 })).toBe(10)
    expect(sanitizeSerialNumber('sn-sol 2026/01!')).toBe('SN-SOL202601')
  })
})
