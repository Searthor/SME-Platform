import { defineStore } from 'pinia'
import { ApiClientError, requestApi } from '~/services/api-client'
import type { AuthMe, AuthSession, Membership, PublicUser } from '~/types/api'
import { destinationAfterAuthentication, isActiveMembership } from '~/utils/auth-routing'

const ACTIVE_BUSINESS_KEY = 'sme.activeBusinessId'

const getSavedBusinessId = (): string | null => {
  if (!import.meta.client) return null
  return sessionStorage.getItem(ACTIVE_BUSINESS_KEY)
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    accessToken: null as string | null,
    csrfToken: null as string | null,
    user: null as PublicUser | null,
    memberships: [] as Membership[],
    activeBusinessId: null as string | null,
    permissionCodes: [] as string[],
    initialized: false,
    initializing: false,
  }),

  getters: {
    isAuthenticated: (state): boolean => Boolean(state.accessToken && state.user),
    isPlatformAdmin: (state): boolean => state.user?.platformRole === 'SUPERADMIN',
    hasBusinessContext: (state): boolean => isActiveMembership(state.memberships, state.activeBusinessId),
    activeMembership: (state): Membership | null =>
      state.memberships.find((item) => item.businessId === state.activeBusinessId) ?? null,
    activeBusiness: (state) =>
      state.memberships.find((item) => item.businessId === state.activeBusinessId)?.business ?? null,
    hasPermission: state => (permission: string): boolean => state.permissionCodes.includes(permission),
  },

  actions: {
    async initialize(): Promise<void> {
      if (!import.meta.client || this.initialized || this.initializing) return
      this.initializing = true
      try {
        await this.refresh()
        await this.loadMe()

        const savedBusinessId = getSavedBusinessId()
        if (isActiveMembership(this.memberships, savedBusinessId)) {
          await this.selectBusiness(savedBusinessId as string)
        }
      } catch {
        this.clearSession()
      } finally {
        this.initialized = true
        this.initializing = false
      }
    },

    async login(identifier: string, password: string): Promise<'/superadmin' | '/dashboard' | '/select-business'> {
      const session = await requestApi<AuthSession>('/auth/login', {
        method: 'POST',
        body: {
          identifier: identifier.trim(),
          password,
          deviceName: navigator.userAgent.slice(0, 120),
        },
      })
      this.applySession(session)
      await this.loadMe()

      if (this.user?.platformRole !== 'SUPERADMIN' && this.memberships.length === 1 && this.memberships[0]) {
        await this.selectBusiness(this.memberships[0].businessId)
      }

      return destinationAfterAuthentication(
        this.memberships,
        this.activeBusinessId,
        this.user?.platformRole === 'SUPERADMIN',
      )
    },

    async register(input: {
      displayName: string
      identifier: string
      password: string
      businessName: string
      branchName: string
      branchCode: string
      currencyCode: 'LAK' | 'THB' | 'USD'
      timezone: string
    }): Promise<void> {
      const session = await requestApi<AuthSession>('/auth/register', {
        method: 'POST',
        body: {
          ...input,
          deviceName: navigator.userAgent.slice(0, 120),
        },
      })
      this.applySession(session)
      await this.loadMe()
      const membership = this.memberships[0]
      if (membership) await this.selectBusiness(membership.businessId)
    },

    async refresh(): Promise<void> {
      const cookieToken = useCookie<string | null>('sme_csrf').value
      const csrfToken = this.csrfToken ?? cookieToken
      if (!csrfToken) throw new ApiClientError('AUTHENTICATION_REQUIRED', 'Authentication required', 401)

      const session = await requestApi<AuthSession>('/auth/refresh', {
        method: 'POST',
        csrfToken,
      })
      this.applySession(session)
    },

    async loadMe(): Promise<void> {
      if (!this.accessToken) throw new ApiClientError('AUTHENTICATION_REQUIRED', 'Authentication required', 401)
      const result = await requestApi<AuthMe>('/auth/me', { accessToken: this.accessToken })
      this.user = result.user
      this.memberships = result.memberships

      if (!isActiveMembership(this.memberships, this.activeBusinessId)) {
        this.activeBusinessId = null
      }
    },

    async selectBusiness(businessId: string): Promise<void> {
      if (!this.accessToken) throw new ApiClientError('AUTHENTICATION_REQUIRED', 'Authentication required', 401)
      if (!isActiveMembership(this.memberships, businessId)) {
        throw new ApiClientError('BUSINESS_ACCESS_DENIED', 'Business access denied', 403)
      }

      const result = await requestApi<{ accessToken: string }>('/auth/select-business', {
        method: 'POST',
        accessToken: this.accessToken,
        body: { businessId },
      })
      this.accessToken = result.accessToken
      this.activeBusinessId = businessId
      if (import.meta.client) sessionStorage.setItem(ACTIVE_BUSINESS_KEY, businessId)
      await this.loadAccess()
    },

    async loadAccess(): Promise<void> {
      if (!this.accessToken || !this.activeBusinessId) {
        this.permissionCodes = []
        return
      }
      this.permissionCodes = await requestApi<string[]>('/access-control/me', {
        accessToken: this.accessToken,
      })
    },

    async logout(): Promise<void> {
      try {
        if (this.accessToken && this.csrfToken) {
          await requestApi('/auth/logout', {
            method: 'POST',
            accessToken: this.accessToken,
            csrfToken: this.csrfToken,
          })
        }
      } finally {
        this.clearSession()
      }
    },

    clearSession(): void {
      this.accessToken = null
      this.csrfToken = null
      this.user = null
      this.memberships = []
      this.activeBusinessId = null
      this.permissionCodes = []
      if (import.meta.client) sessionStorage.removeItem(ACTIVE_BUSINESS_KEY)
    },

    applySession(session: AuthSession): void {
      this.accessToken = session.accessToken
      this.csrfToken = session.csrfToken
    },
  },
})
