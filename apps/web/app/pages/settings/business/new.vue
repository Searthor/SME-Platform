<script setup lang="ts">
import { ApiClientError } from '~/services/api-client'
import type { TenantBusiness } from '~/types/api'

useHead({ title: 'ເພີ່ມທຸລະກິດໃໝ່ · SmeFlow' })

const auth = useAuthStore()
const api = useApiClient()
const toast = useToast()

const creating = ref(false)

const form = reactive({
  name: '',
  currencyCode: 'LAK' as 'LAK' | 'THB' | 'USD',
  timezone: 'Asia/Vientiane',
  branchCode: 'MAIN',
  branchName: 'ສາຂາຫຼັກ',
  category: 'RETAIL',
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

const currencyOptions = [
  { value: 'LAK', label: 'LAK — ກີບລາວ (Lao Kip)' },
  { value: 'THB', label: 'THB — ບາດໄທ (Thai Baht)' },
  { value: 'USD', label: 'USD — ໂດລາສະຫະລັດ (US Dollar)' },
]

const timezoneOptions = [
  { value: 'Asia/Vientiane', label: 'Asia/Vientiane (GMT+7:00 ວຽງຈັນ, ບາງກອກ, ຮ່າໂນ້ຍ)' },
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (GMT+7:00 ບາງກອກ)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (GMT+8:00 ສິງກະໂປ)' },
  { value: 'UTC', label: 'UTC (Universal Coordinated Time)' },
]

const messageFrom = (cause: unknown) =>
  cause instanceof ApiClientError ? cause.message : 'ບໍ່ສາມາດສ້າງທຸລະກິດໄດ້ ກະລຸນາລອງໃໝ່'

const createBusiness = async () => {
  if (!form.name.trim()) {
    toast.warning('ກະລຸນາປ້ອນຊື່ທຸລະກິດ')
    return
  }

  creating.value = true
  try {
    const newBiz = await api.post<TenantBusiness>('/business', {
      name: form.name.trim(),
      currencyCode: form.currencyCode,
      timezone: form.timezone,
      branchCode: form.branchCode.trim().toUpperCase() || 'MAIN',
      branchName: form.branchName.trim() || 'ສາຂາຫຼັກ',
    })

    toast.success('ສ້າງທຸລະກິດສຳເລັດ', `ສ້າງ Workspace “${newBiz.name}” ຮຽບຮ້ອຍແລ້ວ`)

    // Automatically switch to the newly created business workspace
    if (newBiz?.id) {
      await auth.selectBusiness(newBiz.id)
      await auth.loadMe()
    }

    await navigateTo('/settings/business')
  } catch (cause) {
    toast.error('ບໍ່ສາມາດສ້າງທຸລະກິດໄດ້', messageFrom(cause))
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- BREADCRUMB & HEADER -->
    <div>
      <NuxtLink
        to="/settings/business"
        class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#5b4cf5] transition mb-2"
      >
        <AdminIcon name="chevron-left" class="size-3.5" />
        <span>ກັບໄປໜ້າຈັດການທຸລະກິດ</span>
      </NuxtLink>
      <h1 class="text-2xl font-black tracking-tight text-ink-950">
        ເພີ່ມທຸລະກິດໃໝ່ (Create New Workspace)
      </h1>
      <p class="mt-1 text-xs text-ink-500">
        ສ້າງ Workspace ສຳລັບທຸລະກິດ ຫຼື ຮ້ານຄ້າໃໝ່ພາຍໃຕ້ບັນຊີຂອງທ່ານ
      </p>
    </div>

    <!-- FORM CARD -->
    <form class="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-card space-y-6" @submit.prevent="createBusiness">
      <!-- Section 1: Business Identity -->
      <div class="border-b border-line pb-4">
        <h2 class="text-base font-black text-ink-950">1. ຂໍ້ມູນທຸລະກິດ (Business Profile)</h2>
        <p class="text-xs text-slate-500">ກຳນົດຊື່, ປະເພດທຸລະກິດ, ສະກຸນເງິນ ແລະ ເຂດເວລາ</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label class="sm:col-span-2 block">
          <span class="mb-1.5 block text-xs font-bold text-slate-700">
            ຊື່ທຸລະກິດ / ຊື່ຮ້ານຄ້າ (Business Name) *
          </span>
          <input
            v-model="form.name"
            required
            maxlength="160"
            placeholder="ເຊັ່ນ: SmeFlow Express, ຮ້ານສະດວກຊື້ ດາວເຮືອງ"
            class="admin-field text-sm font-bold"
          >
          <span class="mt-1 block text-[0.65rem] text-slate-400">ຊື່ຫຼັກທີ່ຈະໃຊ້ໃນການຈັດການ ແລະ ອອກໃບບິນ</span>
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

        <div class="block">
          <Select2
            v-model="form.currencyCode"
            :options="currencyOptions"
            label="ສະກຸນເງິນຫຼັກ (Base Currency) *"
            :searchable="false"
          />
        </div>

        <div class="sm:col-span-2 lg:col-span-2 block">
          <Select2
            v-model="form.timezone"
            :options="timezoneOptions"
            label="ເຂດເວລາ (IANA Timezone) *"
            placeholder="ເລືອກເຂດເວລາ..."
            :searchable="false"
          />
        </div>
      </div>

      <!-- Section 2: Default Branch -->
      <div class="pt-2 border-b border-line pb-4">
        <h2 class="text-base font-black text-ink-950">2. ສາຂາເລີ່ມຕົ້ນ (Default Operating Branch)</h2>
        <p class="text-xs text-slate-500">ລະບົບຈະສ້າງສາຂາຫຼັກໃຫ້ອັດຕະໂນມັດ ທ່ານສາມາດເພີ່ມສາຂາອື່ນໄດ້ພາຍຫຼັງ</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class="block">
          <span class="mb-1.5 block text-xs font-bold text-slate-700">
            ລະຫັດສາຂາເລີ່ມຕົ້ນ (Branch Code) *
          </span>
          <input
            v-model="form.branchCode"
            required
            maxlength="40"
            placeholder="MAIN"
            class="admin-field uppercase font-mono"
          >
        </label>

        <label class="block">
          <span class="mb-1.5 block text-xs font-bold text-slate-700">
            ຊື່ສາຂາເລີ່ມຕົ້ນ (Branch Name) *
          </span>
          <input
            v-model="form.branchName"
            required
            maxlength="160"
            placeholder="ສາຂາຫຼັກ"
            class="admin-field"
          >
        </label>
      </div>

      <!-- Action Footer -->
      <div class="mt-8 pt-5 border-t border-line flex items-center justify-between">
        <NuxtLink
          to="/settings/business"
          class="text-xs font-bold text-slate-500 hover:text-slate-700"
        >
          ← ຍົກເລີກ
        </NuxtLink>

        <BaseButton
          variant="primary"
          type="submit"
          :loading="creating"
        >
          <template #icon>
            <AdminIcon name="plus" class="size-4" />
          </template>
          ສ້າງທຸລະກິດ ແລະ ເລີ່ມຕົ້ນໃຊ້ງານ
        </BaseButton>
      </div>
    </form>
  </div>
</template>
