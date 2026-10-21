<script setup lang="ts">
import type { Customer, CustomerGroup, CustomerList, GroupBoundProduct, Product, ProductList } from '~/types/api'
import type { TabItem } from '~/types/ui'
import { formatMoney, sanitizeDecimalInput } from '~/utils/money'

const api = useApiClient()
const toast = useToast()

definePageMeta({ layout: 'default' })
useHead({ title: 'ຈັດການລູກຄ້າ ແລະ ກຸ່ມລູກຄ້າ · SME Flow' })

// State
const activeTab = ref<'customers' | 'groups'>('customers')
const tabs = computed<TabItem[]>(() => [
  { key: 'customers', label: 'ລາຍຊື່ລູກຄ້າ', count: totalCustomers.value },
  { key: 'groups', label: 'ກຸ່ມລູກຄ້າ ແລະ ລາຄາພິເສດ', count: groups.value.length },
])

const loading = ref(true)
const saving = ref(false)
const customers = ref<Customer[]>([])
const groups = ref<CustomerGroup[]>([])
const totalCustomers = ref(0)

// Filters
const search = ref('')
const selectedGroupFilter = ref('')
const statusFilter = ref<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE')

// Customer Modal
const showCustomerModal = ref(false)
const isEditingCustomer = ref(false)
const editingCustomerId = ref<string | null>(null)
const customerForm = reactive({
  name: '',
  phone: '',
  email: '',
  groupId: '',
  code: '',
  taxNumber: '',
  address: '',
  creditLimit: '0',
  notes: '',
})

// Group Modal
const showGroupModal = ref(false)
const isEditingGroup = ref(false)
const editingGroupId = ref<string | null>(null)
const groupForm = reactive({
  name: '',
  code: '',
  description: '',
  discountPercent: 0,
  isDefault: false,
})

// Group Products Binding Modal
type BoundProductItem = {
  variantId: string
  productId: string
  productName: string
  variantName: string
  size?: string
  color?: string
  sku?: string
  normalPrice: string
  groupPrice: string
  unitName: string
  categoryName: string
}

const showBindProductsModal = ref(false)
const selectedGroupForBinding = ref<CustomerGroup | null>(null)
const boundProducts = ref<BoundProductItem[]>([])
const loadingBoundProducts = ref(false)
const savingBoundProducts = ref(false)
const catalogProducts = ref<Product[]>([])
const productSearchQuery = ref('')

const fetchGroups = async () => {
  try {
    const res = await api.get<CustomerGroup[]>('/customer-groups')
    groups.value = res
  } catch (err: any) {
    toast.error('ຜິດພາດ', err.message || 'ບໍ່ສາມາດດຶງຂໍ້ມູນກຸ່ມລູກຄ້າໄດ້')
  }
}

const fetchCustomers = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (search.value.trim()) params.set('q', search.value.trim())
    if (selectedGroupFilter.value) params.set('groupId', selectedGroupFilter.value)
    if (statusFilter.value !== 'ALL') params.set('active', String(statusFilter.value === 'ACTIVE'))
    params.set('limit', '100')

    const res = await api.get<CustomerList>(`/customers?${params.toString()}`)
    customers.value = res.items
    totalCustomers.value = res.total
  } catch (err: any) {
    toast.error('ຜິດພາດ', err.message || 'ບໍ່ສາມາດດຶງຂໍ້ມູນລູກຄ້າໄດ້')
  } finally {
    loading.value = false
  }
}

const loadAll = async () => {
  await Promise.all([fetchGroups(), fetchCustomers()])
}

onMounted(loadAll)

// Customer CRUD
const openCreateCustomerModal = () => {
  isEditingCustomer.value = false
  editingCustomerId.value = null
  const defaultGroup = groups.value.find(g => g.isDefault)
  customerForm.name = ''
  customerForm.phone = ''
  customerForm.email = ''
  customerForm.groupId = defaultGroup?.id || ''
  customerForm.code = `CUS-${Math.floor(1000 + Math.random() * 9000)}`
  customerForm.taxNumber = ''
  customerForm.address = ''
  customerForm.creditLimit = '0'
  customerForm.notes = ''
  showCustomerModal.value = true
}

const openEditCustomerModal = (c: Customer) => {
  isEditingCustomer.value = true
  editingCustomerId.value = c.id
  customerForm.name = c.name
  customerForm.phone = c.phone || ''
  customerForm.email = c.email || ''
  customerForm.groupId = c.groupId || ''
  customerForm.code = c.code || ''
  customerForm.taxNumber = c.taxNumber || ''
  customerForm.address = c.address || ''
  customerForm.creditLimit = c.creditLimit || '0'
  customerForm.notes = c.notes || ''
  showCustomerModal.value = true
}

