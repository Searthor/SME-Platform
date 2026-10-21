<script setup lang="ts">
import { ApiClientError } from '~/services/api-client'

definePageMeta({ layout: 'auth' })
useHead({ title: 'ສ້າງທຸລະກິດໃໝ່' })

const auth = useAuthStore()
const submitting = ref(false)
const errorMessage = ref('')
const form = reactive({
  displayName: '',
  identifier: '',
  password: '',
  businessName: '',
  branchName: 'ສາຂາຫຼັກ',
  branchCode: 'MAIN',
  currencyCode: 'LAK' as 'LAK' | 'THB' | 'USD',
  timezone: 'Asia/Vientiane',
})

const messageFrom = (cause: unknown) => {
  if (!(cause instanceof ApiClientError)) return 'ບໍ່ສາມາດສ້າງທຸລະກິດໄດ້'
  if (cause.code === 'IDENTITY_ALREADY_EXISTS') return 'Email ຫຼືເບີໂທນີ້ມີບັນຊີແລ້ວ'
  if (cause.code === 'REGISTRATION_DISABLED') return 'ລະບົບປິດການສະໝັກສາທາລະນະ ກະລຸນາຕິດຕໍ່ Superadmin'
  if (cause.code === 'VALIDATION_FAILED') return 'ກະລຸນາກວດຂໍ້ມູນ ແລະໃຊ້ລະຫັດຜ່ານຢ່າງໜ້ອຍ 12 ຕົວ'
  return cause.message
}

const submit = async () => {
  submitting.value = true
  errorMessage.value = ''
  try {
    await auth.register({ ...form, branchCode: form.branchCode.trim().toUpperCase() })
    await navigateTo('/dashboard')
  } catch (cause) {
    errorMessage.value = messageFrom(cause)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="relative mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6">
    <div class="mb-6 flex items-center justify-between">
      <AppMark />
      <NuxtLink to="/login" class="rounded-lg border border-ink-950/10 bg-white px-3 py-2 text-xs font-bold text-ink-700">ເຂົ້າລະບົບ</NuxtLink>
    </div>

    <section class="rounded-3xl border border-white bg-white/95 p-6 shadow-pop backdrop-blur-xl sm:p-8">
      <p class="text-[0.68rem] font-black tracking-[0.16em] text-[#5b4cf5] uppercase">Business onboarding</p>
      <h1 class="mt-2 text-2xl font-black text-ink-950">ສ້າງພື້ນທີ່ທຸລະກິດ</h1>
      <p class="mt-1 text-xs leading-5 text-ink-500">ລະບົບຈະສ້າງ Owner, ທຸລະກິດ, ສາຂາຫຼັກ ແລະ Roles ໃນ transaction ດຽວ.</p>

      <form class="mt-6 grid gap-4 sm:grid-cols-2" @submit.prevent="submit">
        <label><span class="mb-1 block text-xs font-bold text-ink-950">ຊື່ຜູ້ໃຊ້</span><input v-model="form.displayName" required maxlength="120" class="admin-field"></label>
        <label><span class="mb-1 block text-xs font-bold text-ink-950">Email ຫຼື E.164 phone</span><input v-model="form.identifier" required maxlength="254" class="admin-field"></label>
        <label class="sm:col-span-2"><span class="mb-1 block text-xs font-bold text-ink-950">ລະຫັດຜ່ານ</span><input v-model="form.password" required minlength="12" maxlength="128" type="password" autocomplete="new-password" class="admin-field"><span class="mt-1 block text-[0.62rem] text-ink-500">ຢ່າງໜ້ອຍ 12 ຕົວ</span></label>

        <div class="sm:col-span-2 mt-1 border-t border-line pt-4"><h2 class="text-sm font-extrabold text-ink-950">ຂໍ້ມູນທຸລະກິດ</h2></div>
        <label class="sm:col-span-2"><span class="mb-1 block text-xs font-bold text-ink-950">ຊື່ທຸລະກິດ</span><input v-model="form.businessName" required maxlength="160" class="admin-field"></label>
        <label><span class="mb-1 block text-xs font-bold text-ink-950">ຊື່ສາຂາຫຼັກ</span><input v-model="form.branchName" required maxlength="160" class="admin-field"></label>
        <label><span class="mb-1 block text-xs font-bold text-ink-950">ລະຫັດສາຂາ</span><input v-model="form.branchCode" required maxlength="40" class="admin-field"></label>
        <label><span class="mb-1 block text-xs font-bold text-ink-950">ສະກຸນເງິນ</span><select v-model="form.currencyCode" class="admin-field bg-white"><option value="LAK">LAK — ກີບ</option><option value="THB">THB — ບາດ</option><option value="USD">USD — ໂດລາ</option></select></label>
        <label><span class="mb-1 block text-xs font-bold text-ink-950">Timezone</span><input v-model="form.timezone" required maxlength="80" class="admin-field"></label>

        <div v-if="errorMessage" role="alert" class="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-xs text-rose-700">{{ errorMessage }}</div>
        <button class="sm:col-span-2 flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#5b4cf5] px-5 text-xs font-black text-white shadow-[0_4px_14px_rgba(91,76,245,0.35)] transition-all hover:bg-[#4a3bd9] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer" :disabled="submitting">
          <LoadingSpinner v-if="submitting" class="size-4" />{{ submitting ? 'ກຳລັງສ້າງ...' : 'ສ້າງທຸລະກິດ ແລະເຂົ້າລະບົບ' }}
        </button>
      </form>
    </section>
  </div>
</template>
