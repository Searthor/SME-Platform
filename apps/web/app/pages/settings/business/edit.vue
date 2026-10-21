<script setup lang="ts">
import { ApiClientError } from '~/services/api-client'
import type { TenantBusiness } from '~/types/api'

useHead({ title: 'ແກ້ໄຂຂໍ້ມູນທຸລະກິດ · SmeFlow' })

const auth = useAuthStore()
const api = useApiClient()
const toast = useToast()

const loading = ref(true)
const saving = ref(false)
const activeTab = ref<'general' | 'finance' | 'contact' | 'receipt'>('general')

const form = reactive({
  // Core Business Attributes (API Supported)
  name: '',
  currencyCode: 'LAK' as 'LAK' | 'THB' | 'USD',
  timezone: 'Asia/Vientiane',

  // Comprehensive Business Profile Attributes
  legalName: '',
  category: 'RETAIL',
  description: '',
  taxId: '',
  vatEnabled: false,
  vatRate: 7,
  cashRounding: '1000',
  phone: '',
  email: '',
  website: '',
  address: '',
  receiptHeader: '',
  receiptFooter: 'ຂອບໃຈທີ່ໃຊ້ນຳບໍລິການ · ຍິນດີຕ້ອນຮັບສະເໝີ',
  receiptPrefix: 'INV-',
})

const businessCategories = [
  { value: 'RETAIL', label: 'ຮ້ານຂາຍຍ່ອຍ / ມິນິມາດ (Retail & Mini-mart)' },
  { value: 'F_AND_B', label: 'ອາຫານ ແລະ ເຄື່ອງດື່ມ (Restaurant & Cafe)' },
  { value: 'WHOLESALE', label: 'ຂາຍສົ່ງ ແລະ ກະຈາຍສິນຄ້າ (Wholesale & Distribution)' },
  { value: 'SERVICE', label: 'ການບໍລິການ ແລະ ສ້ອມແປງ (Services & Repair)' },
  { value: 'FASHION', label: 'ເສື້ອຜ້າ ແລະ ແຟຊັ່ນ (Fashion & Apparel)' },
  { value: 'PHARMACY', label: 'ຮ້ານຂາຍຢາ ແລະ ສຸຂະພາບ (Pharmacy & Health)' },
  { value: 'ELECTRONICS', label: 'ໄອທີ ແລະ ເຄື່ອງໃຊ້ໄຟຟ້າ (IT & Electronics)' },
  { value: 'OTHER', label: 'ອື່ນໆ (Other Business)' },
]

