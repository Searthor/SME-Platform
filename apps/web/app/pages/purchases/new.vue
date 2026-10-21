<script setup lang="ts">
import { errorMessage } from '~/utils/errors'
import type { ProductList } from '~/types/api'
import FormattedNumberInput from '~/components/forms/FormattedNumberInput.vue'
import Select2 from '~/components/forms/Select2.vue'

const api = useApiClient()
const toast = useToast()

definePageMeta({
  layout: 'default',
})

useHead({
  title: 'ສ້າງໃບສັ່ງຊື້ສິນຄ້າໃໝ່ - SME Platform',
})

type SupplierOption = { id: string; name: string; code: string; phone: string | null }
type WarehouseOption = { id: string; name: string; code: string; branchId: string }
type BranchOption = { id: string; name: string; code: string }
type VariantOption = {
  id: string
  name: string | null
  sku: string | null
  cost: string
  sellingPrice: string
  productName: string
  unitName: string
}

type OrderItemRow = {
  variantId: string
  orderedQuantity: number
  unitCost: string
  taxAmount: number
}

const loading = ref(true)
const submitting = ref(false)

const suppliers = ref<SupplierOption[]>([])
const warehouses = ref<WarehouseOption[]>([])
const branches = ref<BranchOption[]>([])
const variants = ref<VariantOption[]>([])

const form = reactive({
  supplierId: '',
  branchId: '',
  warehouseId: '',
  expectedAt: '',
  notes: '',
  receiveImmediately: false,
  paymentType: 'CREDIT' as 'CREDIT' | 'PARTIAL' | 'FULL',
  paidAmount: '',
  paymentMethod: 'CASH' as 'CASH' | 'BANK_TRANSFER',
  paymentReference: '',
  paymentNotes: '',
  items: [] as OrderItemRow[],
})

const supplierSelectOptions = computed(() =>
  suppliers.value.map(s => ({
    value: s.id,
    label: s.name,
    sublabel: s.code,
  })),
)

const branchSelectOptions = computed(() =>
  branches.value.map(b => ({
    value: b.id,
    label: b.name,
    sublabel: b.code,
  })),
)

const warehouseSelectOptions = computed(() =>
  availableWarehouses.value.map(w => ({
    value: w.id,
    label: w.name,
    sublabel: w.code,
  })),
)

const variantSelectOptions = computed(() =>
  variants.value.map(v => ({
    value: v.id,
    label: `${v.productName}${v.name ? ` (${v.name})` : ''}`,
    sublabel: v.sku ? `${v.sku} · ${v.unitName}` : v.unitName,
  })),
)

const fetchInitialData = async () => {
  loading.value = true
  try {
    const [supRes, whRes, brRes, prodRes] = await Promise.all([
      api.get<{ items: SupplierOption[] }>('/suppliers?limit=100'),
      api.get<WarehouseOption[]>('/warehouses'),
      api.get<BranchOption[]>('/branches'),
      api.get<ProductList>('/products?limit=100'),
    ])

    suppliers.value = supRes.items
    warehouses.value = whRes
    branches.value = brRes

    // Flatten product variants
    const flatVariants: VariantOption[] = []
    for (const p of prodRes.items) {
      if (p.variants && p.variants.length > 0) {
        for (const v of p.variants) {
          flatVariants.push({
            id: v.id,
            name: v.name,
            sku: v.sku,
            cost: v.cost ? String(Math.round(Number(v.cost))) : '0',
            sellingPrice: v.sellingPrice ? String(Math.round(Number(v.sellingPrice))) : '0',
            productName: p.name,
            unitName: p.unit?.name || 'ອັນ',
          })
        }
      }
    }
    variants.value = flatVariants

    // Set defaults
    if (branches.value.length > 0) {
      form.branchId = branches.value[0]!.id
    }
    if (warehouses.value.length > 0) {
      form.warehouseId = warehouses.value[0]!.id
    }
    if (suppliers.value.length > 0) {
      form.supplierId = suppliers.value[0]!.id
    }

    // Add first row
    addItemRow()
  }
  catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດໂຫລດຂໍ້ມູນເລີ່ມຕົ້ນໄດ້'))
  }
  finally {
    loading.value = false
  }
}

