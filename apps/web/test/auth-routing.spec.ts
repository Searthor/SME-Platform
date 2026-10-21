import type { Membership } from '~/types/api'
import { destinationAfterAuthentication, isActiveMembership } from '~/utils/auth-routing'

const membership = (businessId: string): Membership => ({
  id: `member-${businessId}`,
  businessId,
  userId: 'user-a',
  status: 'ACTIVE',
  allBranches: true,
  authorizationVersion: 1,
  business: {
    id: businessId,
    name: `Business ${businessId}`,
    currencyCode: 'LAK',
    timezone: 'Asia/Vientiane',
    status: 'ACTIVE',
  },
  branchAccess: [],
})

describe('tenant selection routing (TEN-002)', () => {
  const memberships = [membership('business-a'), membership('business-b')]

  it('accepts only a business returned by the authenticated membership list', () => {
    expect(isActiveMembership(memberships, 'business-a')).toBe(true)
    expect(isActiveMembership(memberships, 'business-c')).toBe(false)
  })

  it('requires business selection when no verified active business is present', () => {
    expect(destinationAfterAuthentication(memberships, null)).toBe('/select-business')
    expect(destinationAfterAuthentication(memberships, 'business-c')).toBe('/select-business')
    expect(destinationAfterAuthentication(memberships, 'business-b')).toBe('/dashboard')
  })

  it('routes a platform superadmin to the isolated platform console', () => {
    expect(destinationAfterAuthentication([], null, true)).toBe('/superadmin')
  })
})
