import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  LogOut,
  QrCode,
  ShieldCheck,
  UserCheck,
  CalendarDays,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  ArrowUpRight,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { OPS_UPDATED_EVENT } from '../../lib/inquiryStatusUtils'

const SIDEBAR_COLLAPSE_KEY = 'jds_ops_sidebar_collapsed'

const OPERATIONS_LINKS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'register-sale', label: 'Register Sale', icon: QrCode },
  { id: 'inquiries', label: 'Inquiries', icon: CalendarDays, badgeKey: 'inquiries' },
  { id: 'claims', label: 'Claims', icon: ShieldCheck, badgeKey: 'claims' },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
]

const CATALOG_LINKS = [
  { id: 'products', label: 'Products', icon: Package },
  { id: 'customers', label: 'Customers', icon: UserCheck },
  { id: 'users', label: 'Users', icon: Users, adminOnly: true },
]

/**
 * Shared warm-light collapsible sidebar for Admin Console and Staff Workspace.
 * Supports desktop 64px icon-rail collapse and quick-jump / live Supabase lookup (Ctrl+K).
 */
export default function OperationsSidebar({
  roleVariant = 'admin',
  activeScreen,
  onNavigate,
  isOpen,
  onClose,
}) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const isAdmin = roleVariant === 'admin'

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [liveResults, setLiveResults] = useState({
    products: [],
    inquiries: [],
    claims: [],
    customers: [],
    orders: [],
  })
  const [searchingLive, setSearchingLive] = useState(false)
  const [badges, setBadges] = useState({ inquiries: 0, claims: 0 })
  const searchInputRef = useRef(null)
  const searchBoxRef = useRef(null)

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(next))
      } catch {
        // Ignore storage restrictions
      }
      return next
    })
  }

  // Load pending queue badge counts safely
  useEffect(() => {
    let ignore = false
    async function loadBadges() {
      if (typeof supabase?.from !== 'function') return
      try {
        const [{ count: pendingInq }, { count: openClaims }] = await Promise.all([
          supabase
            .from('quote_tickets')
            .select('id', { count: 'exact', head: true })
            .in('status', ['Pending', 'Confirmed', 'pending', 'confirmed']),
          supabase
            .from('warranty_claims')
            .select('id', { count: 'exact', head: true })
            .in('status', ['Pending', 'Under Review', 'Inspecting', 'pending', 'in_review', 'checking']),
        ])
        if (!ignore) {
          setBadges({
            inquiries: pendingInq || 0,
            claims: openClaims || 0,
          })
        }
      } catch {
        // Non-blocking badge fetch
      }
    }
    loadBadges()
    const handleOpsUpdated = (event) => {
      const detail = event?.detail
      const topics = Array.isArray(detail?.topics)
        ? detail.topics
        : detail?.topic
          ? [detail.topic]
          : null
      if (topics && !topics.includes('inquiries') && !topics.includes('claims')) {
        return
      }
      loadBadges()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener(OPS_UPDATED_EVENT, handleOpsUpdated)
    }
    return () => {
      ignore = true
      if (typeof window !== 'undefined') {
        window.removeEventListener(OPS_UPDATED_EVENT, handleOpsUpdated)
      }
    }
  }, [activeScreen])

  // Keyboard shortcut Ctrl+K / Cmd+K to focus quick-jump search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (collapsed) setCollapsed(false)
        setTimeout(() => {
          searchInputRef.current?.focus()
          setSearchOpen(true)
        }, 50)
      } else if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
        searchInputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [collapsed, searchOpen])

  // Close search dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Debounced live Supabase lookup when query >= 2 chars
  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2 || typeof supabase?.from !== 'function') {
      return
    }

    let cancelled = false
    const cleanClaimQ = q.replace(/^claim-/i, '')
    const isHexPrefix = /^[a-f0-9-]{2,}$/i.test(cleanClaimQ)
    const orderOr = /^\d+$/.test(q)
      ? `customer_name.ilike.%${q}%,product_name.ilike.%${q}%,address.ilike.%${q}%,id.eq.${Number(q)}`
      : `customer_name.ilike.%${q}%,product_name.ilike.%${q}%,address.ilike.%${q}%`

    const timer = setTimeout(async () => {
      setSearchingLive(true)
      try {
        const queries = [
          supabase
            .from('products')
            .select('id, name, type, watt, is_archived')
            .or(`name.ilike.%${q}%,type.ilike.%${q}%`)
            .limit(6),
          supabase
            .from('quote_tickets')
            .select('id, ticket_code, customer_name, customer_phone, purpose, status')
            .or(`ticket_code.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%,purpose.ilike.%${q}%`)
            .limit(4),
          supabase
            .from('warranty_claims')
            .select('id, issue_category, description, status')
            .or(`issue_category.ilike.%${q}%,description.ilike.%${q}%`)
            .limit(4),
          supabase
            .from('customers')
            .select('id, full_name, phone_number, access_token')
            .or(`full_name.ilike.%${q}%,phone_number.ilike.%${q}%,access_token.ilike.%${q}%`)
            .limit(4),
          supabase
            .from('orders')
            .select('id, customer_name, product_name, status')
            .or(orderOr)
            .limit(4),
        ]

        if (isHexPrefix) {
          queries.push(
            supabase
              .from('warranty_claims')
              .select('id, issue_category, description, status')
              .order('created_at', { ascending: false })
              .limit(20)
          )
        }

        const results = await Promise.allSettled(queries)
        const getRows = (idx) =>
          results[idx]?.status === 'fulfilled' && Array.isArray(results[idx].value?.data)
            ? results[idx].value.data
            : []

        const textClaims = getRows(2)
        const idClaims = isHexPrefix
          ? getRows(5).filter((c) => String(c.id || '').toLowerCase().includes(cleanClaimQ.toLowerCase()))
          : []
        const mergedClaims = [...textClaims, ...idClaims].filter(
          (c, idx, arr) => arr.findIndex((x) => x.id === c.id) === idx
        ).slice(0, 4)

        if (!cancelled) {
          setLiveResults({
            products: getRows(0).filter((p) => !p.is_archived).slice(0, 4),
            inquiries: getRows(1).slice(0, 4),
            claims: mergedClaims,
            customers: getRows(3).slice(0, 4),
            orders: getRows(4).slice(0, 4),
          })
        }
      } catch {
        if (!cancelled) {
          setLiveResults({ products: [], inquiries: [], claims: [], customers: [], orders: [] })
        }
      } finally {
        if (!cancelled) setSearchingLive(false)
      }
    }, 220)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [searchQuery])

  const EMPTY_RESULTS = { products: [], inquiries: [], claims: [], customers: [], orders: [] }
  const displayedResults = searchQuery.trim().length >= 2 ? liveResults : EMPTY_RESULTS

  const allRoutes = useMemo(() => {
    return [...OPERATIONS_LINKS, ...CATALOG_LINKS].filter((item) => isAdmin || !item.adminOnly)
  }, [isAdmin])

  const matchedRoutes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return allRoutes.slice(0, 5)
    return allRoutes.filter((r) => r.label.toLowerCase().includes(q) || r.id.toLowerCase().includes(q))
  }, [searchQuery, allRoutes])

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  const handleJump = useCallback(
    (screenId, payload = null) => {
      if (payload) onNavigate(screenId, payload)
      else onNavigate(screenId)
      setSearchOpen(false)
      setSearchQuery('')
      setActiveIndex(-1)
      if (onClose) onClose()
    },
    [onNavigate, onClose]
  )

  const selectableItems = useMemo(() => {
    const items = matchedRoutes.map((route) => ({
      key: `route-${route.id}`,
      onSelect: () => handleJump(route.id),
    }))
    if (searchQuery.trim().length >= 2) {
      displayedResults.products.forEach((p) =>
        items.push({
          key: `prod-${p.id}`,
          onSelect: () => handleJump('products', { searchQuery: p.name, itemId: p.id }),
        })
      )
      displayedResults.inquiries.forEach((inq) =>
        items.push({
          key: `inq-${inq.id}`,
          onSelect: () =>
            handleJump('inquiries', {
              searchQuery: inq.ticket_code || inq.customer_name || '',
              itemId: inq.id,
            }),
        })
      )
      displayedResults.claims.forEach((cl) =>
        items.push({
          key: `claim-${cl.id}`,
          onSelect: () =>
            handleJump('claims', {
              searchQuery: cl.id ? cl.id.slice(0, 8) : cl.issue_category || '',
              itemId: cl.id,
            }),
        })
      )
      displayedResults.customers.forEach((c) =>
        items.push({
          key: `cust-${c.id}`,
          onSelect: () =>
            handleJump('customers', {
              searchQuery: c.full_name || c.phone_number || '',
              itemId: c.id,
            }),
        })
      )
      displayedResults.orders.forEach((o) =>
        items.push({
          key: `order-${o.id}`,
          onSelect: () =>
            handleJump('orders', {
              searchQuery: o.customer_name || o.product_name || String(o.id),
              itemId: o.id,
            }),
        })
      )
    }
    return items
  }, [matchedRoutes, searchQuery, displayedResults, handleJump])

  const handleSearchKeyDown = (e) => {
    if (!searchOpen || selectableItems.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % selectableItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev <= 0 ? selectableItems.length - 1 : prev - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0 && selectableItems[activeIndex]) {
      e.preventDefault()
      selectableItems[activeIndex].onSelect()
    }
  }

  const isRouteActive = (id) => {
    if (activeScreen === id) return true
    if (id === 'inquiries' && ['pickups', 'quotes', 'calendar'].includes(activeScreen)) return true
    if (id === 'products' && ['images', 'add-product'].includes(activeScreen)) return true
    return false
  }

  const NavItem = ({ item }) => {
    const Icon = item.icon
    const active = isRouteActive(item.id)
    const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0

    return (
      <button
        type="button"
        onClick={() => handleJump(item.id)}
        title={collapsed ? item.label : undefined}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        className={`jds-focus-ring flex w-full min-h-[44px] items-center ${collapsed ? 'lg:justify-center lg:px-2' : 'justify-between px-3'
          } gap-2.5 rounded-lg py-2 text-[13.5px] border cursor-pointer ${active
            ? 'bg-jds-surface-container-lowest border-jds-chrome-border text-jds-primary font-bold shadow-2xs'
            : 'border-transparent text-jds-on-surface-variant hover:bg-jds-chrome-hover hover:text-jds-on-surface font-medium'
          }`}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <Icon className="h-4 w-4 shrink-0" />
          <span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{item.label}</span>
        </span>
        {badgeCount > 0 && (
          <span
            className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${collapsed ? 'lg:hidden' : ''
              } ${active
                ? 'bg-jds-primary text-jds-on-primary'
                : 'bg-jds-surface-container-high text-jds-on-surface-variant'
              }`}
          >
            {badgeCount}
          </span>
        )}
      </button>
    )
  }

  const displayName = user?.email?.split('@')[0] || (isAdmin ? 'Admin Desk' : 'Counter Staff')

  return (
    <aside
      aria-label={isAdmin ? 'Admin operations sidebar' : 'Staff operations sidebar'}
      className={`fixed inset-y-0 left-0 z-[60] lg:z-40 flex h-full shrink-0 flex-col border-r border-jds-chrome-border bg-jds-chrome text-jds-on-surface transition-all duration-200 lg:static lg:translate-x-0 ${collapsed ? 'w-64 lg:w-16' : 'w-64'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Header & Collapse Toggle */}
      <div
        className={`px-3.5 py-3.5 border-b border-jds-chrome-border flex items-center ${collapsed ? 'lg:justify-center' : 'justify-between'
          } gap-2`}
      >
        <div className={`flex items-center gap-2 min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-jds-primary truncate">
            {isAdmin ? 'Admin Console' : 'Staff Workspace'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar to icon rail'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex jds-btn-motion jds-focus-ring h-9 w-9 items-center justify-center rounded-lg border border-jds-chrome-border bg-jds-surface-container-lowest text-jds-on-surface hover:bg-jds-chrome-hover cursor-pointer"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close navigation menu"
              className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-jds-on-surface-variant hover:text-jds-on-surface hover:bg-jds-surface-container cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick-Jump & Live Lookup Search */}
      <div ref={searchBoxRef} className={`px-3 pt-3 pb-1 relative ${collapsed ? 'lg:hidden' : ''}`}>
        <label htmlFor="ops-sidebar-search" className="sr-only">
          Search items, inquiries, claims, customers, or orders
        </label>
        <div className="flex items-center gap-2 rounded-lg border border-jds-chrome-border bg-jds-surface-container-lowest px-2.5 py-2 text-jds-on-surface-variant focus-within:border-jds-primary">
          <Search className="h-3.5 w-3.5 shrink-0" />
          <input
            ref={searchInputRef}
            id="ops-sidebar-search"
            type="search"
            value={searchQuery}
            onFocus={() => setSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSearchOpen(true)
              setActiveIndex(-1)
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search items, inquiries, claims..."
            className="w-full bg-transparent text-[13px] text-jds-on-surface placeholder:text-jds-on-surface-variant/60 outline-none"
          />
          <kbd className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-jds-surface-container border border-jds-outline-variant/40 text-jds-on-surface-variant shrink-0">
            Ctrl K
          </kbd>
        </div>

        {searchOpen && (
          <div className="absolute left-3 right-3 top-full mt-1.5 z-50 rounded-xl border border-jds-outline-variant/50 bg-jds-surface-container-lowest p-2 shadow-xl space-y-2 max-h-80 overflow-y-auto">
            <div>
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-jds-on-surface-variant/70">
                Screens
              </p>
              {matchedRoutes.length === 0 ? (
                <p className="px-2 py-1 text-xs text-jds-on-surface-variant">No matching screen</p>
              ) : (
                matchedRoutes.map((route) => {
                  const isHighlighted = selectableItems[activeIndex]?.key === `route-${route.id}`
                  return (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => handleJump(route.id)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-jds-on-surface hover:bg-jds-surface-container cursor-pointer text-left ${isHighlighted ? 'bg-jds-surface-container ring-1 ring-jds-primary/40' : ''}`}
                    >
                      <span>{route.label}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-jds-primary" />
                    </button>
                  )
                })
              )}
            </div>

            {searchQuery.trim().length >= 2 && (
              <>
                <div className="border-t border-jds-outline-variant/30 pt-1.5">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-jds-on-surface-variant/70">
                    {searchingLive ? 'Searching...' : 'Equipment Matches'}
                  </p>
                  {displayedResults.products.map((prod) => {
                    const isHighlighted = selectableItems[activeIndex]?.key === `prod-${prod.id}`
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleJump('products', { searchQuery: prod.name, itemId: prod.id })}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-jds-on-surface hover:bg-jds-surface-container cursor-pointer text-left gap-2 ${isHighlighted ? 'bg-jds-surface-container ring-1 ring-jds-primary/40' : ''}`}
                      >
                        <span className="truncate">{prod.name}</span>
                        <span className="text-[10px] text-jds-on-surface-variant shrink-0">{prod.watt}W</span>
                      </button>
                    )
                  })}
                  {!searchingLive && displayedResults.products.length === 0 && (
                    <p className="px-2 py-1 text-xs text-jds-on-surface-variant">No equipment matched</p>
                  )}
                </div>

                {displayedResults.inquiries.length > 0 && (
                  <div className="border-t border-jds-outline-variant/30 pt-1.5">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-jds-on-surface-variant/70">
                      Inquiries &amp; Requests
                    </p>
                    {displayedResults.inquiries.map((inq) => {
                      const isHighlighted = selectableItems[activeIndex]?.key === `inq-${inq.id}`
                      return (
                        <button
                          key={inq.id}
                          type="button"
                          onClick={() =>
                            handleJump('inquiries', {
                              searchQuery: inq.ticket_code || inq.customer_name || '',
                              itemId: inq.id,
                            })
                          }
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-jds-on-surface hover:bg-jds-surface-container cursor-pointer text-left gap-2 ${isHighlighted ? 'bg-jds-surface-container ring-1 ring-jds-primary/40' : ''}`}
                        >
                          <span className="truncate">{inq.customer_name || inq.purpose || 'Inquiry'}</span>
                          <span className="font-mono text-[10px] text-jds-primary shrink-0">
                            {inq.ticket_code || inq.status}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {displayedResults.claims.length > 0 && (
                  <div className="border-t border-jds-outline-variant/30 pt-1.5">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-jds-on-surface-variant/70">
                      Warranty Claims
                    </p>
                    {displayedResults.claims.map((cl) => {
                      const isHighlighted = selectableItems[activeIndex]?.key === `claim-${cl.id}`
                      return (
                        <button
                          key={cl.id}
                          type="button"
                          onClick={() =>
                            handleJump('claims', {
                              searchQuery: cl.id ? cl.id.slice(0, 8) : cl.issue_category || '',
                              itemId: cl.id,
                            })
                          }
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-jds-on-surface hover:bg-jds-surface-container cursor-pointer text-left gap-2 ${isHighlighted ? 'bg-jds-surface-container ring-1 ring-jds-primary/40' : ''}`}
                        >
                          <span className="truncate">{cl.issue_category || cl.description || 'Warranty Claim'}</span>
                          <span className="font-mono text-[10px] text-jds-primary shrink-0">
                            CLAIM-{String(cl.id || '').slice(0, 8).toUpperCase()}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {displayedResults.customers.length > 0 && (
                  <div className="border-t border-jds-outline-variant/30 pt-1.5">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-jds-on-surface-variant/70">
                      Customers
                    </p>
                    {displayedResults.customers.map((c) => {
                      const isHighlighted = selectableItems[activeIndex]?.key === `cust-${c.id}`
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            handleJump('customers', {
                              searchQuery: c.full_name || c.phone_number || '',
                              itemId: c.id,
                            })
                          }
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-jds-on-surface hover:bg-jds-surface-container cursor-pointer text-left gap-2 ${isHighlighted ? 'bg-jds-surface-container ring-1 ring-jds-primary/40' : ''}`}
                        >
                          <span className="truncate">{c.full_name}</span>
                          <span className="font-mono text-[10px] text-jds-primary shrink-0">
                            {c.access_token || c.phone_number}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {displayedResults.orders.length > 0 && (
                  <div className="border-t border-jds-outline-variant/30 pt-1.5">
                    <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-jds-on-surface-variant/70">
                      Orders
                    </p>
                    {displayedResults.orders.map((o) => {
                      const isHighlighted = selectableItems[activeIndex]?.key === `order-${o.id}`
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() =>
                            handleJump('orders', {
                              searchQuery: o.customer_name || o.product_name || String(o.id),
                              itemId: o.id,
                            })
                          }
                          className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs text-jds-on-surface hover:bg-jds-surface-container cursor-pointer text-left gap-2 ${isHighlighted ? 'bg-jds-surface-container ring-1 ring-jds-primary/40' : ''}`}
                        >
                          <span className="truncate">
                            {o.customer_name} — {o.product_name}
                          </span>
                          <span className="font-mono text-[10px] text-jds-on-surface-variant shrink-0">
                            #{o.id}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Operations navigation">
        <div className="space-y-1">
          <p className={`mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.07em] text-jds-on-surface-variant/70 ${collapsed ? 'lg:hidden' : ''}`}>
            Operations
          </p>
          {OPERATIONS_LINKS.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>

        <div className="space-y-1">
          <p className={`mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-[0.07em] text-jds-on-surface-variant/70 ${collapsed ? 'lg:hidden' : ''}`}>
            Catalog
          </p>
          {CATALOG_LINKS.filter((item) => isAdmin || !item.adminOnly).map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>
      </nav>

      {/* Footer User Chip (Profile folded here) + Sign Out */}
      <div className="border-t border-jds-chrome-border p-2.5 bg-jds-chrome">
        <div className={`flex items-center ${collapsed ? 'lg:flex-col lg:gap-2' : 'justify-between gap-2'}`}>
          <button
            type="button"
            onClick={() => handleJump('profile')}
            title="Open account profile"
            aria-label="Open account profile"
            className={`jds-focus-ring flex items-center gap-2.5 min-w-0 min-h-[44px] rounded-lg px-2 py-1.5 text-left transition-colors cursor-pointer ${activeScreen === 'profile'
              ? 'bg-jds-primary/10 ring-1 ring-jds-primary/40'
              : 'hover:bg-jds-surface-container'
              } ${collapsed ? 'lg:justify-center lg:px-1.5' : 'flex-1'}`}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-jds-primary-container text-jds-on-primary-container text-xs font-extrabold shrink-0">
              {displayName[0]?.toUpperCase() || 'U'}
            </div>
            <div className={`min-w-0 ${collapsed ? 'lg:hidden' : ''}`}>
              <p className="truncate text-[13px] font-semibold text-jds-on-surface">{displayName}</p>
              <p className="text-[11px] text-jds-on-surface-variant">
                {isAdmin ? 'Admin Profile' : 'Staff Profile'}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="jds-btn-motion jds-focus-ring min-w-[40px] min-h-[40px] flex items-center justify-center text-jds-on-surface-variant hover:text-jds-primary rounded-lg hover:bg-jds-surface-container cursor-pointer shrink-0"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
