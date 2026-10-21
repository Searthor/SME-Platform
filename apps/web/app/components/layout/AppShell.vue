<script setup lang="ts">
import type { NavItem } from '~/types/ui'

defineProps<{ navigation: NavItem[] }>()

const route = useRoute()
const { isCollapsed, toggle } = useSidebar()
const sidebarOpen = ref(false)

watch(() => route.fullPath, () => { sidebarOpen.value = false })
</script>

<template>
  <div class="min-h-screen bg-canvas text-ink-950">
    <AppSidebar :navigation="navigation" :collapsed="isCollapsed" :open="sidebarOpen" @close="sidebarOpen = false">
      <template v-if="$slots['sidebar-promo']" #promo><slot name="sidebar-promo" /></template>
      <template #footer="{ collapsed }"><slot name="sidebar-footer" :collapsed="collapsed" /></template>
    </AppSidebar>

    <div
      class="transition-all duration-300 flex flex-col"
      :class="[
        isCollapsed ? 'lg:pl-[4.85rem]' : 'lg:pl-[15rem]',
        route.path === '/pos' ? 'h-screen overflow-hidden' : 'min-h-screen',
      ]"
    >
      <AppNavbar :collapsed="isCollapsed" @toggle-collapse="toggle" @open-menu="sidebarOpen = true">
        <template v-if="$slots['navbar-search']" #search><slot name="navbar-search" /></template>
        <template #actions><slot name="navbar-actions" /></template>
      </AppNavbar>
      <main
        :class="route.path === '/pos'
          ? 'flex-1 h-[calc(100dvh-4rem)] p-2.5 sm:p-3 overflow-hidden flex flex-col min-h-0'
          : 'w-full px-3 py-4 sm:px-4 sm:py-5 lg:px-5'"
      >
        <slot />
      </main>
    </div>
  </div>
</template>
