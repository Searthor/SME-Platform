<script setup lang="ts">
import { ApiClientError } from '~/services/api-client'
import type { UserSessionSummary } from '~/types/api'

useHead({ title: 'ຄວາມປອດໄພ' })

const auth = useAuthStore()
const api = useApiClient()
const sessions = ref<UserSessionSummary[]>([])
const loading = ref(true)
const revokingId = ref<string | null>(null)
const errorMessage = ref('')

const load = async () => {
  loading.value = true
  try {
    sessions.value = await api.get<UserSessionSummary[]>('/auth/sessions')
  }
  catch (cause) {
    errorMessage.value = cause instanceof ApiClientError ? cause.message : 'ບໍ່ສາມາດໂຫຼດ session ໄດ້'
  }
  finally {
    loading.value = false
  }
}

onMounted(load)

const revoke = async (sessionId: string) => {
  revokingId.value = sessionId
  errorMessage.value = ''
  try {
    await api.post(`/auth/sessions/${sessionId}/revoke`)
    const revokedCurrentSession = sessions.value.some(session => session.id === sessionId && session.current)
    if (revokedCurrentSession) {
      auth.clearSession()
      await navigateTo('/login')
      return
    }
    await load()
  }
  catch (cause) {
    errorMessage.value = cause instanceof ApiClientError ? cause.message : 'ບໍ່ສາມາດປິດ session ໄດ້'
  }
  finally {
    revokingId.value = null
  }
}

const dateLabel = (value: string) => new Intl.DateTimeFormat('lo-LA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
</script>

<template>
  <div class="space-y-5">
    <section><p class="text-[0.66rem] font-extrabold tracking-[0.12em] text-brand-600 uppercase">Account security</p><h1 class="mt-1 text-xl font-black">ອຸປະກອນ ແລະ Session</h1><p class="mt-1 text-xs text-ink-500">ກວດເບິ່ງ ແລະປິດ refresh-token family ທີ່ບໍ່ຮູ້ຈັກ.</p></section>
    <div v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{{ errorMessage }}</div>
    <div v-if="loading" class="grid min-h-48 place-items-center rounded-xl border bg-white text-brand-600"><LoadingSpinner /></div>
    <section v-else class="overflow-hidden rounded-xl border border-ink-950/7 bg-white shadow-sm">
      <article v-for="session in sessions" :key="session.id" class="flex flex-col justify-between gap-3 border-b border-ink-950/7 p-4 last:border-b-0 sm:flex-row sm:items-center">
        <div><h2 class="text-xs font-extrabold">{{ session.deviceName || 'ອຸປະກອນບໍ່ລະບຸຊື່' }} <span v-if="session.current" class="ml-1 rounded bg-brand-100 px-1.5 py-0.5 text-[0.5rem] text-brand-700">ປັດຈຸບັນ</span></h2><p class="mt-1 text-[0.6rem] text-ink-500">IP {{ session.ipAddress || '—' }} · ສ້າງ {{ dateLabel(session.createdAt) }} · ໝົດອາຍຸ {{ dateLabel(session.expiresAt) }}</p></div>
        <button type="button" class="self-start rounded-lg border border-red-200 px-3 py-1.5 text-[0.62rem] font-bold text-red-600 hover:bg-red-50" :disabled="revokingId === session.id" @click="revoke(session.id)">ປິດ Session</button>
      </article>
      <p v-if="sessions.length === 0" class="p-6 text-center text-xs text-ink-500">ບໍ່ມີ active session.</p>
    </section>
  </div>
</template>
