// Direct numeric input control with quick-tap preset pills (RAM-12)
// Uses native inputmode="numeric" for mobile keypads and tabular-nums alignment.

export default function NumericCriterionInput({
  id,
  label,
  helperText,
  value,
  onChange,
  presets = [],
  prefix = '',
  suffix = '',
  placeholder = '',
  min = 1,
  max,
  allowAny = false,
  anyLabel = 'Any',
  compact = false,
  variant = 'matcher', // 'matcher' (neutral/amber) | 'modal' (jds tokens)
  error = '',
}) {
  const isAny = value === 'any' || value === '' || value === null || value === undefined
  const displayValue = isAny ? '' : String(value)

  const handleInputChange = (e) => {
    const raw = e.target.value
    if (raw === '') {
      onChange(allowAny ? 'any' : '')
      return
    }
    const digitsOnly = raw.replace(/[^0-9]/g, '')
    if (digitsOnly === '') {
      onChange(allowAny ? 'any' : '')
      return
    }
    let num = parseInt(digitsOnly, 10)
    if (isNaN(num)) return
    if (typeof max === 'number' && num > max) num = max
    onChange(num)
  }

  const handleBlur = () => {
    if (!allowAny && (value === '' || value === null || value === undefined || Number(value) < min)) {
      onChange(min)
    }
  }

  const isModal = variant === 'modal'

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {(label || helperText) && (
        <div>
          {label && (
            <label
              htmlFor={id}
              className={
                isModal
                  ? 'block text-label-md font-bold text-jds-on-surface'
                  : 'block text-xs font-semibold text-neutral-900 dark:text-white'
              }
            >
              {label}
            </label>
          )}
          {helperText && (
            <p
              className={
                isModal
                  ? 'text-[12px] text-jds-on-surface-variant/80 mt-0.5'
                  : 'text-xs text-neutral-500 dark:text-neutral-400 mt-0.5'
              }
            >
              {helperText}
            </p>
          )}
        </div>
      )}

      {/* Direct Numeric Text Field */}
      <div className="relative flex items-center">
        {prefix && (
          <span
            className={`absolute left-3.5 text-sm font-semibold select-none pointer-events-none ${
              isModal ? 'text-jds-on-surface-variant' : 'text-neutral-400 dark:text-neutral-500'
            }`}
          >
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={isAny && allowAny ? anyLabel : placeholder}
          aria-label={label || id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full tabular-nums font-semibold outline-none transition-all ${
            prefix ? 'pl-8' : 'pl-3.5'
          } ${suffix ? 'pr-14' : 'pr-3.5'} ${
            compact ? 'py-2 text-sm rounded-xl' : 'py-2.5 sm:py-3 text-base sm:text-lg rounded-xl'
          } ${
            error
              ? isModal
                ? 'bg-white border border-red-500 text-jds-on-surface focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                : 'bg-white dark:bg-neutral-900 border border-red-500 dark:border-red-500 text-neutral-900 dark:text-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : isModal
              ? 'bg-white border border-jds-outline-variant/60 text-jds-on-surface focus:border-jds-primary focus:ring-2 focus:ring-jds-primary/20'
              : 'bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-700 text-neutral-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
          }`}
        />
        {suffix && (
          <span
            className={`absolute right-3.5 text-xs font-semibold select-none pointer-events-none ${
              isModal ? 'text-jds-on-surface-variant' : 'text-neutral-400 dark:text-neutral-500'
            }`}
          >
            {suffix}
          </span>
        )}
      </div>

      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs font-medium text-red-600 dark:text-red-400 leading-snug"
        >
          {error}
        </p>
      )}

      {/* Quick-Tap Preset Pills */}
      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => {
            const presetVal = typeof preset === 'object' ? preset.value : preset
            const presetLabel = typeof preset === 'object' ? preset.label : `${preset}${suffix ? suffix.trim() : ''}`
            const isSelected =
              presetVal === 'any'
                ? isAny
                : !isAny && Number(value) === Number(presetVal)

            return (
              <button
                key={String(presetVal)}
                type="button"
                onClick={() => onChange(presetVal)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer tabular-nums ${
                  isSelected
                    ? isModal
                      ? 'bg-jds-primary text-white border-jds-primary'
                      : 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                    : isModal
                    ? 'bg-white border-jds-outline-variant/40 text-jds-on-surface-variant hover:border-jds-primary'
                    : 'bg-white dark:bg-neutral-800/70 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-amber-500/70 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {presetLabel}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
