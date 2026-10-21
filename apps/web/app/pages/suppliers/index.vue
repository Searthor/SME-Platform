<script setup lang="ts">
import { errorMessage } from '~/utils/errors'
const api = useApiClient()
const toast = useToast()

definePageMeta({
  layout: 'default',
})

useHead({
  title: 'ຜູ້ຈຳໜ່າຍສິນຄ້າ - SME Platform',
})

type SupplierItem = {
  id: string
  code: string
  name: string
  contactName: string | null
  phone: string | null
  email: string | null
  address: string | null
  taxId: string | null
  notes: string | null
  status: 'ACTIVE' | 'ARCHIVED'
  totalPurchases: string
  totalPaid: string
  outstandingDebt: string
  createdAt: string
  updatedAt: string
}

const loading = ref(true)
const saving = ref(false)
const suppliers = ref<SupplierItem[]>([])
const search = ref('')
const statusFilter = ref<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ACTIVE')

// Modal state
const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({
  code: '',
  name: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  taxId: '',
  notes: '',
})

const fetchSuppliers = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (search.value) params.set('search', search.value)
    if (statusFilter.value !== 'ALL') params.set('status', statusFilter.value)
    params.set('limit', '100')

    const res = await api.get<{ items: SupplierItem[]; total: number }>(`/suppliers?${params.toString()}`)
    suppliers.value = res.items
  }
  catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດດຶງຂໍ້ມູນຜູ້ຈຳໜ່າຍໄດ້'))
  }
  finally {
    loading.value = false
  }
}

// Stats
const totalSuppliersCount = computed(() => suppliers.value.length)
const totalPurchasesSum = computed(() =>
  suppliers.value.reduce((acc, s) => acc + Number(s.totalPurchases || 0), 0),
)
const totalPaidSum = computed(() =>
  suppliers.value.reduce((acc, s) => acc + Number(s.totalPaid || 0), 0),
)
const totalDebtSum = computed(() =>
  suppliers.value.reduce((acc, s) => acc + Number(s.outstandingDebt || 0), 0),
)

const formatMoney = (val: number | string) => {
  const num = typeof val === 'string' ? Number(val) : val
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(num || 0))
}

const openCreateModal = () => {
  isEditing.value = false
  editingId.value = null
  const randomSuffix = Math.floor(100 + Math.random() * 900)
  form.code = `SUP-${randomSuffix}`
  form.name = ''
  form.contactName = ''
  form.phone = ''
  form.email = ''
  form.address = ''
  form.taxId = ''
  form.notes = ''
  showModal.value = true
}

const openEditModal = (supplier: SupplierItem) => {
  isEditing.value = true
  editingId.value = supplier.id
  form.code = supplier.code
  form.name = supplier.name
  form.contactName = supplier.contactName || ''
  form.phone = supplier.phone || ''
  form.email = supplier.email || ''
  form.address = supplier.address || ''
  form.taxId = supplier.taxId || ''
  form.notes = supplier.notes || ''
  showModal.value = true
}

const submitForm = async () => {
  if (!form.code.trim() || !form.name.trim()) {
    toast.warning('ກະລຸນາປ້ອນຂໍ້ມູນ', 'ລະຫັດ ແລະ ຊື່ຜູ້ຈຳໜ່າຍແມ່ນຈຳເປັນ')
    return
  }

  saving.value = true
  try {
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      contactName: form.contactName.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      taxId: form.taxId.trim() || undefined,
      notes: form.notes.trim() || undefined,
    }

    if (isEditing.value && editingId.value) {
      await api.patch(`/suppliers/${editingId.value}`, payload)
      toast.success('ສຳເລັດ', 'ອັບເດດຂໍ້ມູນຜູ້ຈຳໜ່າຍຮຽບຮ້ອຍແລ້ວ')
    }
    else {
      await api.post('/suppliers', payload)
      toast.success('ສຳເລັດ', 'ເພີ່ມຜູ້ຈຳໜ່າຍໃໝ່ຮຽບຮ້ອຍແລ້ວ')
    }
    showModal.value = false
    await fetchSuppliers()
  }
  catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດບັນທຶກຂໍ້ມູນໄດ້'))
  }
  finally {
    saving.value = false
  }
}

