<script setup lang="ts">
import { ApiClientError } from '~/services/api-client'

definePageMeta({ layout: 'auth' })
useHead({ title: 'ເລືອກທຸລະກິດ' })

const auth = useAuthStore()
const selectingId = ref<string | null>(null)
const errorMessage = ref('')

const select = async (businessId: string) => {
  selectingId.value = businessId
  errorMessage.value = ''
  try {
    await auth.selectBusiness(businessId)
    await navigateTo('/dashboard')
  } catch (cause) {
    errorMessage.value = cause instanceof ApiClientError
      ? cause.message
      : 'ບໍ່ສາມາດເລືອກທຸລະກິດນີ້ໄດ້'
  } finally {
    selectingId.value = null
  }
}

const signOut = async () => {
  await auth.logout()
  await navigateTo('/login')
}
</script>

<template>
  <div class="relative mx-auto flex min-h-screen max-w-4xl flex-col px-5 py-8 sm:px-8 sm:py-12">
    <div class="flex items-center justify-between">
      <AppMark />
      <button type="button" class="focus-ring rounded-xl px-3 py-2 text-sm font-bold text-ink-500 hover:bg-white hover:text-ink-700" @click="signOut">
        ອອກຈາກລະບົບ
      </button>
    </div>

    <section class="my-auto py-14">
      <div class="mx-auto max-w-2xl text-center">
        <p class="text-sm font-extrabold tracking-[0.15em] text-brand-600 uppercase">Workspace</p>
        <h1 class="mt-4 text-4xl font-black tracking-[-0.045em] text-ink-950 sm:text-5xl">ເລືອກທຸລະກິດທີ່ຈະເຂົ້າໃຊ້</h1>
        <p class="mt-5 text-base leading-7 text-ink-500">ທ່ານຈະເຫັນສະເພາະທຸລະກິດ ແລະ ສາຂາທີ່ server ອະນຸຍາດໃຫ້ເທົ່ານັ້ນ</p>
      </div>

      <div v-if="errorMessage" role="alert" class="mx-auto mt-7 max-w-2xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ errorMessage }}
      </div>

      <div v-if="auth.memberships.length" class="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
        <button
          v-for="membership in auth.memberships"
          :key="membership.id"
          type="button"
          class="focus-ring group relative overflow-hidden rounded-3xl border border-ink-950/8 bg-white p-6 text-left shadow-[0_12px_40px_rgb(16_37_31_/_6%)] transition hover:-translate-y-1 hover:border-brand-500/35 hover:shadow-[0_20px_50px_rgb(16_37_31_/_10%)] disabled:cursor-wait disabled:opacity-60"
          :disabled="Boolean(selectingId)"
          @click="select(membership.businessId)"
        >
          <span class="absolute -top-7 -right-7 size-24 rounded-full bg-brand-100/65 transition group-hover:scale-125" />
          <span class="relative grid size-12 place-items-center rounded-2xl bg-brand-700 text-lg font-black text-white">
            {{ membership.business.name.trim().charAt(0).toUpperCase() }}
          </span>
          <span class="relative mt-5 block text-lg font-extrabold text-ink-950">{{ membership.business.name }}</span>
          <span class="relative mt-2 flex items-center justify-between text-xs font-semibold text-ink-500">
            <span>{{ membership.business.currencyCode }} · {{ membership.business.timezone }}</span>
            <LoadingSpinner v-if="selectingId === membership.businessId" class="text-brand-600" />
            <svg v-else class="size-5 text-brand-600 transition group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M14 7l5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        </button>
      </div>

      <div v-else class="mx-auto mt-10 max-w-xl rounded-3xl border border-amber-200 bg-amber-50 p-7 text-center">
        <p class="font-extrabold text-amber-900">ບັນຊີນີ້ຍັງບໍ່ມີທຸລະກິດທີ່ເປີດໃຊ້ງານ</p>
        <p class="mt-2 text-sm leading-6 text-amber-800">ກະລຸນາຕິດຕໍ່ຜູ້ດູແລລະບົບເພື່ອເພີ່ມ membership.</p>
      </div>
    </section>
  </div>
</template>