const submitCustomer = async () => {
  if (!customerForm.name.trim()) {
    toast.warning('ກະລຸນາປ້ອນຂໍ້ມູນ', 'ຊື່ລູກຄ້າຕ້ອງບໍ່ຫວ່າງເປົ່າ')
    return
  }
  saving.value = true
  try {
    const payload = {
      name: customerForm.name.trim(),
      phone: customerForm.phone.trim() || undefined,
      email: customerForm.email.trim() || undefined,
      groupId: customerForm.groupId || undefined,
      code: customerForm.code.trim() || undefined,
      taxNumber: customerForm.taxNumber.trim() || undefined,
      address: customerForm.address.trim() || undefined,
      creditLimit: customerForm.creditLimit || '0',
      notes: customerForm.notes.trim() || undefined,
    }

    if (isEditingCustomer.value && editingCustomerId.value) {
      await api.patch(`/customers/${editingCustomerId.value}`, payload)
      toast.success('ສຳເລັດ', 'ອັບເດດຂໍ້ມູນລູກຄ້າຮຽບຮ້ອຍແລ້ວ')
    } else {
      await api.post('/customers', payload)
      toast.success('ສຳເລັດ', 'ເພີ່ມລູກຄ້າໃໝ່ຮຽບຮ້ອຍແລ້ວ')
    }
    showCustomerModal.value = false
    await fetchCustomers()
  } catch (err: any) {
    toast.error('ຜິດພາດ', err.message || 'ບໍ່ສາມາດບັນທຶກຂໍ້ມູນລູກຄ້າໄດ້')
  } finally {
    saving.value = false
  }
}

const deleteCustomer = async (c: Customer) => {
  if (!confirm(`ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບ ຫຼື ປິດການໃຊ້ງານລູກຄ້າ "${c.name}"?`)) return
  try {
    await api.delete(`/customers/${c.id}`)
    toast.success('ສຳເລັດ', 'ລຶບ/ປິດການໃຊ້ງານລູກຄ້າຮຽບຮ້ອຍແລ້ວ')
    await fetchCustomers()
  } catch (err: any) {
    toast.error('ຜິດພາດ', err.message || 'ບໍ່ສາມາດລຶບລູກຄ້າໄດ້')
  }
}

// Group CRUD
const openCreateGroupModal = () => {
  isEditingGroup.value = false
  editingGroupId.value = null
  groupForm.name = ''
  groupForm.code = `GRP_${Math.floor(100 + Math.random() * 900)}`
  groupForm.description = ''
  groupForm.discountPercent = 0
  groupForm.isDefault = false
  showGroupModal.value = true
}

const openEditGroupModal = (g: CustomerGroup) => {
  isEditingGroup.value = true
  editingGroupId.value = g.id
  groupForm.name = g.name
  groupForm.code = g.code
  groupForm.description = g.description || ''
  groupForm.discountPercent = g.discountPercent
  groupForm.isDefault = g.isDefault
  showGroupModal.value = true
}

const submitGroup = async () => {
  if (!groupForm.name.trim() || !groupForm.code.trim()) {
    toast.warning('ກະລຸນາປ້ອນຂໍ້ມູນ', 'ຊື່ ແລະ ລະຫັດກຸ່ມຕ້ອງບໍ່ຫວ່າງເປົ່າ')
    return
  }
  saving.value = true
  try {
    const payload = {
      name: groupForm.name.trim(),
      code: groupForm.code.trim().toUpperCase(),
      description: groupForm.description.trim() || undefined,
      discountPercent: Number(groupForm.discountPercent) || 0,
      isDefault: groupForm.isDefault,
    }

    if (isEditingGroup.value && editingGroupId.value) {
      await api.patch(`/customer-groups/${editingGroupId.value}`, payload)
      toast.success('ສຳເລັດ', 'ອັບເດດກຸ່ມລູກຄ້າຮຽບຮ້ອຍແລ້ວ')
    } else {
      await api.post('/customer-groups', payload)
      toast.success('ສຳເລັດ', 'ເພີ່ມກຸ່ມລູກຄ້າໃໝ່ຮຽບຮ້ອຍແລ້ວ')
    }
    showGroupModal.value = false
    await fetchGroups()
  } catch (err: any) {
    toast.error('ຜິດພາດ', err.message || 'ບໍ່ສາມາດບັນທຶກກຸ່ມລູກຄ້າໄດ້')
  } finally {
    saving.value = false
  }
}

const deleteGroup = async (g: CustomerGroup) => {
  if (!confirm(`ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບກຸ່ມ "${g.name}"? (ລູກຄ້າໃນກຸ່ມນີ້ຈະກາຍເປັນລູກຄ້າທົ່ວໄປ ແລະ ໃຊ້ລາຄາປົກກະຕິ)`)) return
  try {
    await api.delete(`/customer-groups/${g.id}`)
    toast.success('ສຳເລັດ', 'ລຶບກຸ່ມລູກຄ້າຮຽບຮ້ອຍແລ້ວ')
    await fetchGroups()
  } catch (err: any) {
    toast.error('ຜິດພາດ', err.message || 'ບໍ່ສາມາດລຶບກຸ່ມລູກຄ້າໄດ້')
  }
}