const addItemRow = () => {
  const defaultVariant = variants.value[0]
  form.items.push({
    variantId: defaultVariant ? defaultVariant.id : '',
    orderedQuantity: 1,
    unitCost: defaultVariant && defaultVariant.cost ? String(Math.round(Number(defaultVariant.cost))) : '0',
    taxAmount: 0,
  })
}

const removeItemRow = (index: number) => {
  if (form.items.length <= 1) {
    toast.warning('ແຈ້ງເຕືອນ', 'ໃບສັ່ງຊື້ຕ້ອງມີສິນຄ້າຢ່າງໜ້ອຍ 1 ລາຍການ')
    return
  }
  form.items.splice(index, 1)
}

const onVariantChange = (row: OrderItemRow, val?: string | number | Array<string | number> | null) => {
  if (val !== undefined && val !== null && !Array.isArray(val)) {
    row.variantId = String(val)
  }
  const selected = variants.value.find(v => v.id === row.variantId)
  if (selected) {
    row.unitCost = selected.cost ? String(Math.round(Number(selected.cost))) : '0'
  }
}

// Filtered warehouses by selected branch
const availableWarehouses = computed(() => {
  if (!form.branchId) return warehouses.value
  return warehouses.value.filter(wh => wh.branchId === form.branchId)
})

watch(() => form.branchId, (newBranchId) => {
  const whs = warehouses.value.filter(wh => wh.branchId === newBranchId)
  if (whs.length > 0) {
    form.warehouseId = whs[0]!.id
  }
  else {
    form.warehouseId = ''
  }
})

// Calculations
const subtotalSum = computed(() =>
  form.items.reduce((sum, item) => sum + (Number(item.orderedQuantity || 0) * Number(item.unitCost || 0)), 0),
)
const taxSum = computed(() =>
  form.items.reduce((sum, item) => sum + Number(item.taxAmount || 0), 0),
)
const grandTotalSum = computed(() => subtotalSum.value + taxSum.value)

const effectivePaidAmount = computed(() => {
  if (form.paymentType === 'CREDIT') return 0
  if (form.paymentType === 'FULL') return grandTotalSum.value
  return Math.min(Number(form.paidAmount || 0), grandTotalSum.value)
})

const remainingDebtOnCreate = computed(() => {
  return Math.max(0, grandTotalSum.value - effectivePaidAmount.value)
})

const formatMoney = (val: number | string) => {
  const num = typeof val === 'string' ? Number(val) : val
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(num || 0))
}

