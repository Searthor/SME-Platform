<script setup lang="ts">
import { errorMessage } from '~/utils/errors'
import { formatMoney, sanitizeDecimalInput } from '~/utils/money'

definePageMeta({
  layout: 'default',
})

useHead({
  title: 'ສະຕັອກສິນຄ້າ - SME Platform',
})

type WarehouseOption = { id: string; name: string; code: string; branch?: { name: string } }

type BalanceItem = {
  variantId: string
  productName: string
  variantName: string | null
  sku: string | null
  unitName: string
  quantity: string
  minStock: string
  isLowStock: boolean
}

type MovementItem = {
  id: string
  type: 'PURCHASE_RECEIPT' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'SALE'
  quantityDelta: string
  referenceType: string | null
  notes: string | null
  createdAt: string
  warehouse: { id: string; name: string }
  variant: { id: string; name: string | null; sku: string | null; productName: string }
}

const api = useApiClient()
const auth = useAuthStore()
const toast = useToast()

const canAdjust = computed(() => auth.hasPermission('stock.adjust'))
const activeTab = ref<'BALANCES' | 'MOVEMENTS'>('BALANCES')

const warehouses = ref<WarehouseOption[]>([])
const warehouseId = ref('')
const search = ref('')
const lowStockOnly = ref(false)

const loading = ref(false)
const balances = ref<BalanceItem[]>([])
const movements = ref<MovementItem[]>([])

// Stock count: counted quantities typed per variant; only changed rows are submitted
const counting = ref(false)
const counted = ref<Record<string, string>>({})
const countReason = ref('')
const savingCount = ref(false)

const movementLabel: Record<MovementItem['type'], string> = {
  PURCHASE_RECEIPT: 'ຮັບເຄື່ອງ',
  ADJUSTMENT: 'ປັບສະຕັອກ',
  TRANSFER_IN: 'ໂອນເຂົ້າ',
  TRANSFER_OUT: 'ໂອນອອກ',
  SALE: 'ຂາຍ',
}

const displayName = (item: { productName: string; variantName: string | null }) =>
  item.variantName ? `${item.productName} (${item.variantName})` : item.productName

const fetchBalances = async () => {
  if (!warehouseId.value) return
  loading.value = true
  try {
    const params = new URLSearchParams({ warehouseId: warehouseId.value, limit: '200' })
    if (search.value.trim()) params.set('search', search.value.trim())
    if (lowStockOnly.value) params.set('lowStock', 'true')
    const res = await api.get<{ items: BalanceItem[] }>(`/inventory/balances?${params.toString()}`)
    balances.value = res.items
  }
  catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດໂຫຼດສະຕັອກໄດ້'))
  }
  finally {
    loading.value = false
  }
}

const fetchMovements = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({ limit: '100' })
    if (warehouseId.value) params.set('warehouseId', warehouseId.value)
    const res = await api.get<{ items: MovementItem[] }>(`/inventory/movements?${params.toString()}`)
    movements.value = res.items
  }
  catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດໂຫຼດປະຫວັດສະຕັອກໄດ້'))
  }
  finally {
    loading.value = false
  }
}

const refresh = () => (activeTab.value === 'BALANCES' ? fetchBalances() : fetchMovements())

const startCount = () => {
  counted.value = {}
  countReason.value = ''
  counting.value = true
}

const changedLines = computed(() =>
  balances.value
    .filter(item => (counted.value[item.variantId] ?? '') !== '')
    .map(item => ({ variantId: item.variantId, countedQuantity: sanitizeDecimalInput(counted.value[item.variantId] ?? '', 6) }))
    .filter(line => line.countedQuantity !== ''),
)

