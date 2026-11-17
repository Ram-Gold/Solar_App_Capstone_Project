import { List, LayoutGrid } from 'lucide-react'

/**
 * Shared Table / Cards (plus optional extra modes) view toggle.
 * Uses Tier 2 control height (h-9) and radius (rounded-lg) with rounded-md inner segments.
 */
export default function ViewModeToggle({ value = 'table', onChange, extraModes = [] }) {
  const modes = [
    { id: 'table', label: 'Table', icon: List },
    { id: 'cards', label: 'Cards', icon: LayoutGrid },
    ...extraModes,
  ]

  return (
    <div
      role="group"
      aria-label="View mode"
      className="inline-flex h-9 items-center rounded-lg border border-jds-outline-variant bg-jds-surface p-0.5 shrink-0"
    >
      {modes.map((mode) => {
        const Icon = mode.icon
        const active = value === mode.id
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            aria-pressed={active}
            title={`${mode.label} view`}
            aria-label={`${mode.label} view`}
            className={`jds-focus-ring inline-flex h-full items-center gap-1.5 px-2.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
              active
                ? 'bg-jds-surface-container text-jds-primary'
                : 'text-jds-on-surface-variant hover:text-jds-on-surface'
            }`}
          >
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
            <span>{mode.label}</span>
          </button>
        )
      })}
    </div>
  )
}
