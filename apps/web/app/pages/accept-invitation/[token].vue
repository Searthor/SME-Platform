<script setup lang="ts">
import { ApiClientError, requestApi } from '~/services/api-client'
import type { InvitationPreview } from '~/types/api'

definePageMeta({ layout: 'auth' })
useHead({ title: 'ຮັບຄຳເຊີນ' })

const route = useRoute()
const token = computed(() => String(route.params.token || ''))
const preview = ref<InvitationPreview | null>(null)
const loading = ref(true)
const submitting = ref(false)
const accepted = ref(false)
const errorMessage = ref('')
const form = reactive({ displayName: '', password: '' })

const messageFrom = (cause: unknown) => {
  if (!(cause instanceof ApiClientError)) return 'ບໍ່ສາມາດຮັບຄຳເຊີນໄດ້'
  if (cause.code === 'INVITATION_INVALID') return 'ຄຳເຊີນບໍ່ຖືກຕ້ອງ, ໝົດອາຍຸ ຫຼືຖືກຍົກເລີກແລ້ວ'
  if (cause.code === 'INVALID_CREDENTIALS') return 'ລະຫັດຜ່ານຂອງບັນຊີທີ່ຖືກເຊີນບໍ່ຖືກຕ້ອງ'
  if (cause.code === 'MEMBERSHIP_ALREADY_EXISTS') return 'ບັນຊີນີ້ເປັນສະມາຊິກຢູ່ແລ້ວ'
  return cause.message
}

onMounted(async () => {
  try {
    preview.value = await requestApi<InvitationPreview>(`/auth/invitations/${token.value}`)
    if (preview.value.accountExists) form.displayName = 'Existing user'
  } catch (cause) {
    errorMessage.value = messageFrom(cause)
  } finally {
    loading.value = false
  }
})

const submit = async () => {
  submitting.value = true
  errorMessage.value = ''
  try {
    await requestApi(`/auth/invitations/${token.value}/accept`, {
      method: 'POST',
      body: { displayName: form.displayName, password: form.password },
    })
    accepted.value = true
  } catch (cause) {
    errorMessage.value = messageFrom(cause)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="relative mx-auto grid min-h-screen max-w-xl place-items-center px-4 py-8">
    <section class="w-full rounded-2xl border border-white bg-white/95 p-6 shadow-xl shadow-brand-950/5 sm:p-8">
      <AppMark />
      <div v-if="loading" class="grid min-h-48 place-items-center text-brand-600"><LoadingSpinner /></div>
      <template v-else-if="accepted">
        <div class="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <h1 class="text-lg font-black text-emerald-800">ຮັບຄຳເຊີນສຳເລັດ</h1>
          <p class="mt-2 text-xs leading-5 text-emerald-700">ບັນຊີຂອງທ່ານຖືກຜູກກັບ Business ແລະສາຂາທີ່ກຳນົດແລ້ວ.</p>
          <NuxtLink to="/login" class="mt-4 inline-flex rounded-lg bg-brand-700 px-4 py-2 text-xs font-extrabold text-white">ໄປໜ້າເຂົ້າລະບົບ</NuxtLink>
        </div>
      </template>
      <template v-else-if="preview">
        <p class="mt-8 text-[0.65rem] font-extrabold tracking-[0.12em] text-brand-600 uppercase">Business invitation</p>
        <h1 class="mt-2 text-xl font-black">ເຂົ້າຮ່ວມ {{ preview.businessName }}</h1>
        <p class="mt-2 text-xs leading-5 text-ink-500">ຄຳເຊີນສຳລັບ {{ preview.normalizedIdentity }}</p>

        <form class="mt-6 space-y-4" @submit.prevent="submit">
          <label v-if="!preview.accountExists"><span class="mb-1 block text-xs font-bold">ຊື່ສະແດງ</span><input v-model="form.displayName" required maxlength="120" class="admin-field"></label>
          <label><span class="mb-1 block text-xs font-bold">{{ preview.accountExists ? 'ລະຫັດຜ່ານປັດຈຸບັນ' : 'ສ້າງລະຫັດຜ່ານ' }}</span><input v-model="form.password" required minlength="12" maxlength="128" type="password" autocomplete="current-password" class="admin-field"></label>
          <div v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{{ errorMessage }}</div>
          <button class="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 text-xs font-extrabold text-white disabled:opacity-60" :disabled="submitting"><LoadingSpinner v-if="submitting" />{{ submitting ? 'ກຳລັງຢືນຢັນ...' : 'ຮັບຄຳເຊີນ' }}</button>
        </form>
      </template>
      <div v-else class="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-xs leading-5 text-red-700">{{ errorMessage }}</div>
    </section>
  </div>
</template>
