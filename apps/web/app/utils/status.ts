export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const toneByStatus: Record<string, StatusTone> = {
  ACTIVE: 'success',
  PAID: 'success',
  COMPLETED: 'success',
  ACCEPTED: 'success',
  PENDING: 'warning',
  INVITED: 'warning',
  DRAFT: 'warning',
  PARTIALLY_PAID: 'warning',
  IN_TRANSIT: 'info',
  ORDERED: 'info',
  INACTIVE: 'neutral',
  ARCHIVED: 'neutral',
  CLOSED: 'neutral',
  CANCELLED: 'neutral',
  SUSPENDED: 'danger',
  DISABLED: 'danger',
  REVOKED: 'danger',
  FAILED: 'danger',
  EXPIRED: 'danger',
  REFUNDED: 'danger',
}

export const statusTone = (status: string): StatusTone =>
  toneByStatus[status.trim().toUpperCase()] ?? 'neutral'

export const toneClasses: Record<StatusTone, { badge: string; dot: string }> = {
  success: { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' },
  warning: { badge: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-500' },
  danger: { badge: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  info: { badge: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500' },
  neutral: { badge: 'bg-slate-100 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
}
