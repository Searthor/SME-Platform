<script setup lang="ts">
import { ApiClientError } from '~/services/api-client'
import type { TenantAuditLog } from '~/types/api'

useHead({ title: 'ບັນທຶກກິດຈະກຳ' })

const api = useApiClient()
const logs = ref<TenantAuditLog[]>([])
const loading = ref(true)
const errorMessage = ref('')

onMounted(async () => {
  try {
    logs.value = await api.get<TenantAuditLog[]>('/audit-logs?limit=100')
  }
  catch (cause) {
    errorMessage.value = cause instanceof ApiClientError ? cause.message : 'ບໍ່ສາມາດໂຫຼດ audit log ໄດ້'
  }
  finally {
    loading.value = false
  }
})

const dateLabel = (value: string) => new Intl.DateTimeFormat('lo-LA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
</script>

<template>
  <div class="space-y-5">
    <section><p class="text-[0.66rem] font-extrabold tracking-[0.12em] text-brand-600 uppercase">Audit trail</p><h1 class="mt-1 text-xl font-black">ບັນທຶກກິດຈະກຳ</h1><p class="mt-1 text-xs text-ink-500">ສະແດງ 100 ລາຍການຫຼ້າສຸດຂອງ Business ປັດຈຸບັນ.</p></section>
    <div v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{{ errorMessage }}</div>
    <div v-if="loading" class="grid min-h-48 place-items-center rounded-xl border bg-white text-brand-600"><LoadingSpinner /></div>
    <section v-else class="overflow-hidden rounded-xl border border-ink-950/7 bg-white shadow-sm">
      <article v-for="log in logs" :key="log.id" class="grid gap-2 border-b border-ink-950/7 p-4 last:border-b-0 sm:grid-cols-[11rem_1fr_auto] sm:items-center">
        <div><p class="text-[0.64rem] font-extrabold text-brand-700">{{ log.action }}</p><p class="mt-0.5 text-[0.56rem] text-ink-500">{{ log.entityType }}</p></div>
        <p class="text-[0.64rem] text-ink-700">{{ log.user?.displayName || 'System' }}</p>
        <p class="text-[0.58rem] text-ink-500">{{ dateLabel(log.createdAt) }}</p>
      </article>
      <p v-if="logs.length === 0" class="p-6 text-center text-xs text-ink-500">ຍັງບໍ່ມີ audit activity.</p>
    </section>
  </div>
</template>
