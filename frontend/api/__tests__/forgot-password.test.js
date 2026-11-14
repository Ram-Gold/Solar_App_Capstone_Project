/* global process */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const generateLink = vi.fn()
const sendMail = vi.fn()
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ auth: { admin: { generateLink } } }) }))
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail }) } }))

import handler, { buildPasswordResetEmailHtml } from '../forgot-password.js'

function call(body, method = 'POST') {
  const res = { statusCode: 0, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } }
  return handler({ method, body }, res).then(() => res)
}

describe('/api/forgot-password', () => {
  beforeEach(() => {
    generateLink.mockReset(); sendMail.mockReset()
    process.env.VITE_SUPABASE_URL = 'https://x.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc'
    process.env.GMAIL_USER = 'sender@example.com'
    process.env.GMAIL_APP_PASSWORD = 'app pass'
    process.env.PUBLIC_SITE_URL = 'https://shop.example.com/'
  })

  it('rejects non-POST and invalid emails', async () => {
    expect((await call({}, 'GET')).statusCode).toBe(405)
    expect((await call({ email: 'nope' })).statusCode).toBe(400)
  })

  it('sends mail with a server-built recovery link when a token is issued', async () => {
    generateLink.mockResolvedValue({ data: { properties: { hashed_token: 'tok123' } }, error: null })
    const res = await call({ email: 'User@Example.com' })
    expect(res.statusCode).toBe(200)
    expect(generateLink).toHaveBeenCalledWith({
      type: 'recovery',
      email: 'user@example.com',
      options: { redirectTo: 'https://shop.example.com/reset-password' }
    })
    const mail = sendMail.mock.calls[0][0]
    expect(mail.to).toBe('user@example.com')
    expect(mail.html).toContain('https://shop.example.com/reset-password?token_hash=tok123&amp;type=recovery')
  })

  it('returns the identical response and sends nothing for unknown emails', async () => {
    generateLink.mockResolvedValue({ data: { properties: {} }, error: { message: 'User not found' } })
    const res = await call({ email: 'ghost@example.com' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ success: true })
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('still returns 200 when SMTP fails', async () => {
    generateLink.mockResolvedValue({ data: { properties: { hashed_token: 'tok' } }, error: null })
    sendMail.mockRejectedValue(new Error('smtp down'))
    const res = await call({ email: 'a@b.com' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ success: true })
  })

  it('email template escapes the url and contains no emoji', () => {
    const html = buildPasswordResetEmailHtml({ resetUrl: 'https://x/?a=1&b="2"' })
    expect(html).toContain('&amp;b=&quot;2&quot;')
    expect(/\p{Extended_Pictographic}/u.test(html)).toBe(false)
  })
})
