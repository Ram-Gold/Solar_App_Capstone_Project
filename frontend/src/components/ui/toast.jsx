import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

const ToastContext = createContext(null)

const VARIANT_STYLES = {
  success: {
    container: 'border-emerald-500/35 bg-jds-surface text-jds-on-surface',
    accent: 'border-l-[3px] border-l-emerald-500',
    iconWrap: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle2,
  },
  error: {
    container: 'border-rose-500/35 bg-jds-surface text-jds-on-surface',
    accent: 'border-l-[3px] border-l-rose-500',
    iconWrap: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    icon: AlertCircle,
  },
  warning: {
    container: 'border-amber-500/35 bg-jds-surface text-jds-on-surface',
    accent: 'border-l-[3px] border-l-amber-500',
    iconWrap: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    icon: AlertTriangle,
  },
  info: {
    container: 'border-sky-500/35 bg-jds-surface text-jds-on-surface',
    accent: 'border-l-[3px] border-l-sky-500',
    iconWrap: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    icon: Info,
  },
}

function normalizeToastArgs(titleOrPayload, message, type) {
  if (titleOrPayload && typeof titleOrPayload === 'object') {
    return {
      title: titleOrPayload.title || '',
      message: titleOrPayload.message || '',
      type: titleOrPayload.type || 'info',
    }
  }
  return {
    title: titleOrPayload || '',
    message: message || '',
    type: type || 'info',
  }
}

export function ToastViewport({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0 || typeof document === 'undefined') return null

  return createPortal(
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 w-full max-w-sm pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((t) => {
        const variant = VARIANT_STYLES[t.type] || VARIANT_STYLES.info
        const Icon = variant.icon
        return (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-lg backdrop-blur-sm transition-all ${variant.container} ${variant.accent}`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${variant.iconWrap}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              {t.title && (
                <p className="text-xs font-bold text-jds-on-surface leading-snug">
                  {t.title}
                </p>
              )}
              {t.message && (
                <p className="text-xs text-jds-on-surface-variant mt-0.5 leading-relaxed break-words">
                  {t.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="p-1 rounded-md text-jds-on-surface-variant/70 hover:text-jds-on-surface hover:bg-jds-surface-container transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>,
    document.body
  )
}

/**
 * Shared toast provider rendering bottom-right stacked notifications.
 */
export function ToastProvider({ children, durationMs = 4000 }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const dismissToast = useCallback((id) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (titleOrPayload, message, type = 'info') => {
      const normalized = normalizeToastArgs(titleOrPayload, message, type)
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => [...prev.slice(-3), { id, ...normalized }])
      const timer = setTimeout(() => {
        timersRef.current.delete(id)
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, durationMs)
      timersRef.current.set(id, timer)
      return id
    },
    [durationMs]
  )

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, toasts }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

const FALLBACK_CONTEXT = {
  showToast: () => null,
  dismissToast: () => {},
  toasts: [],
}

/**
 * Access the shared toast dispatcher. Safely returns a no-op fallback if
 * rendered outside ToastProvider (e.g. isolated unit tests).
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  return ctx || FALLBACK_CONTEXT
}
