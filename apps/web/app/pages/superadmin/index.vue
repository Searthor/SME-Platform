<script setup lang="ts">
import { ApiClientError, requestApi } from '~/services/api-client'
import type { PlatformSettings } from '~/types/api'

definePageMeta({ layout: 'admin' })
useHead({ title: 'ແຜງຄວບຄຸມ Superadmin' })

const auth = useAuthStore()
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const lastLoadedAt = ref<Date | null>(null)
const form = reactive({
  platformName: '',
  supportEmail: '',
  defaultLocale: 'lo',
  defaultCurrencyCode: 'LAK' as PlatformSettings['defaultCurrencyCode'],
  defaultTimezone: 'Asia/Vientiane',
  allowRegistration: true,
})
const settingsVersion = ref(0)

const today = new Intl.DateTimeFormat('lo-LA', {
  dateStyle: 'full',
  timeZone: 'Asia/Vientiane',
}).format(new Date())

const lastLoadedLabel = computed(() => lastLoadedAt.value
  ? new Intl.DateTimeFormat('lo-LA', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Vientiane',
    }).format(lastLoadedAt.value)
  : '—')

const localeLabels: Record<string, string> = {
  lo: 'ພາສາລາວ',
  en: 'English',
  th: 'ພາສາໄທ (ไทย)',
  zh: 'ພາສາຈີນ (中文)',
  vi: 'ພາສາຫວຽດ (Tiếng Việt)',
}

const localeLabel = computed(() => localeLabels[form.defaultLocale] ?? form.defaultLocale)

const applySettings = (settings: PlatformSettings) => {
  form.platformName = settings.platformName
  form.supportEmail = settings.supportEmail ?? ''
  form.defaultLocale = settings.defaultLocale
  form.defaultCurrencyCode = settings.defaultCurrencyCode
  form.defaultTimezone = settings.defaultTimezone
  form.allowRegistration = settings.allowRegistration
  settingsVersion.value = settings.version
  lastLoadedAt.value = new Date()
}

const messageFrom = (cause: unknown): string => {
  if (!(cause instanceof ApiClientError)) return 'ບໍ່ສາມາດດຳເນີນການໄດ້'
  if (cause.code === 'PLATFORM_ACCESS_DENIED') return 'ບັນຊີນີ້ບໍ່ມີສິດ Superadmin'
  if (cause.code === 'INVALID_TIMEZONE') return 'Timezone ບໍ່ແມ່ນ IANA timezone ທີ່ຖືກຕ້ອງ'
  return cause.message
}

const loadSettings = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const settings = await requestApi<PlatformSettings>('/platform/admin/settings', {
      accessToken: auth.accessToken,
    })
    applySettings(settings)
  }
  catch (cause) {
    errorMessage.value = messageFrom(cause)
  }
  finally {
    loading.value = false
  }
}

onMounted(loadSettings)

