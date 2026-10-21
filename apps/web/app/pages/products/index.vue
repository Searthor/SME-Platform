import { ApiClientError } from '~/services/api-client'
import type { CatalogCategory, CatalogUnit, CustomerGroup, GroupBoundProduct, Product, ProductList } from '~/types/api'
import type { TabItem } from '~/types/ui'
import { formatMoney, sanitizeDecimalInput } from '~/utils/money'

useHead({ title: 'ຈັດການສິນຄ້າ ແລະ ກຸ່ມລາຄາ' })

const api = useApiClient()
const auth = useAuthStore()

// Active Tab
const activeTab = ref<'products' | 'price-groups' | 'categories' | 'units' | 'attributes'>('products')
const catalogTabs = computed<TabItem[]>(() => [
  { key: 'products', label: 'ຈັດການສິນຄ້າ', count: totalProducts.value },
  { key: 'price-groups', label: 'ກຸ່ມລາຄາ', count: priceGroups.value.length },
  { key: 'categories', label: 'ຈັດການໝວດໝູ່', count: categories.value.length },
  { key: 'units', label: 'ຈັດການຫົວໜ່ວຍ', count: units.value.length },
  { key: 'attributes', label: 'ຕົວເລືອກຂະໜາດ ແລະ ສີ' },
])

// State
const products = ref<Product[]>([])
const categories = ref<CatalogCategory[]>([])
const units = ref<CatalogUnit[]>([])
const totalProducts = ref(0)
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Filters
const query = ref('')
const status = ref<'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'ALL'>('ACTIVE')
const selectedCategoryFilter = ref<string>('')
const page = ref(1)

// Permissions
const canCreate = computed(() => auth.hasPermission('product.create'))
const canUpdate = computed(() => auth.hasPermission('product.update'))
const canDelete = computed(() => auth.hasPermission('product.delete'))

const messageFrom = (cause: unknown) =>
  cause instanceof ApiClientError ? cause.message : 'ບໍ່ສາມາດດຳເນີນການໄດ້ ກະລຸນາລອງໃໝ່'

// Load all catalog data
const load = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const params = new URLSearchParams({
      status: status.value,
      page: page.value.toString(),
      limit: '50',
    })
    if (query.value.trim()) params.set('q', query.value.trim())
    if (selectedCategoryFilter.value) params.set('categoryId', selectedCategoryFilter.value)

    const [productResult, categoryResult, unitResult] = await Promise.all([
      api.get<ProductList>(`/products?${params.toString()}`),
      api.get<CatalogCategory[]>('/catalog/categories'),
      api.get<CatalogUnit[]>('/catalog/units'),
      fetchPriceGroups(),
    ])

    products.value = productResult.items
    totalProducts.value = productResult.total
    categories.value = categoryResult
    units.value = unitResult
  } catch (cause) {
    errorMessage.value = messageFrom(cause)
  } finally {
    loading.value = false
  }
}

onMounted(load)

// ----------------------------------------------------
// PRODUCT ROUTING NAVIGATION
// ----------------------------------------------------
const goToCreateProduct = () => {
  navigateTo('/products/new')
}

const goToEditProduct = (product: Product) => {
  navigateTo(`/products/new?id=${product.id}`)
}

// Presets for Attributes Tab
const standardSizePresets = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'Free Size']
const footwearSizePresets = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45']
const standardColorPresets = [
  { name: 'ສີດຳ', hex: '#1e293b' },
  { name: 'ສີຂາວ', hex: '#ffffff' },
  { name: 'ສີແດງ', hex: '#ef4444' },
  { name: 'ສີນ້ຳເງິນ', hex: '#3b82f6' },
  { name: 'ສີຂຽວ', hex: '#10b981' },
  { name: 'ສີເຫຼືອງ', hex: '#f59e0b' },
  { name: 'ສີເທົາ', hex: '#6b7280' },
  { name: 'ສີບົວ', hex: '#ec4899' },
]

// Delete / Archive product
const productToDelete = ref<Product | null>(null)
const showDeleteConfirm = ref(false)

const openDeleteConfirm = (product: Product) => {
  productToDelete.value = product
  showDeleteConfirm.value = true
}

const confirmDeleteProduct = async () => {
  if (!productToDelete.value) return
  const target = productToDelete.value
  saving.value = true
  errorMessage.value = ''
  try {
    await api.post<Product>(`/products/${target.id}/archive`, { version: target.version })
    showDeleteConfirm.value = false
    productToDelete.value = null
    successMessage.value = `ລຶບສິນຄ້າ “${target.name}” ສຳເລັດແລ້ວ`
    await load()
  } catch (cause) {
    errorMessage.value = messageFrom(cause)
  } finally {
    saving.value = false
  }
}


// Quick View Product Details Modal
const selectedViewProduct = ref<Product | null>(null)
const viewProduct = (p: Product) => {
  selectedViewProduct.value = p
}

// ----------------------------------------------------
// UNIT MANAGEMENT STATE
// ----------------------------------------------------
const showUnitModal = ref(false)
const isEditingUnit = ref(false)
const editingUnitId = ref<string | null>(null)
const unitForm = reactive({
  code: '',
  name: '',
  decimalPlaces: 0,
  active: true,
})

const openCreateUnitModal = () => {
  unitForm.code = ''
  unitForm.name = ''
  unitForm.decimalPlaces = 0
  unitForm.active = true
  isEditingUnit.value = false
  editingUnitId.value = null
  showUnitModal.value = true
}

const openEditUnitModal = (unit: CatalogUnit) => {
  unitForm.code = unit.code
  unitForm.name = unit.name
  unitForm.decimalPlaces = unit.decimalPlaces
  unitForm.active = unit.active
  isEditingUnit.value = true
  editingUnitId.value = unit.id
  showUnitModal.value = true
}

const submitUnit = async () => {
  saving.value = true
  errorMessage.value = ''
  try {
    if (isEditingUnit.value && editingUnitId.value) {
      await api.patch<CatalogUnit>(`/catalog/units/${editingUnitId.value}`, {
        code: unitForm.code.trim().toUpperCase(),
        name: unitForm.name.trim(),
        decimalPlaces: Number(unitForm.decimalPlaces),
        active: unitForm.active,
      })
      successMessage.value = 'ອັບເດດຫົວໜ່ວຍສຳເລັດແລ້ວ'
    } else {
      await api.post<CatalogUnit>('/catalog/units', {
        code: unitForm.code.trim().toUpperCase(),
        name: unitForm.name.trim(),
        decimalPlaces: Number(unitForm.decimalPlaces),
      })
      successMessage.value = 'ເພີ່ມຫົວໜ່ວຍໃໝ່ສຳເລັດແລ້ວ'
    }
    showUnitModal.value = false
    await load()
  } catch (cause) {
    errorMessage.value = messageFrom(cause)
  } finally {
    saving.value = false
  }
}

// ----------------------------------------------------
// CATEGORY MANAGEMENT STATE
// ----------------------------------------------------
const showCategoryModal = ref(false)
const isEditingCategory = ref(false)
const editingCategoryId = ref<string | null>(null)
const categoryForm = reactive({
  name: '',
  parentId: '',
})

const openCreateCategoryModal = () => {
  categoryForm.name = ''
  categoryForm.parentId = ''
  isEditingCategory.value = false
  editingCategoryId.value = null
  showCategoryModal.value = true
}

const openEditCategoryModal = (cat: CatalogCategory) => {
  categoryForm.name = cat.name
  categoryForm.parentId = cat.parentId || ''
  isEditingCategory.value = true
  editingCategoryId.value = cat.id
  showCategoryModal.value = true
}

const submitCategory = async () => {
  saving.value = true
  errorMessage.value = ''
  try {
    if (isEditingCategory.value && editingCategoryId.value) {
      await api.patch<CatalogCategory>(`/catalog/categories/${editingCategoryId.value}`, {
        name: categoryForm.name.trim(),
      })
      successMessage.value = 'ອັບເດດໝວດໝູ່ສຳເລັດແລ້ວ'
    } else {
      await api.post<CatalogCategory>('/catalog/categories', {
        name: categoryForm.name.trim(),
        parentId: categoryForm.parentId || undefined,
      })
      successMessage.value = 'ເພີ່ມໝວດໝູ່ໃໝ່ສຳເລັດແລ້ວ'
    }
    showCategoryModal.value = false
    await load()
  } catch (cause) {
    errorMessage.value = messageFrom(cause)
  } finally {
    saving.value = false
  }
}

