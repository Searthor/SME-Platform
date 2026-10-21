<script setup lang="ts">
import { errorMessage } from '~/utils/errors'
const api = useApiClient()
const route = useRoute()
const toast = useToast()

definePageMeta({
  layout: 'default',
})

useHead({
  title: 'ສັ່ງຊື້ສິນຄ້າເຂົ້າຮ້ານ - SME Platform',
})

type PurchaseListItem = {
  id: string
  purchaseNumber: string
  supplierId: string
  branchId: string
  warehouseId: string
  supplier: { id: string; code: string; name: string; phone: string | null }
  branch: { id: string; code: string; name: string }
  warehouse: { id: string; code: string; name: string }
  lifecycleStatus: 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'
  currencyCode: string
  subtotal: string
  taxAmount: string
  grandTotal: string
  paidAmount: string
  remainingDebt: string
  itemCount: number
  receiptCount: number
  notes: string | null
  orderedAt: string | null
  expectedAt: string | null
  createdAt: string
  updatedAt: string
}

type SupplierOption = { id: string; name: string; code: string }

const loading = ref(true)
const purchases = ref<PurchaseListItem[]>([])
const suppliers = ref<SupplierOption[]>([])

const search = ref('')
const supplierFilter = ref<string>((route.query.supplierId as string) || '')
const lifecycleFilter = ref<string>('')
const paymentFilter = ref<string>('')

// Quick Payment Modal
const paymentModal = ref(false)
const selectedPurchaseForPayment = ref<PurchaseListItem | null>(null)
const paymentForm = reactive({
  amount: '',
  method: 'CASH' as 'CASH' | 'BANK_TRANSFER',
  reference: '',
  notes: '',
})
const recordingPayment = ref(false)

const fetchSuppliers = async () => {
  try {
    const res = await api.get<{ items: SupplierOption[] }>('/suppliers?limit=100')
    suppliers.value = res.items
  }
  catch {
    // fallback
  }
}

const fetchPurchases = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (search.value) params.set('search', search.value)
    if (supplierFilter.value) params.set('supplierId', supplierFilter.value)
    if (lifecycleFilter.value) params.set('lifecycleStatus', lifecycleFilter.value)
    if (paymentFilter.value) params.set('paymentStatus', paymentFilter.value)
    params.set('limit', '100')

    const res = await api.get<{ items: PurchaseListItem[]; total: number }>(`/purchases?${params.toString()}`)
    purchases.value = res.items
  }
  catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດດຶງລາຍການສັ່ງຊື້ໄດ້'))
  }
  finally {
    loading.value = false
  }
}

// Stats
const totalOrdersCount = computed(() => purchases.value.length)
const pendingReceiptCount = computed(() =>
  purchases.value.filter(p => p.lifecycleStatus === 'ORDERED' || p.lifecycleStatus === 'PARTIALLY_RECEIVED').length,
)
const totalPurchasesAmount = computed(() =>
  purchases.value.reduce((acc, p) => acc + Number(p.grandTotal || 0), 0),
)
const totalOutstandingDebt = computed(() =>
  purchases.value
    .filter(p => p.lifecycleStatus !== 'CANCELLED')
    .reduce((acc, p) => acc + Number(p.remainingDebt || 0), 0),
)

const formatMoney = (val: number | string) => {
  const num = typeof val === 'string' ? Number(val) : val
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(num || 0))
}

const formatDate = (iso: string | null) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('lo-LA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const openPaymentModal = (p: PurchaseListItem) => {
  selectedPurchaseForPayment.value = p
  paymentForm.amount = String(Math.round(Number(p.remainingDebt || 0)))
  paymentForm.method = 'CASH'
  paymentForm.reference = ''
  paymentForm.notes = ''
  paymentModal.value = true
}

