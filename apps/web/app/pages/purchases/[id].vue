<script setup lang="ts">
const route = useRoute()
const api = useApiClient()
const toast = useToast()

definePageMeta({
  layout: 'default',
})

const purchaseId = computed(() => route.params.id as string)

type PurchaseDetail = {
  id: string
  purchaseNumber: string
  supplierId: string
  branchId: string
  warehouseId: string
  supplier: {
    id: string
    code: string
    name: string
    contactName: string | null
    phone: string | null
    email: string | null
    address: string | null
    taxId: string | null
  }
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
  notes: string | null
  orderedAt: string | null
  expectedAt: string | null
  createdAt: string
  updatedAt: string
  items: Array<{
    id: string
    variantId: string
    productName: string
    variantName: string | null
    sku: string | null
    unitName: string
    orderedQuantity: string
    receivedQuantity: string
    remainingQuantity: string
    unitCost: string
    subtotal: string
    taxAmount: string
    totalAmount: string
  }>
  goodsReceipts: Array<{
    id: string
    receiptNumber: string
    warehouseName: string
    receivedAt: string
    notes: string | null
    items: Array<{
      id: string
      variantId: string
      productName: string
      receivedQuantity: string
      unitCost: string
    }>
  }>
  payments: Array<{
    allocationId: string
    paymentId: string
    method: 'CASH' | 'BANK_TRANSFER' | 'OTHER'
    amount: string
    currencyCode: string
    paidAt: string
    reference: string | null
    notes: string | null
  }>
}

const loading = ref(true)
const purchase = ref<PurchaseDetail | null>(null)
const activeTab = ref<'items' | 'receipts' | 'payments'>('items')

// Modal: Goods Receipt
const showReceiptModal = ref(false)
const receivingGoods = ref(false)
const receiptNotes = ref('')
const receiptItemsInput = ref<Array<{ purchaseItemId: string; variantId: string; receivedQuantity: number }>>([])

// Modal: Payment
const showPaymentModal = ref(false)
const recordingPayment = ref(false)
const paymentForm = reactive({
  amount: '',
  method: 'CASH' as 'CASH' | 'BANK_TRANSFER',
  reference: '',
  notes: '',
})

useHead({
  title: computed(() => purchase.value ? `${purchase.value.purchaseNumber} - SME Platform` : 'ລາຍລະອຽດໃບສັ່ງຊື້'),
})

const fetchPurchase = async () => {
  loading.value = true
  try {
    purchase.value = await api.get<PurchaseDetail>(`/purchases/${purchaseId.value}`)
  }
  catch (err: any) {
    toast.error('ຜິດພາດ', err.message || 'ບໍ່ສາມາດດຶງຂໍ້ມູນໃບສັ່ງຊື້ໄດ້')
  }
  finally {
    loading.value = false
  }
}

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
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Open Goods Receipt Modal
const openReceiveModal = () => {
  if (!purchase.value) return
  receiptNotes.value = ''
  receiptItemsInput.value = purchase.value.items.map(item => ({
    purchaseItemId: item.id,
    variantId: item.variantId,
    receivedQuantity: Math.max(0, Number(item.remainingQuantity)),
  }))
  showReceiptModal.value = true
}

const submitReceiveGoods = async () => {
  if (!purchase.value) return
  const validItems = receiptItemsInput.value.filter(i => i.receivedQuantity > 0)
  if (validItems.length === 0) {
    toast.warning('ກະລຸນາປ້ອນຈຳນວນ', 'ຕ້ອງມີສິນຄ້າທີ່ຮັບຢ່າງໜ້ອຍ 1 ລາຍການ')
    return
  }

  receivingGoods.value = true
  try {
    await api.post(`/purchases/${purchase.value.id}/receive`, {
      warehouseId: purchase.value.warehouseId,
      notes: receiptNotes.value.trim() || undefined,
      items: validItems.map(i => ({
        purchaseItemId: i.purchaseItemId,
        variantId: i.variantId,
        receivedQuantity: String(i.receivedQuantity),
      })),
    })

    toast.success('ຮັບເຄື່ອງສຳເລັດ', 'ເພີ່ມສະຕັອກ ແລະ ສ້າງປະຫວັດການຮັບຮຽບຮ້ອຍແລ້ວ')
    showReceiptModal.value = false
    await fetchPurchase()
  }
  catch (err: any) {
    toast.error('ຜິດພາດ', err.message || 'ບໍ່ສາມາດຮັບສິນຄ້າໄດ້')
  }
  finally {
    receivingGoods.value = false
  }
}

