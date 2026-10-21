<script setup lang="ts">
import type { NavItem } from '~/types/ui'

const props = withDefaults(defineProps<{
  navigation: NavItem[]
  collapsed?: boolean
  /** Mobile drawer state. Ignored on lg+ where the sidebar is always visible. */
  open?: boolean
  searchable?: boolean
}>(), { collapsed: false, open: false, searchable: false })

const emit = defineEmits<{ close: [] }>()

const route = useRoute()
const { t } = useI18n()
const NuxtLinkComponent = resolveComponent('NuxtLink')
const query = ref('')

const items = computed(() => {
  const q = query.value.trim().toLocaleLowerCase()
  return q ? props.navigation.filter(item => item.label.toLocaleLowerCase().includes(q)) : props.navigation
})

const isActive = (item: NavItem): boolean => {
  const [path = '', hash] = item.href.split('#')
  if (hash) return route.path === path && route.hash === `#${hash}`
  if (route.hash && props.navigation.some(other => other.href.startsWith(`${path}#`))) return false
  return route.path === path || Boolean(item.matchPrefix && route.path.startsWith(`${path}/`))
}

const sectionFor = (index: number): string | undefined => {
  const item = items.value[index]
  if (!item?.section || props.collapsed) return undefined
  return items.value[index - 1]?.section === item.section ? undefined : item.section
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-40 bg-navy-950/50 backdrop-blur-sm lg:hidden" aria-hidden="true" @click="emit('close')" />

  <aside
    class="sidebar-surface fixed inset-y-0 left-0 z-50 flex flex-col text-white transition-all duration-300 lg:translate-x-0"
    :class="[open ? 'translate-x-0' : '-translate-x-full', collapsed ? 'w-[4.85rem]' : 'w-[15rem]']"
    :aria-label="t('ui.menu')"
  >
    <div class="flex h-16 items-center px-4" :class="collapsed ? 'justify-center px-0' : ''">
      <AppMark :compact="collapsed" inverse class="origin-left scale-90" />
    </div>

    <div v-if="searchable" class="px-3 pb-2">
      <label v-if="!collapsed" class="relative block">
        <span class="sr-only">{{ t('ui.search') }}</span>
        <AdminIcon name="search" class="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-white/45" />
        <input
          v-model="query"
          type="search"
          :placeholder="t('header.search_placeholder', t('ui.search_placeholder'))"
          class="h-9 w-full rounded-xl border border-white/10 bg-white/7 pr-3 pl-9 text-[0.68rem] text-white outline-none transition placeholder:text-white/40 focus:border-brand-500 focus:bg-white/10"
        >
      </label>
    </div>

    <nav class="min-h-0 flex-1 overflow-y-auto no-scrollbar px-3 py-2" :aria-label="t('ui.menu')">
      <template v-for="(item, index) in items" :key="item.href + item.label">
        <p v-if="sectionFor(index)" class="px-3 pt-5 pb-2 text-[0.58rem] font-extrabold tracking-[0.14em] text-white/40 uppercase">{{ sectionFor(index) }}</p>
        <component
          :is="item.disabled ? 'button' : NuxtLinkComponent"
          v-bind="item.disabled ? { type: 'button', disabled: true } : { to: item.href }"
          :title="collapsed ? item.label : undefined"
          class="group relative mb-1 flex w-full items-center rounded-xl text-left text-[0.74rem] font-bold transition"
          :class="[
            collapsed ? 'h-10 justify-center' : 'h-10 gap-3 px-3',
            item.disabled ? 'cursor-not-allowed text-white/30' : isActive(item)
              ? 'bg-gradient-to-r from-[#5b4cf5] to-[#4839e4] text-white shadow-[0_6px_20px_rgba(91,76,245,0.45)]'
              : 'text-white/70 hover:bg-white/8 hover:text-white',
          ]"
          :aria-current="isActive(item) ? 'page' : undefined"
        >
          <AdminIcon :name="item.icon" class="size-[1.1rem] shrink-0" />
          <span v-if="!collapsed" class="min-w-0 flex-1 truncate">{{ item.label }}</span>
          <span v-if="!collapsed && item.badge !== undefined" class="rounded-full bg-white/15 px-2 py-0.5 text-[0.58rem] font-black">{{ item.badge }}</span>
        </component>
      </template>
    </nav>

    <div v-if="$slots.promo && !collapsed" class="px-3 pb-3"><slot name="promo" /></div>

    <div class="border-t border-white/10 p-3"><slot name="footer" :collapsed="collapsed" /></div>
  </aside>
</template>
