import type { Membership } from '~/types/api'

export const isActiveMembership = (
  memberships: Membership[],
  businessId: string | null,
): boolean => Boolean(businessId && memberships.some((item) => item.businessId === businessId))

export const destinationAfterAuthentication = (
  memberships: Membership[],
  activeBusinessId: string | null,
  isPlatformAdmin = false,
): '/superadmin' | '/dashboard' | '/select-business' => {
  if (isPlatformAdmin) return '/superadmin'
  return isActiveMembership(memberships, activeBusinessId) ? '/dashboard' : '/select-business'
}