const archiveSupplier = async (supplier: SupplierItem) => {
  if (!confirm(`ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການປິດໃຊ້ງານຜູ້ຈຳໜ່າຍ "${supplier.name}"?`)) return
  try {
    await api.post(`/suppliers/${supplier.id}/archive`)
    toast.success('ສຳເລັດ', 'ປິດໃຊ້ງານຜູ້ຈຳໜ່າຍຮຽບຮ້ອຍແລ້ວ')
    await fetchSuppliers()
  }
  catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດປິດໃຊ້ງານໄດ້'))
  }
}

onMounted(() => {
  fetchSuppliers()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900">
          ຜູ້ຈຳໜ່າຍສິນຄ້າ (Suppliers)
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          ຈັດການຂໍ້ມູນຜູ້ສະໜອງສິນຄ້າ, ຍອດຊື້ສະສົມ, ປະຫວັດການຊຳລະ ແລະ ຍອດໜີ້ຄ້າງຈ່າຍ
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700"
          @click="openCreateModal"
        >
          <AdminIcon name="plus" class="size-4" />
          <span>ເພີ່ມຜູ້ຈຳໜ່າຍໃໝ່</span>
        </button>
      </div>
    </div>

    <!-- KPI Stats Cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl border border-line bg-white p-4 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase text-slate-400">ຜູ້ຈຳໜ່າຍທັງໝົດ</span>
          <span class="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <AdminIcon name="truck" class="size-4.5" />
          </span>
        </div>
        <p class="mt-3 text-2xl font-black text-slate-900">{{ totalSuppliersCount }}</p>
        <span class="mt-1 block text-[0.72rem] text-slate-400">ລາຍການຜູ້ສະໜອງໃນລະບົບ</span>
      </div>

      <div class="rounded-2xl border border-line bg-white p-4 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase text-slate-400">ຍອດສັ່ງຊື້ລວມ</span>
          <span class="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <AdminIcon name="cart" class="size-4.5" />
          </span>
        </div>
        <p class="mt-3 text-2xl font-black text-slate-900">{{ formatMoney(totalPurchasesSum) }} <span class="text-xs font-medium text-slate-400">LAK</span></p>
        <span class="mt-1 block text-[0.72rem] text-slate-400">ມູນຄ່າການສັ່ງຊື້ທັງໝົດ</span>
      </div>

      <div class="rounded-2xl border border-line bg-white p-4 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase text-slate-400">ຊຳລະແລ້ວ</span>
          <span class="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <AdminIcon name="check" class="size-4.5" />
          </span>
        </div>
        <p class="mt-3 text-2xl font-black text-emerald-600">{{ formatMoney(totalPaidSum) }} <span class="text-xs font-medium text-slate-400">LAK</span></p>
        <span class="mt-1 block text-[0.72rem] text-slate-400">ຍອດທີ່ໄດ້ຈ່າຍອອກແລ້ວ</span>
      </div>

      <div class="rounded-2xl border border-line bg-white p-4 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase text-amber-600">ຍອດໜີ້ຄ້າງຊຳລະ (ຕິດໜີ້)</span>
          <span class="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <AdminIcon name="wallet" class="size-4.5" />
          </span>
        </div>
        <p class="mt-3 text-2xl font-black text-amber-600">{{ formatMoney(totalDebtSum) }} <span class="text-xs font-medium text-slate-400">LAK</span></p>
        <span class="mt-1 block text-[0.72rem] text-amber-700/80 font-medium">ໜີ້ສິນທີ່ຕ້ອງຊຳລະສະສາງ</span>
      </div>
    </div>

    <!-- Filters & Search -->
    <div class="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
      <div class="relative w-full max-w-sm">
        <AdminIcon name="search" class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input
          v-model="search"
          type="search"
          placeholder="ຄົ້ນຫາຊື່, ລະຫັດ, ເບີໂທ..."
          class="h-9.5 w-full rounded-xl border border-line bg-canvas/40 pr-4 pl-9 text-xs text-ink-950 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none"
          @input="fetchSuppliers"
        >
      </div>

      <div class="flex items-center gap-2">
        <select
          v-model="statusFilter"
          class="h-9.5 rounded-xl border border-line bg-canvas/40 px-3 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:bg-white focus:outline-none"
          @change="fetchSuppliers"
        >
          <option value="ACTIVE">ສະເພາະທີ່ໃຊ້ງານຢູ່ (Active)</option>
          <option value="ARCHIVED">ປິດໃຊ້ງານແລ້ວ (Archived)</option>
          <option value="ALL">ທັງໝົດ (All)</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="overflow-hidden rounded-2xl border border-line bg-white shadow-xs">
      <div v-if="loading" class="flex flex-col items-center justify-center py-16">
        <LoadingSpinner class="size-8 text-brand-600" />
        <p class="mt-3 text-xs text-slate-400 font-medium">ກຳລັງໂຫລດຂໍ້ມູນ...</p>
      </div>

      <div v-else-if="suppliers.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="grid size-12 place-items-center rounded-2xl bg-canvas text-slate-400">
          <AdminIcon name="truck" class="size-6" />
        </div>
        <p class="mt-3 text-sm font-bold text-slate-700">ບໍ່ພົບຂໍ້ມູນຜູ້ຈຳໜ່າຍ</p>
        <p class="mt-1 text-xs text-slate-400">ເລີ່ມຕົ້ນເພີ່ມຜູ້ຈຳໜ່າຍສິນຄ້າເພື່ອບັນທຶກການສັ່ງຊື້</p>
        <button
          type="button"
          class="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
          @click="openCreateModal"
        >
          + ເພີ່ມຜູ້ຈຳໜ່າຍທຳອິດ
        </button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-line bg-canvas/60 text-[0.68rem] font-black uppercase text-slate-500 tracking-wider">
              <th class="py-3 px-4">ລະຫັດ & ຊື່ຜູ້ຈຳໜ່າຍ</th>
              <th class="py-3 px-4">ຜູ້ຕິດຕໍ່ & ເບີໂທ</th>
              <th class="py-3 px-4 text-right">ຍອດສັ່ງຊື້</th>
              <th class="py-3 px-4 text-right">ຊຳລະແລ້ວ</th>
              <th class="py-3 px-4 text-right">ຍອດຕິດໜີ້</th>
              <th class="py-3 px-4 text-center">ສະຖານະ</th>
              <th class="py-3 px-4 text-right">ຈັດການ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line font-medium text-slate-700">
            <tr v-for="s in suppliers" :key="s.id" class="transition hover:bg-slate-50/70">
              <td class="py-3 px-4">
                <div class="flex items-center gap-2.5">
                  <span class="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-xs font-black text-brand-600">
                    {{ s.name.substring(0, 1).toUpperCase() }}
                  </span>
                  <div>
                    <span class="block font-bold text-slate-900">{{ s.name }}</span>
                    <span class="text-[0.65rem] text-slate-400 font-mono">{{ s.code }}</span>
                  </div>
                </div>
              </td>
              <td class="py-3 px-4">
                <span class="block font-medium text-slate-800">{{ s.contactName || '-' }}</span>
                <span class="text-[0.68rem] text-slate-500">{{ s.phone || s.email || '-' }}</span>
              </td>
              <td class="py-3 px-4 text-right font-mono font-bold text-slate-900">
                {{ formatMoney(s.totalPurchases) }}
              </td>
              <td class="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                {{ formatMoney(s.totalPaid) }}
              </td>
              <td class="py-3 px-4 text-right font-mono font-bold">
                <span
                  v-if="Number(s.outstandingDebt) > 0"
                  class="inline-block rounded-md bg-amber-50 px-2 py-0.5 text-amber-700 border border-amber-200/60"
                >
                  {{ formatMoney(s.outstandingDebt) }} LAK
                </span>
                <span v-else class="text-slate-400">0</span>
              </td>
              <td class="py-3 px-4 text-center">
                <span
                  v-if="s.status === 'ACTIVE'"
                  class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[0.65rem] font-bold text-emerald-600 border border-emerald-200/50"
                >
                  <span class="size-1.5 rounded-full bg-emerald-500" />
                  ໃຊ້ງານຢູ່
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.65rem] font-bold text-slate-500"
                >
                  ປິດໃຊ້ງານ
                </span>
              </td>
              <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-1">
                  <NuxtLink
                    :to="`/purchases?supplierId=${s.id}`"
                    title="ເບິ່ງລາຍການສັ່ງຊື້"
                    class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 transition"
                  >
                    <AdminIcon name="cart" class="size-4" />
                  </NuxtLink>
                  <button
                    type="button"
                    title="ແກ້ໄຂ"
                    class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
                    @click="openEditModal(s)"
                  >
                    <AdminIcon name="edit" class="size-4" />
                  </button>
                  <button
                    v-if="s.status === 'ACTIVE'"
                    type="button"
                    title="ປິດໃຊ້ງານ"
                    class="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                    @click="archiveSupplier(s)"
                  >
                    <AdminIcon name="trash" class="size-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl transition">
        <div class="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h3 class="text-base font-extrabold text-slate-900">
              {{ isEditing ? 'ແກ້ໄຂຂໍ້ມູນຜູ້ຈຳໜ່າຍ' : 'ເພີ່ມຜູ້ຈຳໜ່າຍສິນຄ້າໃໝ່' }}
            </h3>
            <p class="text-xs text-slate-500">ກະລຸນາປ້ອນລາຍລະອຽດຂໍ້ມູນຕິດຕໍ່ ແລະ ເອກະສານ</p>
          </div>
          <button
            type="button"
            class="rounded-xl p-1 text-slate-400 hover:bg-canvas hover:text-slate-700"
            @click="showModal = false"
          >
            <AdminIcon name="x" class="size-5" />
          </button>
        </div>

        <form class="mt-4 space-y-3.5" @submit.prevent="submitForm">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">ລະຫັດຜູ້ຈຳໜ່າຍ <span class="text-rose-500">*</span></label>
              <input
                v-model="form.code"
                type="text"
                placeholder="SUP-001"
                class="h-9.5 w-full rounded-xl border border-line bg-canvas/30 px-3 text-xs uppercase font-mono focus:border-brand-500 focus:bg-white focus:outline-none"
                required
              >
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">ຊື່ຜູ້ຈຳໜ່າຍ/ບໍລິສັດ <span class="text-rose-500">*</span></label>
              <input
                v-model="form.name"
                type="text"
                placeholder="ຊື່ຮ້ານ ຫຼື ບໍລິສັດຄູ່ຄ້າ"
                class="h-9.5 w-full rounded-xl border border-line bg-canvas/30 px-3 text-xs focus:border-brand-500 focus:bg-white focus:outline-none"
                required
              >
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">ຊື່ຜູ້ຕິດຕໍ່ (Contact Name)</label>
              <input
                v-model="form.contactName"
                type="text"
                placeholder="ຊື່ຕົວແທນຂາຍ"
                class="h-9.5 w-full rounded-xl border border-line bg-canvas/30 px-3 text-xs focus:border-brand-500 focus:bg-white focus:outline-none"
              >
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">ເບີໂທລະສັບ</label>
              <input
                v-model="form.phone"
                type="tel"
                placeholder="020 xxxx xxxx"
                class="h-9.5 w-full rounded-xl border border-line bg-canvas/30 px-3 text-xs focus:border-brand-500 focus:bg-white focus:outline-none"
              >
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">ອີເມວ</label>
              <input
                v-model="form.email"
                type="email"
                placeholder="supplier@email.com"
                class="h-9.5 w-full rounded-xl border border-line bg-canvas/30 px-3 text-xs focus:border-brand-500 focus:bg-white focus:outline-none"
              >
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">ເລກປະຈຳຕົວຜູ້ເສຍພາສີ (Tax ID)</label>
              <input
                v-model="form.taxId"
                type="text"
                placeholder="ເລກທະບຽນວິສາຫະກິດ"
                class="h-9.5 w-full rounded-xl border border-line bg-canvas/30 px-3 text-xs focus:border-brand-500 focus:bg-white focus:outline-none"
              >
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ທີ່ຢູ່</label>
            <input
              v-model="form.address"
              type="text"
              placeholder="ບ້ານ, ເມືອງ, ແຂວງ"
              class="h-9.5 w-full rounded-xl border border-line bg-canvas/30 px-3 text-xs focus:border-brand-500 focus:bg-white focus:outline-none"
            >
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ໝາຍເຫດເພີ່ມເຕີມ</label>
            <textarea
              v-model="form.notes"
              rows="2"
              placeholder="ຂໍ້ມູນທະນາຄານ ຫຼື ເງື່ອນໄຂການຊຳລະ..."
              class="w-full rounded-xl border border-line bg-canvas/30 p-2.5 text-xs focus:border-brand-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div class="mt-6 flex items-center justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              class="rounded-xl border border-line px-4 py-2 text-xs font-bold text-slate-600 hover:bg-canvas transition"
              @click="showModal = false"
            >
              ຍົກເລີກ
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              <span v-if="saving">ກຳລັງບັນທຶກ...</span>
              <span v-else>{{ isEditing ? 'ອັບເດດ' : 'ບັນທຶກ' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
