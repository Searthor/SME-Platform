import {
  SIDEBAR_COLLAPSED_COOKIE,
  SIDEBAR_COLLAPSED_STORAGE,
} from '~/composables/use-sidebar'

describe('Sidebar state', () => {
  it('defines consistent storage and cookie keys for persistent sidebar state', () => {
    expect(SIDEBAR_COLLAPSED_COOKIE).toBe('sme_sidebar_collapsed')
    expect(SIDEBAR_COLLAPSED_STORAGE).toBe('sme-flow:sidebar-collapsed:v1')
  })
})