const submitPayment = async () => {
  if (!selectedPurchaseForPayment.value) return
  const amountNum = Number(paymentForm.amount)
  if (!amountNum || amountNum <= 0) {
    toast.warning('ກະລຸນາປ້ອນຈຳນວນເງິນ', 'ຈຳນວນເງິນຕ້ອງຫຼາຍກວ່າ 0')
    return
  }

  recordingPayment.value = true
  try {
    await api.post(`/purchases/${selectedPurchaseForPayment.value.id}/payments`, {
      amount: String(amountNum),
      method: paymentForm.method,
      reference: paymentForm.reference.trim() || undefined,
      notes: paymentForm.notes.trim() || undefined,
    })
    toast.success('ສຳເລັດ', 'ບັນທຶກການຊຳລະເງິນຕັດໜີ້ຮຽບຮ້ອຍແລ້ວ')
    paymentModal.value = false
    await fetchPurchases()
  }
  catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດຊຳລະເງິນໄດ້'))
  }
  finally {
    recordingPayment.value = false
  }
}

onMounted(() => {
  fetchSuppliers()
  fetchPurchases()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900">
          ສັ່ງຊື້ສິນຄ້າເຂົ້າຮ້ານ (Purchase Orders)
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          ບັນທຶກການສັ່ງຊື້, ຕິດຕາມການກວດຮັບເຄື່ອງເຂົ້າສາງ, ແລະ ຊຳລະສະສາງໜີ້ສິນຜູ້ສະໜອງ
        </p>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink
          to="/suppliers"
          class="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-canvas transition"
        >
          <AdminIcon name="truck" class="size-4 text-slate-500" />
          <span>ຈັດການຜູ້ຈຳໜ່າຍ</span>
        </NuxtLink>
        <NuxtLink
          to="/purchases/new"
          class="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700"
        >
          <AdminIcon name="plus" class="size-4" />
          <span>ສ້າງໃບສັ່ງຊື້ໃໝ່ (+ PO)</span>
        </NuxtLink>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl border border-line bg-white p-4 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase text-slate-400">ໃບສັ່ງຊື້ທັງໝົດ</span>
          <span class="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <AdminIcon name="cart" class="size-4.5" />
          </span>
        </div>
        <p class="mt-3 text-2xl font-black text-slate-900">{{ totalOrdersCount }}</p>
        <span class="mt-1 block text-[0.72rem] text-slate-400">ລາຍການໃບສັ່ງຊື້ທັງໝົດ</span>
      </div>

      <div class="rounded-2xl border border-line bg-white p-4 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase text-amber-600">ລໍຖ້າຮັບສິນຄ້າ</span>
          <span class="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <AdminIcon name="box" class="size-4.5" />
          </span>
        </div>
        <p class="mt-3 text-2xl font-black text-amber-600">{{ pendingReceiptCount }}</p>
        <span class="mt-1 block text-[0.72rem] text-slate-400">ລາຍການຍັງບໍ່ໄດ້ຮັບ ຫຼື ຮັບບາງສ່ວນ</span>
      </div>

      <div class="rounded-2xl border border-line bg-white p-4 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase text-slate-400">ມູນຄ່າສັ່ງຊື້ລວມ</span>
          <span class="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <AdminIcon name="chart" class="size-4.5" />
          </span>
        </div>
        <p class="mt-3 text-2xl font-black text-slate-900">{{ formatMoney(totalPurchasesAmount) }} <span class="text-xs font-medium text-slate-400">LAK</span></p>
        <span class="mt-1 block text-[0.72rem] text-slate-400">ມູນຄ່າໃບສັ່ງຊື້ທັງໝົດ</span>
      </div>

      <div class="rounded-2xl border border-line bg-white p-4 shadow-xs">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold uppercase text-rose-600">ຍອດຕິດໜີ້ (ຕ້ອງຊຳລະ)</span>
          <span class="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-600">
            <AdminIcon name="wallet" class="size-4.5" />
          </span>
        </div>
        <p class="mt-3 text-2xl font-black text-rose-600">{{ formatMoney(totalOutstandingDebt) }} <span class="text-xs font-medium text-slate-400">LAK</span></p>
        <span class="mt-1 block text-[0.72rem] text-rose-700/80 font-medium">ໜີ້ສິນຄ້າງຊຳລະຜູ້ສະໜອງ</span>
      </div>
    </div>

    <!-- Filters & Search -->
    <div class="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
      <div class="relative w-full max-w-sm">
        <AdminIcon name="search" class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input
          v-model="search"
          type="search"
          placeholder="ຄົ້ນຫາເລກ PO, ຜູ້ຈຳໜ່າຍ..."
          class="h-9.5 w-full rounded-xl border border-line bg-canvas/40 pr-4 pl-9 text-xs text-ink-950 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none"
          @input="fetchPurchases"
        >
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model="supplierFilter"
          class="h-9.5 rounded-xl border border-line bg-canvas/40 px-3 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:bg-white focus:outline-none"
          @change="fetchPurchases"
        >
          <option value="">ຜູ້ຈຳໜ່າຍທັງໝົດ</option>
          <option v-for="sup in suppliers" :key="sup.id" :value="sup.id">
            {{ sup.name }}
          </option>
        </select>

        <select
          v-model="lifecycleFilter"
          class="h-9.5 rounded-xl border border-line bg-canvas/40 px-3 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:bg-white focus:outline-none"
          @change="fetchPurchases"
        >
          <option value="">ສະຖານະການຮັບ (ທັງໝົດ)</option>
          <option value="ORDERED">ສັ່ງຊື້ແລ້ວ (ເຄື່ອງຍັງບໍ່ຮອດ)</option>
          <option value="PARTIALLY_RECEIVED">ຮັບເຄື່ອງບາງສ່ວນ</option>
          <option value="RECEIVED">ຮັບເຄື່ອງຄົບແລ້ວ</option>
          <option value="CANCELLED">ຍົກເລີກແລ້ວ</option>
        </select>

        <select
          v-model="paymentFilter"
          class="h-9.5 rounded-xl border border-line bg-canvas/40 px-3 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:bg-white focus:outline-none"
          @change="fetchPurchases"
        >
          <option value="">ສະຖານະການເງິນ (ທັງໝົດ)</option>
          <option value="UNPAID">ຕິດໜີ້ (ຍັງບໍ່ຈ່າຍ)</option>
          <option value="PARTIALLY_PAID">ຊຳລະບາງສ່ວນ</option>
          <option value="PAID">ຊຳລະຄົບແລ້ວ</option>
        </select>
      </div>
    </div>

    <!-- Purchases Table -->
    <div class="overflow-hidden rounded-2xl border border-line bg-white shadow-xs">
      <div v-if="loading" class="flex flex-col items-center justify-center py-16">
        <LoadingSpinner class="size-8 text-brand-600" />
        <p class="mt-3 text-xs text-slate-400 font-medium">ກຳລັງໂຫລດຂໍ້ມູນການສັ່ງຊື້...</p>
      </div>

      <div v-else-if="purchases.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
        <div class="grid size-12 place-items-center rounded-2xl bg-canvas text-slate-400">
          <AdminIcon name="cart" class="size-6" />
        </div>
        <p class="mt-3 text-sm font-bold text-slate-700">ບໍ່ພົບໃບສັ່ງຊື້ສິນຄ້າ</p>
        <p class="mt-1 text-xs text-slate-400">ເລີ່ມຕົ້ນສ້າງໃບສັ່ງຊື້ສິນຄ້າເຂົ້າຮ້ານ/ສາງຂອງທ່ານ</p>
        <NuxtLink
          to="/purchases/new"
          class="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
        >
          + ສ້າງໃບສັ່ງຊື້ໃໝ່
        </NuxtLink>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-line bg-canvas/60 text-[0.68rem] font-black uppercase text-slate-500 tracking-wider">
              <th class="py-3 px-4">ເລກທີ PO & ວັນທີ</th>
              <th class="py-3 px-4">ຜູ້ຈຳໜ່າຍ</th>
              <th class="py-3 px-4">ສາງປາຍທາງ</th>
              <th class="py-3 px-4 text-center">ຈຳນວນລາຍການ</th>
              <th class="py-3 px-4 text-right">ຍອດລວມ</th>
              <th class="py-3 px-4 text-right">ຕິດໜີ້</th>
              <th class="py-3 px-4 text-center">ການກວດຮັບ</th>
              <th class="py-3 px-4 text-center">ການຈ່າຍເງິນ</th>
              <th class="py-3 px-4 text-right">ຈັດການ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line font-medium text-slate-700">
            <tr v-for="p in purchases" :key="p.id" class="transition hover:bg-slate-50/70">
              <td class="py-3 px-4">
                <NuxtLink :to="`/purchases/${p.id}`" class="block font-bold font-mono text-brand-600 hover:underline">
                  {{ p.purchaseNumber }}
                </NuxtLink>
                <span class="text-[0.65rem] text-slate-400">{{ formatDate(p.createdAt) }}</span>
              </td>
              <td class="py-3 px-4">
                <span class="block font-bold text-slate-900">{{ p.supplier.name }}</span>
                <span class="text-[0.68rem] text-slate-500">{{ p.supplier.phone || p.supplier.code }}</span>
              </td>
              <td class="py-3 px-4">
                <span class="block font-medium text-slate-800">{{ p.warehouse.name }}</span>
                <span class="text-[0.68rem] text-slate-400">{{ p.branch.name }}</span>
              </td>
              <td class="py-3 px-4 text-center">
                <span class="rounded-md bg-canvas px-2 py-1 font-mono font-bold text-slate-700">
                  {{ p.itemCount }} ລາຍການ
                </span>
              </td>
              <td class="py-3 px-4 text-right font-mono font-bold text-slate-900">
                {{ formatMoney(p.grandTotal) }} <span class="text-[0.65rem] text-slate-400 font-sans">LAK</span>
              </td>
              <td class="py-3 px-4 text-right font-mono font-bold">
                <span
                  v-if="Number(p.remainingDebt) > 0"
                  class="inline-block rounded-md bg-rose-50 px-2 py-0.5 text-rose-700 border border-rose-200/60"
                >
                  {{ formatMoney(p.remainingDebt) }}
                </span>
                <span v-else class="text-emerald-600">0</span>
              </td>
              <td class="py-3 px-4 text-center">
                <span
                  v-if="p.lifecycleStatus === 'RECEIVED'"
                  class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[0.65rem] font-bold text-emerald-700 border border-emerald-200/60"
                >
                  <span class="size-1.5 rounded-full bg-emerald-500" />
                  ຮັບຄົບແລ້ວ
                </span>
                <span
                  v-else-if="p.lifecycleStatus === 'PARTIALLY_RECEIVED'"
                  class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[0.65rem] font-bold text-blue-700 border border-blue-200/60"
                >
                  <span class="size-1.5 rounded-full bg-blue-500" />
                  ຮັບບາງສ່ວນ
                </span>
                <span
                  v-else-if="p.lifecycleStatus === 'ORDERED'"
                  class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[0.65rem] font-bold text-amber-700 border border-amber-200/60"
                >
                  <span class="size-1.5 rounded-full bg-amber-500" />
                  ສັ່ງຊື້ແລ້ວ (ເຄື່ອງຍັງບໍ່ຮອດ)
                </span>
                <span
                  v-else-if="p.lifecycleStatus === 'CANCELLED'"
                  class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[0.65rem] font-bold text-slate-500"
                >
                  ຍົກເລີກແລ້ວ
                </span>
              </td>
              <td class="py-3 px-4 text-center">
                <span
                  v-if="p.paymentStatus === 'PAID'"
                  class="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-700 border border-emerald-200/60"
                >
                  ຊຳລະຄົບແລ້ວ
                </span>
                <span
                  v-else-if="p.paymentStatus === 'PARTIALLY_PAID'"
                  class="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[0.65rem] font-bold text-indigo-700 border border-indigo-200/60"
                >
                  ຊຳລະບາງສ່ວນ
                </span>
                <span
                  v-else
                  class="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[0.65rem] font-bold text-rose-700 border border-rose-200/60"
                >
                  ຕິດໜີ້ (ຍັງບໍ່ຈ່າຍ)
                </span>
              </td>
              <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <!-- Quick Payment Button -->
                  <button
                    v-if="Number(p.remainingDebt) > 0 && p.lifecycleStatus !== 'CANCELLED'"
                    type="button"
                    title="ຊຳລະເງິນ/ຕັດໜີ້"
                    class="rounded-lg bg-emerald-50 px-2 py-1 text-[0.68rem] font-bold text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100 transition"
                    @click="openPaymentModal(p)"
                  >
                    ຈ່າຍເງິນ
                  </button>
                  <NuxtLink
                    :to="`/purchases/${p.id}`"
                    class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
                    title="ເບິ່ງລາຍລະອຽດ"
                  >
                    <AdminIcon name="eye" class="size-4" />
                  </NuxtLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Quick Payment Modal -->
    <div
      v-if="paymentModal && selectedPurchaseForPayment"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl transition">
        <div class="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h3 class="text-base font-extrabold text-slate-900">
              ຊຳລະເງິນ / ຕັດໜີ້ໃບສັ່ງຊື້
            </h3>
            <p class="text-xs text-slate-500 font-mono">{{ selectedPurchaseForPayment.purchaseNumber }} - {{ selectedPurchaseForPayment.supplier.name }}</p>
          </div>
          <button
            type="button"
            class="rounded-xl p-1 text-slate-400 hover:bg-canvas hover:text-slate-700"
            @click="paymentModal = false"
          >
            <AdminIcon name="x" class="size-5" />
          </button>
        </div>

        <form class="mt-4 space-y-3.5" @submit.prevent="submitPayment">
          <div class="rounded-2xl bg-canvas p-3 border border-line">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">ຍອດສັ່ງຊື້ທັງໝົດ:</span>
              <span class="font-bold font-mono text-slate-900">{{ formatMoney(selectedPurchaseForPayment.grandTotal) }} LAK</span>
            </div>
            <div class="flex items-center justify-between text-xs mt-1">
              <span class="text-slate-500">ຊຳລະແລ້ວ:</span>
              <span class="font-bold font-mono text-emerald-600">{{ formatMoney(selectedPurchaseForPayment.paidAmount) }} LAK</span>
            </div>
            <div class="flex items-center justify-between text-xs mt-1 pt-1 border-t border-line font-bold">
              <span class="text-rose-600">ຍອດຕິດໜີ້ຄ້າງຈ່າຍ:</span>
              <span class="font-mono text-rose-600">{{ formatMoney(selectedPurchaseForPayment.remainingDebt) }} LAK</span>
            </div>
          </div>

          <div>
            <FormattedNumberInput
              v-model="paymentForm.amount"
              label="ຈຳນວນເງິນທີ່ຊຳລະ (LAK)"
              suffix="LAK"
              placeholder="0"
              :scale="0"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ຊ່ອງທາງການຊຳລະ</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                :class="[
                  'h-9 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5',
                  paymentForm.method === 'CASH'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-line bg-white text-slate-600 hover:bg-canvas'
                ]"
                @click="paymentForm.method = 'CASH'"
              >
                <AdminIcon name="wallet" class="size-3.5" />
                <span>ເງິນສົດ (Cash)</span>
              </button>
              <button
                type="button"
                :class="[
                  'h-9 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5',
                  paymentForm.method === 'BANK_TRANSFER'
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-line bg-white text-slate-600 hover:bg-canvas'
                ]"
                @click="paymentForm.method = 'BANK_TRANSFER'"
              >
                <AdminIcon name="card" class="size-3.5" />
                <span>ໂອນຜ່ານທະນາຄານ</span>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ເລກອ້າງອີງ/ສະລິບໂອນ (Reference)</label>
            <input
              v-model="paymentForm.reference"
              type="text"
              placeholder="ເລກທຸລະກຳ BCELOne ຫຼື ເລກເຊັກ"
              class="h-9.5 w-full rounded-xl border border-line bg-canvas/30 px-3 text-xs focus:border-brand-500 focus:bg-white focus:outline-none"
            >
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ໝາຍເຫດ</label>
            <input
              v-model="paymentForm.notes"
              type="text"
              placeholder="ໝາຍເຫດການຕັດຈ່າຍ..."
              class="h-9.5 w-full rounded-xl border border-line bg-canvas/30 px-3 text-xs focus:border-brand-500 focus:bg-white focus:outline-none"
            >
          </div>

          <div class="mt-6 flex items-center justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              class="rounded-xl border border-line px-4 py-2 text-xs font-bold text-slate-600 hover:bg-canvas transition"
              @click="paymentModal = false"
            >
              ຍົກເລີກ
            </button>
            <button
              type="submit"
              :disabled="recordingPayment"
              class="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <span v-if="recordingPayment">ກຳລັງຕັດຈ່າຍ...</span>
              <span v-else>ຢືນຢັນຊຳລະເງິນ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
