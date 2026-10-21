<script setup lang="ts">
import { errorMessage } from '~/utils/errors'
import { formatMoney } from '~/utils/money'
import type { PosSale, PosSaleList, PosSaleListItem, PosSessionList, PosSessionListItem, PosSessionSummary } from '~/types/api'

definePageMeta({
  layout: 'default',
})

useHead({
  title: 'ປະຫວັດການຂາຍ ແລະ ກະຂາຍ (POS History) - SME Flow',
})

const api = useApiClient()
const toast = useToast()

const activeTab = ref<'SALES' | 'SESSIONS'>('SALES')
const loading = ref(true)

// Sales data
const sales = ref<PosSaleListItem[]>([])
const salesTotal = ref(0)
const salesPage = ref(1)
const salesLimit = ref(20)
const salesSearch = ref('')

// Sessions data
const sessions = ref<PosSessionListItem[]>([])
const sessionsTotal = ref(0)

// View Details Modal
const selectedSale = ref<PosSale | null>(null)
const selectedSessionSummary = ref<PosSessionSummary | null>(null)
const loadingDetail = ref(false)

const fetchSales = async () => {
  loading.value = true
  try {
    const q = salesSearch.value.trim()
    const res = await api.get<PosSaleList>(`/pos/sales?page=${salesPage.value}&limit=${salesLimit.value}${q ? `&q=${encodeURIComponent(q)}` : ''}`)
    sales.value = res.items || []
    salesTotal.value = res.total || 0
  } catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດໂຫຼດປະຫວັດການຂາຍໄດ້'))
  } finally {
    loading.value = false
  }
}

const fetchSessions = async () => {
  loading.value = true
  try {
    const res = await api.get<PosSessionList>('/pos/sessions?limit=50')
    sessions.value = res.items || []
    sessionsTotal.value = res.total || 0
  } catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດໂຫຼດປະຫວັດກະຂາຍໄດ້'))
  } finally {
    loading.value = false
  }
}

const onTabChange = (tab: 'SALES' | 'SESSIONS') => {
  activeTab.value = tab
  if (tab === 'SALES') {
    fetchSales()
  } else {
    fetchSessions()
  }
}

const viewSaleDetails = async (saleId: string) => {
  loadingDetail.value = true
  try {
    const sale = await api.get<PosSale>(`/pos/sales/${saleId}`)
    selectedSale.value = sale
  } catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດດຶງລາຍລະອຽດໃບບິນໄດ້'))
  } finally {
    loadingDetail.value = false
  }
}

const viewSessionSummary = async (sessionId: string) => {
  loadingDetail.value = true
  try {
    const summary = await api.get<PosSessionSummary>(`/pos/sessions/${sessionId}/summary`)
    selectedSessionSummary.value = summary
  } catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດດຶງລາຍງານກະຂາຍໄດ້'))
  } finally {
    loadingDetail.value = false
  }
}

const printCurrent = () => {
  window.print()
}

