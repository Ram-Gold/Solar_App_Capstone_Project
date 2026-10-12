/**
 * Utility functions for warranty calculation, formatting, and claim status display.
 */

export function formatDate(dateString) {
  if (!dateString) return 'N/A'
  try {
    const d = new Date(dateString)
    return d.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

export function calculateExpiryDate(purchaseDateStr, warrantyMonths = 12) {
  const purchase = purchaseDateStr ? new Date(purchaseDateStr) : new Date()
  const expiry = new Date(purchase)
  expiry.setMonth(expiry.getMonth() + Number(warrantyMonths))
  return expiry.toISOString().split('T')[0]
}

export function getRemainingDays(expiryDateStr) {
  if (!expiryDateStr) return 0
  const expiry = new Date(expiryDateStr)
  const now = new Date()
  // Reset hours to start of day
  expiry.setHours(23, 59, 59, 999)
  now.setHours(0, 0, 0, 0)
  const diffTime = expiry.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

export function isWarrantyActive(expiryDateStr) {
  return getRemainingDays(expiryDateStr) > 0
}

export function formatRemainingText(daysRemaining) {
  if (daysRemaining <= 0) return 'Warranty Expired'
  if (daysRemaining === 1) return '1 day remaining'
  if (daysRemaining < 30) return `${daysRemaining} days remaining`
  const months = Math.floor(daysRemaining / 30)
  const remainderDays = daysRemaining % 30
  if (months === 1 && remainderDays === 0) return '1 month remaining'
  if (months > 0 && remainderDays > 5) return `~${months} mos ${remainderDays} days remaining`
  return `~${months} month${months > 1 ? 's' : ''} remaining`
}

export const CLAIM_STATUSES = {
  pending: {
    label: 'Pending Review',
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    description: 'Submitted and awaiting inspection by store technician.'
  },
  in_review: {
    label: 'Under Inspection',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    description: 'Store technician is currently evaluating the issue.'
  },
  approved: {
    label: 'Approved for Replacement / Repair',
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    description: 'Claim approved! Visit branch or await unit handover.'
  },
  resolved: {
    label: 'Resolved',
    color: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    description: 'Unit serviced, replaced, or closed successfully.'
  },
  rejected: {
    label: 'Claim Declined',
    color: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    description: 'Declined due to expired coverage or physical void terms.'
  }
}

export function getClaimStatusMeta(status) {
  return CLAIM_STATUSES[status] || {
    label: status || 'Pending',
    color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    description: ''
  }
}
