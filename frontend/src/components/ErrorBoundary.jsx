import React from 'react'
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react'

/**
 * Enterprise Error Boundary for JD Solar Platform
 * Prevents catastrophic full-page React unmounts (White Screen of Death).
 * Strictly zero emojis.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error('JD Solar Error Boundary caught an unhandled error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  handleNavigateHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      const isSubtree = Boolean(this.props.isSubtree)
      const title = this.props.fallbackTitle || (isSubtree ? 'Section Temporarily Unavailable' : 'Application View Error')

      return (
        <div
          role="alert"
          className={`flex flex-col items-center justify-center p-6 ${
            isSubtree ? 'min-h-[320px] w-full' : 'min-h-screen w-full bg-jds-background'
          }`}
        >
          <div className="max-w-lg w-full rounded-2xl border border-jds-outline-variant/30 bg-jds-surface p-6 sm:p-8 shadow-xl text-center space-y-5">
            <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-jds-on-surface">
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-jds-on-surface-variant leading-relaxed">
                An unexpected technical error occurred while rendering this interface component. Your data and account session remain intact.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="text-left rounded-lg bg-jds-surface-container-low/60 border border-jds-outline-variant/20 p-3 max-h-32 overflow-y-auto">
                <p className="text-[11px] font-mono text-rose-600 dark:text-rose-400 break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-jds-primary text-jds-on-primary text-xs sm:text-sm font-semibold hover:opacity-95 active:scale-95 transition-all cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry View</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-jds-outline-variant/40 bg-jds-surface-container-low text-jds-on-surface text-xs sm:text-sm font-medium hover:bg-jds-surface-container transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Reload Page</span>
              </button>

              {!isSubtree && (
                <button
                  type="button"
                  onClick={this.handleNavigateHome}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-jds-outline-variant/40 bg-jds-surface text-jds-on-surface text-xs sm:text-sm font-medium hover:bg-jds-surface-container transition-colors cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>Return Home</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

