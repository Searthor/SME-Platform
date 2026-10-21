<script setup lang="ts">
withDefaults(defineProps<{ collapsed?: boolean }>(), { collapsed: false })

const auth = useAuthStore()
const { t } = useI18n()
const switching = ref(false)

const choices = computed(() => auth.memberships.filter(item => item.status === 'ACTIVE'))
const current = computed(() => auth.activeMembership)

/** The API re-validates membership on select-business; this is only the UX path. */
const choose = async (businessId: string, close: () => void) => {
  close()
  if (businessId === auth.activeBusinessId) return
  switching.value = true
  try {
    await auth.selectBusiness(businessId)
    await navigateTo('/dashboard')
    reloadNuxtApp({ path: '/dashboard', persistState: false })
  } finally {
    switching.value = false
  }
}
</script>

<template>
  <BasePopover v-if="choices.length > 1" align="left" width="w-64">
    <template #trigger="{ open, toggle }">
      <button
        type="button"
        class="focus-ring flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2 text-left text-white transition hover:bg-white/10"
        :class="collapsed ? 'justify-center' : ''"
        :aria-expanded="open"
        :title="t('ui.switch_business', 'ປ່ຽນທຸລະກິດ')"
        :disabled="switching"
        @click="toggle"
      >
        <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-white/15"><AdminIcon name="building" class="size-4" /></span>
        <template v-if="!collapsed">
          <span class="min-w-0 flex-1">
            <span class="block truncate text-xs font-bold">{{ current?.business.name ?? '—' }}</span>
            <span class="block text-[0.65rem] text-white/60">{{ t('ui.active_business', 'ທຸລະກິດທີ່ໃຊ້ງານ') }}</span>
          </span>
          <AdminIcon name="swap" class="size-4 shrink-0 text-white/60" />
        </template>
      </button>
    </template>
    <template #default="{ close }">
      <button
        v-for="item in choices"
        :key="item.businessId"
        type="button"
        role="menuitem"
        class="focus-ring flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-ink-900 hover:bg-canvas"
        @click="choose(item.businessId, close)"
      >
        <span class="min-w-0 flex-1 truncate font-medium">{{ item.business.name }}</span>
        <AdminIcon v-if="item.businessId === auth.activeBusinessId" name="check" class="size-4 text-brand-600" />
      </button>
    </template>
  </BasePopover>
</template>