const submitCount = async () => {
  if (changedLines.value.length === 0) {
    toast.warning('ຍັງບໍ່ມີການນັບ', 'ກະລຸນາປ້ອນຈຳນວນທີ່ນັບໄດ້ຢ່າງໜ້ອຍ 1 ລາຍການ')
    return
  }
  if (!countReason.value.trim()) {
    toast.warning('ກະລຸນາໃສ່ເຫດຜົນ', 'ເຊັ່ນ: ສະຕັອກເລີ່ມຕົ້ນ, ນັບສະຕັອກປະຈຳເດືອນ, ສິນຄ້າເສຍຫາຍ')
    return
  }
  savingCount.value = true
  try {
    await api.post('/inventory/adjustments', {
      warehouseId: warehouseId.value,
      reason: countReason.value.trim(),
      lines: changedLines.value,
    })
    toast.success('ບັນທຶກສຳເລັດ', `ປັບສະຕັອກ ${changedLines.value.length} ລາຍການ`)
    counting.value = false
    await fetchBalances()
  }
  catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດບັນທຶກການປັບສະຕັອກໄດ້'))
  }
  finally {
    savingCount.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(fetchBalances, 300)
})
watch([warehouseId, lowStockOnly], refresh)
watch(activeTab, refresh)

onMounted(async () => {
  try {
    warehouses.value = await api.get<WarehouseOption[]>('/warehouses')
    warehouseId.value = warehouses.value[0]?.id ?? ''
  }
  catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດໂຫຼດສາງສິນຄ້າໄດ້'))
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900">
          ສະຕັອກສິນຄ້າ (Inventory)
        </h1>
        <p class="mt-1 text-sm text-slate-500">
          ຈຳນວນຄົງເຫຼືອຕາມສາງ, ສະຕັອກເລີ່ມຕົ້ນ, ການນັບສະຕັອກ ແລະ ປະຫວັດການເຄື່ອນໄຫວທຸກລາຍການ
        </p>
      </div>
      <div class="flex items-center gap-2">
        <select
          v-model="warehouseId"
          class="h-10 rounded-xl border border-line bg-white px-3 text-xs font-bold text-slate-800 focus:border-brand-500 focus:outline-none"
        >
          <option v-for="w in warehouses" :key="w.id" :value="w.id">
            {{ w.name }}{{ w.branch ? ` · ${w.branch.name}` : '' }}
          </option>
        </select>
        <button
          v-if="canAdjust && activeTab === 'BALANCES' && !counting"
          type="button"
          class="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
          :disabled="!warehouseId"
          @click="startCount"
        >
          <AdminIcon name="box" class="size-4" />
          <span>ນັບ / ປັບສະຕັອກ</span>
        </button>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="tab in [{ key: 'BALANCES', label: 'ຄົງເຫຼືອ' }, { key: 'MOVEMENTS', label: 'ປະຫວັດການເຄື່ອນໄຫວ' }] as const"
        :key="tab.key"
        type="button"
        class="rounded-xl px-4 py-2 text-xs font-bold transition"
        :class="activeTab === tab.key ? 'bg-brand-600 text-white' : 'border border-line bg-white text-slate-600 hover:bg-slate-50'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
      <template v-if="activeTab === 'BALANCES'">
        <input
          v-model="search"
          type="search"
          placeholder="ຄົ້ນຫາຊື່ສິນຄ້າ / SKU..."
          class="ml-auto h-10 w-full max-w-xs rounded-xl border border-line bg-white px-3 text-xs focus:border-brand-500 focus:outline-none"
        >
        <label class="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
          <input v-model="lowStockOnly" type="checkbox" class="size-4 rounded">
          ສະເພາະໃກ້ໝົດ
        </label>
      </template>
    </div>

    <!-- Stock count bar -->
    <div v-if="counting" class="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-4 sm:flex-row sm:items-center">
      <p class="text-xs font-bold text-slate-700">
        ປ້ອນ "ຈຳນວນທີ່ນັບໄດ້" ໃນລາຍການທີ່ຕ້ອງການປັບ ({{ changedLines.length }} ລາຍການ). ລະບົບຈະບັນທຶກສ່ວນຕ່າງເປັນການປັບສະຕັອກ.
      </p>
      <input
        v-model="countReason"
        type="text"
        maxlength="200"
        placeholder="ເຫດຜົນ ເຊັ່ນ: ສະຕັອກເລີ່ມຕົ້ນ"
        class="h-10 flex-1 rounded-xl border border-line bg-white px-3 text-xs focus:border-brand-500 focus:outline-none"
      >
      <div class="flex gap-2">
        <button type="button" class="rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-bold text-slate-700" @click="counting = false">
          ຍົກເລີກ
        </button>
        <button
          type="button"
          class="rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
          :disabled="savingCount"
          @click="submitCount"
        >
          {{ savingCount ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກການນັບ' }}
        </button>
      </div>
    </div>

    <div class="overflow-x-auto rounded-2xl border border-line bg-white shadow-xs">
      <div v-if="loading" class="p-8 text-center text-xs text-slate-400">
        ກຳລັງໂຫຼດ...
      </div>

      <table v-else-if="activeTab === 'BALANCES'" class="w-full text-left text-xs">
        <thead class="border-b border-line bg-slate-50 text-[0.68rem] uppercase text-slate-500">
          <tr>
            <th class="px-4 py-3">ສິນຄ້າ</th>
            <th class="px-4 py-3">SKU</th>
            <th class="px-4 py-3 text-right">ຄົງເຫຼືອ</th>
            <th class="px-4 py-3 text-right">ຂັ້ນຕ່ຳ</th>
            <th v-if="counting" class="px-4 py-3 text-right">ຈຳນວນທີ່ນັບໄດ້</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="balances.length === 0">
            <td :colspan="counting ? 5 : 4" class="px-4 py-8 text-center text-slate-400">
              ບໍ່ມີສິນຄ້າທີ່ຕິດຕາມສະຕັອກ
            </td>
          </tr>
          <tr v-for="item in balances" :key="item.variantId" class="border-b border-line/60 last:border-0">
            <td class="px-4 py-2.5 font-bold text-slate-900">
              {{ displayName(item) }}
              <span v-if="item.isLowStock" class="ml-1.5 rounded-md bg-rose-50 px-1.5 py-0.5 text-[0.62rem] font-bold text-rose-600">ໃກ້ໝົດ</span>
            </td>
            <td class="px-4 py-2.5 text-slate-500">{{ item.sku || '-' }}</td>
            <td class="px-4 py-2.5 text-right font-black" :class="item.isLowStock ? 'text-rose-600' : 'text-slate-900'">
              {{ formatMoney(item.quantity) }} <span class="font-normal text-slate-400">{{ item.unitName }}</span>
            </td>
            <td class="px-4 py-2.5 text-right text-slate-500">{{ formatMoney(item.minStock) }}</td>
            <td v-if="counting" class="px-4 py-2 text-right">
              <input
                v-model="counted[item.variantId]"
                inputmode="decimal"
                :placeholder="item.quantity"
                class="h-8 w-28 rounded-lg border border-line px-2 text-right text-xs font-bold focus:border-brand-500 focus:outline-none"
              >
            </td>
          </tr>
        </tbody>
      </table>

      <table v-else class="w-full text-left text-xs">
        <thead class="border-b border-line bg-slate-50 text-[0.68rem] uppercase text-slate-500">
          <tr>
            <th class="px-4 py-3">ວັນທີ</th>
            <th class="px-4 py-3">ສິນຄ້າ</th>
            <th class="px-4 py-3">ປະເພດ</th>
            <th class="px-4 py-3 text-right">ຈຳນວນ</th>
            <th class="px-4 py-3">ໝາຍເຫດ</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="movements.length === 0">
            <td colspan="5" class="px-4 py-8 text-center text-slate-400">
              ຍັງບໍ່ມີການເຄື່ອນໄຫວ
            </td>
          </tr>
          <tr v-for="m in movements" :key="m.id" class="border-b border-line/60 last:border-0">
            <td class="px-4 py-2.5 text-slate-500">{{ new Date(m.createdAt).toLocaleString('lo-LA') }}</td>
            <td class="px-4 py-2.5 font-bold text-slate-900">{{ displayName({ productName: m.variant.productName, variantName: m.variant.name }) }}</td>
            <td class="px-4 py-2.5">{{ movementLabel[m.type] }}</td>
            <td class="px-4 py-2.5 text-right font-black" :class="m.quantityDelta.startsWith('-') ? 'text-rose-600' : 'text-emerald-600'">
              {{ m.quantityDelta.startsWith('-') ? '' : '+' }}{{ m.quantityDelta }}
            </td>
            <td class="px-4 py-2.5 text-slate-500">{{ m.notes || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
