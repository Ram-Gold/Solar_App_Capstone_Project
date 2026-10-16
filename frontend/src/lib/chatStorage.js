// frontend/src/lib/chatStorage.js
// Local storage manager for JD Solar Assistant conversation history
// Enforces a strict 30-day auto-purge policy and client-side isolation.

const STORAGE_KEY = 'jd_solar_chat_history'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000 // 30 days in milliseconds

/**
 * Clean and load active chat sessions from localStorage.
 * Automatically purges any session older than 30 days.
 * @returns {Array} List of valid sessions sorted with newest first.
 */
export function loadChatSessions() {
  if (typeof window === 'undefined' || !window.localStorage) return []

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const now = Date.now()
    let hasExpired = false

    const validSessions = parsed.filter((session) => {
      if (!session || !session.id || !session.updatedAt) return false
      const age = now - Number(session.updatedAt)
      if (age > THIRTY_DAYS_MS || age < 0) {
        hasExpired = true
        return false
      }
      return true
    })

    // If any expired records were dropped, sync clean list back to localStorage
    if (hasExpired || validSessions.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validSessions))
    }

    return validSessions.sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt))
  } catch (err) {
    console.warn('Failed to load local chat sessions:', err)
    return []
  }
}

/**
 * Derive a clean, human-readable title from the first meaningful user action
 * @param {Array} messages
 * @returns {string}
 */
export function deriveSessionTitle(messages) {
  if (!Array.isArray(messages)) return 'General Consultation'

  const firstUserMsg = messages.find((m) => m && m.role === 'user' && m.content)
  if (firstUserMsg && typeof firstUserMsg.content === 'string') {
    const clean = firstUserMsg.content.replace(/\s+/g, ' ').trim()
    if (clean.length > 45) {
      return clean.slice(0, 42) + '...'
    }
    return clean || 'Solar Consultation'
  }

  return 'Solar Consultation'
}

/**
 * Save or update a session in local storage.
 * @param {Object} session
 * @returns {Array} Updated sessions
 */
export function saveChatSession({ id, messages, criteria = {} }) {
  if (!id || !Array.isArray(messages) || messages.length <= 1) return loadChatSessions()

  // Only save if there is at least one user interaction
  const hasUserMessage = messages.some((m) => m.role === 'user')
  if (!hasUserMessage) return loadChatSessions()

  try {
    const sessions = loadChatSessions()
    const now = Date.now()
    const title = deriveSessionTitle(messages)

    const existingIndex = sessions.findIndex((s) => s.id === id)
    const sessionRecord = {
      id,
      title,
      messages,
      criteria,
      createdAt: existingIndex !== -1 ? sessions[existingIndex].createdAt : now,
      updatedAt: now,
    }

    let updated
    if (existingIndex !== -1) {
      updated = [...sessions]
      updated[existingIndex] = sessionRecord
    } else {
      updated = [sessionRecord, ...sessions]
    }

    // Cap at 40 sessions max to preserve localStorage quota
    if (updated.length > 40) {
      updated = updated.slice(0, 40)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    return updated.sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt))
  } catch (err) {
    console.warn('Failed to persist chat session:', err)
    return loadChatSessions()
  }
}

/**
 * Delete a single session from localStorage.
 * @param {string} sessionId
 * @returns {Array} Updated sessions list
 */
export function deleteChatSession(sessionId) {
  try {
    const sessions = loadChatSessions()
    const filtered = sessions.filter((s) => s.id !== sessionId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return filtered
  } catch (err) {
    console.warn('Failed to delete chat session:', err)
    return loadChatSessions()
  }
}

/**
 * Format a timestamp for display
 * @param {number|string} timestamp
 * @returns {string}
 */
export function formatSessionDate(timestamp) {
  if (!timestamp) return ''
  try {
    const d = new Date(Number(timestamp))
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}