// Open Payment Modal
const openPaymentModal = () => {
  if (!purchase.value) return
  paymentForm.amount = String(Math.round(Number(purchase.value.remainingDebt)))
  paymentForm.method = 'CASH'
  paymentForm.reference = ''
  paymentForm.notes = ''
  showPaymentModal.value = true
}

const submitPayment = async () => {
  if (!purchase.value) return
  const amountNum = Number(paymentForm.amount)
  if (!amountNum || amountNum <= 0) {
    toast.warning('ຈຳນວນເງິນບໍ່ຖືກຕ້ອງ', 'ກະລຸນາປ້ອນຈຳນວນເງິນທີ່ຫຼາຍກວ່າ 0')
    return
  }

  recordingPayment.value = true
  try {
    await api.post(`/purchases/${purchase.value.id}/payments`, {
      amount: String(amountNum),
      method: paymentForm.method,
      reference: paymentForm.reference.trim() || undefined,
      notes: paymentForm.notes.trim() || undefined,
    })

    toast.success('ຊຳລະເງິນສຳເລັດ', 'ບັນທຶກການຕັດໜີ້ສິນຮຽບຮ້ອຍແລ້ວ')
    showPaymentModal.value = false
    await fetchPurchase()
  }
  catch (err: any) {
    toast.error('ຜິດພາດ', err.message || 'ບໍ່ສາມາດຊຳລະເງິນໄດ້')
  }
  finally {
    recordingPayment.value = false
  }
}

// Cancel Purchase
const cancelPurchase = async () => {
  if (!purchase.value) return
  if (!confirm(`ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການຍົກເລີກໃບສັ່ງຊື້ ${purchase.value.purchaseNumber}?`)) return

  try {
    await api.post(`/purchases/${purchase.value.id}/cancel`)
    toast.success('ຍົກເລີກສຳເລັດ', 'ໃບສັ່ງຊື້ຖືກຍົກເລີກຮຽບຮ້ອຍແລ້ວ')
    await fetchPurchase()
  }
  catch (err: any) {
    toast.error('ຜິດພາດ', err.message || 'ບໍ່ສາມາດຍົກເລີກໃບສັ່ງຊື້ໄດ້')
  }
}