// Price range display helper
const getPriceDisplay = (product: Product): string => {
  if (!product.variants || product.variants.length === 0) return '0'
  if (product.variants.length === 1) {
    return Number(product.variants[0]?.sellingPrice || 0).toLocaleString()
  }
  const prices = product.variants.map(v => Number(v.sellingPrice))
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  if (min === max) return min.toLocaleString()
  return `${min.toLocaleString()} - ${max.toLocaleString()}`
}

// =========================================================================
// PRICE GROUPS & CHANNEL PRICING LOGIC
// =========================================================================
const priceGroups = ref<CustomerGroup[]>([])
const loadingPriceGroups = ref(false)
const showPriceGroupModal = ref(false)
const isEditingPriceGroup = ref(false)
const editingPriceGroupId = ref<string | null>(null)
const priceGroupForm = reactive({
  name: '',
  code: '',
  description: '',
  isDefault: false,
})

const showBindPricesModal = ref(false)
const selectedPriceGroupForBinding = ref<CustomerGroup | null>(null)
const loadingBoundGroupProducts = ref(false)
const savingBoundGroupProducts = ref(false)
const boundGroupProducts = ref<Array<{
  variantId: string
  productId: string
  productName: string
  variantName: string
  sku: string
  normalPrice: string
  groupPrice: string
  unitName: string
  categoryName: string
}>>([])
const productSearchInGroup = ref('')

const fetchPriceGroups = async () => {
  loadingPriceGroups.value = true
  try {
    const res = await api.get<CustomerGroup[]>('/price-groups')
    priceGroups.value = res || []
  } catch (err: any) {
    console.error('Failed to load price groups:', err)
  } finally {
    loadingPriceGroups.value = false
  }
}

const openCreatePriceGroupModal = () => {
  isEditingPriceGroup.value = false
  editingPriceGroupId.value = null
  priceGroupForm.name = ''
  priceGroupForm.code = ''
  priceGroupForm.description = ''
  priceGroupForm.isDefault = false
  showPriceGroupModal.value = true
}

const openEditPriceGroupModal = (g: CustomerGroup) => {
  isEditingPriceGroup.value = true
  editingPriceGroupId.value = g.id
  priceGroupForm.name = g.name
  priceGroupForm.code = g.code
  priceGroupForm.description = g.description || ''
  priceGroupForm.isDefault = g.isDefault
  showPriceGroupModal.value = true
}

const submitPriceGroup = async () => {
  if (!priceGroupForm.name.trim()) return
  saving.value = true
  try {
    if (isEditingPriceGroup.value && editingPriceGroupId.value) {
      await api.patch(`/price-groups/${editingPriceGroupId.value}`, {
        name: priceGroupForm.name.trim(),
        description: priceGroupForm.description.trim() || undefined,
        isDefault: priceGroupForm.isDefault,
      })
      successMessage.value = 'ອັບເດດກຸ່ມລາຄາສຳເລັດແລ້ວ'
    } else {
      await api.post('/price-groups', {
        name: priceGroupForm.name.trim(),
        code: priceGroupForm.code.trim().toUpperCase() || `GRP_${Date.now()}`,
        description: priceGroupForm.description.trim() || undefined,
        discountPercent: 0,
        isDefault: priceGroupForm.isDefault,
      })
      successMessage.value = 'ເພີ່ມກຸ່ມລາຄາໃໝ່ສຳເລັດແລ້ວ'
    }
    showPriceGroupModal.value = false
    await fetchPriceGroups()
  } catch (cause) {
    errorMessage.value = messageFrom(cause)
  } finally {
    saving.value = false
  }
}

const deletePriceGroup = async (g: CustomerGroup) => {
  if (g.isDefault) {
    alert('ບໍ່ສາມາດລຶບກຸ່ມລາຄາເລີ່ມຕົ້ນ (Default) ໄດ້')
    return
  }
  if (!confirm(`ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບກຸ່ມລາຄາ "${g.name}"? (ສິນຄ້າໃນກຸ່ມນີ້ຈະກັບຄືນສູ່ລາຄາໜ້າຮ້ານປົກກະຕິ)`)) return
  try {
    await api.delete(`/price-groups/${g.id}`)
    successMessage.value = 'ລຶບກຸ່ມລາຄາສຳເລັດແລ້ວ'
    await fetchPriceGroups()
  } catch (cause) {
    errorMessage.value = messageFrom(cause)
  }
}

const openBindPricesModal = async (group: CustomerGroup) => {
  selectedPriceGroupForBinding.value = group
  showBindPricesModal.value = true
  loadingBoundGroupProducts.value = true
  productSearchInGroup.value = ''
  try {
    const res = await api.get<GroupBoundProduct[]>(`/price-groups/${group.id}/products`)
    boundGroupProducts.value = (res || []).map(bp => ({
      variantId: bp.variantId,
      productId: bp.productId,
      productName: bp.productName,
      variantName: bp.variantName,
      sku: bp.sku || '',
      normalPrice: bp.normalPrice,
      groupPrice: bp.groupPrice,
      unitName: bp.unitName,
      categoryName: bp.categoryName,
    }))
  } catch (err: any) {
    errorMessage.value = messageFrom(err)
  } finally {
    loadingBoundGroupProducts.value = false
  }
}

