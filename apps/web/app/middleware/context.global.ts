export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const auth = useAuthStore()
  await auth.initialize()

  const publicAuthRoute = to.path === '/login' || to.path === '/register' || to.path.startsWith('/accept-invitation/')
  if (publicAuthRoute) {
    if (auth.isAuthenticated) {
      if (to.path.startsWith('/accept-invitation/')) return
      if (auth.isPlatformAdmin) return navigateTo('/superadmin')
      return navigateTo(auth.hasBusinessContext ? '/dashboard' : '/select-business')
    }
    return
  }

  if (!auth.isAuthenticated) return navigateTo('/login')

  if (to.path.startsWith('/superadmin')) {
    if (!auth.isPlatformAdmin) {
      return navigateTo(auth.hasBusinessContext ? '/dashboard' : '/select-business')
    }
    return
  }

  if (to.path === '/' && auth.isPlatformAdmin) return navigateTo('/superadmin')

  if (to.path === '/select-business') {
    if (auth.hasBusinessContext) return navigateTo('/dashboard')
    return
  }

  if (!auth.hasBusinessContext) {
    return navigateTo(auth.isPlatformAdmin ? '/superadmin' : '/select-business')
  }
  if (to.path === '/') return navigateTo('/dashboard')
})