const timezoneOptions = [
  { value: 'Asia/Vientiane', label: 'Asia/Vientiane (GMT+7:00 ວຽງຈັນ, ບາງກອກ, ຮ່າໂນ້ຍ)' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (GMT+7:00 ບາງກອກ)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (GMT+8:00 ສິງກະໂປ)' },
  { value: 'UTC', label: 'UTC (Universal Coordinated Time)' },
]

const currencyOptions = [
  { value: 'LAK', label: 'LAK — ກີບລາວ (Lao Kip)' },
  { value: 'THB', label: 'THB — ບາດໄທ (Thai Baht)' },
  { value: 'USD', label: 'USD — ໂດລາສະຫະລັດ (US Dollar)' },
]

const messageFrom = (cause: unknown) =>
  cause instanceof ApiClientError ? cause.message : 'ບໍ່ສາມາດດຳເນີນການໄດ້ ກະລຸນາລອງໃໝ່'

const load = async () => {
  loading.value = true
  try {
    const data = await api.get<TenantBusiness>('/business')
    if (data) {
      form.name = data.name
      form.currencyCode = data.currencyCode as 'LAK' | 'THB' | 'USD'
      form.timezone = data.timezone

      // Prefill extended fields from localStorage for client persistence
      if (import.meta.client) {
        const ext = localStorage.getItem(`sme:biz_ext:${data.id}`)
        if (ext) {
          try {
            Object.assign(form, JSON.parse(ext))
          } catch {
            // ignore JSON parse error
          }
        }
      }
    }
  } catch (cause) {
    toast.error('ບໍ່ສາມາດໂຫຼດຂໍ້ມູນທຸລະກິດໄດ້', messageFrom(cause))
  } finally {
    loading.value = false
  }
}

onMounted(load)

const save = async () => {
  if (!form.name.trim()) {
    toast.warning('ກະລຸນາປ້ອນຊື່ທຸລະກິດ')
    activeTab.value = 'general'
    return
  }

  saving.value = true
  try {
    const updated = await api.patch<TenantBusiness>('/business', {
      name: form.name.trim(),
      currencyCode: form.currencyCode,
      timezone: form.timezone,
    })

    // Save extended profile fields in local storage cache
    if (import.meta.client && updated?.id) {
      localStorage.setItem(`sme:biz_ext:${updated.id}`, JSON.stringify({
        legalName: form.legalName,
        category: form.category,
        description: form.description,
        taxId: form.taxId,
        vatEnabled: form.vatEnabled,
        vatRate: form.vatRate,
        cashRounding: form.cashRounding,
        phone: form.phone,
        email: form.email,
        website: form.website,
        address: form.address,
        receiptHeader: form.receiptHeader,
        receiptFooter: form.receiptFooter,
        receiptPrefix: form.receiptPrefix,
      }))
    }

    await auth.loadMe()
    toast.success('ບັນທຶກຂໍ້ມູນທຸລະກິດສຳເລັດ', 'ອັບເດດໂຄງສ້າງ ແລະ ການຕັ້ງຄ່າຮຽບຮ້ອຍແລ້ວ')
    await navigateTo('/settings/business')
  } catch (cause) {
    toast.error('ບໍ່ສາມາດບັນທຶກໄດ້', messageFrom(cause))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- BREADCRUMB & HEADER -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <NuxtLink
          to="/settings/business"
          class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#5b4cf5] transition mb-2"
        >
          <AdminIcon name="chevron-left" class="size-3.5" />
          <span>ກັບໄປໜ້າຈັດການທຸລະກິດ</span>
        </NuxtLink>
        <h1 class="text-2xl font-black tracking-tight text-ink-950">
          ແກ້ໄຂຂໍ້ມູນທຸລະກິດ (Business Configuration)
        </h1>
        <p class="mt-1 text-xs text-ink-500">
          ກຳນົດຂໍ້ມູນອົງກອນ, ພາສີ, ການເງິນ, ທີ່ຢູ່ ແລະ ຮູບແບບໃບບິນໃຫ້ຄົບຖ້ວນ
        </p>
      </div>

      <div class="flex items-center gap-3">
        <BaseButton
          variant="secondary"
          to="/settings/business"
          :disabled="saving"
        >
          ຍົກເລີກ
        </BaseButton>

        <BaseButton
          variant="primary"
          :loading="saving"
          @click="save"
        >
          <template #icon>
            <AdminIcon name="check" class="size-4" />
          </template>
          ບັນທຶກການປ່ຽນແປງ
        </BaseButton>
      </div>
    </div>

    <!-- LOADING SPINNER -->
    <div v-if="loading" class="grid min-h-64 place-items-center rounded-3xl border border-line bg-white shadow-card">
      <LoadingSpinner class="size-8 text-[#5b4cf5]" />
    </div>

    <div v-else class="space-y-6">
      <!-- CONFIG NAVIGATION TABS -->
      <div class="flex overflow-x-auto rounded-2xl border border-line bg-white p-1.5 shadow-2xs gap-1.5">
        <button
          type="button"
          class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap cursor-pointer"
          :class="activeTab === 'general'
            ? 'bg-[#5b4cf5] text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-50'"
          @click="activeTab = 'general'"
        >
          <span>🏢</span>
          <span>1. ຂໍ້ມູນທົ່ວໄປ (General Profile)</span>
        </button>

        <button
          type="button"
          class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap cursor-pointer"
          :class="activeTab === 'finance'
            ? 'bg-[#5b4cf5] text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-50'"
          @click="activeTab = 'finance'"
        >
          <span>💰</span>
          <span>2. ການເງິນ & ພາສີ (Finance & Tax)</span>
        </button>

        <button
          type="button"
          class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap cursor-pointer"
          :class="activeTab === 'contact'
            ? 'bg-[#5b4cf5] text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-50'"
          @click="activeTab = 'contact'"
        >
          <span>📍</span>
          <span>3. ການຕິດຕໍ່ & ທີ່ຢູ່ (Contact & Location)</span>
        </button>

        <button
          type="button"
          class="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap cursor-pointer"
          :class="activeTab === 'receipt'
            ? 'bg-[#5b4cf5] text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-50'"
          @click="activeTab = 'receipt'"
        >
          <span>🧾</span>
          <span>4. ເວລາ & ໃບບິນ (Timezone & Receipt)</span>
        </button>
      </div>

      <!-- TAB 1: GENERAL PROFILE -->
      <section v-show="activeTab === 'general'" class="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-card space-y-6">
        <div class="border-b border-line pb-4">
          <h2 class="text-base font-black text-ink-950">1. ຂໍ້ມູນທົ່ວໄປ ແລະ ອັດຕະລັກແບຣນ (Business Identity)</h2>
          <p class="text-xs text-slate-500">ຊື່ທຸລະກິດ, ຊື່ຈົດທະບຽນ, ປະເພດອຸດສາຫະກຳ ແລະ ໂລໂກ້</p>
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <label class="sm:col-span-2 block">
            <span class="mb-1.5 block text-xs font-bold text-slate-700">
              ຊື່ທຸລະກິດ / ຊື່ທາງການຄ້າ (Business Trade Name) *
            </span>
            <input
              v-model="form.name"
              required
              maxlength="160"
              placeholder="ເຊັ່ນ: SmeFlow Mart, ຮ້ານກາເຟ ອະນຸວົງ"
              class="admin-field text-sm font-bold"
            >
            <span class="mt-1 block text-[0.65rem] text-slate-400">ຊື່ນີ້ຈະສະແດງໃນ Sidebar, ໃບບິນ ແລະ ລະບົບ POS</span>
          </label>

          <label class="block">
            <span class="mb-1.5 block text-xs font-bold text-slate-700">
              ຊື່ນິຕິບຸກຄົນ / ຊື່ຈົດທະບຽນ (Legal Registered Name)
            </span>
            <input
              v-model="form.legalName"
              maxlength="180"
              placeholder="ເຊັ່ນ: ບໍລິສັດ ເອັສເອັມອີ ໂຟລວ ຈຳກັດຜູ້ດຽວ"
              class="admin-field"
            >
            <span class="mt-1 block text-[0.65rem] text-slate-400">ສຳລັບພິມໃສ່ໃບກຳກັບພາສີ ແລະ ເອກະສານທາງການ</span>
          </label>

          <div class="block">
            <Select2
              v-model="form.category"
              :options="businessCategories"
              label="ປະເພດທຸລະກິດ (Business Category)"
              placeholder="ເລືອກປະເພດທຸລະກິດ..."
              :searchable="false"
            />
          </div>

          <label class="sm:col-span-2 block">
            <span class="mb-1.5 block text-xs font-bold text-slate-700">
              ຄຳອະທິບາຍ ຫຼື ຄຳຂວັນທຸລະກິດ (Slogan / Bio)
            </span>
            <textarea
              v-model="form.description"
              rows="3"
              maxlength="500"
              placeholder="ອະທິບາຍທຸລະກິດຂອງທ່ານໂດຍຫຍໍ້..."
              class="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#5b4cf5] focus:outline-none transition"
            />
          </label>
        </div>
      </section>

      <!-- TAB 2: FINANCE & TAX -->
      <section v-show="activeTab === 'finance'" class="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-card space-y-6">
        <div class="border-b border-line pb-4">
          <h2 class="text-base font-black text-ink-950">2. ການເງິນ ແລະ ພາສີ (Finance & Tax Configuration)</h2>
          <p class="text-xs text-slate-500">ສະກຸນເງິນຫຼັກ, ເລກປະຈຳຕົວຜູ້ເສຍອາກອນ ແລະ ການຄຳນວນອາກອນ</p>
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <div class="block">
            <Select2
              v-model="form.currencyCode"
              :options="currencyOptions"
              label="ສະກຸນເງິນຫຼັກຂອງລະບົບ (Base Currency) *"
              :searchable="false"
            />
            <span class="mt-1 block text-[0.65rem] text-slate-400">
              ໃຊ້ເປັນສະກຸນເງິນມາດຕະຖານໃນການລົງບັນຊີ ແລະ ຕັດຍອດສາງ
            </span>
          </div>

          <label class="block">
            <span class="mb-1.5 block text-xs font-bold text-slate-700">
              ເລກປະຈຳຕົວຜູ້ເສຍອາກອນ / ເລກທະບຽນວິສາຫະກິດ (Tax ID / TIN)
            </span>
            <input
              v-model="form.taxId"
              maxlength="60"
              placeholder="ເຊັ່ນ: 01-23456789-00"
              class="admin-field font-mono"
            >
            <span class="mt-1 block text-[0.65rem] text-slate-400">ສະແດງເທິງໃບຮັບເງິນ / ໃບກຳກັບພາສີ</span>
          </label>

          <!-- VAT Setting -->
          <div class="rounded-2xl border border-line p-4.5 sm:col-span-2 bg-canvas/30 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-bold text-xs text-slate-800 block">ການເກັບອາກອນມູນຄ່າເພີ່ມ (VAT Setting)</span>
                <span class="text-[0.68rem] text-slate-500">ເປີດໃຊ້ງານຫາກທຸລະກິດຂອງທ່ານເຂົ້າລະບົບອາກອນມູນຄ່າເພີ່ມ</span>
              </div>
              <input
                v-model="form.vatEnabled"
                type="checkbox"
                class="size-5 accent-[#5b4cf5] rounded cursor-pointer"
              >
            </div>

            <div v-if="form.vatEnabled" class="pt-3 border-t border-line/60 flex items-center gap-4">
              <label class="w-44 block">
                <span class="mb-1 block text-[0.68rem] font-bold text-slate-600">ອັດຕາ VAT (%)</span>
                <input
                  v-model.number="form.vatRate"
                  type="number"
                  min="0"
                  max="100"
                  class="admin-field text-center font-bold"
                >
              </label>
              <p class="text-[0.68rem] text-slate-500 pt-3">
                ອັດຕາມາດຕະຖານໃນ ສປປ ລາວ ແມ່ນ 7% ຫຼື 10% ຕາມກົດໝາຍອາກອນ
              </p>
            </div>
          </div>

          <!-- Cash Rounding Rule -->
          <label class="block">
            <span class="mb-1.5 block text-xs font-bold text-slate-700">
              ການປັດເສດເງິນສົດ (Cash Rounding Rule)
            </span>
            <select v-model="form.cashRounding" class="admin-field bg-white">
              <option value="none">ບໍ່ປັດເສດ (No Rounding)</option>
              <option value="500">ປັດເສດຫາຫຼັກ 500 ກີບ (Nearest 500 LAK)</option>
              <option value="1000">ປັດເສດຫາຫຼັກ 1,000 ກີບ (Nearest 1,000 LAK)</option>
            </select>
            <span class="mt-1 block text-[0.65rem] text-slate-400">ເໝາະສຳລັບການຖອນເງິນສົດໜ້າຮ້ານ POS</span>
          </label>
        </div>
      </section>

      <!-- TAB 3: CONTACT & LOCATION -->
      <section v-show="activeTab === 'contact'" class="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-card space-y-6">
        <div class="border-b border-line pb-4">
          <h2 class="text-base font-black text-ink-950">3. ຂໍ້ມູນການຕິດຕໍ່ ແລະ ທີ່ຢູ່ (Contact & Location)</h2>
          <p class="text-xs text-slate-500">ເບີໂທ, ອີເມວ, ຊ່ອງທາງອອນລາຍ ແລະ ທີ່ຢູ່ສຳນັກງານໃຫຍ່</p>
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-xs font-bold text-slate-700">ເບີໂທລະສັບຕິດຕໍ່ (Phone Number)</span>
            <input
              v-model="form.phone"
              maxlength="40"
              placeholder="+856 20 5555 8888"
              class="admin-field"
            >
          </label>

          <label class="block">
            <span class="mb-1.5 block text-xs font-bold text-slate-700">ອີເມວຕິດຕໍ່ (Email Address)</span>
            <input
              v-model="form.email"
              type="email"
              maxlength="120"
              placeholder="contact@business.com"
              class="admin-field"
            >
          </label>

          <label class="block">
            <span class="mb-1.5 block text-xs font-bold text-slate-700">ເວັບໄຊ ຫຼື Facebook Page</span>
            <input
              v-model="form.website"
              maxlength="200"
              placeholder="https://facebook.com/yourpage"
              class="admin-field"
            >
          </label>

          <label class="sm:col-span-2 block">
            <span class="mb-1.5 block text-xs font-bold text-slate-700">ທີ່ຢູ່ສຳນັກງານໃຫຍ່ (Headquarter Address)</span>
            <textarea
              v-model="form.address"
              rows="3"
              maxlength="300"
              placeholder="ບ້ານ, ເມືອງ, ແຂວງ (ເຊັ່ນ: ບ້ານ ດົງປ່າລານ, ເມືອງ ສີສັດຕະນາກ, ນະຄອນຫຼວງວຽງຈັນ)"
              class="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#5b4cf5] focus:outline-none transition"
            />
          </label>
        </div>
      </section>

      <!-- TAB 4: TIMEZONE & RECEIPT -->
      <section v-show="activeTab === 'receipt'" class="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-card space-y-6">
        <div class="border-b border-line pb-4">
          <h2 class="text-base font-black text-ink-950">4. ເວລາ ແລະ ໃບບິນ (Timezone & Receipt Layout)</h2>
          <p class="text-xs text-slate-500">ເຂດເວລາ IANA, ຂໍ້ຄວາມຫົວ/ທ້າຍໃບບິນ ແລະ ຄຳນຳໜ້າເລກທີເອກະສານ</p>
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <div class="sm:col-span-2 block">
            <Select2
              v-model="form.timezone"
              :options="timezoneOptions"
              label="ເຂດເວລາຂອງລະບົບ (IANA Timezone) *"
              placeholder="ເລືອກເຂດເວລາ..."
              :searchable="false"
            />
            <span class="mt-1 block text-[0.65rem] text-slate-400">
              ກຳນົດວັນທີ ແລະ ເວລາສຳລັບລາຍງານການຂາຍ, ປິດກະ POS, ແລະ Audit Trail
            </span>
          </div>

          <label class="block">
            <span class="mb-1.5 block text-xs font-bold text-slate-700">
              ຄຳນຳໜ້າເລກທີໃບບິນ (Receipt Number Prefix)
            </span>
            <input
              v-model="form.receiptPrefix"
              maxlength="20"
              placeholder="INV-, POS-, BILL-"
              class="admin-field uppercase font-mono"
            >
          </label>

          <label class="sm:col-span-2 block">
            <span class="mb-1.5 block text-xs font-bold text-slate-700">
              ຂໍ້ຄວາມຫົວໃບບິນ (Receipt Header Note)
            </span>
            <input
              v-model="form.receiptHeader"
              maxlength="200"
              placeholder="ເຊັ່ນ: ຍິນດີຕ້ອນຮັບສູ່ຮ້ານເຮົາ, ບໍລິການດ້ວຍຄວາມຈິງໃຈ"
              class="admin-field"
            >
          </label>

          <label class="sm:col-span-2 block">
            <span class="mb-1.5 block text-xs font-bold text-slate-700">
              ຂໍ້ຄວາມທ້າຍໃບບິນ (Receipt Footer Note)
            </span>
            <textarea
              v-model="form.receiptFooter"
              rows="2"
              maxlength="250"
              placeholder="ເຊັ່ນ: ຂອບໃຈທີ່ໃຊ້ນຳບໍລິການ, ສິນຄ້າຊື້ແລ້ວບໍ່ຮັບປ່ຽນຄືນ"
              class="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#5b4cf5] focus:outline-none transition"
            />
          </label>
        </div>
      </section>

      <!-- BOTTOM ACTION BAR -->
      <div class="flex items-center justify-between rounded-2xl border border-line bg-white p-4 shadow-card">
        <NuxtLink
          to="/settings/business"
          class="text-xs font-bold text-slate-500 hover:text-slate-700"
        >
          ← ຍົກເລີກ ແລະ ກັບຄືນ
        </NuxtLink>

        <BaseButton
          variant="primary"
          :loading="saving"
          @click="save"
        >
          <template #icon>
            <AdminIcon name="check" class="size-4" />
          </template>
          ບັນທຶກການປ່ຽນແປງ
        </BaseButton>
      </div>
    </div>
  </div>
</template>
