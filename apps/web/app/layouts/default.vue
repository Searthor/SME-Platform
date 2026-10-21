<script setup lang="ts">
import type { NavItem } from '~/types/ui'

const auth = useAuthStore()
const { t } = useI18n()
const loggingOut = ref(false)

const initials = computed(() => {
  const value = auth.user?.displayName?.trim() || 'Admin'
  return value.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
})

const navigation = computed<NavItem[]>(() => [
  { label: 'Overview', icon: 'home', href: '/dashboard' },
  { label: 'POS ຂາຍໜ້າຮ້ານ', icon: 'cart', href: '/pos', matchPrefix: true },
  { label: 'Businesses', icon: 'building', href: '/settings/business', matchPrefix: true },
  { label: 'Products', icon: 'box', href: '/products', matchPrefix: true },
  { label: 'Promotions', icon: 'tag', href: '/promotions', matchPrefix: true },
  { label: 'Purchases', icon: 'box', href: '/purchases', matchPrefix: true },
  { label: 'Inventory ສະຕັອກ', icon: 'box', href: '/inventory', matchPrefix: true },
  { label: 'Suppliers', icon: 'truck', href: '/suppliers', matchPrefix: true },
  { label: 'Customers', icon: 'users', href: '/customers', matchPrefix: true },
  { label: 'Analytics', icon: 'chart', href: '/dashboard#analytics' },
  { label: 'Users & Roles', icon: 'shield', href: '/settings/roles', section: 'MANAGEMENT', matchPrefix: true },
  { label: 'Subscriptions', icon: 'card', href: '/dashboard#subscriptions' },
  { label: 'Payments', icon: 'wallet', href: '/dashboard#payments' },
  { label: 'Settings', icon: 'settings', href: '/settings/security' },
])

const switchBusiness = () => {
  auth.activeBusinessId = null
  auth.permissionCodes = []
  if (import.meta.client) sessionStorage.removeItem('sme.activeBusinessId')
  return navigateTo('/select-business')
}

const logout = async () => {
  loggingOut.value = true
  try {
    await auth.logout()
    await navigateTo('/login')
  }
  finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <AppShell :navigation="navigation">
    <template #navbar-search>
      <div class="relative w-full max-w-xs sm:max-w-sm">
        <AdminIcon name="search" class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder="Search anything..."
          class="h-9.5 w-full rounded-xl border border-line bg-canvas/40 pr-14 pl-9 text-xs text-ink-950 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none"
        >
        <span class="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md border border-line bg-white px-1.5 py-0.5 text-[0.62rem] font-bold text-slate-400 shadow-2xs">Ctrl K</span>
      </div>
    </template>

    <template #navbar-actions>
      <!-- Notifications -->
      <button
        type="button"
        title="Notifications"
        class="focus-ring relative grid size-9 place-items-center rounded-xl border border-line text-slate-600 hover:bg-canvas transition"
      >
        <AdminIcon name="bell" class="size-4" />
        <span class="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[0.55rem] font-black text-white ring-2 ring-white">3</span>
      </button>

      <!-- Language selector -->
      <ClientOnly>
        <LanguageSelector />
      </ClientOnly>

      <!-- User Profile Card -->
      <div class="flex items-center gap-2.5 rounded-xl border border-line bg-white px-2.5 py-1 text-left transition hover:bg-canvas cursor-pointer">
        <span class="grid size-7.5 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-black text-white">
          {{ initials }}
        </span>
        <div class="hidden sm:block leading-none">
          <span class="block text-xs font-bold text-slate-900">{{ auth.user?.displayName || 'Admin' }}</span>
          <span class="mt-0.5 block text-[0.62rem] font-medium text-slate-400">Super Admin</span>
        </div>
        <AdminIcon name="chevron-down" class="size-3 text-slate-400" />
      </div>
    </template>

    <template #sidebar-promo>
      <div class="relative overflow-hidden rounded-2xl bg-white p-3 text-ink-950 shadow-md">
        <div class="flex items-center gap-2">
          <span class="grid size-5.5 place-items-center rounded-lg bg-amber-100 text-amber-600 text-xs">👑</span>
          <p class="text-xs font-extrabold text-slate-900">Upgrade to Pro</p>
        </div>
        <p class="mt-1 text-[0.65rem] font-medium text-slate-500 leading-snug">Unlock more features for your business</p>
        <button
          type="button"
          class="focus-ring mt-2.5 w-full rounded-xl bg-[#5b4cf5] hover:bg-[#4a3bd9] py-1.5 text-center text-[0.72rem] font-bold text-white transition shadow-[0_4px_12px_rgba(91,76,245,0.35)]"
        >
          Explore Plans →
        </button>
      </div>
    </template>

    <template #sidebar-footer="{ collapsed }">
      <div v-if="!collapsed" class="space-y-2">
        <TenantSwitcher v-if="auth.memberships.length > 1" :collapsed="collapsed" />
        <div class="flex items-center gap-2.5 rounded-xl bg-white/5 p-2.5">
          <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-600 text-xs font-black text-white">{{ initials }}</span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-xs font-bold text-white">{{ auth.user?.displayName || 'Admin' }}</span>
            <span class="mt-0.5 block truncate text-[0.62rem] font-medium text-white/50 uppercase">{{ auth.activeMembership?.business.name || 'SmeFlow' }}</span>
          </span>
          <button
            type="button"
            :title="t('header.logout')"
            class="focus-ring grid size-7 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-rose-400"
            :disabled="loggingOut"
            @click="logout"
          >
            <AdminIcon name="logout" class="size-3.5" />
          </button>
        </div>
      </div>
      <div v-else class="flex flex-col items-center gap-2">
        <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-600 text-xs font-black text-white" :title="auth.user?.displayName">{{ initials }}</span>
        <button
          v-if="auth.memberships.length > 1"
          type="button"
          :title="t('header.switch_business')"
          class="focus-ring grid size-7 place-items-center rounded-lg border border-white/10 text-white/70 hover:bg-white/10"
          @click="switchBusiness"
        >
          <AdminIcon name="building" class="size-3.5" />
        </button>
        <button
          type="button"
          :title="t('header.logout')"
          class="focus-ring grid size-7 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-rose-400"
          :disabled="loggingOut"
          @click="logout"
        >
          <AdminIcon name="logout" class="size-3.5" />
        </button>
      </div>
    </template>

    <slot />
  </AppShell>
</template>
