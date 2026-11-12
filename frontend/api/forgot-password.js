/* global process */
import nodemailer from 'nodemailer'
import { createClient } from '@supabase/supabase-js'

const RESET_LINK_TTL_MINUTES = 30

function escapeHtml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Builds the password reset email. Professional, technical tone, no emojis.
 */
export function buildPasswordResetEmailHtml({ resetUrl, ttlMinutes = RESET_LINK_TTL_MINUTES }) {
  const safeUrl = escapeHtml(resetUrl)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JD Force Solar - Password Reset</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1c1917;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#1c1917;padding:24px 32px;border-bottom:3px solid #f59e0b;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#f59e0b;margin-bottom:4px;">JD Force Solar Products Trading</div>
              <div style="font-size:20px;font-weight:800;color:#ffffff;">Password Reset Request</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">A password reset was requested for the customer account associated with this email address.</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">Use the button below to choose a new password. This link can be used once and expires in ${ttlMinutes} minutes.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#f59e0b;border-radius:8px;">
                    <a href="${safeUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#1c1917;text-decoration:none;">Reset Password</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:12px;color:#78716c;">If the button does not work, copy this address into your browser:</p>
              <p style="margin:0 0 24px;font-size:12px;font-family:monospace;color:#44403c;word-break:break-all;">${safeUrl}</p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#57534e;">If you did not request this, you can ignore this email. Your password will not change and your account remains secure.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background-color:#fafaf9;border-top:1px solid #e7e5e4;font-size:11px;color:#78716c;">
              JD Force Solar Products Trading. This is an automated message; please do not reply.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function stripQuotes(value) {
  return String(value || '').trim().replace(/^["']|["']$/g, '')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' })
  }

  // Identical response for every outcome so account existence is never revealed.
  const genericOk = () => res.status(200).json({ success: true })

  const email = String(req.body?.email || '').trim().toLowerCase()
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'A valid email address is required.' })
  }

  try {
    const supabaseUrl = stripQuotes(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)
    const serviceKey = stripQuotes(process.env.SUPABASE_SERVICE_ROLE_KEY)
    const smtpUser = stripQuotes(process.env.GMAIL_USER || process.env.SMTP_USER)
    const smtpPass = stripQuotes(process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS).replace(/\s+/g, '')

    if (!supabaseUrl || !serviceKey || !smtpUser || !smtpPass) {
      console.error('/api/forgot-password: missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SMTP credentials')
      return genericOk()
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { data: token, error } = await admin.rpc('create_customer_password_reset', { p_email: email })
    if (error) {
      console.error('/api/forgot-password rpc error:', error.message)
      return genericOk()
    }
    if (!token) {
      // Unknown email or rate limited: stay silent.
      return genericOk()
    }

    // The link origin comes from server config only. Trusting a request header here
    // would let an attacker point the emailed token at a domain they control.
    const baseOrigin = stripQuotes(process.env.PUBLIC_SITE_URL) || 'https://jdforcesolar.com'
    const resetUrl = `${baseOrigin.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(token)}`

    const smtpPort = Number(process.env.SMTP_PORT || 465)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass }
    })

    await transporter.sendMail({
      from: `"JD Force Solar" <${smtpUser}>`,
      to: email,
      subject: 'JD Force Solar - Password Reset Request',
      html: buildPasswordResetEmailHtml({ resetUrl })
    })
  } catch (err) {
    console.error('Error in /api/forgot-password:', err)
  }

  return genericOk()
}