onMounted(() => {
  fetchSales()
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/pos"
          class="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs"
        >
          ←
        </NuxtLink>
        <div>
          <h1 class="text-xl font-black text-slate-900">ປະຫວັດການຂາຍ ແລະ ກະຂາຍ (POS History)</h1>
          <p class="text-xs text-slate-500">ກວດສອບບິນຍ້ອນຫຼັງ ແລະ ບົດລາຍງານ Z-Report ຂອງແຕ່ລະກະ</p>
        </div>
      </div>

      <!-- Tab Switcher -->
      <div class="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
        <button
          type="button"
          class="rounded-lg px-4 py-1.5 text-xs font-bold transition"
          :class="activeTab === 'SALES' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'"
          @click="onTabChange('SALES')"
        >
          🧾 ລາຍການບິນຂາຍ (Sales)
        </button>
        <button
          type="button"
          class="rounded-lg px-4 py-1.5 text-xs font-bold transition"
          :class="activeTab === 'SESSIONS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'"
          @click="onTabChange('SESSIONS')"
        >
          📊 ກະຂາຍ / Z-Report (Shifts)
        </button>
      </div>
    </div>

    <!-- TAB 1: SALES LIST -->
    <div v-if="activeTab === 'SALES'" class="space-y-3">
      <!-- Search filter -->
      <div class="flex items-center gap-2">
        <div class="relative flex-1 max-w-sm">
          <input
            v-model="salesSearch"
            type="search"
            placeholder="ຄົ້ນຫາເລກບິນ, ຊື່ລູກຄ້າ..."
            class="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
            @keydown.enter="fetchSales"
          >
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
        </div>
        <button
          type="button"
          class="h-10 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white hover:bg-slate-800 transition"
          @click="fetchSales"
        >
          ຄົ້ນຫາ
        </button>
      </div>

      <!-- Sales Table -->
      <div class="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold">
              <tr>
                <th class="py-3 px-4">ເລກທີບິນ (Invoice)</th>
                <th class="py-3 px-4">ເວລາຂາຍ (Date)</th>
                <th class="py-3 px-4">ສາຂາ (Branch)</th>
                <th class="py-3 px-4">ລູກຄ້າ (Customer)</th>
                <th class="py-3 px-4 text-right">ຈຳນວນລາຍການ</th>
                <th class="py-3 px-4 text-right">ຍອດຊຳລະ (Total)</th>
                <th class="py-3 px-4 text-center">ການຊຳລະ</th>
                <th class="py-3 px-4 text-center">ຈັດການ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="loading" class="text-center text-slate-400 py-8">
                <td colspan="8" class="py-8">ກຳລັງໂຫຼດຂໍ້ມູນ...</td>
              </tr>
              <tr v-else-if="sales.length === 0" class="text-center text-slate-400 py-8">
                <td colspan="8" class="py-8">ບໍ່ມີລາຍການຂາຍ</td>
              </tr>
              <tr v-for="s in sales" :key="s.id" class="hover:bg-slate-50/50 transition">
                <td class="py-3 px-4 font-black text-brand-600 font-mono">{{ s.saleNumber }}</td>
                <td class="py-3 px-4 text-slate-500">{{ new Date(s.soldAt).toLocaleString('lo-LA') }}</td>
                <td class="py-3 px-4 font-bold text-slate-800">{{ s.branch?.name }}</td>
                <td class="py-3 px-4 text-slate-600">{{ s.customerName || 'ລູກຄ້າທົ່ວໄປ' }}</td>
                <td class="py-3 px-4 text-right font-bold">{{ s.itemCount }}</td>
                <td class="py-3 px-4 text-right font-black text-slate-900">{{ formatMoney(s.grandTotal) }} ₭</td>
                <td class="py-3 px-4 text-center">
                  <span
                    v-for="p in s.payments"
                    :key="p.method"
                    class="inline-block rounded-md px-2 py-0.5 text-[0.65rem] font-bold"
                    :class="p.method === 'CASH' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'"
                  >
                    {{ p.method === 'CASH' ? 'ເງິນສົດ' : 'ໂອນ' }}
                  </span>
                </td>
                <td class="py-3 px-4 text-center">
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[0.7rem] font-bold text-slate-700 hover:bg-slate-50"
                    @click="viewSaleDetails(s.id)"
                  >
                    ເບິ່ງໃບບິນ 🧾
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TAB 2: SHIFT SESSIONS (Z-REPORTS) -->
    <div v-else-if="activeTab === 'SESSIONS'" class="space-y-3">
      <div class="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold">
              <tr>
                <th class="py-3 px-4">ເລກທີກະ (Shift)</th>
                <th class="py-3 px-4">ສາຂາ / ເຄົາເຕີ້</th>
                <th class="py-3 px-4">ເວລາເປີດ - ປິດ</th>
                <th class="py-3 px-4 text-right">ເງິນເປີດກະ</th>
                <th class="py-3 px-4 text-right">ຍອດຂາຍລວມ</th>
                <th class="py-3 px-4 text-right">ເງິນທີ່ຄວນມີ</th>
                <th class="py-3 px-4 text-center">ສ່ວນຕ່າງ (Over/Short)</th>
                <th class="py-3 px-4 text-center">ສະຖານະ</th>
                <th class="py-3 px-4 text-center">Z-Report</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="loading" class="text-center text-slate-400 py-8">
                <td colspan="9" class="py-8">ກຳລັງໂຫຼດຂໍ້ມູນ...</td>
              </tr>
              <tr v-else-if="sessions.length === 0" class="text-center text-slate-400 py-8">
                <td colspan="9" class="py-8">ບໍ່ມີປະຫວັດກະຂາຍ</td>
              </tr>
              <tr v-for="sess in sessions" :key="sess.id" class="hover:bg-slate-50/50 transition">
                <td class="py-3 px-4 font-black font-mono text-slate-900">{{ sess.sessionNumber }}</td>
                <td class="py-3 px-4 text-slate-700">
                  <span class="font-bold">{{ sess.branch?.name }}</span>
                  <span class="text-slate-400"> ({{ sess.register?.name }})</span>
                </td>
                <td class="py-3 px-4 text-[0.7rem] text-slate-500">
                  <div>{{ new Date(sess.openedAt).toLocaleDateString('lo-LA') }} {{ new Date(sess.openedAt).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' }) }}</div>
                  <div v-if="sess.closedAt" class="text-slate-400">
                    ເຖິງ {{ new Date(sess.closedAt).toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' }) }}
                  </div>
                </td>
                <td class="py-3 px-4 text-right font-bold text-slate-700">{{ formatMoney(sess.openingCash) }} ₭</td>
                <td class="py-3 px-4 text-right font-black text-brand-600">{{ formatMoney(sess.totalNetSales) }} ₭</td>
                <td class="py-3 px-4 text-right font-bold text-slate-900">
                  {{ sess.expectedCash ? `${formatMoney(sess.expectedCash)} ₭` : '-' }}
                </td>
                <td class="py-3 px-4 text-center font-bold">
                  <template v-if="sess.cashDifference !== null">
                    <span
                      class="rounded-md px-1.5 py-0.5 text-[0.68rem]"
                      :class="{
                        'bg-emerald-50 text-emerald-700': Number(sess.cashDifference) === 0,
                        'bg-blue-50 text-blue-700': Number(sess.cashDifference) > 0,
                        'bg-rose-50 text-rose-700': Number(sess.cashDifference) < 0,
                      }"
                    >
                      {{ Number(sess.cashDifference) === 0 ? 'ພໍດີ' : `${Number(sess.cashDifference) > 0 ? '+' : ''}${formatMoney(sess.cashDifference)}` }}
                    </span>
                  </template>
                  <span v-else class="text-slate-300">-</span>
                </td>
                <td class="py-3 px-4 text-center">
                  <span
                    class="rounded-md px-2 py-0.5 text-[0.65rem] font-black"
                    :class="sess.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'"
                  >
                    {{ sess.status === 'OPEN' ? '🟢 ເປີດຢູ່' : 'ປິດແລ້ວ' }}
                  </span>
                </td>
                <td class="py-3 px-4 text-center">
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[0.7rem] font-bold text-slate-700 hover:bg-slate-50"
                    @click="viewSessionSummary(sess.id)"
                  >
                    ສະຫຼຸບຍອດ 📊
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- MODAL: SALE DETAILS RECEIPT -->
    <div
      v-if="selectedSale"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center">
        <div class="flex justify-between items-center pb-2 border-b border-slate-100">
          <span class="text-xs font-bold text-slate-400">ລາຍລະອຽດໃບບິນ</span>
          <button type="button" class="text-slate-400 hover:text-slate-600" @click="selectedSale = null">✕</button>
        </div>

        <div class="my-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-left text-xs font-mono space-y-1.5">
          <div class="text-center font-bold pb-2 border-b border-dashed border-slate-300">
            <p class="text-sm font-black">SME FLOW POS</p>
            <p class="text-[0.65rem] text-slate-500">{{ selectedSale.branch?.name }}</p>
            <p class="text-[0.62rem] text-slate-400">ເລກບິນ: {{ selectedSale.saleNumber }}</p>
            <p class="text-[0.62rem] text-slate-400">{{ new Date(selectedSale.soldAt).toLocaleString('lo-LA') }}</p>
          </div>

          <div class="py-2 border-b border-dashed border-slate-300 space-y-1">
            <div v-for="item in selectedSale.items" :key="item.id" class="flex justify-between">
              <span>{{ item.productName }} x{{ item.quantity }}</span>
              <span>{{ formatMoney(item.totalAmount) }}</span>
            </div>
          </div>

          <div class="pt-1 space-y-1">
            <div class="flex justify-between font-bold">
              <span>ຍອດລວມ (Total):</span>
              <span>{{ formatMoney(selectedSale.grandTotal) }} ₭</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>ຮັບເງິນມາ:</span>
              <span>{{ formatMoney(selectedSale.paidAmount) }} ₭</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>ເງິນທອນ:</span>
              <span>{{ formatMoney(selectedSale.changeAmount) }} ₭</span>
            </div>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            @click="printCurrent"
          >
            🖨️ ພິມໃບບິນ
          </button>
          <button
            type="button"
            class="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
            @click="selectedSale = null"
          >
            ປິດ
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: Z-REPORT SUMMARY -->
    <div
      v-if="selectedSessionSummary"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div class="flex justify-between items-center pb-2 border-b border-slate-100">
          <div>
            <h3 class="text-sm font-black text-slate-900">ໃບສະຫຼຸບຍອດກະ (Z-Report)</h3>
            <p class="text-[0.65rem] text-slate-400">{{ selectedSessionSummary.sessionNumber }}</p>
          </div>
          <button type="button" class="text-slate-400 hover:text-slate-600" @click="selectedSessionSummary = null">✕</button>
        </div>

        <div class="my-4 space-y-3 text-xs font-mono">
          <div class="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-1.5">
            <div class="flex justify-between">
              <span class="text-slate-500">ສາຂາ / ເຄົາເຕີ້:</span>
              <span class="font-bold">{{ selectedSessionSummary.branch?.name }} ({{ selectedSessionSummary.register?.name }})</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">ເງິນເປີດກະ (Float):</span>
              <span class="font-bold">{{ formatMoney(selectedSessionSummary.openingCash) }} ₭</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-500">ຈຳນວນບິນຂາຍ:</span>
              <span class="font-bold">{{ selectedSessionSummary.salesCount }} ບິນ</span>
            </div>
            <div class="flex justify-between text-emerald-700">
              <span>ຍອດຂາຍເງິນສົດ:</span>
              <span class="font-bold">{{ formatMoney(selectedSessionSummary.cashSales) }} ₭</span>
            </div>
            <div class="flex justify-between text-blue-700">
              <span>ຍອດຂາຍໂອນ:</span>
              <span class="font-bold">{{ formatMoney(selectedSessionSummary.bankSales) }} ₭</span>
            </div>
            <div class="flex justify-between pt-1 border-t border-slate-200 font-bold text-slate-900">
              <span>ຍອດຂາຍລວມສຸດທິ:</span>
              <span>{{ formatMoney(selectedSessionSummary.netSales) }} ₭</span>
            </div>
          </div>

          <div class="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-1.5">
            <div class="flex justify-between font-bold text-amber-950">
              <span>ເງິນສົດທີ່ຄວນມີໃນລິ້ນຊັກ:</span>
              <span>{{ formatMoney(selectedSessionSummary.expectedCash) }} ₭</span>
            </div>
            <div v-if="selectedSessionSummary.closingCashCount" class="flex justify-between text-slate-700">
              <span>ເງິນສົດຕົວຈິງທີ່ນັບໄດ້:</span>
              <span class="font-bold">{{ formatMoney(selectedSessionSummary.closingCashCount) }} ₭</span>
            </div>
            <div v-if="selectedSessionSummary.cashDifference !== null" class="flex justify-between font-bold">
              <span>ສ່ວນຕ່າງ (Over/Short):</span>
              <span :class="Number(selectedSessionSummary.cashDifference) >= 0 ? 'text-emerald-700' : 'text-rose-700'">
                {{ formatMoney(selectedSessionSummary.cashDifference) }} ₭
              </span>
            </div>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            @click="printCurrent"
          >
            🖨️ ພິມ Z-Report
          </button>
          <button
            type="button"
            class="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
            @click="selectedSessionSummary = null"
          >
            ປິດ
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
