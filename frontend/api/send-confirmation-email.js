import nodemailer from 'nodemailer'

/**
 * Builds the industrial HTML confirmation email for JD Force Solar.
 * Strictly follows project rules: professional, technical tone, zero emojis.
 */
export function buildConfirmationEmailHtml({
  customerName,
  email,
  phoneNumber,
  branchLocation,
  accessToken,
  portalUrl,
  confirmUrl
}) {
  const safeName = escapeHtml(customerName || 'Valued Customer')
  const safeEmail = escapeHtml(email || '')
  const safePhone = escapeHtml(phoneNumber || 'N/A')
  const safeBranch = escapeHtml(branchLocation || 'Cavite / Quiapo')
  const safeToken = escapeHtml(accessToken || '')
  const safePortalUrl = escapeHtml(portalUrl || '')
  const safeConfirmUrl = escapeHtml(confirmUrl || safePortalUrl)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JD Force Solar - Account Created & Email Confirmation</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1c1917;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:#1c1917;padding:24px 32px;border-bottom:3px solid #f59e0b;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#f59e0b;margin-bottom:4px;">
                JD Force Solar Products Trading
              </div>
              <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.01em;">
                Customer Account Created
              </div>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#1c1917;">
                Dear <strong>${safeName}</strong>,
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#44403c;">
                Your customer equipment profile and warranty portal account with <strong>JD Force Solar</strong> has been created. Please confirm your email address using the verification button below to complete your account registration and activate email notifications.
              </p>

              <!-- Primary CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${safeConfirmUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#d97706;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:10px;">
                      Confirm Email &amp; Open Customer Portal
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Account Summary Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#78716c;margin-bottom:12px;border-bottom:1px solid #e7e5e4;padding-bottom:8px;">
                      Customer Account Summary
                    </div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.8;color:#292524;">
                      <tr>
                        <td style="color:#78716c;width:40%;">Full Name:</td>
                        <td style="font-weight:600;">${safeName}</td>
                      </tr>
                      <tr>
                        <td style="color:#78716c;">Registered Email:</td>
                        <td style="font-weight:600;">${safeEmail}</td>
                      </tr>
                      <tr>
                        <td style="color:#78716c;">Mobile Contact:</td>
                        <td style="font-family:monospace;font-weight:600;">${safePhone}</td>
                      </tr>
                      <tr>
                        <td style="color:#78716c;">Servicing Branch:</td>
                        <td style="font-weight:600;">${safeBranch}</td>
                      </tr>
                      <tr>
                        <td style="color:#78716c;">Unique Access Token:</td>
                        <td style="font-family:monospace;font-size:12px;font-weight:600;color:#b45309;word-break:break-all;">${safeToken}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Direct Portal Link -->
              <div style="background-color:#f5f5f4;border-radius:10px;padding:14px 16px;margin-bottom:24px;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#57534e;margin-bottom:4px;">
                  Direct Customer Portal URL
                </div>
                <a href="${safeConfirmUrl}" style="font-family:monospace;font-size:12px;color:#0284c7;word-break:break-all;text-decoration:underline;">
                  ${safeConfirmUrl}
                </a>
              </div>

              <p style="margin:0;font-size:12px;line-height:1.6;color:#78716c;">
                You can access your JD Force Solar Customer Portal at any time using your printed QR receipt, your Unique Access Token, or by setting an account password inside the portal.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fafaf9;border-top:1px solid #e7e5e4;padding:18px 32px;text-align:center;font-size:11px;color:#78716c;">
              JD Force Solar Products Trading &bull; Quiapo Showroom (Manila) &amp; Cavite Distribution Hub
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default async function handler(req, res) {
  // Support CORS for local development if needed
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    const {
      customerName,
      email,
      phoneNumber,
      branchLocation,
      accessToken,
      verificationToken,
      origin
    } = req.body || {}

    if (!email || !String(email).includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'A valid recipient email address is required.'
      })
    }

    const baseOrigin = origin || process.env.PUBLIC_SITE_URL || 'https://jdforcesolar.com'
    const portalUrl = `${baseOrigin}/portal?token=${encodeURIComponent(accessToken || '')}`
    const confirmUrl = verificationToken
      ? `${portalUrl}&confirm_email=${encodeURIComponent(verificationToken)}`
      : `${portalUrl}&confirm_email=1`

    const subject = 'JD Force Solar - Account Created & Email Confirmation Required'
    const html = buildConfirmationEmailHtml({
      customerName,
      email,
      phoneNumber,
      branchLocation,
      accessToken,
      portalUrl,
      confirmUrl
    })

    const gmailUser = (process.env.GMAIL_USER || process.env.SMTP_USER || '').trim().replace(/^["']|["']$/g, '')
    const rawGmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '').trim().replace(/^["']|["']$/g, '')
    const gmailPass = rawGmailPass ? rawGmailPass.replace(/\s+/g, '') : ''
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
    const smtpPort = Number(process.env.SMTP_PORT || 465)

    // 1. Primary Transport: Gmail SMTP / Custom SMTP via Nodemailer
    if (gmailUser && gmailPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: gmailUser,
          pass: gmailPass
        }
      })

      const info = await transporter.sendMail({
        from: `"JD Force Solar" <${gmailUser}>`,
        to: email.trim().toLowerCase(),
        subject,
        html
      })

      return res.status(200).json({
        success: true,
        provider: 'gmail_smtp',
        messageId: info.messageId,
        status: 'awaiting_confirmation',
        confirmUrl
      })
    }

    // 2. Fallback signal: Let the client know SMTP env vars are not configured on Vercel yet
    // so client can invoke Supabase Auth built-in mailer fallback seamlessly
    return res.status(200).json({
      success: true,
      provider: 'supabase_fallback_required',
      status: 'awaiting_confirmation',
      confirmUrl,
      message: 'Queued for confirmation via Supabase mailer fallback.'
    })
  } catch (err) {
    console.error('Error in /api/send-confirmation-email:', err)
    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to dispatch confirmation email.'
    })
  }
}

