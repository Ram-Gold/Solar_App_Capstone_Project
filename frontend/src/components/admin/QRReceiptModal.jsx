import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, Copy, Check, X, ShieldCheck, Calendar, Phone, User, Store, Key, ExternalLink } from 'lucide-react'
import { formatDate } from '../../lib/warrantyUtils'

export default function QRReceiptModal({
  isOpen,
  onClose,
  customer,
  purchases = [],
  qrUrl
}) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)

  if (!isOpen || !customer) return null

  const token = customer.access_token || customer.token || ''
  const computedQrUrl = qrUrl || (token ? `${typeof window !== 'undefined' ? window.location.origin : ''}/portal?token=${token}` : '')

  const handleCopyLink = () => {
    if (!computedQrUrl) return
    navigator.clipboard.writeText(computedQrUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleCopyToken = () => {
    if (!token) return
    navigator.clipboard.writeText(token)
    setCopiedToken(true)
    setTimeout(() => setCopiedToken(false), 2000)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      {/* Container */}
      <div className="bg-jds-surface border border-jds-outline-variant/40 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-jds-outline-variant/30 flex items-center justify-between bg-jds-surface-container/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-jds-primary/10 flex items-center justify-center text-jds-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-jds-on-surface">Customer QR & Access Token</h2>
              <p className="text-xs text-jds-on-surface-variant">Customer credentials for digital warranty access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-jds-on-surface-variant hover:text-jds-on-surface rounded-lg hover:bg-jds-surface-container transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable if tall) */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          
          {/* Centered QR Display */}
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-inner border border-gray-200 text-slate-900">
            <div className="p-3 bg-white rounded-xl shadow-md border border-gray-100">
              <QRCodeSVG
                value={computedQrUrl || ''}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="mt-3 text-xs font-semibold tracking-wider uppercase text-slate-500">
              Scan with mobile camera to open warranty portal
            </p>

            {/* Direct Portal URL */}
            <div className="mt-3 w-full max-w-sm flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={computedQrUrl || ''}
                className="text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-1.5 w-full text-slate-700 truncate select-all font-mono"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1.5 shrink-0"
                title="Copy customer portal link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Access Token Box */}
          <div className="p-4 rounded-xl bg-jds-surface-container/60 border border-jds-outline-variant/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-jds-on-surface flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-jds-primary" />
                Customer Access Token
              </span>
              <span className="text-[10px] uppercase font-semibold text-jds-primary bg-jds-primary/10 px-2 py-0.5 rounded-md">
                Unique UUID
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={token}
                className="text-xs bg-jds-surface border border-jds-outline-variant/50 rounded-lg px-3 py-2 w-full text-jds-on-surface font-mono select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyToken}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-jds-primary text-jds-on-primary hover:bg-jds-primary/90 transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
              >
                {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedToken ? 'Copied Token' : 'Copy Token'}
              </button>
            </div>
            <p className="text-[11px] text-jds-on-surface-variant">
              This token authorizes customer access to their warranty certificates, product records, and self-service diagnostics.
            </p>
          </div>

          {/* Customer & Branch Details */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-jds-surface-container/40 border border-jds-outline-variant/30 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-jds-on-surface-variant">
                <User className="w-3.5 h-3.5" /> Customer Name
              </div>
              <div className="font-semibold text-jds-on-surface">{customer.full_name || customer.name}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-jds-on-surface-variant">
                <Phone className="w-3.5 h-3.5" /> Mobile Phone
              </div>
              <div className="font-mono text-jds-on-surface">{customer.phone_number || customer.phone}</div>
            </div>
          </div>

          {/* Purchased Items & Warranties */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-jds-on-surface-variant">
              Registered Products ({purchases.length})
            </div>
            <div className="divide-y divide-jds-outline-variant/20 border border-jds-outline-variant/30 rounded-xl overflow-hidden bg-jds-surface">
              {purchases.map((p, idx) => (
                <div key={p.id || idx} className="p-3.5 flex items-center justify-between text-sm hover:bg-jds-surface-container/20">
                  <div className="space-y-0.5">
                    <div className="font-medium text-jds-on-surface">
                      {p.products?.name || p.product_name || 'Solar Product'}
                    </div>
                    <div className="text-xs text-jds-on-surface-variant flex items-center gap-2">
                      {p.serial_number && <span>S/N: <strong className="font-mono">{p.serial_number}</strong></span>}
                      <span>• Branch: {p.branch_location || 'Cavite'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-emerald-500">
                      {p.warranty_months || 12} Mos Warranty
                    </div>
                    <div className="text-[11px] text-jds-on-surface-variant">
                      Expires: {formatDate(p.warranty_expires_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-jds-outline-variant/30 flex items-center justify-end gap-3 bg-jds-surface-container/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-xl text-jds-on-surface-variant hover:bg-jds-surface-container hover:text-jds-on-surface transition-colors"
          >
            Done
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-jds-primary text-jds-on-primary hover:bg-jds-primary/90 transition-all flex items-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print Receipt Slip
          </button>
        </div>
      </div>

      {/* PRINT-ONLY RECEIPT SLIP (Hidden on screen, visible only when printing) */}
      <div className="hidden print:block print:fixed print:inset-0 print:bg-white print:text-black print:p-6 print:z-[99999]">
        <div className="max-w-xs mx-auto text-center font-mono text-xs border border-dashed border-gray-400 p-4 rounded-lg">
          <div className="text-base font-bold uppercase tracking-wider mb-1">JD Force Solar</div>
          <div className="text-[10px] text-gray-600 mb-2">Sustainable Energy Solutions • Philippines</div>
          <div className="border-b border-dashed border-gray-400 my-2"></div>
          
          <div className="text-left space-y-1 mb-3 text-[11px]">
            <div><strong>Customer:</strong> {customer.full_name || customer.name}</div>
            <div><strong>Contact:</strong> {customer.phone_number || customer.phone}</div>
            <div><strong>Date:</strong> {new Date().toLocaleDateString('en-PH')}</div>
            <div><strong>Branch:</strong> {purchases[0]?.branch_location || 'Cavite'}</div>
          </div>

          <div className="border-b border-dashed border-gray-400 my-2"></div>

          <div className="text-left space-y-2 mb-3">
            <div className="font-bold text-[10px] uppercase">Purchased Items & Warranty:</div>
            {purchases.map((p, idx) => (
              <div key={idx} className="text-[10px]">
                <div className="font-semibold">{p.products?.name || p.product_name}</div>
                {p.serial_number && <div>S/N: {p.serial_number}</div>}
                <div className="text-gray-600">Warranty: {p.warranty_months} Mos (Until: {formatDate(p.warranty_expires_at)})</div>
              </div>
            ))}
          </div>

          <div className="border-b border-dashed border-gray-400 my-2"></div>

          <div className="flex flex-col items-center justify-center my-3">
            <QRCodeSVG
              value={qrUrl || ''}
              size={150}
              level="M"
              includeMargin={false}
            />
            <div className="text-[10px] font-bold mt-2">SCAN TO ACCESS DASHBOARD</div>
            <div className="text-[9px] text-gray-500 text-center mt-1">
              Check active warranty, view purchases & submit fault diagnostics anytime.
            </div>
          </div>

          <div className="border-b border-dashed border-gray-400 my-2"></div>
          <div className="text-[9px] text-gray-500 mt-2">
            Thank you for choosing JD Force Solar!
          </div>
        </div>
      </div>
    </div>
  )
}