const availableVariantsForGroup = computed(() => {
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

  const boundVariantIds = new Set(boundGroupProducts.value.map(bp => bp.variantId))
  const q = productSearchInGroup.value.trim().toLowerCase()

  products.value.forEach((p) => {
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
  boundGroupProducts.value.unshift({
    variantId: item.variantId,
    productId: item.productId,
    productName: item.productName,
    variantName: item.variantName,
    sku: item.sku,
    normalPrice: item.normalPrice,
    groupPrice: item.normalPrice,
    unitName: item.unitName,
    categoryName: item.categoryName,
  })
}

const addAllVariantsToGroup = () => {
  availableVariantsForGroup.value.forEach(item => {
    boundGroupProducts.value.push({
      variantId: item.variantId,
      productId: item.productId,
      productName: item.productName,
      variantName: item.variantName,
      sku: item.sku,
      normalPrice: item.normalPrice,
      groupPrice: item.normalPrice,
      unitName: item.unitName,
      categoryName: item.categoryName,
    })
  })
}

const removeVariantFromGroup = (variantId: string) => {
  boundGroupProducts.value = boundGroupProducts.value.filter(bp => bp.variantId !== variantId)
}

const applyMarkupPercentToAll = (pct: number) => {
  boundGroupProducts.value.forEach((bp) => {
    const normal = Number(bp.normalPrice) || 0
    if (normal > 0) {
      const calculated = Math.round(normal * (1 + pct / 100))
      bp.groupPrice = String(calculated)
    }
  })
}

const saveBoundGroupPrices = async () => {
  if (!selectedPriceGroupForBinding.value) return
  savingBoundGroupProducts.value = true
  try {
    const items = boundGroupProducts.value
      .filter(bp => bp.groupPrice && Number(bp.groupPrice.replace(/,/g, '')) > 0)
      .map(bp => ({
        variantId: bp.variantId,
        price: bp.groupPrice.replace(/,/g, ''),
      }))

    await api.put(`/price-groups/${selectedPriceGroupForBinding.value.id}/products`, { items })
    successMessage.value = `ບັນທຶກລາຄາສິນຄ້າສຳລັບກຸ່ມ "${selectedPriceGroupForBinding.value.name}" ຮຽບຮ້ອຍແລ້ວ`
    showBindPricesModal.value = false
    await fetchPriceGroups()
  } catch (err: any) {
    errorMessage.value = messageFrom(err)
  } finally {
    savingBoundGroupProducts.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header with PageHeader -->
    <PageHeader
      title="ຈັດການສິນຄ້າ ແລະ ຄຸນລັກສະນະ"
      eyebrow="Catalog & Inventory"
      description="ຮອງຮັບຫຼາຍຫົວໜ່ວຍ, ຫຼາຍຂະໜາດ, ຫຼາຍສີ, ການແຍກ SKU, Barcode ແລະ ໂຄງສ້າງໝວດໝູ່"
    >
      <template #actions>
        <BaseButton
          v-if="activeTab === 'products' && canCreate"
          variant="primary"
          @click="goToCreateProduct()"
        >
          <template #icon><AdminIcon name="plus" class="size-4" /></template>
          ເພີ່ມສິນຄ້າໃໝ່
        </BaseButton>
        <BaseButton
          v-else-if="activeTab === 'price-groups' && canCreate"
          variant="primary"
          @click="openCreatePriceGroupModal()"
        >
          <template #icon><AdminIcon name="plus" class="size-4" /></template>
          ເພີ່ມກຸ່ມລາຄາໃໝ່
        </BaseButton>
        <BaseButton
          v-else-if="activeTab === 'units' && canCreate"
          variant="primary"
          @click="openCreateUnitModal()"
        >
          <template #icon><AdminIcon name="plus" class="size-4" /></template>
          ເພີ່ມຫົວໜ່ວຍໃໝ່
        </BaseButton>
        <BaseButton
          v-else-if="activeTab === 'categories' && canCreate"
          variant="primary"
          @click="openCreateCategoryModal()"
        >
          <template #icon><AdminIcon name="plus" class="size-4" /></template>
          ເພີ່ມໝວດໝູ່ໃໝ່
        </BaseButton>
      </template>
    </PageHeader>

    <!-- Global alert messages -->
    <BaseAlert v-if="errorMessage" tone="danger" dismissible @click="errorMessage = ''">
      {{ errorMessage }}
    </BaseAlert>
    <BaseAlert v-if="successMessage" tone="success" dismissible @click="successMessage = ''">
      {{ successMessage }}
    </BaseAlert>

    <!-- Navigation Tabs with BaseTabs -->
    <BaseTabs v-model="activeTab" :tabs="catalogTabs" />

    <!-- ==================================================== -->
    <!-- TAB 1: ຈັດການສິນຄ້າ (PRODUCTS) -->
    <!-- ==================================================== -->
    <div v-if="activeTab === 'products'" class="space-y-4">
      <!-- Search and Filter Bar -->
      <section class="rounded-2xl border border-line bg-white p-3.5 shadow-card">
        <div class="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <!-- Search Input with AdminIcon -->
          <div class="relative flex-1 min-w-0">
            <AdminIcon name="search" class="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
            <input
              v-model="query"
              type="search"
              class="h-9.5 w-full rounded-xl border border-line bg-canvas/40 pr-4 pl-10 text-xs leading-normal text-slate-900 placeholder:text-slate-400 transition hover:bg-white focus:border-[#5b4cf5] focus:bg-white focus:outline-none"
              placeholder="ຄົ້ນຫາຊື່ສິນຄ້າ, SKU ຫຼື Barcode..."
              @keyup.enter="load"
            >
          </div>

          <!-- Category Filter -->
          <div class="w-full sm:w-48 shrink-0">
            <Select2
              v-model="selectedCategoryFilter"
              :options="[{ value: '', label: 'ທຸກໝວດໝູ່' }, ...categories.map(c => ({ value: c.id, label: c.name }))]"
              placeholder="ທຸກໝວດໝູ່"
              size="sm"
              @change="load"
            />
          </div>

          <!-- Status Filter -->
          <div class="w-full sm:w-44 shrink-0">
            <Select2
              v-model="status"
              :options="[
                { value: 'ACTIVE', label: 'ໃຊ້ງານ (Active)' },
                { value: 'INACTIVE', label: 'ບໍ່ໃຊ້ງານ (Inactive)' },
                { value: 'ARCHIVED', label: 'ເກັບໃນຄັງ (Archived)' },
                { value: 'ALL', label: 'ທັງໝົດ (All)' },
              ]"
              placeholder="ເລືອກສະຖານະ..."
              :searchable="false"
              size="sm"
              @change="load"
            />
          </div>

          <!-- Search Button -->
          <button
            type="button"
            class="focus-ring flex h-9.5 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-4 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
            @click="load"
          >
            <AdminIcon name="filter" class="size-3.5 text-slate-400" />
            <span>ຄົ້ນຫາ</span>
          </button>
        </div>
      </section>

      <!-- Products Data Table -->
      <section class="rounded-2xl border border-line bg-white shadow-card overflow-hidden">
        <div v-if="loading" class="grid min-h-60 place-items-center text-[#5b4cf5]">
          <LoadingSpinner />
        </div>

        <div v-else-if="!products.length" class="p-12 text-center">
          <span class="mx-auto grid size-14 place-items-center rounded-2xl bg-[#ede9fe] text-[#5b4cf5] shadow-2xs">
            <AdminIcon name="box" class="size-7" />
          </span>
          <p class="mt-4 text-sm font-bold text-slate-900">ບໍ່ພົບລາຍການສິນຄ້າ</p>
          <p class="mt-1 text-xs text-slate-500">ລອງປ່ຽນຄຳຄົ້ນຫາ ຫຼື ເພີ່ມສິນຄ້າໃໝ່ເຂົ້າສູ່ລະບົບ</p>
          <button
            v-if="canCreate"
            class="focus-ring mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#5b4cf5] px-4 py-2.5 text-xs font-bold text-white shadow-[0_4px_14px_rgba(91,76,245,0.35)] hover:bg-[#4a3bd9] transition"
            @click="goToCreateProduct()"
          >
            <AdminIcon name="plus" class="size-4" />
            <span>ເພີ່ມສິນຄ້າທຳອິດ</span>
          </button>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="border-b border-line bg-slate-50/75 text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th class="p-3.5 pl-5">ສິນຄ້າ</th>
                <th class="p-3.5">ຫົວໜ່ວຍ (Units)</th>
                <th class="p-3.5">ຮູບແບບ (Variants / ສີ / ຂະໜາດ)</th>
                <th class="p-3.5">ລາຄາຂາຍ (ກີບ)</th>
                <th class="p-3.5">ສະຕັອກ (Stock)</th>
                <th class="p-3.5">SKU / Barcode</th>
                <th class="p-3.5">ສະຖານະ</th>
                <th class="p-3.5 pr-5 text-right">ຈັດການ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="product in products" :key="product.id" class="hover:bg-slate-50/60 transition">
                <!-- Name & Category -->
                <td class="p-3.5 pl-5">
                  <div class="font-extrabold text-slate-900 text-sm">{{ product.name }}</div>
                  <div class="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.65rem]">
                    <span v-if="product.category" class="rounded-lg bg-[#ede9fe] px-2 py-0.5 font-bold text-[#5b4cf5]">
                      {{ product.category.name }}
                    </span>
                    <span v-if="product.trackStock" class="rounded-lg bg-sky-50 px-2 py-0.5 text-sky-700 font-semibold border border-sky-200/50">
                      ຕິດຕາມສະຕັອກ
                    </span>
                    <span v-if="product.description" class="text-slate-400 truncate max-w-xs">
                      {{ product.description }}
                    </span>
                  </div>
                </td>

                <!-- Units (Base + Packaging) -->
                <td class="p-3">
                  <span class="inline-flex items-center gap-1 font-bold text-ink-900">
                    {{ product.unit.name }}
                    <span class="text-[0.65rem] text-ink-500 font-normal">({{ product.unit.code }})</span>
                  </span>
                  <!-- Secondary Packaging Units Badges -->
                  <div v-if="product.packagingUnits?.length" class="mt-1.5 flex flex-wrap gap-1.5">
                    <span
                      v-for="pu in product.packagingUnits"
                      :key="pu.id"
                      class="inline-flex items-center rounded-lg bg-amber-50 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700 border border-amber-200"
                      :title="`1 ${pu.unit?.name || 'ຫົວໜ່ວຍ'} = ${Number(pu.conversionRate)} ${product.unit.name}`"
                    >
                      {{ pu.unit?.name || 'ຫົວໜ່ວຍ' }} (x{{ Number(pu.conversionRate) }})
                    </span>
                  </div>
                </td>

                <!-- Variants Info -->
                <td class="p-3">
                  <div v-if="product.variants.length > 1" class="flex flex-col items-start gap-1.5">
                    <span class="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-0.5 text-[0.65rem] font-black text-violet-700 border border-violet-200 shadow-2xs">
                      {{ product.variants.length }} ຮູບແບບ
                    </span>
                    <div class="flex flex-wrap items-center gap-1.5">
                      <span
                        v-for="v in product.variants.slice(0, 3)"
                        :key="v.id"
                        class="inline-flex items-center rounded-lg bg-ink-950/5 px-2 py-0.5 text-[0.65rem] text-ink-700 font-medium"
                      >
                        {{ v.size ? `Size ${v.size}` : '' }}
                        {{ v.color ? (v.size ? `· ${v.color}` : v.color) : '' }}
                        {{ !v.size && !v.color ? (v.name || 'Default') : '' }}
                      </span>
                      <span v-if="product.variants.length > 3" class="text-[0.65rem] text-ink-500 font-bold">
                        +{{ product.variants.length - 3 }} ອື່ນໆ
                      </span>
                    </div>
                  </div>
                  <div v-else>
                    <span class="text-ink-500 text-[0.7rem]">ຮູບແບບດ່ຽວ</span>
                  </div>
                </td>

                <!-- Selling Price -->
                <td class="p-3 font-extrabold text-ink-950">
                  {{ getPriceDisplay(product) }}
                </td>

                <!-- Stock Quantity -->
                <td class="p-3">
                  <div v-if="product.trackStock">
                    <div class="flex items-center gap-1.5">
                      <span
                        class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-black shadow-2xs transition"
                        :class="Number(product.totalStock ?? 0) <= 0
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : Number(product.totalStock ?? 0) <= Number(product.variants[0]?.minStock ?? 0)
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'"
                      >
                        <span
                          class="size-1.5 rounded-full"
                          :class="Number(product.totalStock ?? 0) <= 0
                            ? 'bg-rose-500'
                            : Number(product.totalStock ?? 0) <= Number(product.variants[0]?.minStock ?? 0)
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'"
                        />
                        {{ Number(product.totalStock ?? 0).toLocaleString() }}
                      </span>
                      <span class="text-[0.7rem] text-slate-500 font-semibold">{{ product.unit.name }}</span>
                    </div>

                    <!-- Variant breakdown preview if multi-variant -->
                    <div v-if="product.variants.length > 1" class="mt-1 flex flex-wrap gap-1">
                      <span
                        v-for="v in product.variants.slice(0, 2)"
                        :key="v.id"
                        class="text-[0.62rem] text-slate-500"
                      >
                        {{ v.name || v.color || v.size || 'V' }}: <strong class="text-slate-800">{{ Number(v.stock ?? 0).toLocaleString() }}</strong>
                      </span>
                      <span v-if="product.variants.length > 2" class="text-[0.62rem] text-slate-400">...</span>
                    </div>
                  </div>
                  <div v-else>
                    <span class="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-[0.65rem] font-bold text-slate-400">
                      ບໍ່ຕິດຕາມ
                    </span>
                  </div>
                </td>

                <!-- Default SKU / Barcode -->
                <td class="p-3 text-ink-500 font-mono text-[0.7rem]">
                  <div>{{ product.variants[0]?.sku || '—' }}</div>
                  <div v-if="product.variants[0]?.barcodes?.[0]" class="text-[0.65rem] text-ink-400">
                    {{ product.variants[0]?.barcodes[0]?.barcode }}
                  </div>
                </td>

                <!-- Status Badge -->
                <td class="p-3">
                  <StatusBadge :status="product.archivedAt ? 'ARCHIVED' : product.active ? 'ACTIVE' : 'INACTIVE'" />
                </td>

                <!-- Actions -->
                <td class="p-3 pr-5 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      class="text-slate-600 hover:text-slate-900 font-bold hover:underline"
                      title="ເບິ່ງລາຍລະອຽດ"
                      @click="viewProduct(product)"
                    >
                      ເບິ່ງ
                    </button>
                    <button
                      v-if="canUpdate && !product.archivedAt"
                      type="button"
                      class="text-[#5b4cf5] hover:text-[#4a3bd9] font-bold hover:underline"
                      @click="goToEditProduct(product)"
                    >
                      ແກ້ໄຂ
                    </button>
                    <button
                      v-if="canDelete && !product.archivedAt"
                      type="button"
                      class="text-rose-600 hover:text-rose-700 font-bold hover:underline"
                      :disabled="saving"
                      @click="openDeleteConfirm(product)"
                    >
                      ລົບ
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
    <!-- TAB 2: ກຸ່ມລາຄາ (PRICE GROUPS / CHANNELS) -->
    <!-- ==================================================== -->
    <div v-else-if="activeTab === 'price-groups'" class="space-y-4">
      <!-- Info Header Banner -->
      <section class="rounded-2xl border border-line bg-white p-5 shadow-card">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-xl">🏷️</span>
              <h2 class="text-base font-black text-slate-900">ກຸ່ມລາຄາສິນຄ້າ (Price Groups / Channels)</h2>
            </div>
            <p class="text-xs text-slate-500 mt-1">
              ກຳນົດລາຄາຂາຍແຍກຕາມຊ່ອງທາງ (ເຊັ່ນ: ລາຄາໜ້າຮ້ານ, Foodpanda, Grab, ຂາຍສົ່ງ). ຫາກສິນຄ້າໃດບໍ່ໄດ້ກຳນົດລາຄາພິເສດ ລະບົບຈະຂາຍຕາມລາຄາໜ້າຮ້ານ (Default) ໂດຍອັດຕະໂນມັດ
            </p>
          </div>
          <button
            v-if="canCreate"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl bg-[#5b4cf5] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#4a3bd9] transition shrink-0"
            @click="openCreatePriceGroupModal"
          >
            <span>+ ເພີ່ມກຸ່ມລາຄາໃໝ່</span>
          </button>
        </div>

        <div v-if="loadingPriceGroups" class="py-12 text-center text-xs text-slate-400">
          ກຳລັງໂຫຼດກຸ່ມລາຄາ...
        </div>

        <!-- Price Group Cards Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          <div
            v-for="g in priceGroups"
            :key="g.id"
            class="rounded-2xl border p-5 transition flex flex-col justify-between"
            :class="g.isDefault
              ? 'border-indigo-300 bg-gradient-to-b from-indigo-50/40 to-white shadow-sm'
              : 'border-line bg-white hover:shadow-md'"
          >
            <div>
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span class="text-[0.65rem] font-extrabold uppercase tracking-wider text-brand-600 font-mono">{{ g.code }}</span>
                  <h3 class="text-base font-black text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <span>{{ g.name }}</span>
                  </h3>
                </div>
                <span
                  v-if="g.isDefault"
                  class="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[0.62rem] font-bold shrink-0"
                >
                  ⭐ ລາຄາ Default (ໜ້າຮ້ານ)
                </span>
                <span
                  v-else-if="g.code === 'FOODPANDA'"
                  class="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[0.62rem] font-bold shrink-0"
                >
                  🐼 Foodpanda
                </span>
                <span
                  v-else-if="g.code === 'GRAB'"
                  class="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[0.62rem] font-bold shrink-0"
                >
                  🛵 Grab
                </span>
              </div>

              <p class="mt-2 text-xs text-slate-500 min-h-8">
                {{ g.description || (g.isDefault ? 'ລາຄາຂາຍມາດຕະຖານໜ້າຮ້ານ (ໃຊ້ລາຄາຂາຍຫຼັກຂອງສິນຄ້າທັງໝົດ)' : 'ກຸ່ມລາຄາພິເສດສະເພາະຊ່ອງທາງນີ້') }}
              </p>

              <div class="mt-4 pt-3 border-t border-line space-y-2 text-xs">
                <div class="flex items-center justify-between">
                  <span class="text-slate-500">ຮູບແບບລາຄາ:</span>
                  <span class="font-extrabold text-slate-900">
                    {{ g.isDefault ? 'ລາຄາຫຼັກຂອງສິນຄ້າ (Default)' : 'ກຳນົດລາຄາເຈາະຈົງ' }}
                  </span>
                </div>
                <div v-if="!g.isDefault" class="flex items-center justify-between">
                  <span class="text-slate-500">ສິນຄ້າທີ່ກຳນົດລາຄາແລ້ວ:</span>
                  <span class="font-bold text-emerald-600">
                    {{ g.boundProductsCount || 0 }} ລາຍການ
                  </span>
                </div>
                <div v-else class="flex items-center justify-between text-slate-400 text-[0.7rem]">
                  <span>ສິນຄ້າທຸກລາຍການຂາຍຕາມລາຄາປົກກະຕິ</span>
                </div>
              </div>
            </div>

            <div class="mt-5 pt-3 border-t border-line flex items-center justify-between gap-2">
              <button
                v-if="!g.isDefault"
                type="button"
                class="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition shadow-xs"
                @click="openBindPricesModal(g)"
              >
                <span>🏷️ ຕັ້ງລາຄາສິນຄ້າ</span>
                <span
                  v-if="(g.boundProductsCount || 0) > 0"
                  class="rounded-full bg-indigo-600 px-1.5 py-0.2 text-[0.62rem] font-bold text-white leading-tight"
                >
                  {{ g.boundProductsCount }}
                </span>
              </button>
              <span v-else class="text-[0.7rem] font-bold text-slate-400 italic">
                ໃຊ້ລາຄາຂາຍຫຼັກ
              </span>

              <div class="flex items-center gap-1.5">
                <button
                  type="button"
                  class="rounded-xl border border-line bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                  @click="openEditPriceGroupModal(g)"
                >
                  ແກ້ໄຂ
                </button>
                <button
                  v-if="!g.isDefault"
                  type="button"
                  class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
                  @click="deletePriceGroup(g)"
                >
                  ລຶບ
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- ==================================================== -->
    <!-- TAB 2: ຈັດການຫົວໜ່ວຍ (UNITS) -->
    <!-- ==================================================== -->
    <div v-else-if="activeTab === 'units'" class="space-y-4">
      <section class="rounded-2xl border border-line bg-white p-5 shadow-card">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 class="text-base font-black text-slate-900">ຫົວໜ່ວຍວັດແທກ ແລະ ນັບສິນຄ້າ (Units)</h2>
            <p class="text-xs text-slate-500">
              ກຳນົດຫົວໜ່ວຍພື້ນຖານ ເຊັ່ນ ອັນ, ກິໂລ, ແພັກ, ລັງ, ແກ້ວ, ກະປ໋ອງ ເພື່ອນຳໄປໃຊ້ກັບສິນຄ້າ ແລະ ການຂາຍ
            </p>
          </div>
          <button
            v-if="canCreate"
            type="button"
            class="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[#5b4cf5] px-4 py-2.5 text-xs font-bold text-white shadow-[0_4px_14px_rgba(91,76,245,0.35)] hover:bg-[#4a3bd9] transition"
            @click="openCreateUnitModal()"
          >
            <AdminIcon name="plus" class="size-4" />
            <span>ເພີ່ມຫົວໜ່ວຍ</span>
          </button>
        </div>

        <div class="mt-4 overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="border-b border-line text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th class="p-3">ລະຫັດຫົວໜ່ວຍ (Code)</th>
                <th class="p-3">ຊື່ຫົວໜ່ວຍ (Name)</th>
                <th class="p-3">ທົດສະນິຍົມ (Decimal Places)</th>
                <th class="p-3">ສະຖານະ</th>
                <th class="p-3 text-right">ຈັດການ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="unit in units" :key="unit.id" class="hover:bg-slate-50/60 transition">
                <td class="p-3 font-mono font-bold text-slate-900">{{ unit.code }}</td>
                <td class="p-3 font-extrabold text-slate-900">{{ unit.name }}</td>
                <td class="p-3 text-slate-500">{{ unit.decimalPlaces }} ຕຳແໜ່ງ</td>
                <td class="p-3">
                  <StatusBadge :status="unit.active ? 'ACTIVE' : 'INACTIVE'" />
                </td>
                <td class="p-3 text-right">
                  <button
                    v-if="canUpdate"
                    type="button"
                    class="text-[#5b4cf5] hover:text-[#4a3bd9] font-bold hover:underline"
                    @click="openEditUnitModal(unit)"
                  >
                    ແກ້ໄຂ
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- ==================================================== -->
    <!-- TAB 3: ຈັດການໝວດໝູ່ (CATEGORIES) -->
    <!-- ==================================================== -->
    <div v-else-if="activeTab === 'categories'" class="space-y-4">
      <section class="rounded-2xl border border-line bg-white p-5 shadow-card">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 class="text-base font-black text-slate-900">ໝວດໝູ່ສິນຄ້າ (Categories)</h2>
            <p class="text-xs text-slate-500">
              ຈັດໝວດໝູ່ສິນຄ້າໃຫ້ເປັນລະບຽບ ຮອງຮັບໝວດໝູ່ຫຼັກ ແລະ ໝວດໝູ່ຍ່ອຍ
            </p>
          </div>
          <button
            v-if="canCreate"
            type="button"
            class="focus-ring inline-flex items-center gap-1.5 rounded-xl bg-[#5b4cf5] px-4 py-2.5 text-xs font-bold text-white shadow-[0_4px_14px_rgba(91,76,245,0.35)] hover:bg-[#4a3bd9] transition"
            @click="openCreateCategoryModal()"
          >
            <AdminIcon name="plus" class="size-4" />
            <span>ເພີ່ມໝວດໝູ່</span>
          </button>
        </div>

        <div class="mt-4 overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="border-b border-line text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th class="p-3">ຊື່ໝວດໝູ່</th>
                <th class="p-3">ໝວດໝູ່ຫຼັກ (Parent)</th>
                <th class="p-3 text-right">ຈັດການ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr v-for="cat in categories" :key="cat.id" class="hover:bg-slate-50/60 transition">
                <td class="p-3 font-extrabold text-slate-900 flex items-center gap-2">
                  <span>🏷️</span>
                  <span>{{ cat.name }}</span>
                </td>
                <td class="p-3 text-slate-500">
                  {{ categories.find(c => c.id === cat.parentId)?.name || '— (ໝວດໝູ່ຫຼັກ)' }}
                </td>
                <td class="p-3 text-right">
                  <button
                    v-if="canUpdate"
                    type="button"
                    class="text-[#5b4cf5] hover:text-[#4a3bd9] font-bold hover:underline"
                    @click="openEditCategoryModal(cat)"
                  >
                    ແກ້ໄຂ
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- ==================================================== -->
    <!-- TAB 4: ຕົວເລືອກຂະໜາດ ແລະ ສີ (SIZES & COLORS PRESETS) -->
    <!-- ==================================================== -->
    <div v-else-if="activeTab === 'attributes'" class="space-y-6">
      <section class="rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 class="text-base font-black text-slate-900">ລະບົບຕົວເລືອກຂະໜາດ ແລະ ສີ (Attributes & Variants System)</h2>
        <p class="mt-1 text-xs text-slate-500">
          ລະບົບໄດ້ຖືກອອກແບບມາດຕະຖານໃຫ້ຮອງຮັບການສ້າງສິນຄ້າທີ່ມີຫຼາຍຂະໜາດ (Sizes), ຫຼາຍສີ (Colors), ແລະ ຫຼາຍຫົວໜ່ວຍບັນຈຸ (Multi-units)
        </p>

        <!-- Apparel Sizes -->
        <div class="mt-6">
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">1. ຂະໜາດເສື້ອຜ້າ (Apparel Sizes)</h3>
          <div class="mt-2.5 flex flex-wrap gap-2">
            <span
              v-for="s in standardSizePresets"
              :key="s"
              class="rounded-xl border border-line bg-canvas px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs"
            >
              {{ s }}
            </span>
          </div>
        </div>

        <!-- Footwear Sizes -->
        <div class="mt-6">
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">2. ຂະໜາດເກີບ / ຕົວເລກ (Footwear & Numeric Sizes)</h3>
          <div class="mt-2.5 flex flex-wrap gap-2">
            <span
              v-for="s in footwearSizePresets"
              :key="s"
              class="rounded-xl border border-line bg-canvas px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-2xs"
            >
              EU {{ s }}
            </span>
          </div>
        </div>

        <!-- Color Palette -->
        <div class="mt-6">
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">3. ໂທນສີມາດຕະຖານ (Color Presets)</h3>
          <div class="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              v-for="c in standardColorPresets"
              :key="c.name"
              class="flex items-center gap-2.5 rounded-xl border border-line p-2.5 bg-canvas"
            >
              <span
                class="size-5 rounded-full border border-slate-300 shadow-2xs"
                :style="{ backgroundColor: c.hex }"
              />
              <span class="text-xs font-bold text-slate-800">{{ c.name }}</span>
            </div>
          </div>
        </div>

        <!-- Action shortcut -->
        <div class="mt-8 rounded-2xl bg-[#ede9fe]/40 border border-[#c4b5fd]/60 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 class="text-xs font-black text-slate-900">ຕ້ອງການເພີ່ມສິນຄ້າໃໝ່ພ້ອມຕັ້ງຄ່າ Variant ເລີຍບໍ?</h4>
            <p class="text-[0.68rem] text-slate-500">ຄລິກປຸ່ມດ້ານຂ້າງເພື່ອເປີດໜ້າຕ່າງສ້າງສິນຄ້າພ້ອມລະບົບ Multi-variant ທັນທີ</p>
          </div>
          <button
            type="button"
            class="focus-ring rounded-xl bg-[#5b4cf5] px-4 py-2 text-xs font-bold text-white shadow-[0_4px_14px_rgba(91,76,245,0.35)] hover:bg-[#4a3bd9] transition"
            @click="goToCreateProduct()"
          >
            ສ້າງສິນຄ້າ Variant ດຽວນີ້
          </button>
        </div>
      </section>
    </div>

    <!-- ==================================================== -->
    <!-- UNIT CREATE / EDIT MODAL -->
    <!-- ==================================================== -->
    <div
      v-if="showUnitModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
      @click.self="showUnitModal = false"
    >
      <div class="relative w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6.5 shadow-2xl">
        <header class="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <h2 class="text-base font-extrabold text-slate-800">
            {{ isEditingUnit ? 'ແກ້ໄຂຫົວໜ່ວຍ' : 'ເພີ່ມຫົວໜ່ວຍໃໝ່' }}
          </h2>
          <button
            type="button"
            class="grid size-7.5 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 font-bold transition"
            @click="showUnitModal = false"
          >
            ✕
          </button>
        </header>

        <form class="mt-5 space-y-5" @submit.prevent="submitUnit">
          <label class="block">
            <span class="mb-2 block text-xs font-semibold text-slate-600">ລະຫັດຫົວໜ່ວຍ (Unit Code) *</span>
            <input
              v-model="unitForm.code"
              required
              class="admin-field uppercase font-mono"
              placeholder="EA, KG, PACK, BOX"
            >
          </label>

          <label class="block">
            <span class="mb-2 block text-xs font-semibold text-slate-600">ຊື່ຫົວໜ່ວຍ (Unit Name) *</span>
            <input v-model="unitForm.name" required class="admin-field" placeholder="ອັນ, ກິໂລ, ແພັກ, ລັງ">
          </label>

          <label class="block">
            <span class="mb-2 block text-xs font-semibold text-slate-600">ຕຳແໜ່ງທົດສະນິຍົມ (0 - 6)</span>
            <input
              v-model.number="unitForm.decimalPlaces"
              type="number"
              min="0"
              max="6"
              required
              class="admin-field"
            >
          </label>

          <label v-if="isEditingUnit" class="flex items-center gap-2 pt-1 text-xs font-semibold text-slate-600 cursor-pointer">
            <input v-model="unitForm.active" type="checkbox" class="size-4 accent-[#5b4cf5] rounded">
            <span>ເປີດໃຊ້ງານຫົວໜ່ວຍນີ້ (Active)</span>
          </label>

          <footer class="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              @click="showUnitModal = false"
            >
              ຍົກເລີກ
            </button>
            <button
              type="submit"
              class="rounded-xl bg-[#5b4cf5] px-5 py-2 text-xs font-bold text-white hover:bg-[#4a3bd9] shadow-[0_4px_14px_rgba(91,76,245,0.35)] transition"
              :disabled="saving"
            >
              {{ saving ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກ' }}
            </button>
          </footer>
        </form>
      </div>
    </div>

    <!-- ==================================================== -->
    <!-- CATEGORY CREATE / EDIT MODAL -->
    <!-- ==================================================== -->
    <div
      v-if="showCategoryModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs"
      @click.self="showCategoryModal = false"
    >
      <div class="relative w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6.5 shadow-2xl">
        <header class="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <h2 class="text-base font-extrabold text-slate-800">
            {{ isEditingCategory ? 'ແກ້ໄຂໝວດໝູ່' : 'ເພີ່ມໝວດໝູ່ໃໝ່' }}
          </h2>
          <button
            type="button"
            class="grid size-7.5 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 font-bold transition"
            @click="showCategoryModal = false"
          >
            ✕
          </button>
        </header>

        <form class="mt-5 space-y-5" @submit.prevent="submitCategory">
          <label class="block">
            <span class="mb-2 block text-xs font-semibold text-slate-600">ຊື່ໝວດໝູ່ *</span>
            <input v-model="categoryForm.name" required class="admin-field" placeholder="ເຊັ່ນ: ເຄື່ອງດື່ມ, ເສື້ອຜ້າ">
          </label>

          <div v-if="!isEditingCategory" class="block">
            <Select2
              v-model="categoryForm.parentId"
              :options="[{ value: '', label: 'ບໍ່ມີ (ເປັນໝວດໝູ່ຫຼັກ)' }, ...categories.map(c => ({ value: c.id, label: c.name }))]"
              label="ໝວດໝູ່ແມ່ (Parent Category - ຖ້າມີ)"
              placeholder="ເລືອກໝວດໝູ່ແມ່..."
              search-placeholder="ຄົ້ນຫາໝວດໝູ່..."
            />
          </div>

          <footer class="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              class="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              @click="showCategoryModal = false"
            >
              ຍົກເລີກ
            </button>
            <button
              type="submit"
              class="rounded-xl bg-[#5b4cf5] px-5 py-2 text-xs font-bold text-white hover:bg-[#4a3bd9] shadow-[0_4px_14px_rgba(91,76,245,0.35)] transition"
              :disabled="saving"
            >
              {{ saving ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກ' }}
            </button>
          </footer>
        </form>
      </div>
    </div>

    <!-- ==================================================== -->
    <!-- PRODUCT DETAIL QUICK VIEW MODAL -->
    <!-- ==================================================== -->
    <div
      v-if="selectedViewProduct"
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-xs"
      @click.self="selectedViewProduct = null"
    >
      <div class="relative w-full max-w-2xl rounded-3xl border border-ink-950/10 bg-white p-6 shadow-2xl max-h-[85vh] flex flex-col">
        <header class="flex items-center justify-between border-b border-ink-950/10 pb-4">
          <div>
            <h2 class="text-lg font-black text-ink-950">{{ selectedViewProduct.name }}</h2>
            <p class="text-xs text-ink-500">
              ໝວດໝູ່: {{ selectedViewProduct.category?.name || 'ບໍ່ລະບຸ' }} · ຫົວໜ່ວຍຫຼັກ: {{ selectedViewProduct.unit.name }}
            </p>
          </div>
          <button type="button" class="text-ink-500 font-bold" @click="selectedViewProduct = null">✕</button>
        </header>

        <div class="mt-4 flex-1 overflow-y-auto space-y-4 text-xs pr-1">
          <!-- Packaging Units List -->
          <div v-if="selectedViewProduct.packagingUnits?.length" class="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
            <span class="font-extrabold text-amber-900 block mb-2">ຫົວໜ່ວຍຍ່ອຍ / ຫົວໜ່ວຍຂາຍຍົກ (Packaging Units):</span>
            <div class="space-y-1.5">
              <div
                v-for="pu in selectedViewProduct.packagingUnits"
                :key="pu.id"
                class="flex items-center justify-between bg-white p-2 rounded-lg border border-amber-200 text-xs"
              >
                <span class="font-bold">
                  1 {{ pu.unit?.name || 'ຫົວໜ່ວຍ' }} = {{ Number(pu.conversionRate) }} {{ selectedViewProduct.unit.name }}
                </span>
                <span class="text-ink-600 font-semibold">
                  ລາຄາຂາຍ: {{ pu.sellingPrice ? Number(pu.sellingPrice).toLocaleString() + ' ກີບ' : 'ຕາມອັດຕາສ່ວນ' }}
                </span>
                <span v-if="pu.barcode" class="font-mono text-ink-500 text-[0.68rem]">
                  Barcode: {{ pu.barcode }}
                </span>
              </div>
            </div>
          </div>

          <!-- Variants Table -->
          <div>
            <span class="font-extrabold text-ink-900 block mb-2">ລາຍການ Variants ({{ selectedViewProduct.variants.length }}):</span>
            <div class="overflow-x-auto rounded-xl border border-ink-950/10">
              <table class="w-full text-left text-xs">
                <thead class="bg-canvas text-[0.65rem] font-black uppercase text-ink-500 border-b border-ink-950/10">
                  <tr>
                    <th class="p-2.5">ຮູບແບບ</th>
                    <th class="p-2.5">ຂະໜາດ</th>
                    <th class="p-2.5">ສີ</th>
                    <th class="p-2.5">SKU</th>
                    <th class="p-2.5">ຕົ້ນທຶນ</th>
                    <th class="p-2.5">ລາຄາຂາຍ</th>
                    <th class="p-2.5">ສະຕັອກ</th>
                    <th class="p-2.5">Barcode</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-ink-950/5">
                  <tr v-for="v in selectedViewProduct.variants" :key="v.id" class="hover:bg-canvas">
                    <td class="p-2 font-bold">{{ v.name || 'Default' }}</td>
                    <td class="p-2">{{ v.size || '—' }}</td>
                    <td class="p-2">{{ v.color || '—' }}</td>
                    <td class="p-2 font-mono text-ink-500">{{ v.sku || '—' }}</td>
                    <td class="p-2">{{ Number(v.cost).toLocaleString() }}</td>
                    <td class="p-2 font-extrabold text-brand-700">{{ Number(v.sellingPrice).toLocaleString() }}</td>
                    <td class="p-2">
                      <span
                        v-if="selectedViewProduct.trackStock"
                        class="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-black"
                        :class="Number(v.stock ?? 0) <= 0
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : Number(v.stock ?? 0) <= Number(v.minStock ?? 0)
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'"
                      >
                        {{ Number(v.stock ?? 0).toLocaleString() }} {{ selectedViewProduct.unit.name }}
                      </span>
                      <span v-else class="text-slate-400 text-xs">—</span>
                    </td>
                    <td class="p-2 font-mono text-[0.68rem] text-ink-500">
                      {{ v.barcodes.map(b => b.barcode).join(', ') || '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <footer class="mt-4 pt-3 border-t border-ink-950/10 flex justify-end">
          <button
            type="button"
            class="rounded-xl bg-ink-900 px-4 py-2 text-xs font-bold text-white hover:bg-black transition"
            @click="selectedViewProduct = null"
          >
            ປິດ
          </button>
        </footer>
      </div>
    </div>

    <!-- ==================================================== -->
    <!-- PRODUCT DELETE CONFIRMATION DIALOG -->
    <!-- ==================================================== -->
    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="ຢືນຢັນການລຶບສິນຄ້າ"
      :message="`ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບສິນຄ້າ “${productToDelete?.name}”?`"
      tone="danger"
      confirm-label="ລຶບສິນຄ້າ"
      cancel-label="ຍົກເລີກ"
      :loading="saving"
      @confirm="confirmDeleteProduct"
    >
      <div v-if="productToDelete" class="rounded-2xl border border-rose-100 bg-rose-50/60 p-3.5 text-xs">
        <div class="flex items-center gap-3">
          <span class="text-xl">📦</span>
          <div class="min-w-0 flex-1">
            <p class="font-black text-slate-800 truncate">{{ productToDelete.name }}</p>
            <p class="text-[0.7rem] text-slate-500 mt-0.5">
              <span v-if="productToDelete.category?.name">ໝວດໝູ່: {{ productToDelete.category.name }} · </span>
              <span>ຫົວໜ່ວຍ: {{ productToDelete.unit.name }}</span>
              <span v-if="productToDelete.variants?.[0]?.barcodes?.[0]?.barcode"> · Barcode: {{ productToDelete.variants[0].barcodes[0].barcode }}</span>
            </p>
          </div>
        </div>
        <div class="mt-2.5 flex items-start gap-1.5 text-[0.68rem] text-rose-700 font-medium">
          <AdminIcon name="alert" class="size-3.5 shrink-0 mt-0.5" />
          <span>ສິນຄ້ານີ້ຈະຖືກຍ້າຍໄປໄວ້ໃນຄັງເກັບ (Archived) ແລະ ຈະບໍ່ສະແດງໃນລາຍການຂາຍ.</span>
        </div>
      </div>
    </ConfirmDialog>

    <!-- ==================================================== -->
    <!-- MODAL: ADD / EDIT PRICE GROUP -->
    <!-- ==================================================== -->
    <div
      v-if="showPriceGroupModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div class="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
        <div class="flex items-center justify-between border-b border-line pb-3">
          <h2 class="text-base font-black text-slate-900">
            {{ isEditingPriceGroup ? 'ແກ້ໄຂກຸ່ມລາຄາ' : 'ເພີ່ມກຸ່ມລາຄາໃໝ່' }}
          </h2>
          <button
            type="button"
            class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            @click="showPriceGroupModal = false"
          >
            ✕
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="submitPriceGroup">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ຊື່ກຸ່ມລາຄາ <span class="text-rose-500">*</span></label>
            <input
              v-model="priceGroupForm.name"
              type="text"
              required
              class="w-full h-10 rounded-xl border border-line px-3 text-xs focus:border-[#5b4cf5] focus:outline-none"
              placeholder="ເຊັ່ນ: Foodpanda, GrabFood, ລາຄາສົ່ງ, VIP"
            >
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ລະຫັດກຸ່ມ (Code)</label>
            <input
              v-model="priceGroupForm.code"
              type="text"
              class="w-full h-10 rounded-xl border border-line px-3 text-xs uppercase font-mono focus:border-[#5b4cf5] focus:outline-none"
              placeholder="FOODPANDA / GRAB / WHOLESALE"
              :disabled="isEditingPriceGroup"
            >
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ລາຍລະອຽດ</label>
            <textarea
              v-model="priceGroupForm.description"
              rows="2"
              class="w-full rounded-xl border border-line p-2.5 text-xs focus:border-[#5b4cf5] focus:outline-none"
              placeholder="ຄຳອະທິບາຍກຸ່ມລາຄານີ້ ເຊັ່ນ: ລາຄາຂາຍຜ່ານ Delivery..."
            />
          </div>

          <div class="flex items-center gap-2">
            <input
              id="isDefaultPriceGroup"
              v-model="priceGroupForm.isDefault"
              type="checkbox"
              class="rounded accent-brand-600 size-4"
            >
            <label for="isDefaultPriceGroup" class="text-xs font-medium text-slate-700">
              ຕັ້ງເປັນກຸ່ມລາຄາເລີ່ມຕົ້ນ (Default Price Group)
            </label>
          </div>

          <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
            <button
              type="button"
              class="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              @click="showPriceGroupModal = false"
            >
              ຍົກເລີກ
            </button>
            <button
              type="submit"
              class="rounded-xl bg-[#5b4cf5] px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#4a3bd9] transition disabled:opacity-50"
              :disabled="saving"
            >
              {{ saving ? 'ກຳລັງບັນທຶກ...' : (isEditingPriceGroup ? 'ບັນທຶກການແກ້ໄຂ' : 'ເພີ່ມກຸ່ມລາຄາ') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ==================================================== -->
    <!-- MODAL: SET GROUP PRODUCT PRICES -->
    <!-- ==================================================== -->
    <div
      v-if="showBindPricesModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
    >
      <div class="relative w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-line px-6 py-4 bg-slate-50/50">
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base font-black text-slate-900">
                ຕັ້ງລາຄາສິນຄ້າສຳລັບກຸ່ມ
              </h2>
              <span class="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-extrabold text-indigo-700 font-mono">
                {{ selectedPriceGroupForBinding?.name }}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-1">
              ສິນຄ້າທີ່ກຳນົດຢູ່ນີ້ຈະຂາຍຕາມລາຄານີ້, ສ່ວນສິນຄ້າອື່ນໆທີ່ບໍ່ໄດ້ຕັ້ງຈະຂາຍຕາມລາຄາໜ້າຮ້ານ (Default)
            </p>
          </div>
          <button
            type="button"
            class="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            @click="showBindPricesModal = false"
          >
            ✕
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto p-6 space-y-5">
          <!-- Search & Add Bar -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-slate-700">ຄົ້ນຫາ ແລະ ເພີ່ມສິນຄ້າໃສ່ກຸ່ມນີ້</label>
              <button
                v-if="availableVariantsForGroup.length > 0"
                type="button"
                class="text-xs font-bold text-indigo-600 hover:underline"
                @click="addAllVariantsToGroup"
              >
                + ເພີ່ມສິນຄ້າທັງໝົດ ({{ availableVariantsForGroup.length }} ລາຍການ)
              </button>
            </div>
            <div class="relative">
              <input
                v-model="productSearchInGroup"
                type="text"
                class="w-full h-11 rounded-xl border border-line pl-10 pr-4 text-xs focus:border-[#5b4cf5] focus:ring-1 focus:ring-[#5b4cf5] focus:outline-none"
                placeholder="ພິມຊື່ສິນຄ້າ, ບາໂຄ້ດ ຫຼື SKU ເພື່ອເລືອກເພີ່ມໃສ່ກຸ່ມ..."
              >
              <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>

            <!-- Search Results Dropdown -->
            <div
              v-if="productSearchInGroup.trim() && availableVariantsForGroup.length > 0"
              class="max-h-56 overflow-y-auto rounded-xl border border-line bg-white shadow-lg divide-y divide-line"
            >
              <div
                v-for="item in availableVariantsForGroup.slice(0, 8)"
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
                    <div class="text-[0.65rem] text-slate-400">ລາຄາໜ້າຮ້ານ</div>
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
          </div>

          <!-- Quick Bulk Adjustment Toolbar (e.g. +20%, +25%, +30% for Foodpanda) -->
          <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
            <div class="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <span>⚡ ປັບລາຄາດ່ວນທຸກລາຍການ:</span>
            </div>
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-[0.68rem] text-slate-500 font-medium">ບວກເພີ່ມ (Delivery GP):</span>
              <button
                type="button"
                class="rounded-lg bg-white border border-indigo-200 px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition shadow-xs"
                @click="applyMarkupPercentToAll(10)"
              >
                +10%
              </button>
              <button
                type="button"
                class="rounded-lg bg-white border border-indigo-200 px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition shadow-xs"
                @click="applyMarkupPercentToAll(15)"
              >
                +15%
              </button>
              <button
                type="button"
                class="rounded-lg bg-white border border-indigo-200 px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition shadow-xs"
                @click="applyMarkupPercentToAll(20)"
              >
                +20%
              </button>
              <button
                type="button"
                class="rounded-lg bg-white border border-indigo-200 px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition shadow-xs"
                @click="applyMarkupPercentToAll(25)"
              >
                +25%
              </button>
              <button
                type="button"
                class="rounded-lg bg-white border border-indigo-200 px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition shadow-xs"
                @click="applyMarkupPercentToAll(30)"
              >
                +30%
              </button>
              <span class="text-slate-300">|</span>
              <button
                type="button"
                class="rounded-lg bg-white border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 transition shadow-xs"
                @click="applyMarkupPercentToAll(0)"
              >
                ຣີເຊັດເທົ່າລາຄາໜ້າຮ້ານ
              </button>
            </div>
          </div>

          <!-- Bound Products Table -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xs font-bold text-slate-700">
                ລາຍການສິນຄ້າໃນກຸ່ມນີ້ ({{ boundGroupProducts.length }} ລາຍການ)
              </h3>
            </div>

            <div v-if="loadingBoundGroupProducts" class="py-12 text-center text-xs text-slate-400">
              ກຳລັງໂຫຼດຂໍ້ມູນສິນຄ້າ...
            </div>

            <div
              v-else-if="boundGroupProducts.length === 0"
              class="py-12 text-center rounded-2xl border border-dashed border-line bg-slate-50/50 space-y-2"
            >
              <div class="text-3xl">🏷️</div>
              <p class="text-xs font-bold text-slate-600">ຍັງບໍ່ມີສິນຄ້າທີ່ກຳນົດລາຄາໃນກຸ່ມນີ້ເທື່ອ</p>
              <p class="text-[0.7rem] text-slate-400">
                ຄົ້ນຫາຊື່ສິນຄ້າດ້ານເທິງ ຫຼື ກົດ "+ ເພີ່ມສິນຄ້າທັງໝົດ" ເພື່ອກຳນົດລາຄາ
              </p>
            </div>

            <div v-else class="overflow-x-auto rounded-2xl border border-line">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-50 text-slate-600 border-b border-line text-[0.7rem] font-bold">
                  <tr>
                    <th class="p-3 pl-4">ສິນຄ້າ</th>
                    <th class="p-3 text-right">ລາຄາໜ້າຮ້ານ (Default)</th>
                    <th class="p-3 w-48 text-right">ລາຄາກຸ່ມນີ້ (₭)</th>
                    <th class="p-3 text-center">ສ່ວນຕ່າງ</th>
                    <th class="p-3 pr-4 text-right">ລຶບອອກ</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-line">
                  <tr v-for="bp in boundGroupProducts" :key="bp.variantId" class="hover:bg-slate-50/70 transition">
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
                      <template v-if="Number(bp.groupPrice) > Number(bp.normalPrice)">
                        <span class="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[0.65rem] font-bold text-amber-700">
                          +{{ formatMoney(String(Number(bp.groupPrice) - Number(bp.normalPrice))) }} ₭ (+{{ Math.round(((Number(bp.groupPrice) - Number(bp.normalPrice)) / Number(bp.normalPrice)) * 100) }}%)
                        </span>
                      </template>
                      <template v-else-if="Number(bp.groupPrice) < Number(bp.normalPrice)">
                        <span class="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-700">
                          ຫຼຸດ {{ formatMoney(String(Number(bp.normalPrice) - Number(bp.groupPrice))) }} ₭
                        </span>
                      </template>
                      <template v-else>
                        <span class="text-[0.65rem] text-slate-400">ເທົ່າລາຄາໜ້າຮ້ານ</span>
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
            ທັງໝົດ <span class="font-bold text-slate-800">{{ boundGroupProducts.length }}</span> ລາຍການ
          </div>
          <div class="flex items-center gap-2.5">
            <button
              type="button"
              class="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              @click="showBindPricesModal = false"
            >
              ຍົກເລີກ
            </button>
            <button
              type="button"
              class="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50"
              :disabled="savingBoundGroupProducts"
              @click="saveBoundGroupPrices"
            >
              {{ savingBoundGroupProducts ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກລາຄາກຸ່ມນີ້' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
