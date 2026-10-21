export type AdminIconName =
  | 'activity' | 'bell' | 'building' | 'chevron-left' | 'chevron-right' | 'dashboard' | 'globe' | 'logout' | 'menu'
  | 'panel-left' | 'panel-left-close' | 'panel-left-open' | 'search' | 'settings' | 'shield' | 'users'
  | 'box' | 'cart' | 'chart' | 'card' | 'wallet' | 'plus' | 'x' | 'check' | 'alert' | 'info' | 'upload'
  | 'chevron-down' | 'chevron-up' | 'filter' | 'eye' | 'edit' | 'trash' | 'more' | 'calendar' | 'tag' | 'sort' | 'file' | 'swap' | 'home' | 'truck'

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export type NavItem = {
  label: string
  href: string
  icon: AdminIconName
  /** Optional section heading rendered above this item. */
  section?: string
  disabled?: boolean
  /** Match nested routes (e.g. /products/123) as active. */
  matchPrefix?: boolean
  badge?: string | number
}

export type BreadcrumbItem = { label: string; to?: string }

export type TabItem = { key: string; label: string; count?: number | string; disabled?: boolean }

export type SelectOption = { value: string; label: string; disabled?: boolean }

export type SortDirection = 'asc' | 'desc'
export type SortState = { key: string; direction: SortDirection } | null

export type DataTableColumn = {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'right' | 'center'
  /** Tailwind width/utility classes applied to the header and cells. */
  class?: string
}

export type ToastItem = {
  id: number
  tone: Tone
  title: string
  message?: string
  duration: number
}

export type PlanFeature = { label: string; included?: boolean }
