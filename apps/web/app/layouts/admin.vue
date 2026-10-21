<script setup lang="ts">
import type { NavItem } from '~/types/ui'

const auth = useAuthStore()
const { t } = useI18n()
const loggingOut = ref(false)

const initials = computed(() => {
  const value = auth.user?.displayName?.trim() || 'Super Admin'
  return value.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
})

const navigation = computed<NavItem[]>(() => [
  { label: t('nav.platform_dashboard'), icon: 'dashboard', href: '/superadmin' },
  { label: t('nav.platform_businesses'), icon: 'building', href: '/superadmin/businesses', matchPrefix: true },
  { label: t('nav.platform_users'), icon: 'users', href: '#', disabled: true, badge: t('header.soon') },
  { label: t('nav.platform_security'), icon: 'shield', href: '#', disabled: true, badge: t('header.soon') },
  { label: t('nav.platform_activity'), icon: 'activity', href: '#', disabled: true, badge: t('header.soon') },
  { label: t('nav.platform_settings'), icon: 'settings', href: '/superadmin#settings' },
])

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
    <template #navbar-actions>
      <ClientOnly>
        <UiPreferencesMenu />
      </ClientOnly>
      <button
        type="button"
        :title="t('header.notifications')"
        class="focus-ring relative grid size-9 place-items-center rounded-xl border border-line text-ink-700 hover:bg-canvas"
      >
        <AdminIcon name="bell" class="size-4" />
        <span class="absolute top-2 right-2 size-1.5 rounded-full bg-orange-500 ring-2 ring-white" />
      </button>
      <ClientOnly>
        <LanguageSelector />
      </ClientOnly>
      <BaseButton variant="ghost" size="sm" :loading="loggingOut" @click="logout">
        <template #icon>
          <AdminIcon name="logout" class="size-3.5 text-rose-600" />
        </template>
        <span class="text-rose-600">{{ t('header.logout') }}</span>
      </BaseButton>
    </template>

    <template #sidebar-footer="{ collapsed }">
      <div v-if="!collapsed" class="flex items-center gap-2.5 rounded-xl bg-white/5 p-2.5">
        <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-600 text-xs font-black text-white">{{ initials }}</span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-xs font-bold text-white">{{ auth.user?.displayName }}</span>
          <span class="mt-0.5 block text-[0.62rem] font-medium text-white/50 uppercase">Superadmin</span>
        </span>
        <button
          type="button"
          :title="t('header.logout')"
          class="focus-ring grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-rose-400"
          :disabled="loggingOut"
          @click="logout"
        >
          <AdminIcon name="logout" class="size-4" />
        </button>
      </div>
      <div v-else class="flex flex-col items-center gap-2">
        <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-600 text-xs font-black text-white" :title="auth.user?.displayName">{{ initials }}</span>
        <button
          type="button"
          :title="t('header.logout')"
          class="focus-ring grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-rose-400"
          :disabled="loggingOut"
          @click="logout"
        >
          <AdminIcon name="logout" class="size-4" />
        </button>
      </div>
    </template>

    <slot />
  </AppShell>
</template>
