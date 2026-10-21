<script setup lang="ts">
import { ApiClientError } from '~/services/api-client'

definePageMeta({ layout: 'auth' })
useHead({ title: 'ເຂົ້າລະບົບ · SmeFlow' })

const auth = useAuthStore()
const identifier = ref('')
const password = ref('')
const showPassword = ref(false)
const submitting = ref(false)
const errorMessage = ref('')

const friendlyError = (cause: unknown): string => {
  if (!(cause instanceof ApiClientError)) return 'ເກີດຂໍ້ຜິດພາດ ກະລຸນາລອງໃໝ່'
  if (cause.code === 'INVALID_CREDENTIALS') return 'ອີເມວ, ເບີໂທ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ'
  if (cause.code === 'VALIDATION_FAILED') return 'ກະລຸນາກວດຂໍ້ມູນທີ່ປ້ອນໃຫ້ຄົບຖ້ວນ'
  if (cause.statusCode === 429) return 'ທ່ານລອງເຂົ້າລະບົບຫຼາຍຄັ້ງເກີນໄປ ກະລຸນາລໍຖ້າໜ້ອຍໜຶ່ງ'
  return cause.message
}

const submit = async () => {
  errorMessage.value = ''
  submitting.value = true
  try {
    const destination = await auth.login(identifier.value, password.value)
    await navigateTo(destination)
  } catch (cause) {
    errorMessage.value = friendlyError(cause)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="relative mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-5 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-12">
    <!-- Left Hero Branding -->
    <section class="hidden max-w-xl pl-4 lg:block">
      <AppMark />

      <div class="mt-14 inline-flex items-center gap-2 rounded-full border border-[#5b4cf5]/20 bg-[#5b4cf5]/5 px-3.5 py-1.5 text-xs font-bold tracking-wide text-[#5b4cf5] shadow-2xs backdrop-blur-md">
        <span class="relative flex size-2">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5b4cf5] opacity-75" />
          <span class="relative inline-flex size-2 rounded-full bg-[#5b4cf5]" />
        </span>
        ຈັດການທຸລະກິດໃນບ່ອນດຽວ
      </div>

      <h1 class="mt-6 text-[3.5rem] leading-[1.12] font-black tracking-[-0.04em] text-ink-950">
        ເຫັນພາບລວມ.<br>
        <span class="bg-gradient-to-r from-[#5b4cf5] via-[#6d5dfc] to-[#4a3bd9] bg-clip-text text-transparent">ຕັດສິນໃຈໄດ້ໄວ.</span>
      </h1>

      <p class="mt-6 max-w-lg text-[1rem] leading-relaxed text-ink-700">
        ພື້ນທີ່ເຮັດວຽກທີ່ປອດໄພສຳລັບທີມງານ SME — ແຍກຂໍ້ມູນຂອງແຕ່ລະທຸລະກິດ ແລະ ສາຂາຢ່າງຊັດເຈນ.
      </p>

      <div class="mt-10 grid max-w-lg grid-cols-3 gap-3.5">
        <div
          v-for="item in [
            { title: 'ປອດໄພສູງ', desc: 'ແຍກຂໍ້ມູນລະດັບ Tenant' },
            { title: 'ຫຼາຍສາຂາ', desc: 'ຈັດການສາງ & ການຂາຍ' },
            { title: 'ເຮັດວຽກໄວ', desc: 'ລະບົບ Real-time POS' },
          ]"
          :key="item.title"
          class="rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white hover:shadow-card"
        >
          <div class="mb-3 flex size-8 items-center justify-center rounded-xl bg-[#5b4cf5]/10 text-[#5b4cf5]">
            <AdminIcon name="check" class="size-4" />
          </div>
          <p class="text-xs font-black text-ink-950">{{ item.title }}</p>
          <p class="mt-0.5 text-[0.65rem] text-ink-500">{{ item.desc }}</p>
        </div>
      </div>
    </section>

    <!-- Right Login Card -->
    <section class="surface-shadow mx-auto w-full max-w-[29.5rem] rounded-[2.25rem] border border-white/90 bg-white/95 p-7 shadow-pop backdrop-blur-xl sm:p-10 lg:mr-4">
      <div class="mb-8 lg:hidden">
        <AppMark />
      </div>

      <p class="text-xs font-black tracking-[0.18em] text-[#5b4cf5] uppercase">Welcome back</p>
      <h2 class="mt-2 text-3xl font-black tracking-tight text-ink-950">ເຂົ້າລະບົບ</h2>
      <p class="mt-2 text-xs leading-5 text-ink-500">ປ້ອນອີເມວ ຫຼື ເບີໂທທີ່ໄດ້ລົງທະບຽນໄວ້ໃນລະບົບ</p>

      <form class="mt-7 space-y-4.5" novalidate @submit.prevent="submit">
        <div>
          <label for="identifier" class="mb-1.5 block text-xs font-black text-ink-950">ອີເມວ ຫຼື ເບີໂທ</label>
          <div class="relative">
            <svg class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M4 7.5 12 13l8-5.5M5.5 19h13A1.5 1.5 0 0 0 20 17.5v-11A1.5 1.5 0 0 0 18.5 5h-13A1.5 1.5 0 0 0 4 6.5v11A1.5 1.5 0 0 0 5.5 19Z" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <input
              id="identifier"
              v-model="identifier"
              name="identifier"
              type="text"
              autocomplete="username"
              required
              maxlength="254"
              placeholder="name@business.com"
              class="focus-ring h-12 w-full rounded-2xl border border-line bg-canvas/40 pr-4 pl-10 text-xs text-ink-950 placeholder:text-slate-400 transition hover:bg-white focus:border-[#5b4cf5] focus:bg-white focus:outline-none"
            >
          </div>
        </div>

        <div>
          <div class="mb-1.5 flex items-center justify-between">
            <label for="password" class="text-xs font-black text-ink-950">ລະຫັດຜ່ານ</label>
            <span class="text-[0.68rem] font-semibold text-slate-400">ຢ່າແບ່ງປັນໃຫ້ຜູ້ອື່ນ</span>
          </div>
          <div class="relative">
            <svg class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" stroke-linecap="round" />
            </svg>
            <input
              id="password"
              v-model="password"
              name="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              required
              maxlength="128"
              placeholder="••••••••••••"
              class="focus-ring h-12 w-full rounded-2xl border border-line bg-canvas/40 pr-11 pl-10 text-xs text-ink-950 placeholder:text-slate-400 transition hover:bg-white focus:border-[#5b4cf5] focus:bg-white focus:outline-none"
            >
            <button
              type="button"
              class="focus-ring absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-xl text-slate-400 hover:bg-canvas hover:text-slate-700 transition"
              :aria-label="showPassword ? 'ເຊື່ອງລະຫັດຜ່ານ' : 'ສະແດງລະຫັດຜ່ານ'"
              @click="showPassword = !showPassword"
            >
              <svg v-if="!showPassword" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="m3 3 18 18M10.5 10.677a2 2 0 0 0 2.823 2.823M7.362 7.561C5.68 8.74 4.279 10.42 2 12c1.889 2.991 5.282 6 10 6 1.55 0 3.043-.327 4.395-.94M9.88 4.254A11.085 11.085 0 0 1 12 4c4.718 0 8.111 3.009 10 6a18.24 18.24 0 0 1-2.906 3.659" />
              </svg>
            </button>
          </div>
        </div>

        <div v-if="errorMessage" role="alert" class="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-700">
          <AdminIcon name="alert" class="size-4 shrink-0 text-rose-600" />
          <span>{{ errorMessage }}</span>
        </div>

        <button
          type="submit"
          class="focus-ring flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#5b4cf5] px-5 text-xs font-black text-white shadow-[0_8px_24px_rgba(91,76,245,0.35)] transition-all hover:bg-[#4a3bd9] hover:shadow-[0_12px_28px_rgba(91,76,245,0.45)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 cursor-pointer"
          :disabled="submitting || !identifier.trim() || !password"
        >
          <LoadingSpinner v-if="submitting" class="size-4" />
          <span>{{ submitting ? 'ກຳລັງກວດສອບ...' : 'ເຂົ້າສູ່ພື້ນທີ່ເຮັດວຽກ' }}</span>
          <AdminIcon v-if="!submitting" name="chevron-right" class="size-4" />
        </button>
      </form>

      <div class="mt-7 flex items-center gap-3 text-[0.68rem] text-slate-400">
        <span class="h-px flex-1 bg-line" />
        <span>Protected session · Tenant isolated</span>
        <span class="h-px flex-1 bg-line" />
      </div>

      <p class="mt-5 text-center text-xs text-slate-500">
        ບໍ່ມີບັນຊີ?
        <NuxtLink to="/register" class="font-extrabold text-[#5b4cf5] hover:text-[#4a3bd9] hover:underline">
          ສ້າງທຸລະກິດໃໝ່
        </NuxtLink>
      </p>
    </section>
  </div>
</template>