// =========================================================================
// BIND PRODUCTS & SPECIAL GROUP PRICING
// =========================================================================

const openBindProductsModal = async (g: CustomerGroup) => {
  selectedGroupForBinding.value = g
  showBindProductsModal.value = true
  loadingBoundProducts.value = true
  productSearchQuery.value = ''
  try {
    const [boundRes, catalogRes] = await Promise.all([
      api.get<GroupBoundProduct[]>(`/customer-groups/${g.id}/products`),
      catalogProducts.value.length === 0 ? api.get<ProductList>('/products?limit=200').catch(() => null) : Promise.resolve(null),
    ])
    boundProducts.value = (boundRes || []).map(bp => ({
      variantId: bp.variantId,
      productId: bp.productId,
      productName: bp.productName,
      variantName: bp.variantName,
      size: bp.size,
      color: bp.color,
      sku: bp.sku,
      normalPrice: bp.normalPrice,
      groupPrice: bp.groupPrice,
      unitName: bp.unitName,
      categoryName: bp.categoryName,
    }))
    if (catalogRes) {
      catalogProducts.value = catalogRes.items || []
    }
  } catch (err: any) {
    toast.error('ຜິດພາດ', err.message || 'ບໍ່ສາມາດໂຫຼດຂໍ້ມູນສິນຄ້າຂອງກຸ່ມໄດ້')
  } finally {
    loadingBoundProducts.value = false
  }
}

const availableVariants = computed(() => {
  const list: Array<{
    variantId: string
    productId: string
    productName: string
    variantName: string
    sku: string
    normalPrice: string
    unitName: string
    categoryName: string
  }> = []

  const boundVariantIds = new Set(boundProducts.value.map(bp => bp.variantId))
  const q = productSearchQuery.value.trim().toLowerCase()

  catalogProducts.value.forEach((p) => {
    (p.variants || []).forEach((v) => {
      if (boundVariantIds.has(v.id)) return // already bound
      const vName = v.name || (v.size || v.color ? `${v.size || ''} ${v.color || ''}`.trim() : '')
      const match = !q || p.name.toLowerCase().includes(q) || vName.toLowerCase().includes(q) || (v.sku && v.sku.toLowerCase().includes(q))
      if (match) {
        list.push({
          variantId: v.id,
          productId: p.id,
          productName: p.name,
          variantName: vName,
          sku: v.sku || '',
          normalPrice: v.sellingPrice,
          unitName: p.unit?.name || 'ອັນ',
          categoryName: p.category?.name || 'ທົ່ວໄປ',
        })
      }
    })
  })

  return list
})

const addVariantToGroup = (item: {
  variantId: string
  productId: string
  productName: string
  variantName: string
  sku: string
  normalPrice: string
  unitName: string
  categoryName: string
}) => {
  boundProducts.value.unshift({
    variantId: item.variantId,
    productId: item.productId,
    productName: item.productName,
    variantName: item.variantName,
    sku: item.sku,
    normalPrice: item.normalPrice,
    groupPrice: item.normalPrice, // defaults to normalPrice for user to edit
    unitName: item.unitName,
    categoryName: item.categoryName,
  })
}

const removeVariantFromGroup = (variantId: string) => {
  boundProducts.value = boundProducts.value.filter(bp => bp.variantId !== variantId)
}

const applyDiscountPercentToAll = (pct: number) => {
  boundProducts.value.forEach((bp) => {
    const normal = Number(bp.normalPrice) || 0
    if (normal > 0) {
      const discounted = Math.round(normal * (1 - pct / 100))
      bp.groupPrice = String(discounted)
    }
  })
}