const submitPO = async () => {
  if (!form.supplierId) {
    toast.warning('ກະລຸນາເລືອກ', 'ກະລຸນາເລືອກຜູ້ຈຳໜ່າຍສິນຄ້າ')
    return
  }
  if (!form.warehouseId) {
    toast.warning('ກະລຸນາເລືອກ', 'ກະລຸນາເລືອກສາງປາຍທາງ')
    return
  }
  if (form.items.length === 0) {
    toast.warning('ກະລຸນາເພີ່ມສິນຄ້າ', 'ຕ້ອງມີສິນຄ້າຢ່າງໜ້ອຍ 1 ລາຍການ')
    return
  }

  for (const item of form.items) {
    if (!item.variantId) {
      toast.warning('ຂໍ້ມູນບໍ່ຄົບຖ້ວນ', 'ກະລຸນາເລືອກສິນຄ້າໃຫ້ຄົບທຸກແຖວ')
      return
    }
    if (item.orderedQuantity <= 0) {
      toast.warning('ຈຳນວນບໍ່ຖືກຕ້ອງ', 'ຈຳນວນສັ່ງຊື້ຕ້ອງຫຼາຍກວ່າ 0')
      return
    }
  }

  if (form.paymentType === 'PARTIAL' && effectivePaidAmount.value <= 0) {
    toast.warning('ກະລຸນາໃສ່ຈຳນວນເງິນ', 'ກະລຸນາໃສ່ຈຳນວນເງິນທີ່ຊຳລະບາງສ່ວນ')
    return
  }

  submitting.value = true
  try {
    const payload = {
      supplierId: form.supplierId,
      branchId: form.branchId,
      warehouseId: form.warehouseId,
      notes: form.notes.trim() || undefined,
      expectedAt: form.expectedAt ? new Date(form.expectedAt).toISOString() : undefined,
      receiveImmediately: form.receiveImmediately,
      paymentMethod: form.paymentType !== 'CREDIT' ? form.paymentMethod : undefined,
      paidAmount: form.paymentType !== 'CREDIT' ? String(effectivePaidAmount.value) : undefined,
      paymentReference: form.paymentType !== 'CREDIT' && form.paymentReference.trim() ? form.paymentReference.trim() : undefined,
      paymentNotes: form.paymentType !== 'CREDIT' && form.paymentNotes.trim() ? form.paymentNotes.trim() : undefined,
      items: form.items.map(item => ({
        variantId: item.variantId,
        orderedQuantity: String(item.orderedQuantity),
        unitCost: String(item.unitCost),
        taxAmount: item.taxAmount ? String(item.taxAmount) : undefined,
      })),
    }

    const created = await api.post<{ id: string }>('/purchases', payload)
    toast.success('ສ້າງໃບສັ່ງຊື້ສຳເລັດ', 'ສ້າງໃບສັ່ງຊື້ສິນຄ້າຮຽບຮ້ອຍແລ້ວ')
    await navigateTo(`/purchases/${created.id}`)
  }
  catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດສ້າງໃບສັ່ງຊື້ໄດ້'))
  }
  finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchInitialData()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-line pb-4">
      <div>
        <div class="flex items-center gap-2">
          <NuxtLink to="/purchases" class="text-xs font-bold text-brand-600 hover:underline">
            ← ກັບຄືນໜ້າໃບສັ່ງຊື້
          </NuxtLink>
        </div>
        <h1 class="mt-1 text-2xl font-black tracking-tight text-slate-900">
          ສ້າງໃບສັ່ງຊື້ສິນຄ້າໃໝ່ (New Purchase Order)
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          :disabled="submitting || loading"
          class="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
          @click="submitPO"
        >
          <AdminIcon name="check" class="size-4" />
          <span v-if="submitting">ກຳລັງບັນທຶກ...</span>
          <span v-else>ບັນທຶກໃບສັ່ງຊື້</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <LoadingSpinner class="size-8 text-brand-600" />
      <p class="mt-3 text-xs text-slate-400 font-medium">ກຳລັງໂຫລດຂໍ້ມູນພື້ນຖານ...</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Left 2 Cols: Form & Item Rows -->
      <div class="space-y-6 lg:col-span-2">
        <!-- PO Basic Info -->
        <div class="rounded-3xl border border-line bg-white p-5 shadow-xs">
          <h2 class="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
            <span class="grid size-6 place-items-center rounded-lg bg-brand-50 text-brand-600 text-xs font-bold">1</span>
            <span>ຂໍ້ມູນໃບສັ່ງຊື້ ແລະ ຜູ້ຈຳໜ່າຍ</span>
          </h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="relative z-20">
              <Select2
                v-model="form.supplierId"
                :options="supplierSelectOptions"
                label="ເລືອກຜູ້ຈຳໜ່າຍສິນຄ້າ"
                required
                placeholder="-- ເລືອກຜູ້ຈຳໜ່າຍ --"
                search-placeholder="ຄົ້ນຫາຊື່ ຫຼື ລະຫັດຜູ້ຈຳໜ່າຍ..."
              />
            </div>

            <div class="relative z-20">
              <Select2
                v-model="form.branchId"
                :options="branchSelectOptions"
                label="ສາຂາ (Branch)"
                required
                placeholder="-- ເລືອກສາຂາ --"
                search-placeholder="ຄົ້ນຫາສາຂາ..."
              />
            </div>

            <div class="relative z-10">
              <Select2
                v-model="form.warehouseId"
                :options="warehouseSelectOptions"
                label="ສາງປາຍທາງທີ່ຮັບສິນຄ້າ (Destination Warehouse)"
                required
                placeholder="-- ເລືອກສາງ --"
                search-placeholder="ຄົ້ນຫາສາງ..."
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-2">
                ກຳນົດວັນທີຮັບສິນຄ້າ (Expected Date)
              </label>
              <input
                v-model="form.expectedAt"
                type="date"
                class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs focus:border-[#5b4cf5] focus:bg-white focus:outline-none"
              >
            </div>
          </div>

          <div class="mt-4">
            <label class="block text-xs font-bold text-slate-700 mb-2">ໝາຍເຫດ</label>
            <input
              v-model="form.notes"
              type="text"
              placeholder="ໝາຍເຫດການສັ່ງຊື້, ເລກໃບສະເໜີລາຄາ..."
              class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs focus:border-[#5b4cf5] focus:bg-white focus:outline-none"
            >
          </div>
        </div>

        <!-- Items Card -->
        <div class="rounded-3xl border border-line bg-white p-5 shadow-xs">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-black text-slate-900 flex items-center gap-2">
              <span class="grid size-6 place-items-center rounded-lg bg-brand-50 text-brand-600 text-xs font-bold">2</span>
              <span>ລາຍການສິນຄ້າສັ່ງຊື້</span>
            </h2>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600 hover:bg-brand-100 transition"
              @click="addItemRow"
            >
              <AdminIcon name="plus" class="size-3.5" />
              <span>ເພີ່ມແຖວ (+ Item)</span>
            </button>
          </div>

          <div class="space-y-3">
            <div
              v-for="(row, idx) in form.items"
              :key="idx"
              class="relative flex flex-col gap-3 rounded-2xl border border-line bg-canvas/30 p-3 sm:flex-row sm:items-center transition hover:border-slate-300"
              :style="{ zIndex: form.items.length - idx + 10 }"
            >
              <!-- Variant selector with Select2 -->
              <div class="flex-1 min-w-[240px]">
                <label class="block text-[0.65rem] font-bold text-slate-500 uppercase mb-1">ສິນຄ້າ & Variant</label>
                <Select2
                  v-model="row.variantId"
                  :options="variantSelectOptions"
                  placeholder="-- ເລືອກສິນຄ້າ & Variant --"
                  search-placeholder="ຄົ້ນຫາຊື່ສິນຄ້າ ຫຼື SKU..."
                  size="sm"
                  @change="(val) => onVariantChange(row, val)"
                />
              </div>

              <!-- Quantity -->
              <div class="w-24">
                <label class="block text-[0.65rem] font-bold text-slate-500 uppercase mb-1">ຈຳນວນ</label>
                <input
                  v-model.number="row.orderedQuantity"
                  type="number"
                  min="0.001"
                  step="any"
                  class="h-9.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-mono font-bold text-right focus:border-[#5b4cf5] focus:outline-none"
                  required
                >
              </div>

              <!-- Unit Cost with FormattedNumberInput -->
              <div class="w-36">
                <label class="block text-[0.65rem] font-bold text-slate-500 uppercase mb-1">ຕົ້ນທຶນ/ໜ່ວຍ (LAK)</label>
                <FormattedNumberInput
                  v-model="row.unitCost"
                  size="sm"
                  :scale="0"
                  placeholder="0"
                  required
                />
              </div>

              <!-- Line Total -->
              <div class="w-36 text-right">
                <label class="block text-[0.65rem] font-bold text-slate-500 uppercase mb-1">ລວມຍອດ</label>
                <div class="h-9.5 flex items-center justify-end font-mono font-black text-slate-900 text-xs">
                  {{ formatMoney(Number(row.orderedQuantity || 0) * Number(row.unitCost || 0)) }}
                </div>
              </div>

              <!-- Delete button -->
              <div class="flex items-end sm:pt-4">
                <button
                  type="button"
                  class="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                  title="ລຶບແຖວ"
                  @click="removeItemRow(idx)"
                >
                  <AdminIcon name="trash" class="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Goods Receiving Status Card -->
        <div class="rounded-3xl border border-line bg-white p-5 shadow-xs">
          <h2 class="text-sm font-black text-slate-900 mb-2 flex items-center gap-2">
            <span class="grid size-6 place-items-center rounded-lg bg-brand-50 text-brand-600 text-xs font-bold">3</span>
            <span>ສະຖານະການຮັບສິນຄ້າ (Delivery & Arrival Status)</span>
          </h2>
          <p class="text-xs text-slate-500 mb-4">ເລືອກວ່າສິນຄ້າໄດ້ມາຮອດສາງແລ້ວ ຫຼື ສັ່ງຊື້ໄວ້ກ່ອນລໍຖ້າຮັບເຄື່ອງພາຍຫຼັງ</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              class="flex flex-col p-4 rounded-2xl border text-left transition cursor-pointer"
              :class="!form.receiveImmediately ? 'border-amber-500 bg-amber-50/40 ring-1 ring-amber-500/20' : 'border-slate-200 bg-white hover:border-slate-300'"
              @click="form.receiveImmediately = false"
            >
              <div class="flex items-center justify-between w-full mb-1">
                <span class="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  🚚 ສັ່ງຊື້ໄວ້ (ເຄື່ອງຍັງບໍ່ຮອດ)
                </span>
                <span v-if="!form.receiveImmediately" class="size-2 rounded-full bg-amber-500" />
              </div>
              <p class="text-[0.72rem] text-slate-500 leading-relaxed">
                ສິນຄ້າຍັງບໍ່ທັນມາຮອດສາງ. ສະຕັອກຍັງບໍ່ເພີ່ມ, ທ່ານສາມາດມາກວດຮັບເຄື່ອງເຂົ້າສາງຕົວຈິງພາຍຫຼັງເມື່ອສິນຄ້າມາຮອດ.
              </p>
            </button>

            <button
              type="button"
              class="flex flex-col p-4 rounded-2xl border text-left transition cursor-pointer"
              :class="form.receiveImmediately ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/20' : 'border-slate-200 bg-white hover:border-slate-300'"
              @click="form.receiveImmediately = true"
            >
              <div class="flex items-center justify-between w-full mb-1">
                <span class="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  📦 ເຄື່ອງຮອດແລ້ວ (ຮັບເຂົ້າສາງທັນທີ)
                </span>
                <span v-if="form.receiveImmediately" class="size-2 rounded-full bg-emerald-500" />
              </div>
              <p class="text-[0.72rem] text-slate-500 leading-relaxed">
                ສິນຄ້າມາຮອດສາງແລ້ວ. ລະບົບຈະບັນທຶກຮັບສິນຄ້າເຂົ້າສາງປາຍທາງ ແລະ ເພີ່ມສະຕັອກທັນທີ.
              </p>
            </button>
          </div>
        </div>

        <!-- 4. Payment Settlement Card -->
        <div class="rounded-3xl border border-line bg-white p-5 shadow-xs">
          <h2 class="text-sm font-black text-slate-900 mb-2 flex items-center gap-2">
            <span class="grid size-6 place-items-center rounded-lg bg-brand-50 text-brand-600 text-xs font-bold">4</span>
            <span>ຮູບແບບການຊຳລະເງິນ (Payment Settlement)</span>
          </h2>
          <p class="text-xs text-slate-500 mb-4">ເລືອກຮູບແບບການຊຳລະຄ່າສິນຄ້າ (ຕິດໜີ້ກ່ອນ, ຈ່າຍບາງສ່ວນ, ຫຼື ຈ່າຍຄົບ 100%)</p>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <button
              type="button"
              class="flex flex-col p-3.5 rounded-2xl border text-left transition cursor-pointer"
              :class="form.paymentType === 'CREDIT' ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500/20' : 'border-slate-200 bg-white hover:border-slate-300'"
              @click="form.paymentType = 'CREDIT'"
            >
              <div class="flex items-center justify-between w-full mb-1">
                <span class="text-xs font-black text-slate-900 flex items-center gap-1">
                  ⏳ ຕິດໜີ້ກ່ອນ
                </span>
                <span v-if="form.paymentType === 'CREDIT'" class="size-2 rounded-full bg-rose-500" />
              </div>
              <p class="text-[0.7rem] text-slate-500">ຍັງບໍ່ທັນຊຳລະ (100%), ບັນທຶກເປັນໜີ້ຜູ້ຈຳໜ່າຍ</p>
            </button>

            <button
              type="button"
              class="flex flex-col p-3.5 rounded-2xl border text-left transition cursor-pointer"
              :class="form.paymentType === 'PARTIAL' ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/20' : 'border-slate-200 bg-white hover:border-slate-300'"
              @click="form.paymentType = 'PARTIAL'"
            >
              <div class="flex items-center justify-between w-full mb-1">
                <span class="text-xs font-black text-slate-900 flex items-center gap-1">
                  🪙 ຊຳລະບາງສ່ວນ
                </span>
                <span v-if="form.paymentType === 'PARTIAL'" class="size-2 rounded-full bg-indigo-500" />
              </div>
              <p class="text-[0.7rem] text-slate-500">ຊຳລະມັດຈຳ/ບາງສ່ວນ, ສ່ວນທີ່ເຫຼືອຕິດໜີ້</p>
            </button>

            <button
              type="button"
              class="flex flex-col p-3.5 rounded-2xl border text-left transition cursor-pointer"
              :class="form.paymentType === 'FULL' ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/20' : 'border-slate-200 bg-white hover:border-slate-300'"
              @click="form.paymentType = 'FULL'"
            >
              <div class="flex items-center justify-between w-full mb-1">
                <span class="text-xs font-black text-slate-900 flex items-center gap-1">
                  💳 ຊຳລະຄົບຖ້ວນ
                </span>
                <span v-if="form.paymentType === 'FULL'" class="size-2 rounded-full bg-emerald-500" />
              </div>
              <p class="text-[0.7rem] text-slate-500">ຊຳລະເຕັມຈຳນວນ 100%, ບໍ່ມີຍອດຕິດໜີ້</p>
            </button>
          </div>

          <!-- Payment Details Box when paying Partial or Full -->
          <div
            v-if="form.paymentType !== 'CREDIT'"
            class="rounded-2xl border border-line bg-canvas/40 p-4 space-y-4"
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Partial Amount input -->
              <div v-if="form.paymentType === 'PARTIAL'">
                <label class="block text-xs font-bold text-slate-700 mb-1">
                  ຈຳນວນເງິນທີ່ຊຳລະ (LAK) <span class="text-rose-500">*</span>
                </label>
                <FormattedNumberInput
                  v-model="form.paidAmount"
                  suffix="LAK"
                  placeholder="0"
                  :scale="0"
                  required
                />
                <span class="mt-1 block text-[0.68rem] font-bold text-rose-600">
                  ຍອດຕິດໜີ້ທີ່ເຫຼືອ: {{ formatMoney(remainingDebtOnCreate) }} LAK
                </span>
              </div>

              <!-- Payment Method Selector -->
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">
                  ຊ່ອງທາງການຊຳລະ (Payment Method) <span class="text-rose-500">*</span>
                </label>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    class="h-10 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                    :class="form.paymentMethod === 'CASH' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line bg-white text-slate-600 hover:bg-canvas'"
                    @click="form.paymentMethod = 'CASH'"
                  >
                    <AdminIcon name="wallet" class="size-4" />
                    <span>ເງິນສົດ (Cash)</span>
                  </button>
                  <button
                    type="button"
                    class="h-10 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                    :class="form.paymentMethod === 'BANK_TRANSFER' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line bg-white text-slate-600 hover:bg-canvas'"
                    @click="form.paymentMethod = 'BANK_TRANSFER'"
                  >
                    <AdminIcon name="card" class="size-4" />
                    <span>ໂອນທະນາຄານ</span>
                  </button>
                </div>
              </div>

              <!-- Payment Reference -->
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">
                  ເລກອ້າງອີງ / ເລກສະລິບໂອນ (Reference)
                </label>
                <input
                  v-model="form.paymentReference"
                  type="text"
                  placeholder="ເລກທຸລະກຳ BCELOne, ເລກເຊັກ..."
                  class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs focus:border-[#5b4cf5] focus:bg-white focus:outline-none"
                >
              </div>

              <!-- Payment Notes -->
              <div>
                <label class="block text-xs font-bold text-slate-700 mb-1">ໝາຍເຫດການຊຳລະ</label>
                <input
                  v-model="form.paymentNotes"
                  type="text"
                  placeholder="ໝາຍເຫດການຕັດຈ່າຍ, ຈ່າຍໂດຍ..."
                  class="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs focus:border-[#5b4cf5] focus:bg-white focus:outline-none"
                >
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Col: Financial Calculation Summary -->
      <div class="space-y-6">
        <div class="rounded-3xl border border-line bg-white p-5 shadow-xs sticky top-20">
          <h2 class="text-sm font-black text-slate-900 mb-4">ສະຫຼຸບມູນຄ່າໃບສັ່ງຊື້ (Financials)</h2>

          <div class="space-y-3 text-xs border-b border-line pb-4">
            <div class="flex items-center justify-between">
              <span class="text-slate-500">ຈຳນວນລາຍການ:</span>
              <span class="font-bold text-slate-900">{{ form.items.length }} ລາຍການ</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">ຍອດລວມກ່ອນອາກອນ (Subtotal):</span>
              <span class="font-mono font-bold text-slate-900">{{ formatMoney(subtotalSum) }} LAK</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">ອາກອນ/ພາສີ (Tax):</span>
              <span class="font-mono font-bold text-slate-900">{{ formatMoney(taxSum) }} LAK</span>
            </div>
          </div>

          <div class="mt-4 flex items-center justify-between pt-2">
            <span class="text-sm font-black text-slate-900">ຍອດລວມທັງໝົດ:</span>
            <span class="text-xl font-black font-mono text-brand-600">{{ formatMoney(grandTotalSum) }} <span class="text-xs font-sans">LAK</span></span>
          </div>

          <!-- Status & Debt Breakdown -->
          <div class="mt-4 space-y-2 border-t border-line pt-3 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-slate-500">ສະຖານະສິນຄ້າ:</span>
              <span v-if="form.receiveImmediately" class="font-bold text-emerald-600 flex items-center gap-1">
                📦 ຮັບເຂົ້າສາງທັນທີ
              </span>
              <span v-else class="font-bold text-amber-600 flex items-center gap-1">
                🚚 ສັ່ງຊື້ແລ້ວ (ເຄື່ອງຍັງບໍ່ຮອດ)
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">ສະຖານະການເງິນ:</span>
              <span v-if="form.paymentType === 'FULL'" class="font-bold text-emerald-600">
                💳 ຊຳລະຄົບຖ້ວນ
              </span>
              <span v-else-if="form.paymentType === 'PARTIAL'" class="font-bold text-indigo-600">
                🪙 ຊຳລະບາງສ່ວນ
              </span>
              <span v-else class="font-bold text-rose-600">
                ⏳ ຕິດໜີ້ (ຍັງບໍ່ຈ່າຍ)
              </span>
            </div>
            <div v-if="form.paymentType !== 'CREDIT'" class="flex items-center justify-between pt-1">
              <span class="text-slate-500">ຊຳລະແລ້ວ:</span>
              <span class="font-mono font-bold text-emerald-600">{{ formatMoney(effectivePaidAmount) }} LAK</span>
            </div>
            <div v-if="remainingDebtOnCreate > 0" class="flex items-center justify-between">
              <span class="text-slate-500">ຍອດຕິດໜີ້:</span>
              <span class="font-mono font-bold text-rose-600">{{ formatMoney(remainingDebtOnCreate) }} LAK</span>
            </div>
          </div>

          <div class="mt-6">
            <button
              type="button"
              :disabled="submitting"
              class="w-full rounded-2xl bg-brand-600 py-3 text-center text-xs font-extrabold text-white shadow-md transition hover:bg-brand-700 disabled:opacity-50 cursor-pointer"
              @click="submitPO"
            >
              <span v-if="submitting">ກຳລັງສ້າງໃບສັ່ງຊື້...</span>
              <span v-else>ຢືນຢັນສ້າງໃບສັ່ງຊື້</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