onMounted(() => {
  fetchPurchase()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Back button -->
    <div class="flex items-center gap-2">
      <NuxtLink to="/purchases" class="text-xs font-bold text-brand-600 hover:underline">
        ← ກັບຄືນໜ້າໃບສັ່ງຊື້ທັງໝົດ
      </NuxtLink>
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center py-24">
      <LoadingSpinner class="size-8 text-brand-600" />
      <p class="mt-3 text-xs text-slate-400 font-medium">ກຳລັງໂຫລດຂໍ້ມູນໃບສັ່ງຊື້...</p>
    </div>

    <div v-else-if="purchase" class="space-y-6">
      <!-- Top Banner / Action Header -->
      <div class="flex flex-col gap-4 rounded-3xl border border-line bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-2.5">
            <h1 class="text-2xl font-black font-mono tracking-tight text-slate-900">
              {{ purchase.purchaseNumber }}
            </h1>
            <!-- Lifecycle Badge -->
            <span
              v-if="purchase.lifecycleStatus === 'RECEIVED'"
              class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200/60"
            >
              <span class="size-1.5 rounded-full bg-emerald-500" />
              ຮັບເຄື່ອງຄົບແລ້ວ
            </span>
            <span
              v-else-if="purchase.lifecycleStatus === 'PARTIALLY_RECEIVED'"
              class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200/60"
            >
              <span class="size-1.5 rounded-full bg-blue-500" />
              ຮັບເຄື່ອງບາງສ່ວນ
            </span>
            <span
              v-else-if="purchase.lifecycleStatus === 'ORDERED'"
              class="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200/60"
            >
              <span class="size-1.5 rounded-full bg-amber-500" />
              ສັ່ງຊື້ແລ້ວ (ເຄື່ອງຍັງບໍ່ຮອດ)
            </span>
            <span
              v-else-if="purchase.lifecycleStatus === 'CANCELLED'"
              class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500"
            >
              ຍົກເລີກແລ້ວ
            </span>

            <!-- Payment Badge -->
            <span
              v-if="purchase.paymentStatus === 'PAID'"
              class="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200/60"
            >
              ຊຳລະຄົບແລ້ວ
            </span>
            <span
              v-else-if="purchase.paymentStatus === 'PARTIALLY_PAID'"
              class="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200/60"
            >
              ຊຳລະບາງສ່ວນ
            </span>
            <span
              v-else
              class="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 border border-rose-200/60"
            >
              ຕິດໜີ້ (ຍັງບໍ່ຈ່າຍ)
            </span>
          </div>

          <p class="mt-1 text-xs text-slate-500">
            ສ້າງເມື່ອ: {{ formatDate(purchase.createdAt) }} | ຜູ້ສັ່ງຊື້: {{ purchase.branch.name }}
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="flex flex-wrap items-center gap-2">
          <!-- Receive Button -->
          <button
            v-if="purchase.lifecycleStatus !== 'RECEIVED' && purchase.lifecycleStatus !== 'CANCELLED'"
            type="button"
            class="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700"
            @click="openReceiveModal"
          >
            <AdminIcon name="box" class="size-4" />
            <span>ຮັບສິນຄ້າເຂົ້າສາງ (Receive Goods)</span>
          </button>

          <!-- Payment Button -->
          <button
            v-if="Number(purchase.remainingDebt) > 0 && purchase.lifecycleStatus !== 'CANCELLED'"
            type="button"
            class="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
            @click="openPaymentModal"
          >
            <AdminIcon name="wallet" class="size-4" />
            <span>ຊຳລະເງິນ/ຕັດໜີ້ (Pay)</span>
          </button>

          <!-- Cancel Button -->
          <button
            v-if="purchase.lifecycleStatus === 'ORDERED' && purchase.goodsReceipts.length === 0"
            type="button"
            class="rounded-xl border border-line bg-white px-3.5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
            @click="cancelPurchase"
          >
            ຍົກເລີກໃບສັ່ງຊື້
          </button>
        </div>
      </div>

      <!-- Info Cards Grid -->
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <!-- Supplier Card -->
        <div class="rounded-3xl border border-line bg-white p-5 shadow-xs">
          <div class="flex items-center gap-2 mb-3">
            <span class="grid size-7 place-items-center rounded-lg bg-indigo-50 text-indigo-600 text-xs">
              <AdminIcon name="truck" class="size-4" />
            </span>
            <h3 class="text-xs font-bold uppercase text-slate-400">ຂໍ້ມູນຜູ້ຈຳໜ່າຍ (Supplier)</h3>
          </div>
          <p class="text-base font-extrabold text-slate-900">{{ purchase.supplier.name }}</p>
          <div class="mt-2 space-y-1 text-xs text-slate-600">
            <p v-if="purchase.supplier.contactName"><span class="text-slate-400">ຜູ້ຕິດຕໍ່:</span> {{ purchase.supplier.contactName }}</p>
            <p v-if="purchase.supplier.phone"><span class="text-slate-400">ເບີໂທ:</span> {{ purchase.supplier.phone }}</p>
            <p v-if="purchase.supplier.taxId"><span class="text-slate-400">Tax ID:</span> {{ purchase.supplier.taxId }}</p>
            <p v-if="purchase.supplier.address"><span class="text-slate-400">ທີ່ຢູ່:</span> {{ purchase.supplier.address }}</p>
          </div>
        </div>

        <!-- Destination Warehouse -->
        <div class="rounded-3xl border border-line bg-white p-5 shadow-xs">
          <div class="flex items-center gap-2 mb-3">
            <span class="grid size-7 place-items-center rounded-lg bg-blue-50 text-blue-600 text-xs">
              <AdminIcon name="building" class="size-4" />
            </span>
            <h3 class="text-xs font-bold uppercase text-slate-400">ສາງ ແລະ ສາຂາປາຍທາງ</h3>
          </div>
          <p class="text-base font-extrabold text-slate-900">{{ purchase.warehouse.name }}</p>
          <div class="mt-2 space-y-1 text-xs text-slate-600">
            <p><span class="text-slate-400">ລະຫັດສາງ:</span> <span class="font-mono">{{ purchase.warehouse.code }}</span></p>
            <p><span class="text-slate-400">ສາຂາ:</span> {{ purchase.branch.name }} ({{ purchase.branch.code }})</p>
            <p v-if="purchase.expectedAt"><span class="text-slate-400">ກຳນົດສົ່ງ:</span> {{ formatDate(purchase.expectedAt) }}</p>
            <p v-if="purchase.notes"><span class="text-slate-400">ໝາຍເຫດ:</span> {{ purchase.notes }}</p>
          </div>
        </div>

        <!-- Financial Summary Card -->
        <div class="rounded-3xl border border-line bg-white p-5 shadow-xs">
          <div class="flex items-center gap-2 mb-3">
            <span class="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600 text-xs">
              <AdminIcon name="wallet" class="size-4" />
            </span>
            <h3 class="text-xs font-bold uppercase text-slate-400">ສະຫຼຸບການເງິນ & ໜີ້ສິນ</h3>
          </div>
          <div class="space-y-1.5 text-xs">
            <div class="flex justify-between">
              <span class="text-slate-500">ຍອດສັ່ງຊື້ລວມ:</span>
              <span class="font-mono font-bold text-slate-900">{{ formatMoney(purchase.grandTotal) }} LAK</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">ຊຳລະແລ້ວ:</span>
              <span class="font-mono font-bold text-emerald-600">{{ formatMoney(purchase.paidAmount) }} LAK</span>
            </div>
            <div class="flex justify-between border-t border-line pt-2 text-sm font-black">
              <span class="text-rose-600">ຍອດຕິດໜີ້ຄ້າງຈ່າຍ:</span>
              <span class="font-mono text-rose-600">{{ formatMoney(purchase.remainingDebt) }} LAK</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="border-b border-line">
        <div class="flex items-center gap-4">
          <button
            type="button"
            :class="[
              'pb-3 text-xs font-bold transition border-b-2',
              activeTab === 'items'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            ]"
            @click="activeTab = 'items'"
          >
            ລາຍການສິນຄ້າສັ່ງຊື້ ({{ purchase.items.length }})
          </button>
          <button
            type="button"
            :class="[
              'pb-3 text-xs font-bold transition border-b-2',
              activeTab === 'receipts'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            ]"
            @click="activeTab = 'receipts'"
          >
            ປະຫວັດການຮັບເຄື່ອງເຂົ້າສາງ ({{ purchase.goodsReceipts.length }})
          </button>
          <button
            type="button"
            :class="[
              'pb-3 text-xs font-bold transition border-b-2',
              activeTab === 'payments'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            ]"
            @click="activeTab = 'payments'"
          >
            ປະຫວັດການຊຳລະເງິນ & ຕັດໜີ້ ({{ purchase.payments.length }})
          </button>
        </div>
      </div>

      <!-- Tab 1: Ordered Items -->
      <div v-if="activeTab === 'items'" class="overflow-hidden rounded-3xl border border-line bg-white shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-line bg-canvas/60 text-[0.68rem] font-black uppercase text-slate-500 tracking-wider">
                <th class="py-3 px-4">ສິນຄ້າ & Variant</th>
                <th class="py-3 px-4 text-center">SKU</th>
                <th class="py-3 px-4 text-right">ຈຳນວນສັ່ງ</th>
                <th class="py-3 px-4 text-right">ຮັບແລ້ວ</th>
                <th class="py-3 px-4 text-right">ຄ້າງຮັບ</th>
                <th class="py-3 px-4 text-right">ລາຄາຕົ້ນທຶນ</th>
                <th class="py-3 px-4 text-right">ລວມຍອດ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line font-medium text-slate-700">
              <tr v-for="item in purchase.items" :key="item.id" class="transition hover:bg-slate-50/70">
                <td class="py-3 px-4">
                  <span class="block font-bold text-slate-900">{{ item.productName }}</span>
                  <span v-if="item.variantName" class="text-[0.68rem] text-slate-500">Variant: {{ item.variantName }}</span>
                </td>
                <td class="py-3 px-4 text-center font-mono text-[0.72rem] text-slate-500">
                  {{ item.sku || '-' }}
                </td>
                <td class="py-3 px-4 text-right font-mono font-bold text-slate-900">
                  {{ item.orderedQuantity }} {{ item.unitName }}
                </td>
                <td class="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                  {{ item.receivedQuantity }} {{ item.unitName }}
                </td>
                <td class="py-3 px-4 text-right font-mono font-bold">
                  <span
                    v-if="Number(item.remainingQuantity) > 0"
                    class="rounded-md bg-amber-50 px-2 py-0.5 text-amber-700 border border-amber-200/60"
                  >
                    {{ item.remainingQuantity }} {{ item.unitName }}
                  </span>
                  <span v-else class="text-slate-400">0</span>
                </td>
                <td class="py-3 px-4 text-right font-mono text-slate-800">
                  {{ formatMoney(item.unitCost) }}
                </td>
                <td class="py-3 px-4 text-right font-mono font-black text-slate-900">
                  {{ formatMoney(item.totalAmount) }} LAK
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 2: Goods Receipts History -->
      <div v-else-if="activeTab === 'receipts'" class="space-y-4">
        <div v-if="purchase.goodsReceipts.length === 0" class="rounded-3xl border border-line bg-white p-12 text-center">
          <div class="mx-auto grid size-12 place-items-center rounded-2xl bg-canvas text-slate-400">
            <AdminIcon name="box" class="size-6" />
          </div>
          <p class="mt-3 text-sm font-bold text-slate-700">ຍັງບໍ່ມີປະຫວັດການຮັບເຄື່ອງ</p>
          <p class="mt-1 text-xs text-slate-400">ກົດປຸ່ມ "ຮັບສິນຄ້າເຂົ້າສາງ" ດ້ານເທິງເມື່ອສິນຄ້າມາຮອດຮ້ານ</p>
        </div>

        <div
          v-for="gr in purchase.goodsReceipts"
          :key="gr.id"
          class="rounded-3xl border border-line bg-white p-5 shadow-xs"
        >
          <div class="flex items-center justify-between border-b border-line pb-3 mb-3">
            <div>
              <span class="font-mono font-extrabold text-sm text-slate-900">{{ gr.receiptNumber }}</span>
              <span class="ml-2 text-xs text-slate-400">ວັນທີຮັບ: {{ formatDate(gr.receivedAt) }}</span>
            </div>
            <span class="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/60">
              ສາງ: {{ gr.warehouseName }}
            </span>
          </div>

          <p v-if="gr.notes" class="text-xs text-slate-500 mb-3 italic">ໝາຍເຫດ: {{ gr.notes }}</p>

          <table class="w-full text-left text-xs">
            <thead>
              <tr class="text-[0.65rem] font-bold uppercase text-slate-400 border-b border-line">
                <th class="pb-2">ສິນຄ້າທີ່ໄດ້ຮັບ</th>
                <th class="pb-2 text-right">ຈຳນວນທີ່ເພີ່ມເຂົ້າສະຕັອກ</th>
                <th class="pb-2 text-right">ມູນຄ່າຕົ້ນທຶນ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="gri in gr.items" :key="gri.id" class="text-slate-700">
                <td class="py-2 font-medium">{{ gri.productName }}</td>
                <td class="py-2 text-right font-mono font-bold text-emerald-600">+{{ gri.receivedQuantity }}</td>
                <td class="py-2 text-right font-mono">{{ formatMoney(gri.unitCost) }} LAK</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab 3: Payment History -->
      <div v-else-if="activeTab === 'payments'" class="space-y-4">
        <div v-if="purchase.payments.length === 0" class="rounded-3xl border border-line bg-white p-12 text-center">
          <div class="mx-auto grid size-12 place-items-center rounded-2xl bg-canvas text-slate-400">
            <AdminIcon name="wallet" class="size-6" />
          </div>
          <p class="mt-3 text-sm font-bold text-slate-700">ຍັງບໍ່ມີປະຫວັດການຊຳລະເງິນ</p>
          <p class="mt-1 text-xs text-slate-400">ກົດປຸ່ມ "ຊຳລະເງິນ/ຕັດໜີ້" ເພື່ອບັນທຶກການຈ່າຍເງິນໃຫ້ຜູ້ຈຳໜ່າຍ</p>
        </div>

        <div v-else class="overflow-hidden rounded-3xl border border-line bg-white shadow-xs">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-line bg-canvas/60 text-[0.68rem] font-black uppercase text-slate-500 tracking-wider">
                <th class="py-3 px-4">ວັນທີຊຳລະ</th>
                <th class="py-3 px-4">ວິທີການຊຳລະ</th>
                <th class="py-3 px-4">ເລກອ້າງອີງ / Slip</th>
                <th class="py-3 px-4">ໝາຍເຫດ</th>
                <th class="py-3 px-4 text-right">ຈຳນວນເງິນທີ່ຕັດໜີ້</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line font-medium text-slate-700">
              <tr v-for="pay in purchase.payments" :key="pay.allocationId" class="transition hover:bg-slate-50/70">
                <td class="py-3 px-4 text-slate-500">{{ formatDate(pay.paidAt) }}</td>
                <td class="py-3 px-4 font-bold text-slate-900">
                  <span v-if="pay.method === 'CASH'">💵 ເງິນສົດ (Cash)</span>
                  <span v-else-if="pay.method === 'BANK_TRANSFER'">🏦 ໂອນຜ່ານທະນາຄານ</span>
                  <span v-else>ອື່ນໆ</span>
                </td>
                <td class="py-3 px-4 font-mono text-slate-600">{{ pay.reference || '-' }}</td>
                <td class="py-3 px-4 text-slate-500">{{ pay.notes || '-' }}</td>
                <td class="py-3 px-4 text-right font-mono font-black text-emerald-600 text-sm">
                  {{ formatMoney(pay.amount) }} {{ pay.currencyCode }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Goods Receipt Modal -->
    <div
      v-if="showReceiptModal && purchase"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl transition max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h3 class="text-base font-extrabold text-slate-900">
              ກວດຮັບສິນຄ້າເຂົ້າສາງ (Goods Receipt)
            </h3>
            <p class="text-xs text-slate-500">
              ໃສ່ຈຳນວນສິນຄ້າທີ່ໄດ້ຮັບຕົວຈິງ. ລະບົບຈະເພີ່ມສະຕັອກ ແລະ ສ້າງ StockMovement ອັດຕະໂນມັດ.
            </p>
          </div>
          <button
            type="button"
            class="rounded-xl p-1 text-slate-400 hover:bg-canvas hover:text-slate-700"
            @click="showReceiptModal = false"
          >
            <AdminIcon name="x" class="size-5" />
          </button>
        </div>

        <form class="mt-4 space-y-4 overflow-y-auto flex-1 pr-1" @submit.prevent="submitReceiveGoods">
          <div class="rounded-2xl border border-line overflow-hidden">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="bg-canvas/60 text-[0.65rem] font-bold uppercase text-slate-500 border-b border-line">
                  <th class="py-2.5 px-3">ສິນຄ້າ</th>
                  <th class="py-2.5 px-3 text-right">ສັ່ງຊື້</th>
                  <th class="py-2.5 px-3 text-right">ຮັບແລ້ວ</th>
                  <th class="py-2.5 px-3 text-right">ຄ້າງຮັບ</th>
                  <th class="py-2.5 px-3 text-right w-32">ຈຳນວນທີ່ຮັບຄັ້ງນີ້</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                <tr v-for="item in purchase.items" :key="item.id">
                  <td class="py-2.5 px-3">
                    <span class="block font-bold text-slate-900">{{ item.productName }}</span>
                    <span class="text-[0.65rem] text-slate-400 font-mono">{{ item.sku || '-' }}</span>
                  </td>
                  <td class="py-2.5 px-3 text-right font-mono">{{ item.orderedQuantity }}</td>
                  <td class="py-2.5 px-3 text-right font-mono text-emerald-600">{{ item.receivedQuantity }}</td>
                  <td class="py-2.5 px-3 text-right font-mono text-amber-600 font-bold">{{ item.remainingQuantity }}</td>
                  <td class="py-2.5 px-3 text-right">
                    <input
                      v-model.number="receiptItemsInput.find(i => i.purchaseItemId === item.id)!.receivedQuantity"
                      type="number"
                      min="0"
                      :max="Number(item.remainingQuantity)"
                      step="any"
                      class="h-8 w-24 rounded-lg border border-line bg-canvas/30 px-2 text-xs font-mono font-bold text-right focus:border-brand-500 focus:bg-white focus:outline-none"
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ໝາຍເຫດການກວດຮັບ</label>
            <input
              v-model="receiptNotes"
              type="text"
              placeholder="ສະພາບສິນຄ້າ, ໃບສົ່ງເຄື່ອງຂອງຜູ້ສະໜອງ..."
              class="h-9.5 w-full rounded-xl border border-line bg-canvas/30 px-3 text-xs focus:border-brand-500 focus:bg-white focus:outline-none"
            >
          </div>

          <div class="mt-6 flex items-center justify-end gap-2 border-t border-line pt-4">
            <button
              type="button"
              class="rounded-xl border border-line px-4 py-2 text-xs font-bold text-slate-600 hover:bg-canvas transition"
              @click="showReceiptModal = false"
            >
              ຍົກເລີກ
            </button>
            <button
              type="submit"
              :disabled="receivingGoods"
              class="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              <span v-if="receivingGoods">ກຳລັງບັນທຶກຮັບເຄື່ອງ...</span>
              <span v-else>ຢືນຢັນການຮັບສິນຄ້າ</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Payment Modal -->
    <div
      v-if="showPaymentModal && purchase"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl transition">
        <div class="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h3 class="text-base font-extrabold text-slate-900">
              ຊຳລະເງິນ / ຕັດໜີ້ໃບສັ່ງຊື້
            </h3>
            <p class="text-xs text-slate-500 font-mono">{{ purchase.purchaseNumber }} - {{ purchase.supplier.name }}</p>
          </div>
          <button
            type="button"
            class="rounded-xl p-1 text-slate-400 hover:bg-canvas hover:text-slate-700"
            @click="showPaymentModal = false"
          >
            <AdminIcon name="x" class="size-5" />
          </button>
        </div>

        <form class="mt-4 space-y-3.5" @submit.prevent="submitPayment">
          <div class="rounded-2xl bg-canvas p-3 border border-line">
            <div class="flex items-center justify-between text-xs">
              <span class="text-slate-500">ຍອດສັ່ງຊື້ທັງໝົດ:</span>
              <span class="font-bold font-mono text-slate-900">{{ formatMoney(purchase.grandTotal) }} LAK</span>
            </div>
            <div class="flex items-center justify-between text-xs mt-1">
              <span class="text-slate-500">ຊຳລະແລ້ວ:</span>
              <span class="font-bold font-mono text-emerald-600">{{ formatMoney(purchase.paidAmount) }} LAK</span>
            </div>
            <div class="flex items-center justify-between text-xs mt-1 pt-1 border-t border-line font-bold">
              <span class="text-rose-600">ຍອດຕິດໜີ້ຄ້າງຈ່າຍ:</span>
              <span class="font-mono text-rose-600">{{ formatMoney(purchase.remainingDebt) }} LAK</span>
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
              @click="showPaymentModal = false"
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
