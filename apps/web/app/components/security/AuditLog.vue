<script setup lang="ts">
import type { TenantAuditLog } from '~/types/api'

defineProps<{ logs: TenantAuditLog[]; loading?: boolean }>()
const { t, locale } = useI18n()

const formatDate = (iso: string): string => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(locale.value)
}
</script>

<template>
  <div v-if="loading" class="space-y-3 p-4">
    <SkeletonBlock v-for="n in 4" :key="n" class="h-12 w-full" rounded="lg" />
  </div>
  <EmptyState v-else-if="logs.length === 0" icon="activity" :title="t('ui.no_logs', 'ຍັງບໍ່ມີບັນທຶກກິດຈະກຳ')" />
  <ol v-else class="divide-y divide-line">
    <li v-for="log in logs" :key="log.id" class="flex items-start gap-3 px-4 py-3.5">
      <span class="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700"><AdminIcon name="activity" class="size-4" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-ink-900">
          {{ log.action }}
          <span class="ml-1 rounded bg-canvas px-1.5 py-0.5 text-xs font-medium text-ink-500">{{ log.entityType }}</span>
        </p>
        <p class="mt-0.5 truncate text-xs text-ink-500">
          {{ log.user?.displayName ?? t('ui.system_actor', 'ລະບົບ') }} · {{ formatDate(log.createdAt) }}
        </p>
      </div>
    </li>
  </ol>
</template>
