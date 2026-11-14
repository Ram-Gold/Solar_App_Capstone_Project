/* global process */
import nodemailer from 'nodemailer'
import QRCode from 'qrcode'

/**
 * Escapes HTML characters to prevent XSS in email clients.
 */
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
 * Ensures URLs interpolated into href attributes use http(s) only.
 */
function sanitizeHttpUrl(url) {
  if (!url) return ''
  const trimmed = String(url).trim()
  if (/^https?:\/\//i.test(trimmed)) {
    return escapeHtml(trimmed)
  }
  return ''
}

const EMAIL_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const EMAIL_RATE_LIMIT_MAX = 25
const emailRateLimitStore = new Map()

function isRateLimited(req) {
  const forwarded = req.headers?.['x-forwarded-for']
  const ip = (Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '')).split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
  const now = Date.now()
  const entry = emailRateLimitStore.get(ip)
  if (!entry || now - entry.windowStart >= EMAIL_RATE_LIMIT_WINDOW_MS) {
    emailRateLimitStore.set(ip, { windowStart: now, count: 1 })
    return false
  }
  entry.count += 1
  return entry.count > EMAIL_RATE_LIMIT_MAX
}

function getAllowedCorsOrigin(req) {
  const origin = req.headers?.origin
  if (!origin) return null
  const configured = String(process.env.PUBLIC_SITE_URL || '').trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '')
  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${String(process.env.VERCEL_PROJECT_PRODUCTION_URL).trim().replace(/^["']|["']$/g, '')}`
    : null
  if (
    origin === 'https://jdforcesolar.com' ||
    origin === 'https://www.jdforcesolar.com' ||
    (configured && origin === configured) ||
    (vercelProd && origin === vercelProd) ||
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin) ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
  ) {
    return origin
  }
  return null
}

/**
 * Builds the industrial HTML confirmation email for customer account creation & POS purchase receipt.
 * Strictly follows project rules: professional, technical tone, zero emojis.
 */
export function buildAccountCreationEmailHtml({
  customerName,
  email,
  phoneNumber,
  branchLocation,
  accessToken,
  portalUrl,
  confirmUrl,
  qrCodeDataUrl = null,
  purchases = [],
  assignedPassword = null
}) {
  const safeName = escapeHtml(customerName || 'Valued Customer')
  const safeEmail = escapeHtml(email || '')
  const safePhone = escapeHtml(phoneNumber || 'N/A')
  const safeBranch = escapeHtml(branchLocation || 'Cavite / Quiapo')
  const safeToken = escapeHtml(accessToken || '')
  const safePortalUrl = escapeHtml(portalUrl || '')
  const safeConfirmUrl = escapeHtml(confirmUrl || safePortalUrl)
  const safePassword = assignedPassword ? escapeHtml(assignedPassword) : null

  // Build itemized purchase receipt rows if purchases are available
  const hasPurchases = Array.isArray(purchases) && purchases.length > 0
  const purchaseRows = hasPurchases
    ? purchases
        .map((p, idx) => {
          const prodName = escapeHtml(p.products?.name || p.product_name || p.name || 'Solar Equipment')
          const serial = escapeHtml(p.serial_number || 'N/A')
          const warranty = escapeHtml(p.warranty_months ? `${p.warranty_months} Mos` : 'Standard')
          const expDate = escapeHtml(p.warranty_expires_at ? String(p.warranty_expires_at).split('T')[0] : 'See Portal')
          return `
          <tr style="border-bottom:1px solid #e7e5e4;">
            <td style="padding:10px 8px;font-weight:600;color:#1c1917;">${idx + 1}. ${prodName}</td>
            <td style="padding:10px 8px;font-family:monospace;font-size:12px;color:#44403c;">${serial}</td>
            <td style="padding:10px 8px;font-size:12px;color:#78716c;text-align:center;">${warranty}</td>
            <td style="padding:10px 8px;font-size:12px;color:#047857;font-weight:600;text-align:right;">${expDate}</td>
          </tr>`
        })
        .join('')
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JD-Foz Solar - Account Created & Purchase Receipt</title>
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
                JD-Foz Solar Products Trading
              </div>
              <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.01em;">
                Customer Account &amp; Purchase Receipt
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
                Your customer equipment profile and purchase receipt with <strong>JD-Foz Solar</strong> have been registered. Use the digital QR pass or access link below to open your Customer Warranty Portal.
              </p>

              <!-- QR Pass Card with cid attachment or data URL -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:14px;margin-bottom:28px;">
                <tr>
                  <td align="center" style="padding:24px 20px;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#78716c;margin-bottom:12px;">
                      Official Customer QR Access Pass
                    </div>
                    ${
                      qrCodeDataUrl
                        ? `<div style="background-color:#ffffff;padding:12px;border-radius:12px;display:inline-block;border:1px solid #e7e5e4;margin-bottom:12px;">
                            <img src="${qrCodeDataUrl}" alt="Customer Portal QR Code" width="180" height="180" style="display:block;margin:0 auto;" />
                          </div>`
                        : ''
                    }
                    <div style="font-family:'Courier New',Courier,monospace;font-size:13px;font-weight:700;color:#b45309;word-break:break-all;margin-bottom:14px;">
                      TOKEN: ${safeToken}
                    </div>
                    <div>
                      <a href="${safeConfirmUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#d97706;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:8px;">
                        Confirm Email &amp; Open Customer Portal
                      </a>
                    </div>
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
                      ${
                        safePassword
                          ? `<tr>
                        <td style="color:#78716c;">Portal Password:</td>
                        <td style="font-family:monospace;font-size:13px;font-weight:700;color:#1c1917;">${safePassword}</td>
                      </tr>`
                          : ''
                      }
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

              ${
                hasPurchases
                  ? `<!-- Itemized Purchase Receipt & Warranty Table -->
              <div style="margin-bottom:24px;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#78716c;margin-bottom:10px;">
                  Itemized Purchase &amp; Warranty Receipt
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-collapse:collapse;border:1px solid #e7e5e4;border-radius:8px;overflow:hidden;width:100%;">
                  <thead>
                    <tr style="background-color:#f5f5f4;text-align:left;font-size:11px;text-transform:uppercase;color:#78716c;letter-spacing:0.05em;">
                      <th style="padding:8px;border-bottom:1px solid #e7e5e4;">Product</th>
                      <th style="padding:8px;border-bottom:1px solid #e7e5e4;">Serial No.</th>
                      <th style="padding:8px;border-bottom:1px solid #e7e5e4;text-align:center;">Warranty</th>
                      <th style="padding:8px;border-bottom:1px solid #e7e5e4;text-align:right;">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${purchaseRows}
                  </tbody>
                </table>
              </div>`
                  : ''
              }

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
                You can access your JD-Foz Solar Customer Portal at any time using your printed QR receipt, your Unique Access Token, or by scanning the digital QR code above.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fafaf9;border-top:1px solid #e7e5e4;padding:18px 32px;text-align:center;font-size:11px;line-height:1.6;color:#78716c;">
              JD-Foz Solar Products Trading &bull; 1645 Soler St. Brgy. 309 Cor Calero, Quiapo, Manila &amp; Cavite Distribution Hub<br />
              Phone: 0966 843 1913 &bull; Email: <a href="mailto:fozjeremy@gmail.com" style="color:#0284c7;text-decoration:underline;">fozjeremy@gmail.com</a> &bull; Messenger: <a href="https://www.facebook.com/profile.php?id=100067598921170" style="color:#0284c7;text-decoration:underline;">JD-Foz Solar Products Trading</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Builds the industrial HTML confirmation pass / receipt email for customer Inquiry & Stock Reservations.
 * Strictly follows project rules: professional, technical tone, zero emojis.
 */
export function buildInquiryTicketEmailHtml({
  ticketCode,
  customerName,
  email,
  mobileContact,
  branch,
  visitDate,
  visitTime,
  productName,
  productWatt,
  productPriceRange,
  quantity = 1,
  purposeOfVisitation,
  deliveryAddress,
  facebook
}) {
  const safeTicket = escapeHtml(ticketCode || 'JDS-TICKET')
  const safeName = escapeHtml(customerName || 'Valued Customer')
  const safeEmail = escapeHtml(email || '')
  const safePhone = escapeHtml(mobileContact || 'N/A')
  const safeBranch = escapeHtml(branch || 'Cavite Distribution Hub')
  const safeDate = escapeHtml(visitDate || 'To be confirmed')
  const safeTime = escapeHtml(visitTime || 'Business Hours (8:00 AM - 5:30 PM)')
  const safeProduct = escapeHtml(productName || 'Solar Equipment / General Consultation')
  const safeWatt = productWatt ? `${escapeHtml(productWatt)}W` : null
  const safePrice = productPriceRange ? `PHP ${escapeHtml(productPriceRange)}` : null
  const safeQty = Number(quantity) || 1
  const safePurpose = escapeHtml(purposeOfVisitation || 'Product Inquiry & Technical Consultation')
  const safeAddress = escapeHtml(deliveryAddress || 'N/A')
  const safeFacebookUrl = sanitizeHttpUrl(facebook)
  const safeFacebookLabel = facebook ? escapeHtml(facebook) : null

  const isReservation = String(ticketCode).includes('-RES-') || String(safePurpose).toLowerCase().includes('reservation')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JD-Foz Solar - ${isReservation ? 'Reservation & Showroom Pass' : 'Inquiry Confirmation'} [${safeTicket}]</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f4;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1c1917;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e7e5e4;border-radius:16px;overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#1c1917;padding:24px 32px;border-bottom:3px solid ${isReservation ? '#059669' : '#0284c7'};">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${isReservation ? '#10b981' : '#38bdf8'};margin-bottom:4px;">
                JD-Foz Solar Products Trading
              </div>
              <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.01em;">
                ${isReservation ? 'Showroom Stock Hold &amp; Visit Pass' : 'Product Inquiry &amp; Consultation Pass'}
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#1c1917;">
                Dear <strong>${safeName}</strong>,
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#44403c;">
                ${
                  isReservation
                    ? `Thank you for your stock reservation. Your equipment hold pass has been registered under reference code <strong>${safeTicket}</strong>. Please present this digital receipt when claiming at our showroom.`
                    : `Thank you for reaching out to JD-Foz Solar. Your technical consultation and showroom inquiry ticket has been recorded under reference code <strong>${safeTicket}</strong>.`
                }
              </p>

              <!-- Prominent Ticket Badge -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;border:2px dashed ${isReservation ? '#059669' : '#0284c7'};border-radius:14px;margin-bottom:28px;">
                <tr>
                  <td align="center" style="padding:20px;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#78716c;margin-bottom:6px;">
                      Official Ticket Reference Code
                    </div>
                    <div style="font-family:'Courier New',Courier,monospace;font-size:24px;font-weight:900;letter-spacing:0.08em;color:${isReservation ? '#065f46' : '#0369a1'};">
                      ${safeTicket}
                    </div>
                    <div style="font-size:11px;font-weight:600;color:#78716c;margin-top:6px;">
                      Status: <span style="color:#d97706;font-weight:700;">Pending Verification</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Scheduled Showroom Appointment Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#78716c;margin-bottom:12px;border-bottom:1px solid #e7e5e4;padding-bottom:8px;">
                      Scheduled Visit &amp; Branch Details
                    </div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.8;color:#292524;">
                      <tr>
                        <td style="color:#78716c;width:40%;">Servicing Branch:</td>
                        <td style="font-weight:700;color:#1c1917;">${safeBranch}</td>
                      </tr>
                      <tr>
                        <td style="color:#78716c;">Scheduled Date:</td>
                        <td style="font-weight:600;">${safeDate}</td>
                      </tr>
                      <tr>
                        <td style="color:#78716c;">Scheduled Time Slot:</td>
                        <td style="font-weight:600;">${safeTime}</td>
                      </tr>
                      <tr>
                        <td style="color:#78716c;">Purpose of Visit:</td>
                        <td style="font-weight:600;">${safePurpose}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Equipment & Inquiry Itemization -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#78716c;margin-bottom:12px;border-bottom:1px solid #e7e5e4;padding-bottom:8px;">
                      Equipment &amp; Inquiry Specifications
                    </div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.8;color:#292524;">
                      <tr>
                        <td style="color:#78716c;width:40%;">Product / Equipment:</td>
                        <td style="font-weight:700;color:#1c1917;">${safeProduct}</td>
                      </tr>
                      ${
                        safeWatt
                          ? `<tr>
                        <td style="color:#78716c;">Rated Wattage:</td>
                        <td style="font-weight:600;">${safeWatt}</td>
                      </tr>`
                          : ''
                      }
                      ${
                        safePrice
                          ? `<tr>
                        <td style="color:#78716c;">Unit Price Range:</td>
                        <td style="font-weight:600;">${safePrice}</td>
                      </tr>`
                          : ''
                      }
                      <tr>
                        <td style="color:#78716c;">Requested Quantity:</td>
                        <td style="font-weight:700;">${safeQty} unit(s)</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Customer Details & Delivery Address -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#78716c;margin-bottom:12px;border-bottom:1px solid #e7e5e4;padding-bottom:8px;">
                      Customer Contact Information
                    </div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.8;color:#292524;">
                      <tr>
                        <td style="color:#78716c;width:40%;">Customer Name:</td>
                        <td style="font-weight:600;">${safeName}</td>
                      </tr>
                      <tr>
                        <td style="color:#78716c;">Mobile Contact:</td>
                        <td style="font-family:monospace;font-weight:600;">${safePhone}</td>
                      </tr>
                      <tr>
                        <td style="color:#78716c;">Email Address:</td>
                        <td style="font-weight:600;">${safeEmail}</td>
                      </tr>
                      ${
                        safeFacebookUrl && safeFacebookLabel
                          ? `<tr>
                        <td style="color:#78716c;">Facebook Profile:</td>
                        <td style="font-weight:600;word-break:break-all;"><a href="${safeFacebookUrl}" style="color:#0284c7;text-decoration:underline;">${safeFacebookLabel}</a></td>
                      </tr>`
                          : ''
                      }
                      <tr>
                        <td style="color:#78716c;">Delivery / Project Area:</td>
                        <td style="font-weight:600;">${safeAddress}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Instructions for Showroom Visit -->
              <div style="background-color:#f5f5f4;border-left:4px solid #f59e0b;padding:14px 16px;border-radius:6px;margin-bottom:24px;">
                <div style="font-size:12px;font-weight:700;color:#1c1917;margin-bottom:4px;">
                  Instructions for Showroom Visit
                </div>
                <div style="font-size:12px;line-height:1.6;color:#57534e;">
                  Please bring one (1) government-issued or valid company ID and present this digital pass or mention your ticket code (<strong>${safeTicket}</strong>) upon arrival at our showroom counter.
                </div>
              </div>

              <!-- Branch Address Info -->
              <div style="font-size:11px;line-height:1.6;color:#78716c;">
                <strong>Branch Locations &amp; Contact:</strong><br />
                &bull; <strong>Quiapo Showroom:</strong> 1645 Soler St. Brgy. 309 Cor Calero, Quiapo, Manila (Mon-Sat, 8:00 AM - 5:30 PM; Closed Sundays)<br />
                &bull; <strong>Cavite Hub:</strong> Cavite Distribution &amp; Logistics Hub (Mon-Sat, 8:00 AM - 5:30 PM; Closed Sundays)<br />
                &bull; <strong>Phone:</strong> 0966 843 1913 &bull; <strong>Email:</strong> <a href="mailto:fozjeremy@gmail.com" style="color:#0284c7;text-decoration:underline;">fozjeremy@gmail.com</a> &bull; <strong>Messenger:</strong> <a href="https://www.facebook.com/profile.php?id=100067598921170" style="color:#0284c7;text-decoration:underline;">JD-Foz Solar Products Trading</a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fafaf9;border-top:1px solid #e7e5e4;padding:18px 32px;text-align:center;font-size:11px;color:#78716c;">
              JD-Foz Solar Products Trading &bull; Industrial Lighting &amp; Energy Systems
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// Backward-compatible alias
export const buildConfirmationEmailHtml = buildAccountCreationEmailHtml

export default async function handler(req, res) {
  // Support CORS for known origins only
  const allowedOrigin = getAllowedCorsOrigin(req)
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  if (isRateLimited(req)) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please wait before trying again.'
    })
  }

  try {
    const body = req.body || {}
    const {
      type, // 'inquiry_ticket' | 'account_creation'
      ticketCode,
      ticket_code,
      customerName,
      customer_name,
      email,
      phoneNumber,
      mobileContact,
      mobile_contact,
      branchLocation,
      branch,
      store_branch,
      accessToken,
      verificationToken,
      origin,
      visitDate,
      visit_date,
      visitTime,
      visit_time_slot,
      productName,
      product_name,
      productWatt,
      product_watt,
      productPriceRange,
      product_price_range,
      quantity,
      purposeOfVisitation,
      purpose_of_visitation,
      deliveryAddress,
      delivery_address,
      facebook,
      purchases,
      assignedPassword,
      password
    } = body

    const recipientEmail = email || body.to
    const cleanRecipientEmail = String(recipientEmail || '').trim().toLowerCase()
    if (!cleanRecipientEmail || cleanRecipientEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanRecipientEmail)) {
      return res.status(400).json({
        success: false,
        error: 'A valid recipient email address is required.'
      })
    }
    const finalTicketCode = ticketCode || ticket_code
    const isInquiryType = type === 'inquiry_ticket' || Boolean(finalTicketCode)

    let subject = ''
    let html = ''

    if (isInquiryType) {
      const isRes = String(finalTicketCode).includes('-RES-')
      subject = isRes
        ? `JD-Foz Solar - Reservation & Showroom Pass [${finalTicketCode}]`
        : `JD-Foz Solar - Inquiry & Showroom Pass [${finalTicketCode}]`

      html = buildInquiryTicketEmailHtml({
        ticketCode: finalTicketCode,
        customerName: customerName || customer_name,
        email: cleanRecipientEmail,
        mobileContact: phoneNumber || mobileContact || mobile_contact,
        branch: branchLocation || branch || store_branch,
        visitDate: visitDate || visit_date,
        visitTime: visitTime || visit_time_slot,
        productName: productName || product_name,
        productWatt: productWatt || product_watt,
        productPriceRange: productPriceRange || product_price_range,
        quantity: quantity || 1,
        purposeOfVisitation: purposeOfVisitation || purpose_of_visitation,
        deliveryAddress: deliveryAddress || delivery_address,
        facebook
      })
    } else {
      const rawOrigin =
        String(process.env.PUBLIC_SITE_URL || '').trim().replace(/^["']|["']$/g, '') ||
        (process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${String(process.env.VERCEL_PROJECT_PRODUCTION_URL).trim().replace(/^["']|["']$/g, '')}`
          : 'https://jdforcesolar.com')
      const baseOrigin = rawOrigin.replace(/\/+$/, '')
      const portalUrl = `${baseOrigin}/portal?token=${encodeURIComponent(accessToken || '')}`
      const confirmUrl = verificationToken
        ? `${portalUrl}&confirm_email=${encodeURIComponent(verificationToken)}`
        : `${portalUrl}&confirm_email=1`

      // Generate embedded QR code for the portal URL
      let qrCodeDataUrl = null
      if (accessToken) {
        try {
          qrCodeDataUrl = await QRCode.toDataURL(confirmUrl, {
            errorCorrectionLevel: 'M',
            margin: 2,
            width: 200,
            color: { dark: '#1c1917', light: '#ffffff' }
          })
        } catch (qrErr) {
          console.warn('Failed to generate email QR code:', qrErr)
        }
      }

      subject = 'JD-Foz Solar - Account Created & Purchase Receipt'
      html = buildAccountCreationEmailHtml({
        customerName: customerName || customer_name,
        email: cleanRecipientEmail,
        phoneNumber: phoneNumber || mobileContact || mobile_contact,
        branchLocation: branchLocation || branch || store_branch,
        accessToken,
        portalUrl,
        confirmUrl,
        qrCodeDataUrl,
        purchases: purchases || [],
        assignedPassword: assignedPassword || password || null
      })
    }

    const gmailUser = (process.env.GMAIL_USER || process.env.SMTP_USER || '').trim().replace(/^["']|["']$/g, '')
    const rawGmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '').trim().replace(/^["']|["']$/g, '')
    const gmailPass = rawGmailPass ? rawGmailPass.replace(/\s+/g, '') : ''
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com'
    const smtpPort = Number(process.env.SMTP_PORT || 465)

    // 1. Primary Transport: Gmail SMTP via Nodemailer
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
        from: `"JD-Foz Solar" <${gmailUser}>`,
        to: cleanRecipientEmail,
        subject,
        html
      })

      return res.status(200).json({
        success: true,
        provider: 'gmail_smtp',
        messageId: info.messageId,
        type: isInquiryType ? 'inquiry_ticket' : 'account_creation'
      })
    }

    // 2. Fallback signal if env vars are missing
    return res.status(200).json({
      success: true,
      provider: 'smtp_not_configured',
      type: isInquiryType ? 'inquiry_ticket' : 'account_creation',
      message: 'Email dispatch completed or fallback requested.'
    })
  } catch (err) {
    console.error('Error in /api/send-confirmation-email:', err)
    return res.status(500).json({
      success: false,
      error: 'Failed to dispatch email.'
    })
  }
}
