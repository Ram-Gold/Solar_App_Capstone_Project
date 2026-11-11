import { useEffect, useRef, useCallback } from 'react'

let openModalsCount = 0
let originalOverflow = ''

export function lockBodyScroll() {
  if (typeof document === 'undefined') return
  if (openModalsCount === 0) {
    originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  openModalsCount += 1
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return
  openModalsCount = Math.max(0, openModalsCount - 1)
  if (openModalsCount === 0) {
    document.body.style.overflow = originalOverflow || ''
  }
}

/**
 * Hook to manage modal scroll locking, backdrop click outside, and escape key navigation.
 *
 * @param {Object} options
 * @param {boolean} options.isOpen - Whether the modal is currently open.
 * @param {Function} options.onClose - Callback to close the modal.
 * @param {boolean} [options.closeOnOutsideClick=true] - Whether clicking outside closes the modal.
 * @param {boolean} [options.closeOnEscape=true] - Whether pressing Escape closes the modal.
 */
export function useModalBehavior({
  isOpen,
  onClose,
  closeOnOutsideClick = true,
  closeOnEscape = true,
}) {
  const mouseDownOnBackdropRef = useRef(false)

  // Body scroll lock effect
  useEffect(() => {
    if (!isOpen) return
    lockBodyScroll()
    return () => {
      unlockBodyScroll()
    }
  }, [isOpen])

  // Escape key handler
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeOnEscape, onClose])

  // Backdrop mouse event handlers with text-selection / drag safeguard
  const handleBackdropMouseDown = useCallback((e) => {
    mouseDownOnBackdropRef.current = e.target === e.currentTarget
  }, [])

  const handleBackdropClick = useCallback(
    (e) => {
      if (
        closeOnOutsideClick &&
        mouseDownOnBackdropRef.current &&
        e.target === e.currentTarget
      ) {
        onClose?.()
      }
      mouseDownOnBackdropRef.current = false
    },
    [closeOnOutsideClick, onClose]
  )

  return {
    backdropProps: {
      onMouseDown: handleBackdropMouseDown,
      onClick: handleBackdropClick,
    },
    handleBackdropMouseDown,
    handleBackdropClick,
  }
}

export default useModalBehavior

