<script setup lang="ts">
import { ApiClientError } from '~/services/api-client'
import type { PlatformBusiness } from '~/types/api'

definePageMeta({ layout: 'admin' })
useHead({ title: 'ທຸລະກິດໃນ Platform' })

const api = useApiClient()
const businesses = ref<PlatformBusiness[]>([])
const loading = ref(true)
const errorMessage = ref('')
const copied = ref(false)

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    businesses.value = await api.get<PlatformBusiness[]>('/platform/admin/businesses')
  } catch (cause) {
    errorMessage.value = cause instanceof ApiClientError ? cause.message : 'ບໍ່ສາມາດໂຫຼດທຸລະກິດໄດ້'
  } finally {
    loading.value = false
  }
}

onMounted(load)

const copyRegistrationLink = async () => {
  await navigator.clipboard.writeText(`${window.location.origin}/register`)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1800)
}
</script>

<template>
  <div class="w-full space-y-5">
    <section class="flex flex-wrap items-end justify-between gap-3">
      <div><p class="text-[0.6rem] font-extrabold tracking-[0.13em] text-brand-600 uppercase">Tenant registry</p><h1 class="mt-1 text-xl font-black">ທຸລະກິດໃນ Platform</h1><p class="mt-1 text-xs text-[#7a8581]">Superadmin ເຫັນສະເພາະ metadata; ບໍ່ໄດ້ຮັບສິດເຂົ້າ tenant data.</p></div>
      <button type="button" class="rounded-lg bg-brand-700 px-3 py-2 text-[0.65rem] font-extrabold text-white" @click="copyRegistrationLink">{{ copied ? 'ສຳເນົາແລ້ວ' : 'ສຳເນົາ link ສ້າງ Business' }}</button>
    </section>

    <div class="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-800">
      Owner ເປີດ link ໃນ browser ທີ່ຍັງບໍ່ login, ແລ້ວສ້າງ User + Business + ສາຂາຫຼັກ. ຫຼັງຈາກນັ້ນ Owner ຈຶ່ງສ້າງສາຂາ ແລະ invitation ໃຫ້ພະນັກງານ.
    </div>
    <div v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{{ errorMessage }}</div>
    <div v-if="loading" class="grid min-h-52 place-items-center rounded-xl border bg-white text-brand-600"><LoadingSpinner /></div>
    <section v-else class="overflow-hidden rounded-xl border border-[#e2e8e5] bg-white shadow-sm">
      <div class="grid grid-cols-[minmax(0,1fr)_7rem_7rem_9rem] gap-3 border-b border-[#edf0ee] bg-[#fafbfa] px-4 py-2 text-[0.55rem] font-extrabold tracking-wide text-[#89938f] uppercase"><span>ທຸລະກິດ</span><span>ສາຂາ</span><span>ສະມາຊິກ</span><span>ສະຖານະ</span></div>
      <div v-if="businesses.length" class="divide-y divide-[#edf0ee]"><article v-for="business in businesses" :key="business.id" class="grid grid-cols-[minmax(0,1fr)_7rem_7rem_9rem] items-center gap-3 px-4 py-3"><div><p class="text-xs font-extrabold">{{ business.name }}</p><p class="mt-0.5 text-[0.58rem] text-[#929b98]">{{ business.currencyCode }} · {{ business.timezone }}</p></div><span class="text-xs font-bold">{{ business._count.branches }}</span><span class="text-xs font-bold">{{ business._count.members }}</span><span class="text-[0.62rem] font-extrabold" :class="business.status === 'ACTIVE' ? 'text-emerald-600' : 'text-amber-600'">{{ business.status }}</span></article></div>
      <p v-else class="p-6 text-center text-xs text-[#89938f]">ຍັງບໍ່ມີ Business — ສົ່ງ registration link ໃຫ້ Owner.</p>
    </section>
  </div>
</template>