const save = async () => {
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const settings = await requestApi<PlatformSettings>('/platform/admin/settings', {
      method: 'PATCH',
      accessToken: auth.accessToken,
      body: {
        platformName: form.platformName.trim(),
        supportEmail: form.supportEmail.trim() || null,
        defaultLocale: form.defaultLocale,
        defaultCurrencyCode: form.defaultCurrencyCode,
        defaultTimezone: form.defaultTimezone.trim(),
        allowRegistration: form.allowRegistration,
      },
    })
    applySettings(settings)
    successMessage.value = 'ບັນທຶກຄ່າລະບົບແລ້ວ'
  }
  catch (cause) {
    errorMessage.value = messageFrom(cause)
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="w-full">
    <section class="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
      <div>
        <p class="flex items-center gap-2 text-[0.68rem] font-bold text-[#8a9591]">
          <span class="text-brand-500">✦</span>
          {{ today }}
        </p>
        <p class="mt-1 text-[0.68rem] text-[#7a8581]">ຈັດການຄ່າຫຼັກ ແລະກວດສະຖານະຂອງ SME Flow.</p>
      </div>
      <button type="button" class="focus-ring inline-flex h-7.5 items-center justify-center gap-1 self-start rounded-md border border-[#dfe5e2] bg-white px-2 text-[0.55rem] font-bold text-[#596560] shadow-sm hover:border-brand-500/30 hover:text-brand-700 xl:self-auto" :disabled="loading" @click="loadSettings">
        <span class="text-xs leading-none" :class="loading ? 'animate-spin' : ''">↻</span>
        {{ loading ? 'ກຳລັງໂຫຼດ...' : 'ໂຫຼດຂໍ້ມູນໃໝ່' }}
      </button>
    </section>

    <div v-if="errorMessage" role="alert" class="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{{ errorMessage }}</div>

    <div v-if="loading" class="mt-7 grid min-h-80 place-items-center rounded-2xl border border-[#e5eae7] bg-white text-brand-600 shadow-sm">
      <LoadingSpinner />
    </div>

    <template v-else>
      <section class="mt-5 overflow-hidden rounded-xl border border-[#e2e8e5] bg-white shadow-[0_6px_22px_rgb(20_43_35_/_4%)]">
        <div class="flex flex-col justify-between gap-2.5 border-b border-[#edf0ee] px-4 py-3 sm:flex-row sm:items-center sm:px-5">
          <div class="flex items-center gap-3">
            <span class="grid size-8 place-items-center rounded-lg bg-brand-100 text-brand-700">
              <AdminIcon name="activity" class="size-4" />
            </span>
            <div>
              <h2 class="text-xs font-extrabold text-[#26332f]">ສະຖານະ Platform</h2>
              <p class="mt-0.5 text-[0.66rem] text-[#929b98]">ຂໍ້ມູນ configuration ທີ່ໃຊ້ງານຢູ່ປັດຈຸບັນ</p>
            </div>
          </div>
          <div class="flex items-center gap-2 text-[0.66rem] font-bold text-[#7a8581]">
            <span class="size-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgb(16_185_129_/_10%)]" />
            ເຮັດວຽກປົກກະຕິ
            <span class="text-[#c2c8c5]">·</span>
            ອັບເດດ {{ lastLoadedLabel }}
          </div>
        </div>

        <div class="grid divide-y divide-[#edf0ee] sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-5">
          <article class="p-4">
            <div class="flex items-start justify-between">
              <span class="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-600"><AdminIcon name="shield" class="size-4" /></span>
              <span class="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[0.56rem] font-extrabold text-emerald-600">ACTIVE</span>
            </div>
            <p class="mt-3.5 text-base font-black text-[#16201d]">Superadmin</p>
            <p class="mt-0.5 text-[0.66rem] text-[#929b98]">ສິດຜູ້ຈັດການ Platform</p>
          </article>

          <article class="p-4">
            <span class="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><AdminIcon name="users" class="size-4" /></span>
            <p class="mt-3.5 text-base font-black text-[#16201d]">{{ form.allowRegistration ? 'ເປີດ' : 'ປິດ' }}</p>
            <p class="mt-0.5 text-[0.66rem] text-[#929b98]">Public registration</p>
          </article>

          <article class="p-4">
            <span class="grid size-8 place-items-center rounded-lg bg-violet-50 text-violet-600"><AdminIcon name="globe" class="size-4" /></span>
            <p class="mt-3.5 text-base font-black text-[#16201d]">{{ localeLabel }}</p>
            <p class="mt-0.5 text-[0.66rem] text-[#929b98]">ພາສາເລີ່ມຕົ້ນ</p>
          </article>

          <article class="p-4">
            <span class="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-600"><span class="text-xs font-black">₭</span></span>
            <p class="mt-3.5 text-base font-black text-[#16201d]">{{ form.defaultCurrencyCode }}</p>
            <p class="mt-0.5 text-[0.66rem] text-[#929b98]">ສະກຸນເງິນເລີ່ມຕົ້ນ</p>
          </article>

          <article class="p-4 sm:col-span-2 xl:col-span-1">
            <span class="grid size-8 place-items-center rounded-lg bg-rose-50 text-rose-500"><AdminIcon name="settings" class="size-4" /></span>
            <p class="mt-3.5 text-base font-black text-[#16201d]">v{{ settingsVersion }}</p>
            <p class="mt-0.5 text-[0.66rem] text-[#929b98]">Configuration version</p>
          </article>
        </div>
      </section>

      <form id="settings" class="mt-5 scroll-mt-24" @submit.prevent="save">
        <section class="overflow-hidden rounded-xl border border-[#e2e8e5] bg-white shadow-[0_6px_22px_rgb(20_43_35_/_4%)]">
          <div class="flex flex-col justify-between gap-2.5 border-b border-[#edf0ee] px-4 py-3.5 sm:flex-row sm:items-center sm:px-5">
            <div class="flex items-center gap-3">
              <span class="grid size-8 place-items-center rounded-lg bg-brand-100 text-brand-700"><AdminIcon name="settings" class="size-4" /></span>
              <div>
                <h2 class="text-sm font-black text-[#1c2824]">ການຕັ້ງຄ່າຫຼັກ</h2>
                <p class="mt-0.5 text-[0.66rem] text-[#929b98]">Global configuration ສຳລັບ SME Flow</p>
              </div>
            </div>
            <span class="self-start rounded-md border border-[#e2e8e5] bg-[#fafbfa] px-2 py-1 text-[0.58rem] font-extrabold text-[#7a8581] sm:self-auto">VERSION {{ settingsVersion }}</span>
          </div>

          <div class="grid lg:grid-cols-[minmax(0,1fr)_21rem]">
            <div class="p-4 sm:p-5 lg:border-r lg:border-[#edf0ee]">
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="sm:col-span-2">
                  <span class="mb-1.5 block text-[0.68rem] font-extrabold text-[#56635e]">ຊື່ລະບົບ</span>
                  <input v-model="form.platformName" required minlength="2" maxlength="120" class="admin-field">
                </label>

                <label class="sm:col-span-2">
                  <span class="mb-1.5 block text-[0.68rem] font-extrabold text-[#56635e]">Support email</span>
                  <input v-model="form.supportEmail" type="email" maxlength="254" placeholder="support@example.com" class="admin-field">
                </label>

                <label>
                  <span class="mb-1.5 block text-[0.68rem] font-extrabold text-[#56635e]">ພາສາເລີ່ມຕົ້ນ</span>
                  <select v-model="form.defaultLocale" class="admin-field bg-white">
                    <option value="lo">🇱🇦 ພາສາລາວ (Lao)</option>
                    <option value="en">🇬🇧 English (ອັງກິດ)</option>
                    <option value="th">🇹🇭 ພາສາໄທ (Thai)</option>
                    <option value="zh">🇨🇳 ພາສາຈີນ (Chinese)</option>
                    <option value="vi">🇻🇳 ພາສາຫວຽດ (Vietnamese)</option>
                  </select>
                </label>

                <label>
                  <span class="mb-1.5 block text-[0.68rem] font-extrabold text-[#56635e]">ສະກຸນເງິນ</span>
                  <select v-model="form.defaultCurrencyCode" class="admin-field bg-white">
                    <option value="LAK">LAK — ກີບ</option>
                    <option value="THB">THB — ບາດ</option>
                    <option value="USD">USD — ໂດລາ</option>
                  </select>
                </label>

                <label class="sm:col-span-2">
                  <span class="mb-1.5 block text-[0.68rem] font-extrabold text-[#56635e]">Timezone ເລີ່ມຕົ້ນ</span>
                  <input v-model="form.defaultTimezone" required maxlength="80" class="admin-field">
                  <span class="mt-2 block text-[0.68rem] text-[#9aa4a0]">ໃຊ້ IANA timezone, ຕົວຢ່າງ: Asia/Vientiane</span>
                </label>
              </div>
            </div>

            <aside class="border-t border-[#edf0ee] bg-[#fbfcfb] p-4 sm:p-5 lg:border-t-0">
              <p class="text-[0.6rem] font-extrabold tracking-[0.13em] text-brand-600 uppercase">Access policy</p>
              <label class="mt-3.5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#e2e8e5] bg-white p-3">
                <input v-model="form.allowRegistration" type="checkbox" class="mt-0.5 size-4 shrink-0 rounded border-[#ced7d3] accent-brand-700">
                <span>
                  <span class="block text-xs font-extrabold text-[#24312d]">ເປີດ public registration</span>
                  <span class="mt-1 block text-[0.64rem] leading-4.5 text-[#89938f]">ເມື່ອປິດ, backend ຈະປະຕິເສດການສະໝັກບັນຊີໃໝ່.</span>
                </span>
              </label>

              <div class="mt-3.5 rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-[0.64rem] leading-4.5 text-blue-700">
                <span class="font-extrabold">Tenant isolation:</span> Superadmin ບໍ່ໄດ້ຮັບສິດເຂົ້າຂໍ້ມູນ Business ໂດຍອັດຕະໂນມັດ.
              </div>

              <div v-if="successMessage" role="status" class="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-700">{{ successMessage }}</div>

              <button type="submit" class="focus-ring mt-3.5 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-3 text-[0.68rem] font-extrabold text-white shadow-[0_7px_18px_rgb(9_99_78_/_15%)] hover:bg-brand-600 disabled:opacity-60" :disabled="saving">
                <LoadingSpinner v-if="saving" />
                {{ saving ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກການຕັ້ງຄ່າ' }}
              </button>
            </aside>
          </div>
        </section>
      </form>
    </template>
  </div>
</template>