const saveBoundProducts = async () => {
  if (!selectedGroupForBinding.value) return
  savingBoundProducts.value = true
  try {
    const items = boundProducts.value
      .filter(bp => bp.groupPrice && Number(bp.groupPrice.replace(/,/g, '')) > 0)
      .map(bp => ({
        variantId: bp.variantId,
        price: bp.groupPrice.replace(/,/g, ''),
      }))

    await api.put(`/customer-groups/${selectedGroupForBinding.value.id}/products`, { items })
    toast.success('ສຳເລັດ', `ບັນທຶກລາຄາສິນຄ້າສຳລັບກຸ່ມ "${selectedGroupForBinding.value.name}" ຮຽບຮ້ອຍແລ້ວ`)
    showBindProductsModal.value = false
    await fetchGroups()
  } catch (err: any) {
    toast.error('ຜິດພາດ', err.message || 'ບໍ່ສາມາດບັນທຶກລາຄາສິນຄ້າໄດ້')
  } finally {
    savingBoundProducts.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header with PageHeader -->
    <PageHeader
      title="ຈັດການລູກຄ້າ ແລະ ກຸ່ມລູກຄ້າ"
      eyebrow="Customers & Group Pricing"
      description="ຈັດການຖານຂໍ້ມູນລູກຄ້າ, ແຍກກຸ່ມລູກຄ້າ (VIP, ລາຄາສົ່ງ, ທົ່ວໄປ), ແລະ ກຳນົດສ່ວນຫຼຸດ/ລາຄາພິເສດ"
    >
      <template #actions>
        <BaseButton
          v-if="activeTab === 'customers'"
          variant="primary"
          @click="openCreateCustomerModal()"
        >
          <template #icon><AdminIcon name="plus" class="size-4" /></template>
          ເພີ່ມລູກຄ້າໃໝ່
        </BaseButton>
        <BaseButton
          v-else
          variant="primary"
          @click="openCreateGroupModal()"
        >
          <template #icon><AdminIcon name="plus" class="size-4" /></template>
          ເພີ່ມກຸ່ມລູກຄ້າໃໝ່
        </BaseButton>
      </template>
    </PageHeader>

    <!-- Navigation Tabs -->
    <BaseTabs v-model="activeTab" :tabs="tabs" />

    <!-- ==================================================== -->
    <!-- TAB 1: CUSTOMERS -->
    <!-- ==================================================== -->
    <div v-if="activeTab === 'customers'" class="space-y-4">
      <!-- Filter Bar -->
      <section class="rounded-2xl border border-line bg-white p-3.5 shadow-card">
        <div class="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div class="relative flex-1 min-w-0">
            <AdminIcon name="search" class="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
            <input
              v-model="search"
              type="search"
              class="h-9.5 w-full rounded-xl border border-line bg-canvas/40 pr-4 pl-10 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#5b4cf5] focus:bg-white focus:outline-none"
              placeholder="ຄົ້ນຫາຊື່, ເບີໂທ, ຫຼື ລະຫັດລູກຄ້າ..."
              @keyup.enter="fetchCustomers"
            >
          </div>

          <div class="w-full sm:w-56 shrink-0">
            <select
              v-model="selectedGroupFilter"
              class="h-9.5 w-full rounded-xl border border-line bg-white px-3 text-xs text-slate-700 focus:border-[#5b4cf5] focus:outline-none"
              @change="fetchCustomers"
            >
              <option value="">ທຸກກຸ່ມລູກຄ້າ</option>
              <option v-for="g in groups" :key="g.id" :value="g.id">
                {{ g.name }} {{ g.discountPercent > 0 ? `(ຫຼຸດ ${g.discountPercent}%)` : '' }}
              </option>
            </select>
          </div>

          <button
            type="button"
            class="focus-ring flex h-9.5 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-4 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            @click="fetchCustomers"
          >
            <AdminIcon name="filter" class="size-3.5 text-slate-400" />
            <span>ຄົ້ນຫາ</span>
          </button>
        </div>
      </section>

      <!-- Customers Table -->
      <section class="rounded-2xl border border-line bg-white shadow-card overflow-hidden">
        <div v-if="loading" class="grid min-h-60 place-items-center text-[#5b4cf5]">
          <LoadingSpinner />
        </div>

        <div v-else-if="!customers.length" class="p-12 text-center">
          <span class="mx-auto grid size-14 place-items-center rounded-2xl bg-[#ede9fe] text-[#5b4cf5] shadow-2xs">
            <AdminIcon name="users" class="size-7" />
          </span>
          <p class="mt-4 text-sm font-bold text-slate-900">ບໍ່ພົບຂໍ້ມູນລູກຄ້າ</p>
          <p class="mt-1 text-xs text-slate-500">ລອງປ່ຽນຄຳຄົ້ນຫາ ຫຼື ເພີ່ມລູກຄ້າໃໝ່ເຂົ້າສູ່ລະບົບ</p>
          <button
            class="focus-ring mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#5b4cf5] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#4a3bd9] transition"
            @click="openCreateCustomerModal()"
          >
            <AdminIcon name="plus" class="size-4" />
            <span>ເພີ່ມລູກຄ້າທຳອິດ</span>
          </button>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="border-b border-line bg-slate-50/75 text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th class="p-3.5 pl-5">ລະຫັດ / ຊື່ລູກຄ້າ</th>
                <th class="p-3.5">ເບີໂທຕິດຕໍ່</th>
                <th class="p-3.5">ກຸ່ມລູກຄ້າ (Pricing Tier)</th>
                <th class="p-3.5">ອີເມວ</th>
                <th class="p-3.5">ໝາຍເຫດ</th>
                <th class="p-3.5">ສະຖານະ</th>
                <th class="p-3.5 pr-5 text-right">ຈັດການ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="c in customers" :key="c.id" class="hover:bg-slate-50/60 transition">
                <td class="p-3.5 pl-5">
                  <div class="font-bold text-slate-900 text-sm">{{ c.name }}</div>
                  <div class="text-[0.65rem] text-slate-400 font-mono">{{ c.code || '—' }}</div>
                </td>
                <td class="p-3.5">
                  <span v-if="c.phone" class="font-semibold text-slate-800">{{ c.phone }}</span>
                  <span v-else class="text-slate-400">—</span>
                </td>
                <td class="p-3.5">
                  <span
                    v-if="c.group"
                    class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold border"
                    :class="c.group.code === 'VIP'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : c.group.code === 'WHOLESALE'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'"
                  >
                    <span>✦ {{ c.group.name }}</span>
                    <span v-if="c.group.discountPercent > 0" class="text-[0.65rem] opacity-75 font-normal">
                      (ຫຼຸດ {{ c.group.discountPercent }}%)
                    </span>
                  </span>
                  <span v-else class="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                    ລູກຄ້າທົ່ວໄປ (Default)
                  </span>
                </td>
                <td class="p-3.5 text-slate-600">{{ c.email || '—' }}</td>
                <td class="p-3.5 text-slate-500 max-w-xs truncate">{{ c.notes || '—' }}</td>
                <td class="p-3.5">
                  <span
                    class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.68rem] font-bold"
                    :class="c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'"
                  >
                    <span class="size-1.5 rounded-full" :class="c.active ? 'bg-emerald-500' : 'bg-slate-400'" />
                    {{ c.active ? 'ໃຊ້ງານ' : 'ປິດໃຊ້' }}
                  </span>
                </td>
                <td class="p-3.5 pr-5 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      class="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
                      title="ແກ້ໄຂ"
                      @click="openEditCustomerModal(c)"
                    >
                      <AdminIcon name="edit" class="size-4" />
                    </button>
                    <button
                      type="button"
                      class="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      title="ລຶບ"
                      @click="deleteCustomer(c)"
                    >
                      <AdminIcon name="trash" class="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- ==================================================== -->
    <!-- TAB 2: CUSTOMER GROUPS -->
    <!-- ==================================================== -->
    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="g in groups"
          :key="g.id"
          class="rounded-2xl border border-line bg-white p-5 shadow-card hover:shadow-md transition flex flex-col justify-between"
        >
          <div>
            <div class="flex items-start justify-between gap-2">
              <div>
                <span class="text-[0.65rem] font-extrabold uppercase tracking-wider text-brand-600 font-mono">{{ g.code }}</span>
                <h3 class="text-base font-black text-slate-900 mt-0.5">{{ g.name }}</h3>
              </div>
              <span
                v-if="g.isDefault"
                class="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[0.62rem] font-bold"
              >
                ຄ່າເລີ່ມຕົ້ນ
              </span>
            </div>

            <p class="mt-2 text-xs text-slate-500 min-h-8">
              {{ g.description || 'ກຸ່ມລູກຄ້າສຳລັບກຳນົດນະໂຍບາຍລາຄາພິເສດ ແລະ ສ່ວນຫຼຸດ' }}
            </p>

            <div class="mt-4 pt-4 border-t border-line space-y-2">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-500 font-medium">ສ່ວນຫຼຸດພື້ນຖານ:</span>
                <span class="font-extrabold text-slate-900">
                  {{ g.discountPercent > 0 ? `${g.discountPercent}%` : '0% (ຫຼື ລາຄາເຈາະຈົງ)' }}
                </span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-500 font-medium">ຈຳນວນລູກຄ້າໃນກຸ່ມ:</span>
                <span class="font-bold text-brand-600">{{ g.customerCount || 0 }} ຄົນ</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-500 font-medium">ສິນຄ້າທີ່ຜູກລາຄາພິເສດ:</span>
                <span class="font-bold text-emerald-600">{{ g.boundProductsCount || 0 }} ລາຍການ</span>
              </div>
            </div>
          </div>

          <div class="mt-5 pt-3 border-t border-line flex items-center justify-between gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-xs"
              @click="openBindProductsModal(g)"
            >
              <span>📦 ຜູກສິນຄ້າ</span>
              <span
                v-if="(g.boundProductsCount || 0) > 0"
                class="rounded-full bg-indigo-600 px-1.5 py-0.2 text-[0.62rem] font-bold text-white leading-tight"
              >
                {{ g.boundProductsCount }}
              </span>
            </button>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                @click="openEditGroupModal(g)"
              >
                ແກ້ໄຂ
              </button>
              <button
                type="button"
                class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                @click="deleteGroup(g)"
              >
                ລຶບ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================================================== -->
    <!-- MODAL: ADD / EDIT CUSTOMER -->
    <!-- ==================================================== -->
    <div
      v-if="showCustomerModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div class="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5">
        <div class="flex items-center justify-between border-b border-line pb-3">
          <h2 class="text-base font-black text-slate-900">
            {{ isEditingCustomer ? 'ແກ້ໄຂຂໍ້ມູນລູກຄ້າ' : 'ເພີ່ມລູກຄ້າໃໝ່' }}
          </h2>
          <button
            type="button"
            class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            @click="showCustomerModal = false"
          >
            ✕
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="submitCustomer">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ຊື່ລູກຄ້າ <span class="text-rose-500">*</span></label>
            <input
              v-model="customerForm.name"
              type="text"
              required
              class="w-full h-10 rounded-xl border border-line px-3 text-xs focus:border-[#5b4cf5] focus:outline-none"
              placeholder="ເຊັ່ນ: ທ້າວ ສົມພອນ ແກ້ວມະນີ"
            >
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">ເບີໂທຕິດຕໍ່</label>
              <input
                v-model="customerForm.phone"
                type="tel"
                class="w-full h-10 rounded-xl border border-line px-3 text-xs focus:border-[#5b4cf5] focus:outline-none"
                placeholder="020 XXXXXXXX"
              >
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">ກຸ່ມລູກຄ້າ</label>
              <select
                v-model="customerForm.groupId"
                class="w-full h-10 rounded-xl border border-line bg-white px-3 text-xs focus:border-[#5b4cf5] focus:outline-none"
              >
                <option value="">ລູກຄ້າທົ່ວໄປ (ໃຊ້ລາຄາປົກກະຕິ Default)</option>
                <option v-for="g in groups" :key="g.id" :value="g.id">
                  ✦ {{ g.name }} {{ g.discountPercent > 0 ? `(ຫຼຸດ ${g.discountPercent}%)` : '' }}
                </option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">ລະຫັດລູກຄ້າ</label>
              <input
                v-model="customerForm.code"
                type="text"
                class="w-full h-10 rounded-xl border border-line px-3 text-xs focus:border-[#5b4cf5] focus:outline-none"
                placeholder="CUS-001"
              >
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">ອີເມວ</label>
              <input
                v-model="customerForm.email"
                type="email"
                class="w-full h-10 rounded-xl border border-line px-3 text-xs focus:border-[#5b4cf5] focus:outline-none"
                placeholder="customer@email.com"
              >
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ທີ່ຢູ່</label>
            <input
              v-model="customerForm.address"
              type="text"
              class="w-full h-10 rounded-xl border border-line px-3 text-xs focus:border-[#5b4cf5] focus:outline-none"
              placeholder="ບ້ານ, ເມືອງ, ແຂວງ"
            >
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ໝາຍເຫດ</label>
            <textarea
              v-model="customerForm.notes"
              rows="2"
              class="w-full rounded-xl border border-line p-2.5 text-xs focus:border-[#5b4cf5] focus:outline-none"
              placeholder="ໝາຍເຫດເພີ່ມເຕີມ..."
            />
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
            <button
              type="button"
              class="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              @click="showCustomerModal = false"
            >
              ຍົກເລີກ
            </button>
            <button
              type="submit"
              class="rounded-xl bg-[#5b4cf5] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#4a3bd9] transition disabled:opacity-50"
              :disabled="saving"
            >
              {{ saving ? 'ກຳລັງບັນທຶກ...' : (isEditingCustomer ? 'ບັນທຶກການແກ້ໄຂ' : 'ເພີ່ມລູກຄ້າ') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================================================== -->
    <!-- MODAL: ADD / EDIT CUSTOMER GROUP -->
    <!-- ==================================================== -->
    <div
      v-if="showGroupModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div class="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
        <div class="flex items-center justify-between border-b border-line pb-3">
          <h2 class="text-base font-black text-slate-900">
            {{ isEditingGroup ? 'ແກ້ໄຂກຸ່ມລູກຄ້າ' : 'ເພີ່ມກຸ່ມລູກຄ້າໃໝ່' }}
          </h2>
          <button
            type="button"
            class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            @click="showGroupModal = false"
          >
            ✕
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="submitGroup">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ຊື່ກຸ່ມ <span class="text-rose-500">*</span></label>
            <input
              v-model="groupForm.name"
              type="text"
              required
              class="w-full h-10 rounded-xl border border-line px-3 text-xs focus:border-[#5b4cf5] focus:outline-none"
              placeholder="ເຊັ່ນ: ສະມາຊິກ VIP, ລູກຄ້າຂາຍສົ່ງ"
            >
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">ລະຫັດກຸ່ມ <span class="text-rose-500">*</span></label>
              <input
                v-model="groupForm.code"
                type="text"
                required
                class="w-full h-10 rounded-xl border border-line px-3 text-xs uppercase font-mono focus:border-[#5b4cf5] focus:outline-none"
                placeholder="VIP / WHOLESALE"
                :disabled="isEditingGroup"
              >
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">ສ່ວນຫຼຸດພື້ນຖານ (%)</label>
              <input
                v-model.number="groupForm.discountPercent"
                type="number"
                min="0"
                max="100"
                step="0.5"
                class="w-full h-10 rounded-xl border border-line px-3 text-xs focus:border-[#5b4cf5] focus:outline-none"
                placeholder="0"
              >
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ລາຍລະອຽດກຸ່ມ</label>
            <textarea
              v-model="groupForm.description"
              rows="2"
              class="w-full rounded-xl border border-line p-2.5 text-xs focus:border-[#5b4cf5] focus:outline-none"
              placeholder="ຄຳອະທິບາຍກ່ຽວກັບກຸ່ມລູກຄ້ານີ້..."
            />
          </div>


          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
            <button
              type="button"
              class="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              @click="showGroupModal = false"
            >
              ຍົກເລີກ
            </button>
            <button
              type="submit"
              class="rounded-xl bg-[#5b4cf5] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#4a3bd9] transition disabled:opacity-50"
              :disabled="saving"
            >
              {{ saving ? 'ກຳລັງບັນທຶກ...' : (isEditingGroup ? 'ບັນທຶກການແກ້ໄຂ' : 'ເພີ່ມກຸ່ມ') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================================================== -->
    <!-- MODAL: BIND PRODUCTS & SPECIAL GROUP PRICING -->
    <!-- ==================================================== -->
    <div
      v-if="showBindProductsModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div class="relative w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-line px-6 py-4 bg-slate-50/50">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base font-black text-slate-900">
                ຜູກສິນຄ້າ ແລະ ລາຄາພິເສດ
              </h2>
              <span class="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-extrabold text-indigo-700 font-mono">
                {{ selectedGroupForBinding?.name }} ({{ selectedGroupForBinding?.code }})
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-1">
              ສິນຄ້າທີ່ຜູກຢູ່ນີ້ຈະຂາຍຕາມລາຄາກຸ່ມພິເສດ, ສ່ວນສິນຄ້າທີ່ບໍ່ໄດ້ຜູກຈະຂາຍຕາມລາຄາປົກກະຕິ
            </p>
          </div>
          <button
            type="button"
            class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            @click="showBindProductsModal = false"
          >
            ✕
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-6 space-y-5">
          <!-- Search & Add Bar -->
          <div class="space-y-2">
            <label class="block text-xs font-bold text-slate-700">ຄົ້ນຫາ ແລະ ເພີ່ມສິນຄ້າໃສ່ກຸ່ມນີ້</label>
            <div class="relative">
              <input
                v-model="productSearchQuery"
                type="text"
                class="w-full h-11 rounded-xl border border-line pl-10 pr-4 text-xs focus:border-[#5b4cf5] focus:ring-1 focus:ring-[#5b4cf5] focus:outline-none"
                placeholder="ພິມຊື່ສິນຄ້າ, ບາໂຄ້ດ ຫຼື SKU ເພື່ອເລືອກເພີ່ມໃສ່ກຸ່ມ..."
              >
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>

            <!-- Search Results Dropdown -->
            <div
              v-if="productSearchQuery.trim() && availableVariants.length > 0"
              class="max-h-56 overflow-y-auto rounded-xl border border-line bg-white shadow-lg divide-y divide-line"
            >
              <div
                v-for="item in availableVariants.slice(0, 8)"
                :key="item.variantId"
                class="flex items-center justify-between p-3 hover:bg-indigo-50/40 transition cursor-pointer"
                @click="addVariantToGroup(item)"
              >
                <div>
                  <div class="text-xs font-bold text-slate-900">
                    {{ item.productName }}
                    <span v-if="item.variantName" class="text-slate-500 font-normal">({{ item.variantName }})</span>
                  </div>
                  <div class="text-[0.65rem] text-slate-400 font-mono mt-0.5">
                    {{ item.categoryName }} • ຫົວໜ່ວຍ: {{ item.unitName }} <span v-if="item.sku">• SKU: {{ item.sku }}</span>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="text-right">
                    <div class="text-[0.65rem] text-slate-400">ລາຄາປົກກະຕິ</div>
                    <div class="text-xs font-extrabold text-slate-700 font-mono">{{ formatMoney(item.normalPrice) }} ₭</div>
                  </div>
                  <button
                    type="button"
                    class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition"
                  >
                    + ເພີ່ມໃສ່ກຸ່ມ
                  </button>
                </div>
              </div>
            </div>
            <div
              v-else-if="productSearchQuery.trim() && availableVariants.length === 0"
              class="p-3 text-center text-xs text-slate-400 rounded-xl border border-dashed border-line bg-slate-50"
            >
              ບໍ່ພົບສິນຄ້າໃໝ່ທີ່ຍັງບໍ່ໄດ້ຜູກ
            </div>
          </div>

          <!-- Quick Bulk Actions -->
          <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
            <div class="text-xs font-bold text-indigo-900">
              ກຳນົດສ່ວນຫຼຸດດ່ວນທັງໝົດ:
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                class="rounded-lg bg-white border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition shadow-xs"
                @click="applyDiscountPercentToAll(5)"
              >
                -5%
              </button>
              <button
                type="button"
                class="rounded-lg bg-white border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition shadow-xs"
                @click="applyDiscountPercentToAll(10)"
              >
                -10%
              </button>
              <button
                type="button"
                class="rounded-lg bg-white border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition shadow-xs"
                @click="applyDiscountPercentToAll(15)"
              >
                -15%
              </button>
              <button
                type="button"
                class="rounded-lg bg-white border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition shadow-xs"
                @click="applyDiscountPercentToAll(20)"
              >
                -20%
              </button>
              <button
                type="button"
                class="rounded-lg bg-white border border-indigo-200 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition shadow-xs"
                @click="applyDiscountPercentToAll(0)"
              >
                ຣີເຊັດເປັນລາຄາປົກກະຕິ
              </button>
            </div>
          </div>

          <!-- Bound Products Table -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xs font-bold text-slate-700">
                ລາຍການສິນຄ້າທີ່ຜູກລາຄາພິເສດ ({{ boundProducts.length }} ລາຍການ)
              </h3>
            </div>

            <div v-if="loadingBoundProducts" class="py-12 text-center text-xs text-slate-400">
              ກຳລັງໂຫຼດຂໍ້ມູນສິນຄ້າ...
            </div>

            <div
              v-else-if="boundProducts.length === 0"
              class="py-12 text-center rounded-2xl border border-dashed border-line bg-slate-50/50 space-y-2"
            >
              <div class="text-3xl">📦</div>
              <p class="text-xs font-bold text-slate-600">ຍັງບໍ່ມີສິນຄ້າທີ່ຜູກກັບກຸ່ມນີ້ເທື່ອ</p>
              <p class="text-[0.7rem] text-slate-400">
                ຄົ້ນຫາຊື່ສິນຄ້າດ້ານເທິງ ແລ້ວກົດ "ເພີ່ມໃສ່ກຸ່ມ" ເພື່ອກຳນົດລາຄາພິເສດ
              </p>
            </div>

            <div v-else class="overflow-x-auto rounded-2xl border border-line">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-600 border-b border-line text-[0.7rem] font-bold">
                  <tr>
                    <th class="p-3 pl-4">ສິນຄ້າ</th>
                    <th class="p-3 text-right">ລາຄາປົກກະຕິ</th>
                    <th class="p-3 w-48 text-right">ລາຄາກຸ່ມພິເສດ (₭)</th>
                    <th class="p-3 text-center">ສ່ວນຕ່າງ</th>
                    <th class="p-3 pr-4 text-right">ລຶບອອກ</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-line">
                  <tr v-for="bp in boundProducts" :key="bp.variantId" class="hover:bg-slate-50/70 transition">
                    <td class="p-3 pl-4">
                      <div class="font-bold text-slate-900">
                        {{ bp.productName }}
                        <span v-if="bp.variantName" class="text-slate-500 font-normal">({{ bp.variantName }})</span>
                      </div>
                      <div class="text-[0.65rem] text-slate-400">
                        {{ bp.categoryName || 'ທົ່ວໄປ' }} <span v-if="bp.unitName">• {{ bp.unitName }}</span>
                      </div>
                    </td>
                    <td class="p-3 text-right font-mono font-medium text-slate-600">
                      {{ formatMoney(bp.normalPrice) }} ₭
                    </td>
                    <td class="p-3 text-right">
                      <div class="flex items-center justify-end gap-1.5">
                        <input
                          v-model="bp.groupPrice"
                          type="text"
                          class="w-32 h-9 rounded-lg border border-line px-2 text-right text-xs font-mono font-bold text-indigo-700 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none"
                          placeholder="0"
                          @input="bp.groupPrice = sanitizeDecimalInput(bp.groupPrice, 2)"
                        >
                        <span class="text-xs text-slate-400 font-bold">₭</span>
                      </div>
                    </td>
                    <td class="p-3 text-center">
                      <template v-if="Number(bp.groupPrice) < Number(bp.normalPrice)">
                        <span class="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-700">
                          ຫຼຸດ {{ formatMoney(String(Number(bp.normalPrice) - Number(bp.groupPrice))) }} ₭
                        </span>
                      </template>
                      <template v-else-if="Number(bp.groupPrice) > Number(bp.normalPrice)">
                        <span class="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700">
                          +{{ formatMoney(String(Number(bp.groupPrice) - Number(bp.normalPrice))) }} ₭
                        </span>
                      </template>
                      <template v-else>
                        <span class="text-[0.65rem] text-slate-400">ເທົ່າເດີມ</span>
                      </template>
                    </td>
                    <td class="p-3 pr-4 text-right">
                      <button
                        type="button"
                        class="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="ລຶບອອກຈາກກຸ່ມ"
                        @click="removeVariantFromGroup(bp.variantId)"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between border-t border-line px-6 py-4 bg-slate-50/50">
          <div class="text-xs text-slate-500">
            ທັງໝົດ <span class="font-bold text-slate-800">{{ boundProducts.length }}</span> ລາຍການ
          </div>
          <div class="flex items-center gap-2.5">
            <button
              type="button"
              class="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              @click="showBindProductsModal = false"
            >
              ຍົກເລີກ
            </button>
            <button
              type="button"
              class="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50"
              :disabled="savingBoundProducts"
              @click="saveBoundProducts"
            >
              {{ savingBoundProducts ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກລາຄາພິເສດ' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
