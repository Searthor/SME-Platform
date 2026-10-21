<script setup lang="ts">
import Select2 from '~/components/forms/Select2.vue'
import { ApiClientError } from '~/services/api-client'
import type { CatalogCategory, CatalogUnit, CustomerGroup, Product, ProductList, Promotion, PromotionList, PromotionRewardType, PromotionType } from '~/types/api'
import { formatMoney, formatMoneyInput, sanitizeDecimalInput } from '~/utils/money'

useHead({ title: 'ຈັດການໂປຣໂມຊັ່ນ (Promotions)' })

const api = useApiClient()
const auth = useAuthStore()
const toast = useToast()

// State
const promotions = ref<Promotion[]>([])
const totalPromotions = ref(0)
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Delete confirmation modal state
const showDeleteConfirm = ref(false)
const promotionToDelete = ref<Promotion | null>(null)
const deleting = ref(false)

const openDeleteConfirm = (p: Promotion) => {
  promotionToDelete.value = p
  showDeleteConfirm.value = true
}

const closeDeleteConfirm = () => {
  showDeleteConfirm.value = false
  promotionToDelete.value = null
}

// Filter states
const search = ref('')
const filterType = ref<string>('ALL')
const filterStatus = ref<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
const page = ref(1)

// Catalog reference data for modal builder
const catalogProducts = ref<Product[]>([])
const categories = ref<CatalogCategory[]>([])
const units = ref<CatalogUnit[]>([])
const customerGroups = ref<CustomerGroup[]>([])

// Modal State
const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editingPromotionId = ref<string | null>(null)
const modalError = ref('')

// Form fields
const form = reactive({
  code: '',
  name: '',
  description: '',
  type: 'BUY_X_GET_Y' as PromotionType,
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6] as number[],
  minQuantity: '1',
  minAmount: '0',
  rewardType: 'FREE_ITEM' as PromotionRewardType,
  discountValue: '0',
  rewardQuantity: '1',
  rewardDiscountPercent: '100',
  rewardProductId: '',
  rewardVariantId: '',
  rewardUnitId: '',
  maxDiscountCap: '',
  usageLimit: null as number | null,
  active: true,
  customerGroupId: '',
  // Target items
  targetScope: 'ALL' as 'ALL' | 'PRODUCTS' | 'CATEGORIES',
  selectedProductIds: [] as string[],
  selectedCategoryIds: [] as string[],
  selectedUnitId: '' as string, // Packaging unit constraint (e.g. only cups/bottles)
})

const daysOptions = [
  { value: 1, label: 'ຈັນ' },
  { value: 2, label: 'ອັງຄານ' },
  { value: 3, label: 'ພຸດ' },
  { value: 4, label: 'ພະຫັດ' },
  { value: 5, label: 'ສຸກ' },
  { value: 6, label: 'ເສົາ' },
  { value: 0, label: 'ອາທິດ' },
]

const promoTypeLabels: Record<PromotionType, { label: string; badge: string; color: string; desc: string }> = {
  BUY_X_GET_Y: {
    label: 'ຊື້ X ແຖມ Y (BOGO)',
    badge: 'ຊື້ແຖມ',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'ຊື້ສິນຄ້າຄົບຈຳນວນ ແຖມສິນຄ້າດຽວກັນຟຣີ (ເຊັ່ນ ຊື້ 2 ແຖມ 1)',
  },
  BUNDLE_CROSS: {
    label: 'ຊື້ A ແຖມ B (Bundle)',
    badge: 'ຈັບຄູ່ແຖມ',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    desc: 'ຊື້ສິນຄ້າ A ຄົບເງື່ອນໄຂ ແຖມສິນຄ້າ B ຟຣີ ຫຼື ລາຄາພິເສດ',
  },
  DISCOUNT: {
    label: 'ສ່ວນຫຼຸດສິນຄ້າ (Discount)',
    badge: 'ຫຼຸດລາຄາ',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    desc: 'ຫຼຸດລາຄາເປັນເປີເຊັນ %, ຫຼຸດເປັນເງິນກີບ ₭, ຫຼື ຂາຍລາຄາພິເສດ',
  },
  BILL_TOTAL: {
    label: 'ສ່ວນຫຼຸດຍອດບິນ (Bill Total)',
    badge: 'ຍອດບິນ',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    desc: 'ຊື້ຄົບຍອດຂັ້ນຕ່ຳ ຫຼຸດທັນທີ (ເຊັ່ນ ຊື້ຄົບ 100,000 ₭ ຫຼຸດ 10,000 ₭)',
  },
}

const messageFrom = (cause: unknown) =>
  cause instanceof ApiClientError ? cause.message : 'ບໍ່ສາມາດດຳເນີນການໄດ້ ກະລຸນາລອງໃໝ່'

// Load promotions
const loadPromotions = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const params = new URLSearchParams({
      page: page.value.toString(),
      limit: '50',
    })
    if (search.value.trim()) params.set('q', search.value.trim())
    if (filterType.value !== 'ALL') params.set('type', filterType.value)
    if (filterStatus.value === 'ACTIVE') params.set('active', 'true')
    if (filterStatus.value === 'INACTIVE') params.set('active', 'false')

    const res = await api.get<PromotionList | Promotion[]>(`/promotions?${params.toString()}`)
    if (Array.isArray(res)) {
      promotions.value = res
      totalPromotions.value = res.length
    } else {
      promotions.value = res.items ?? []
      totalPromotions.value = res.total ?? 0
    }
  } catch (cause) {
    errorMessage.value = messageFrom(cause)
  } finally {
    loading.value = false
  }
}

// Load supporting data (products, categories, units, customer groups)
const targetProductSearch = ref('')

const filteredCatalogProducts = computed(() => {
  const q = targetProductSearch.value.trim().toLowerCase()
  if (!q) return catalogProducts.value
  return catalogProducts.value.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.variants?.some(v => v.sku?.toLowerCase().includes(q)) ||
    p.category?.name?.toLowerCase().includes(q)
  )
})

const toggleProductSelection = (productId: string) => {
  const idx = form.selectedProductIds.indexOf(productId)
  if (idx > -1) {
    form.selectedProductIds.splice(idx, 1)
  } else {
    form.selectedProductIds.push(productId)
  }
}

const selectAllFilteredProducts = () => {
  for (const p of filteredCatalogProducts.value) {
    if (!form.selectedProductIds.includes(p.id)) {
      form.selectedProductIds.push(p.id)
    }
  }
}

const clearProductSelection = () => {
  form.selectedProductIds = []
}

const toggleCategorySelection = (categoryId: string) => {
  const idx = form.selectedCategoryIds.indexOf(categoryId)
  if (idx > -1) {
    form.selectedCategoryIds.splice(idx, 1)
  } else {
    form.selectedCategoryIds.push(categoryId)
  }
}

const loadSupportData = async () => {
  try {
    const [prodRes, catRes, unitRes, groupRes] = await Promise.all([
      api.get<ProductList>('/products?limit=100').catch((err) => {
        console.error('Failed to load products', err)
        return { items: [], total: 0, page: 1, limit: 100, totalPages: 1 }
      }),
      api.get<CatalogCategory[]>('/catalog/categories').catch(() => [] as CatalogCategory[]),
      api.get<CatalogUnit[]>('/catalog/units').catch(() => [] as CatalogUnit[]),
      api.get<CustomerGroup[]>('/customer-groups').catch(() => [] as CustomerGroup[]),
    ])
    catalogProducts.value = prodRes.items ?? []
    categories.value = catRes ?? []
    units.value = unitRes ?? []
    customerGroups.value = groupRes ?? []
  } catch (err) {
    console.warn('Failed to load support data for promotions', err)
  }
}

onMounted(async () => {
  await Promise.all([loadPromotions(), loadSupportData()])
})

// Quick Stats
const activePromosCount = computed(() => {
  const now = new Date()
  return promotions.value.filter(p => {
    if (!p.active) return false
    const start = new Date(p.startDate)
    const end = new Date(p.endDate)
    return now >= start && now <= end
  }).length
})

const bogoCount = computed(() =>
  promotions.value.filter(p => p.type === 'BUY_X_GET_Y' || p.type === 'BUNDLE_CROSS').length
)

const discountCount = computed(() =>
  promotions.value.filter(p => p.type === 'DISCOUNT' || p.type === 'BILL_TOTAL').length
)

// Reset form
const resetForm = () => {
  const today = new Date().toISOString().slice(0, 10)
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  form.code = `PROMO-${Math.floor(1000 + Math.random() * 9000)}`
  form.name = 'ໂປຣໂມຊັ່ນ ຊື້ 2 ແຖມ 1 (BOGO)'
  form.description = ''
  form.type = 'BUY_X_GET_Y'
  form.startDate = today
  form.endDate = nextMonth
  form.startTime = ''
  form.endTime = ''
  form.daysOfWeek = [0, 1, 2, 3, 4, 5, 6]
  form.minQuantity = '2'
  form.minAmount = '0'
  form.rewardType = 'FREE_ITEM'
  form.discountValue = '0'
  form.rewardQuantity = '1'
  form.rewardDiscountPercent = '100'
  form.rewardProductId = ''
  form.rewardVariantId = ''
  form.rewardUnitId = ''
  form.maxDiscountCap = ''
  form.usageLimit = null
  form.active = true
  form.customerGroupId = ''
  form.targetScope = 'ALL'
  form.selectedProductIds = []
  form.selectedCategoryIds = []
  form.selectedUnitId = ''
  modalError.value = ''
}

// Open modal for Create
const openCreateModal = () => {
  resetForm()
  modalMode.value = 'create'
  editingPromotionId.value = null
  showModal.value = true
}

// Open modal for Edit
const openEditModal = (p: Promotion) => {
  modalMode.value = 'edit'
  editingPromotionId.value = p.id
  form.code = p.code
  form.name = p.name
  form.description = p.description || ''
  form.type = p.type
  form.startDate = p.startDate.slice(0, 10)
  form.endDate = p.endDate.slice(0, 10)
  form.startTime = p.startTime || ''
  form.endTime = p.endTime || ''
  form.daysOfWeek = Array.isArray(p.daysOfWeek) ? p.daysOfWeek : [0, 1, 2, 3, 4, 5, 6]
  form.minQuantity = p.minQuantity
  form.minAmount = formatMoney(p.minAmount)
  form.rewardType = p.rewardType
  form.discountValue = p.rewardType === 'DISCOUNT_PERCENT' ? p.discountValue : formatMoney(p.discountValue)
  form.rewardQuantity = p.rewardQuantity
  form.rewardDiscountPercent = p.rewardDiscountPercent
  form.rewardProductId = p.rewardProductId || ''
  form.rewardVariantId = p.rewardVariantId || ''
  form.rewardUnitId = p.rewardUnitId || ''
  form.maxDiscountCap = p.maxDiscountCap ? formatMoney(p.maxDiscountCap) : ''
  form.usageLimit = p.usageLimit || null
  form.active = p.active
  form.customerGroupId = p.customerGroupId || ''

  // Infer target scope and unit
  const targetItems = p.items || []
  if (targetItems.length === 0) {
    form.targetScope = 'ALL'
    form.selectedProductIds = []
    form.selectedCategoryIds = []
    form.selectedUnitId = ''
  } else {
    const pIds = targetItems.filter(i => i.productId).map(i => i.productId as string)
    const cIds = targetItems.filter(i => i.categoryId).map(i => i.categoryId as string)
    const uId = targetItems.find(i => i.unitId)?.unitId || ''

    if (pIds.length > 0) {
      form.targetScope = 'PRODUCTS'
      form.selectedProductIds = pIds
    } else if (cIds.length > 0) {
      form.targetScope = 'CATEGORIES'
      form.selectedCategoryIds = cIds
    } else {
      form.targetScope = 'ALL'
    }
    form.selectedUnitId = uId
  }

  showModal.value = true
}

// Watch type change to adjust defaults
watch(
  () => form.type,
  newType => {
    if (modalMode.value === 'create') {
      if (newType === 'BUY_X_GET_Y') {
        form.minQuantity = '2'
        form.rewardQuantity = '1'
        form.rewardType = 'FREE_ITEM'
        form.rewardDiscountPercent = '100'
      } else if (newType === 'BUNDLE_CROSS') {
        form.minQuantity = '1'
        form.rewardQuantity = '1'
        form.rewardType = 'FREE_ITEM'
      } else if (newType === 'DISCOUNT') {
        form.rewardType = 'DISCOUNT_PERCENT'
        form.discountValue = '10'
        form.minQuantity = '1'
      } else if (newType === 'BILL_TOTAL') {
        form.rewardType = 'DISCOUNT_AMOUNT'
        form.minAmount = '100,000'
        form.discountValue = '10,000'
      }
    }
  }
)

// Watch rewardType change to adjust format of discountValue
watch(
  () => form.rewardType,
  (newType, oldType) => {
    if (newType === oldType) return
    if (newType === 'DISCOUNT_PERCENT') {
      const digits = form.discountValue.replace(/[^\d]/g, '')
      const num = parseInt(digits, 10)
      form.discountValue = !isNaN(num) && num <= 100 && num > 0 ? String(num) : '10'
    } else {
      form.discountValue = formatMoneyInput(form.discountValue) || '5,000'
    }
  }
)

// Number input formatters
const handleMinAmountInput = () => {
  form.minAmount = formatMoneyInput(form.minAmount)
}

const handleDiscountValueInput = () => {
  if (form.rewardType === 'DISCOUNT_PERCENT') {
    const digits = form.discountValue.replace(/[^\d]/g, '')
    const num = parseInt(digits, 10)
    if (!isNaN(num) && num > 100) {
      form.discountValue = '100'
    } else {
      form.discountValue = digits
    }
  } else {
    form.discountValue = formatMoneyInput(form.discountValue)
  }
}

const handleMaxDiscountCapInput = () => {
  form.maxDiscountCap = formatMoneyInput(form.maxDiscountCap)
}

const handleQuantityInput = (field: 'minQuantity' | 'rewardQuantity') => {
  const digits = form[field].replace(/[^\d]/g, '')
  form[field] = digits
}

// Variants for reward selection in BUNDLE_CROSS
const availableRewardVariants = computed(() => {
  if (!form.rewardProductId) return []
  const prod = catalogProducts.value.find(p => p.id === form.rewardProductId)
  return prod?.variants || []
})

// Select2 Options Helpers
const productSelectOptions = computed(() =>
  catalogProducts.value.map(p => ({
    value: p.id,
    label: p.name,
    sublabel: p.unit?.name || p.category?.name || undefined,
  }))
)

const categorySelectOptions = computed(() =>
  categories.value.map(c => ({
    value: c.id,
    label: c.name,
  }))
)

const unitSelectOptions = computed(() => [
  { value: '', label: 'ທຸກຫົວໜ່ວຍ (ບໍ່ຈຳກັດຫົວໜ່ວຍ)' },
  ...units.value.map(u => ({
    value: u.id,
    label: `ສະເພາະຫົວໜ່ວຍ: ${u.name}`,
    sublabel: u.code,
  })),
])

const customerGroupSelectOptions = computed(() => [
  { value: '', label: 'ທຸກກຸ່ມລູກຄ້າ (All Customers)' },
  ...customerGroups.value.map(g => ({
    value: g.id,
    label: g.name,
    sublabel: g.code,
  })),
])

const rewardVariantSelectOptions = computed(() =>
  availableRewardVariants.value.map(v => ({
    value: v.id,
    label: v.name || 'ຕົວເລືອກພື້ນຖານ',
    sublabel: v.sku || undefined,
  }))
)

// Auto select first variant when reward product changes
watch(
  () => form.rewardProductId,
  newProdId => {
    if (!newProdId) {
      form.rewardVariantId = ''
      return
    }
    const prod = catalogProducts.value.find(p => p.id === newProdId)
    if (prod && prod.variants && prod.variants.length > 0) {
      form.rewardVariantId = prod.variants[0]?.id ?? ''
    }
  }
)

// Save Promotion (Create or Update)
const savePromotion = async () => {
  modalError.value = ''
  if (!form.name.trim()) {
    modalError.value = 'ກະລຸນາປ້ອນຊື່ໂປຣໂມຊັ່ນ'
    return
  }
  if (!form.code.trim()) {
    modalError.value = 'ກະລຸນາປ້ອນລະຫັດໂປຣໂມຊັ່ນ'
    return
  }
  if (!form.startDate || !form.endDate) {
    modalError.value = 'ກະລຸນາລະບຸວັນທີເລີ່ມຕົ້ນ ແລະ ສິ້ນສຸດ'
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    // Construct items array based on scope
    const itemsPayload: Array<{
      productId?: string
      variantId?: string
      categoryId?: string
      unitId?: string
      isTrigger?: boolean
    }> = []

    if (form.targetScope === 'PRODUCTS') {
      for (const pid of form.selectedProductIds) {
        itemsPayload.push({
          productId: pid,
          unitId: form.selectedUnitId || undefined,
          isTrigger: true,
        })
      }
    } else if (form.targetScope === 'CATEGORIES') {
      for (const cid of form.selectedCategoryIds) {
        itemsPayload.push({
          categoryId: cid,
          unitId: form.selectedUnitId || undefined,
          isTrigger: true,
        })
      }
    } else if (form.selectedUnitId) {
      // Applies to all products, but restricted to this specific unit
      itemsPayload.push({
        unitId: form.selectedUnitId,
        isTrigger: true,
      })
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      startDate: `${form.startDate}T00:00:00.000Z`,
      endDate: `${form.endDate}T23:59:59.999Z`,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      daysOfWeek: form.daysOfWeek.join(','),
      minQuantity: sanitizeDecimalInput(form.minQuantity || '1', 4),
      minAmount: sanitizeDecimalInput(form.minAmount || '0', 4),
      rewardType: form.rewardType,
      discountValue: sanitizeDecimalInput(form.discountValue || '0', 4),
      rewardQuantity: sanitizeDecimalInput(form.rewardQuantity || '1', 4),
      rewardDiscountPercent: sanitizeDecimalInput(form.rewardDiscountPercent || '100', 4),
      rewardProductId: form.rewardProductId || undefined,
      rewardVariantId: form.rewardVariantId || undefined,
      rewardUnitId: form.rewardUnitId || undefined,
      maxDiscountCap: form.maxDiscountCap ? sanitizeDecimalInput(form.maxDiscountCap, 4) : undefined,
      usageLimit: form.usageLimit || undefined,
      active: form.active,
      customerGroupId: form.customerGroupId || undefined,
      items: itemsPayload,
    }

    if (modalMode.value === 'create') {
      await api.post('/promotions', payload)
      toast.success('ສຳເລັດ', 'ສ້າງໂປຣໂມຊັ່ນສຳເລັດແລ້ວ')
    } else if (editingPromotionId.value) {
      await api.patch(`/promotions/${editingPromotionId.value}`, payload)
      toast.success('ສຳເລັດ', 'ບັນທຶກການແກ້ໄຂໂປຣໂມຊັ່ນສຳເລັດແລ້ວ')
    }

    showModal.value = false
    await loadPromotions()
  } catch (cause) {
    modalError.value = messageFrom(cause)
    toast.error('ຜິດພາດ', messageFrom(cause))
  } finally {
    saving.value = false
  }
}

// Toggle status active
const toggleActive = async (p: Promotion) => {
  try {
    await api.patch(`/promotions/${p.id}`, { active: !p.active })
    p.active = !p.active
    toast.info('ສະຖານະ', `ໂປຣໂມຊັ່ນ "${p.name}" ${p.active ? 'ເປີດໃຊ້ງານແລ້ວ' : 'ປິດໃຊ້ງານແລ້ວ'}`)
  } catch (cause) {
    toast.error('ຜິດພາດ', messageFrom(cause))
  }
}

// Delete promotion via custom dialog
const confirmDelete = async () => {
  if (!promotionToDelete.value) return
  deleting.value = true
  const promo = promotionToDelete.value
  try {
    await api.delete(`/promotions/${promo.id}`)
    toast.success('ສຳເລັດ', `ລຶບໂປຣໂມຊັ່ນ "${promo.name}" ສຳເລັດແລ້ວ`)
    closeDeleteConfirm()
    await loadPromotions()
  } catch (cause) {
    toast.error('ຜິດພາດ', messageFrom(cause))
  } finally {
    deleting.value = false
  }
}

// Toggle Day in array
const toggleDay = (dayNum: number) => {
  const idx = form.daysOfWeek.indexOf(dayNum)
  if (idx > -1) {
    if (form.daysOfWeek.length > 1) {
      form.daysOfWeek.splice(idx, 1)
    }
  } else {
    form.daysOfWeek.push(dayNum)
  }
}

// Helpers for list view
const formatPeriod = (p: Promotion) => {
  const start = p.startDate.slice(0, 10)
  const end = p.endDate.slice(0, 10)
  let text = `${start} ຫາ ${end}`
  if (p.startTime && p.endTime) {
    text += ` (${p.startTime} - ${p.endTime})`
  }
  return text
}

const getRewardSummary = (p: Promotion) => {
  if (p.type === 'BUY_X_GET_Y') {
    return `ຊື້ ${p.minQuantity} ແຖມ ${p.rewardQuantity} (${p.rewardDiscountPercent}% ຟຣີ)`
  }
  if (p.type === 'BUNDLE_CROSS') {
    const giftName = p.rewardProduct?.name || 'ສິນຄ້າຂອງແຖມ'
    return `ຊື້ຄົບ ${p.minQuantity} ແຖມ ${giftName} x ${p.rewardQuantity}`
  }
  if (p.type === 'DISCOUNT') {
    if (p.rewardType === 'DISCOUNT_PERCENT') return `ຫຼຸດ ${p.discountValue}%`
    if (p.rewardType === 'DISCOUNT_AMOUNT') return `ຫຼຸດ ${formatMoney(p.discountValue)} ₭`
    return `ຂາຍລາຄາ ${formatMoney(p.discountValue)} ₭`
  }
  if (p.type === 'BILL_TOTAL') {
    if (p.rewardType === 'DISCOUNT_PERCENT') return `ຍອດບິນ >= ${formatMoney(p.minAmount)} ₭ ຫຼຸດ ${p.discountValue}%`
    return `ຍອດບິນ >= ${formatMoney(p.minAmount)} ₭ ຫຼຸດ ${formatMoney(p.discountValue)} ₭`
  }
  return '-'
}

const getUnitSummary = (p: Promotion) => {
  const targetUnit = p.items.find(i => i.unit)?.unit
  if (targetUnit) {
    return `ສະເພາະຫົວໜ່ວຍ: ${targetUnit.name}`
  }
  return 'ທຸກຫົວໜ່ວຍ'
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header Banner -->
    <div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-ink-950 sm:text-3xl">
          ຈັດການໂປຣໂມຊັ່ນ (Promotions)
        </h1>
        <p class="mt-1 text-sm text-ink-500">
          ສ້າງແຄມເປນຫຼຸດລາຄາ, ຊື້ 2 ແຖມ 1 (BOGO), ຊື້ A ແຖມ B, ກຳນົດຫົວໜ່ວຍສິນຄ້າ ແລະ ຊ່ວງເວລາ Happy Hour
        </p>
      </div>
      <div>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-[#5b4cf5] px-4 py-2.5 text-xs font-extrabold text-white shadow-[0_4px_14px_rgba(91,76,245,0.35)] hover:bg-[#4a3bd9] transition active:scale-[0.98]"
          @click="openCreateModal"
        >
          <AdminIcon name="plus" class="size-4" />
          <span>ສ້າງໂປຣໂມຊັ່ນໃໝ່</span>
        </button>
      </div>
    </div>



    <!-- Quick Stats Cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-2xl border border-line bg-white p-5 shadow-xs flex items-center gap-4">
        <div class="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <AdminIcon name="tag" class="size-6" />
        </div>
        <div>
          <p class="text-xs font-medium text-ink-500">ໂປຣໂມຊັ່ນທັງໝົດ</p>
          <p class="text-xl font-black text-ink-950">{{ formatMoney(totalPromotions) }} ລາຍການ</p>
        </div>
      </div>

      <div class="rounded-2xl border border-line bg-white p-5 shadow-xs flex items-center gap-4">
        <div class="grid size-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          <AdminIcon name="check" class="size-6" />
        </div>
        <div>
          <p class="text-xs font-medium text-ink-500">ກຳລັງຈັດລາຍການ (Active)</p>
          <p class="text-xl font-black text-emerald-600">{{ formatMoney(activePromosCount) }} ລາຍການ</p>
        </div>
      </div>

      <div class="rounded-2xl border border-line bg-white p-5 shadow-xs flex items-center gap-4">
        <div class="grid size-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
          <AdminIcon name="box" class="size-6" />
        </div>
        <div>
          <p class="text-xs font-medium text-ink-500">ໂປຣຊື້ແຖມ (BOGO & Bundle)</p>
          <p class="text-xl font-black text-indigo-600">{{ formatMoney(bogoCount) }} ລາຍການ</p>
        </div>
      </div>

      <div class="rounded-2xl border border-line bg-white p-5 shadow-xs flex items-center gap-4">
        <div class="grid size-12 place-items-center rounded-xl bg-amber-50 text-amber-600">
          <AdminIcon name="chart" class="size-6" />
        </div>
        <div>
          <p class="text-xs font-medium text-ink-500">ໂປຣຫຼຸດ & ຍອດບິນ</p>
          <p class="text-xl font-black text-amber-600">{{ formatMoney(discountCount) }} ລາຍການ</p>
        </div>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between">
      <div class="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <!-- Search -->
        <div class="relative w-full sm:max-w-xs">
          <AdminIcon name="search" class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            v-model="search"
            type="text"
            placeholder="ຄົ້ນຫາຊື່ ຫຼື ລະຫັດໂປຣໂມຊັ່ນ..."
            class="h-9.5 w-full rounded-xl border border-line bg-canvas/30 pr-4 pl-9 text-xs text-ink-950 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none"
            @keyup.enter="loadPromotions"
          >
        </div>

        <!-- Filter by Type -->
        <select
          v-model="filterType"
          class="h-9.5 rounded-xl border border-line bg-canvas/30 px-3 text-xs text-ink-950 focus:border-brand-500 focus:bg-white focus:outline-none"
          @change="loadPromotions"
        >
          <option value="ALL">ທຸກປະເພດໂປຣໂມຊັ່ນ</option>
          <option value="BUY_X_GET_Y">ຊື້ X ແຖມ Y (BOGO)</option>
          <option value="BUNDLE_CROSS">ຊື້ A ແຖມ B (Bundle)</option>
          <option value="DISCOUNT">ສ່ວນຫຼຸດສິນຄ້າ</option>
          <option value="BILL_TOTAL">ສ່ວນຫຼຸດຍອດບິນ</option>
        </select>

        <!-- Filter by Status -->
        <select
          v-model="filterStatus"
          class="h-9.5 rounded-xl border border-line bg-canvas/30 px-3 text-xs text-ink-950 focus:border-brand-500 focus:bg-white focus:outline-none"
          @change="loadPromotions"
        >
          <option value="ALL">ທຸກສະຖານະ</option>
          <option value="ACTIVE">ເປີດໃຊ້ງານ (Active)</option>
          <option value="INACTIVE">ປິດໃຊ້ງານ (Inactive)</option>
        </select>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-ink-700 hover:bg-slate-50 transition"
          @click="loadPromotions"
        >
          <AdminIcon name="swap" class="size-3.5" />
          <span>ໂຫຼດໃໝ່</span>
        </button>
      </div>
    </div>

    <!-- Promotions Table List -->
    <div class="overflow-hidden rounded-2xl border border-line bg-white shadow-xs">
      <div v-if="loading" class="flex flex-col items-center justify-center p-12 text-ink-500">
        <LoadingSpinner class="size-8" />
        <p class="mt-3 text-xs">ກຳລັງໂຫຼດຂໍ້ມູນໂປຣໂມຊັ່ນ...</p>
      </div>

      <div v-else-if="promotions.length === 0" class="flex flex-col items-center justify-center p-12 text-center">
        <div class="grid size-16 place-items-center rounded-2xl bg-slate-50 text-slate-400">
          <AdminIcon name="tag" class="size-8" />
        </div>
        <p class="mt-3 text-sm font-bold text-ink-950">ຍັງບໍ່ມີລາຍການໂປຣໂມຊັ່ນ</p>
        <p class="mt-1 text-xs text-ink-500">ເລີ່ມຕົ້ນສ້າງໂປຣໂມຊັ່ນເພື່ອເພີ່ມຍອດຂາຍໃຫ້ຮ້ານຂອງທ່ານ</p>
        <button
          type="button"
          class="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#5b4cf5] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#4a3bd9] transition"
          @click="openCreateModal"
        >
          <AdminIcon name="plus" class="size-3.5" />
          <span>ສ້າງໂປຣໂມຊັ່ນທຳອິດ</span>
        </button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="border-b border-line bg-canvas/60 text-ink-500 font-bold">
            <tr>
              <th class="px-5 py-3.5">ລະຫັດ & ຊື່ໂປຣໂມຊັ່ນ</th>
              <th class="px-4 py-3.5">ປະເພດ & ເງື່ອນໄຂ</th>
              <th class="px-4 py-3.5">ລາງວັນ / ສ່ວນຫຼຸດ</th>
              <th class="px-4 py-3.5">ຫົວໜ່ວຍ</th>
              <th class="px-4 py-3.5">ໄລຍະເວລາ</th>
              <th class="px-4 py-3.5 text-center">ສະຖານະ</th>
              <th class="px-5 py-3.5 text-right">ຈັດການ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="p in promotions" :key="p.id" class="transition hover:bg-canvas/30">
              <td class="px-5 py-4">
                <div class="flex items-center gap-2">
                  <span class="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[0.7rem] font-bold text-slate-700">
                    {{ p.code }}
                  </span>
                </div>
                <div class="mt-1 font-bold text-ink-950 text-sm">{{ p.name }}</div>
                <div v-if="p.description" class="text-[0.7rem] text-ink-500 line-clamp-1">
                  {{ p.description }}
                </div>
              </td>

              <td class="px-4 py-4">
                <span
                  class="inline-flex items-center rounded-lg border px-2.5 py-1 text-[0.7rem] font-bold"
                  :class="promoTypeLabels[p.type]?.color || 'bg-slate-50 text-slate-700 border-slate-200'"
                >
                  {{ promoTypeLabels[p.type]?.badge || p.type }}
                </span>
                <div class="mt-1 text-[0.7rem] text-ink-500">
                  <span v-if="p.type === 'BILL_TOTAL'">ຍອດບິນ >= {{ formatMoney(p.minAmount) }} ₭</span>
                  <span v-else>ຊື້ຂັ້ນຕ່ຳ {{ p.minQuantity }} ລາຍການ</span>
                </div>
              </td>

              <td class="px-4 py-4">
                <div class="font-bold text-ink-950">
                  {{ getRewardSummary(p) }}
                </div>
                <div v-if="p.maxDiscountCap" class="text-[0.7rem] text-rose-600">
                  (ສູງສຸດ {{ formatMoney(p.maxDiscountCap) }} ₭)
                </div>
              </td>

              <td class="px-4 py-4 text-ink-700">
                <span class="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[0.7rem] font-medium text-slate-800">
                  {{ getUnitSummary(p) }}
                </span>
              </td>

              <td class="px-4 py-4 text-ink-600">
                <div class="font-medium">{{ formatPeriod(p) }}</div>
                <div class="mt-0.5 flex gap-1">
                  <span
                    v-for="d in daysOptions"
                    :key="d.value"
                    class="size-4 text-[0.6rem] grid place-items-center rounded font-bold"
                    :class="p.daysOfWeek.includes(d.value) ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-300'"
                  >
                    {{ d.label[0] }}
                  </span>
                </div>
              </td>

              <td class="px-4 py-4 text-center">
                <button
                  type="button"
                  class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                  :class="p.active ? 'bg-emerald-500' : 'bg-slate-200'"
                  @click="toggleActive(p)"
                >
                  <span
                    class="pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
                    :class="p.active ? 'translate-x-5' : 'translate-x-0'"
                  />
                </button>
              </td>

              <td class="px-5 py-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    class="rounded-lg p-1.5 text-ink-500 hover:bg-slate-100 hover:text-brand-600"
                    title="ແກ້ໄຂ"
                    @click="openEditModal(p)"
                  >
                    <AdminIcon name="edit" class="size-4" />
                  </button>
                  <button
                    type="button"
                    class="rounded-lg p-1.5 text-ink-500 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                    title="ລຶບ"
                    @click="openDeleteConfirm(p)"
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

    <!-- Create / Edit Promotion Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 md:p-6 backdrop-blur-xs"
    >
      <div class="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl border border-line bg-white shadow-2xl">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-line px-6 py-4.5">
          <div>
            <h2 class="text-base font-black text-ink-950">
              {{ modalMode === 'create' ? 'ສ້າງໂປຣໂມຊັ່ນໃໝ່' : 'ແກ້ໄຂໂປຣໂມຊັ່ນ' }}
            </h2>
            <p class="text-xs text-ink-500 mt-0.5">
              ກຳນົດເງື່ອນໄຂ, ສິນຄ້າ, ຫົວໜ່ວຍ, ໄລຍະເວລາ ແລະ ສ່ວນຫຼຸດຕາມຄວາມຕ້ອງການ
            </p>
          </div>
          <button
            type="button"
            class="grid size-8 place-items-center rounded-xl text-ink-400 hover:bg-slate-100 hover:text-ink-900 transition"
            @click="showModal = false"
          >
            ✕
          </button>
        </div>

        <!-- Modal Body (Scrollable) -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <!-- Modal Error Banner -->
          <div
            v-if="modalError"
            class="rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-semibold text-rose-800 flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <AdminIcon name="alert" class="size-4 text-rose-600 shrink-0" />
              <span>{{ modalError }}</span>
            </div>
            <button type="button" class="text-rose-600 hover:text-rose-900" @click="modalError = ''">✕</button>
          </div>

          <!-- 1. Basic Information -->
        <div class="rounded-2xl border border-line bg-canvas/30 p-4 space-y-4">
          <h3 class="text-xs font-black uppercase tracking-wider text-ink-500">1. ຂໍ້ມູນທົ່ວໄປ (General Info)</h3>
          
          <!-- Promotion Type Cards -->
          <div>
            <label class="block text-xs font-bold text-ink-900 mb-2">ເລືອກປະເພດໂປຣໂມຊັ່ນ <span class="text-rose-500">*</span></label>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                v-for="(info, tKey) in promoTypeLabels"
                :key="tKey"
                class="cursor-pointer rounded-xl border p-3.5 transition flex flex-col justify-between"
                :class="form.type === tKey ? 'border-brand-500 bg-brand-50/40 shadow-xs ring-1 ring-brand-500' : 'border-line bg-white hover:border-slate-300'"
                @click="form.type = (tKey as PromotionType)"
              >
                <div>
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-black text-ink-950">{{ info.label }}</span>
                    <span
                      class="size-4 rounded-full border grid place-items-center"
                      :class="form.type === tKey ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300'"
                    >
                      <span v-if="form.type === tKey" class="size-1.5 rounded-full bg-white" />
                    </span>
                  </div>
                  <p class="mt-1 text-[0.7rem] text-ink-500 leading-relaxed">{{ info.desc }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-ink-900 mb-1">ລະຫັດໂປຣໂມຊັ່ນ (Code) <span class="text-rose-500">*</span></label>
              <input
                v-model="form.code"
                type="text"
                placeholder="ຕົວຢ່າງ: BOGO-COFFEE"
                class="h-9.5 w-full uppercase font-mono rounded-xl border border-line bg-white px-3 text-xs text-ink-950 focus:border-brand-500 focus:outline-none"
              >
            </div>
            <div>
              <label class="block text-xs font-bold text-ink-900 mb-1">ຊື່ໂປຣໂມຊັ່ນ (Promotion Name) <span class="text-rose-500">*</span></label>
              <input
                v-model="form.name"
                type="text"
                placeholder="ຕົວຢ່າງ: ຊື້ກາເຟ 2 ຈອກ ແຖມ 1 ຈອກ"
                class="h-9.5 w-full rounded-xl border border-line bg-white px-3 text-xs text-ink-950 focus:border-brand-500 focus:outline-none"
              >
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-ink-900 mb-1">ລາຍລະອຽດເພີ່ມເຕີມ</label>
            <input
              v-model="form.description"
              type="text"
              placeholder="ລາຍລະອຽດ ຫຼື ເງື່ອນໄຂເພີ່ມເຕີມເພື່ອສະແດງໃນໃບບິນ"
              class="h-9.5 w-full rounded-xl border border-line bg-white px-3 text-xs text-ink-950 focus:border-brand-500 focus:outline-none"
            >
          </div>
        </div>

        <!-- 2. Conditions & Specific Units -->
        <div class="rounded-2xl border border-line bg-canvas/30 p-4 space-y-4">
          <h3 class="text-xs font-black uppercase tracking-wider text-ink-500">2. ເງື່ອນໄຂສິນຄ້າ & ຫົວໜ່ວຍ (Target Products & Units)</h3>

          <!-- BILL_TOTAL Conditions -->
          <div v-if="form.type === 'BILL_TOTAL'" class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-ink-900 mb-1">ຍອດບິນຂັ້ນຕ່ຳ (₭) <span class="text-rose-500">*</span></label>
              <div class="relative max-w-sm">
                <input
                  v-model="form.minAmount"
                  type="text"
                  class="h-9.5 w-full rounded-xl border border-line bg-white pl-3 pr-8 text-xs text-ink-950 font-bold focus:border-brand-500 focus:outline-none"
                  placeholder="100,000"
                  @input="handleMinAmountInput"
                >
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-400">₭</span>
              </div>
              <p class="mt-1 text-[0.7rem] text-ink-500">ເມື່ອລູກຄ້າຊື້ຄົບຕາມຍອດນີ້ ຈະໄດ້ຮັບສ່ວນຫຼຸດທັນທີ</p>
            </div>
          </div>

          <!-- Product / Unit Conditions for BOGO, BUNDLE, DISCOUNT -->
          <div v-else class="space-y-4">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-xs font-bold text-ink-900 mb-1">ຂອບເຂດສິນຄ້າທີ່ຮ່ວມລາຍການ</label>
                <select
                  v-model="form.targetScope"
                  class="h-9.5 w-full rounded-xl border border-line bg-white px-3 text-xs text-ink-950 focus:border-brand-500 focus:outline-none"
                >
                  <option value="ALL">ທຸກສິນຄ້າໃນຮ້ານ (All Products)</option>
                  <option value="PRODUCTS">ເລືອກສິນຄ້າສະເພາະ (Specific Products)</option>
                  <option value="CATEGORIES">ເລືອກຕາມໝວດໝູ່ (Categories)</option>
                </select>
              </div>

              <!-- Multi-Unit Sensitivity: Select specific unit -->
              <div>
                <label class="block text-xs font-bold text-ink-900 mb-1">
                  ເລືອກຫົວໜ່ວຍທີ່ຮ່ວມລາຍການ (Unit Sensitivity)
                </label>
                <Select2
                  v-model="form.selectedUnitId"
                  :options="unitSelectOptions"
                  placeholder="ທຸກຫົວໜ່ວຍ (ບໍ່ຈຳກັດຫົວໜ່ວຍ)"
                  search-placeholder="ຄົ້ນຫາຫົວໜ່ວຍ..."
                  clearable
                />
                <p class="mt-1 text-[0.7rem] text-ink-500">
                  ຕົວຢ່າງ: ໃຊ້ໄດ້ສະເພາະ "ຈອກ" ຫຼື "ຕຸກ" ເທົ່ານັ້ນ (ຖ້າຊື້ເປັນ "ລັງ" ຈະບໍ່ໄດ້ໂປຣ)
                </p>
              </div>
            </div>

            <!-- Scope: All Products Notice -->
            <div v-if="form.targetScope === 'ALL'" class="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-800 flex items-start gap-2.5">
              <span class="text-base leading-none">✨</span>
              <div>
                <p class="font-bold">ນຳໃຊ້ກັບທຸກສິນຄ້າໃນຮ້ານ (All Products)</p>
                <p class="text-[0.7rem] text-emerald-700 mt-0.5">
                  ລູກຄ້າຊື້ສິນຄ້າໃດກໍ່ຕາມໃນຮ້ານຄົບເງື່ອນໄຂ ຈະໄດ້ຮັບສິດທິໂປຣໂມຊັ່ນທັນທີ (ບໍ່ຈຳເປັນຕ້ອງເລືອກລາຍສິນຄ້າ)
                </p>
              </div>
            </div>

            <!-- Specific Products Interactive Select2 -->
            <div v-if="form.targetScope === 'PRODUCTS'" class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class="block text-xs font-bold text-ink-900">
                  ເລືອກສິນຄ້າທີ່ຮ່ວມລາຍການ <span class="text-rose-500">*</span>
                </label>
                <div class="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    class="text-ink-600 hover:text-brand-600 font-bold underline cursor-pointer text-[0.7rem]"
                    @click="selectAllFilteredProducts"
                  >
                    ເລືອກທັງໝົດ
                  </button>
                  <span class="text-slate-300">|</span>
                  <button
                    type="button"
                    class="text-rose-600 hover:text-rose-700 font-bold underline cursor-pointer text-[0.7rem]"
                    @click="clearProductSelection"
                  >
                    ລ້າງການເລືອກ
                  </button>
                </div>
              </div>

              <Select2
                v-model="form.selectedProductIds"
                :options="productSelectOptions"
                multiple
                placeholder="-- ເລືອກສິນຄ້າທີ່ຮ່ວມລາຍການ (ຄລິກເລືອກໄດ້ຫຼາຍລາຍການ) --"
                search-placeholder="ຄົ້ນຫາຊື່ ຫຼື ລະຫັດສິນຄ້າ..."
                clearable
              />
              <p class="text-[0.7rem] text-ink-500">
                ເລືອກແລ້ວ: {{ form.selectedProductIds.length }} ລາຍການ
              </p>
            </div>

            <!-- Categories Selection with Select2 -->
            <div v-if="form.targetScope === 'CATEGORIES'" class="space-y-1.5">
              <label class="block text-xs font-bold text-ink-900">
                ເລືອກໝວດໝູ່ທີ່ຮ່ວມລາຍການ <span class="text-rose-500">*</span>
              </label>
              <Select2
                v-model="form.selectedCategoryIds"
                :options="categorySelectOptions"
                multiple
                placeholder="-- ເລືອກໝວດໝູ່ (ເລືອກໄດ້ຫຼາຍໝວດ) --"
                search-placeholder="ຄົ້ນຫາໝວດໝູ່..."
                clearable
              />
            </div>

            <!-- Min Quantity -->
            <div>
              <label class="block text-xs font-bold text-ink-900 mb-1">ຈຳນວນຊື້ຂັ້ນຕ່ຳ (Min Quantity) <span class="text-rose-500">*</span></label>
              <input
                v-model="form.minQuantity"
                type="text"
                class="h-9.5 w-full sm:w-48 rounded-xl border border-line bg-white px-3 text-xs text-ink-950 font-bold focus:border-brand-500 focus:outline-none"
                placeholder="2"
                @input="handleQuantityInput('minQuantity')"
              >
              <p class="mt-1 text-[0.7rem] text-ink-500">ຕົວຢ່າງ: ຊື້ຄົບ 2 ຈອກ ເພື່ອໄດ້ຮັບສິດແຖມ ຫຼື ສ່ວນຫຼຸດ</p>
            </div>
          </div>
        </div>

        <!-- 3. Rewards / Benefits -->
        <div class="rounded-2xl border border-line bg-canvas/30 p-4 space-y-4">
          <h3 class="text-xs font-black uppercase tracking-wider text-ink-500">3. ລາງວັນ / ສ່ວນຫຼຸດ (Reward & Benefit)</h3>

          <!-- BOGO: Buy X Get Y Free on same item -->
          <div v-if="form.type === 'BUY_X_GET_Y'" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-ink-900 mb-1">ຈຳນວນທີ່ແຖມ (Reward Quantity) <span class="text-rose-500">*</span></label>
              <input
                v-model="form.rewardQuantity"
                type="text"
                class="h-9.5 w-full rounded-xl border border-line bg-white px-3 text-xs text-ink-950 font-bold focus:border-brand-500 focus:outline-none"
                placeholder="1"
                @input="handleQuantityInput('rewardQuantity')"
              >
              <p class="mt-1 text-[0.7rem] text-ink-500">ຕົວຢ່າງ: ຊື້ 2 ແຖມ 1 (ປ້ອນ 1)</p>
            </div>
            <div>
              <label class="block text-xs font-bold text-ink-900 mb-1">ສ່ວນຫຼຸດຂອງສິນຄ້າແຖມ (%)</label>
              <input
                v-model="form.rewardDiscountPercent"
                type="text"
                class="h-9.5 w-full rounded-xl border border-line bg-white px-3 text-xs text-ink-950 font-bold focus:border-brand-500 focus:outline-none"
                placeholder="100"
                @input="form.rewardDiscountPercent = form.rewardDiscountPercent.replace(/[^\d]/g, '')"
              >
              <p class="mt-1 text-[0.7rem] text-ink-500">100 = ແຖມຟຣີ 100%, 50 = ຊື້ຊິ້ນທີ 2 ຫຼຸດ 50%</p>
            </div>
          </div>

          <!-- BUNDLE_CROSS: Buy A Get B -->
          <div v-else-if="form.type === 'BUNDLE_CROSS'" class="space-y-4">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-xs font-bold text-ink-900 mb-1">ເລືອກສິນຄ້າຂອງແຖມ (Item B) <span class="text-rose-500">*</span></label>
                <Select2
                  v-model="form.rewardProductId"
                  :options="productSelectOptions"
                  placeholder="-- ເລືອກສິນຄ້າຂອງແຖມ --"
                  search-placeholder="ຄົ້ນຫາສິນຄ້າ..."
                  clearable
                />
              </div>

              <div v-if="availableRewardVariants.length > 0">
                <label class="block text-xs font-bold text-ink-900 mb-1">ເລືອກລຸ້ນ/ຂະໜາດສິນຄ້າຂອງແຖມ <span class="text-rose-500">*</span></label>
                <Select2
                  v-model="form.rewardVariantId"
                  :options="rewardVariantSelectOptions"
                  placeholder="-- ເລືອກລຸ້ນ/ຂະໜາດ --"
                  search-placeholder="ຄົ້ນຫາລຸ້ນ/ຂະໜາດ..."
                  clearable
                />
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label class="block text-xs font-bold text-ink-900 mb-1">ຈຳນວນທີ່ແຖມ</label>
                <input
                  v-model="form.rewardQuantity"
                  type="text"
                  class="h-9.5 w-full rounded-xl border border-line bg-white px-3 text-xs text-ink-950 font-bold focus:border-brand-500 focus:outline-none"
                  placeholder="1"
                  @input="handleQuantityInput('rewardQuantity')"
                >
              </div>
            </div>
          </div>

          <!-- DISCOUNT or BILL_TOTAL -->
          <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-ink-900 mb-1">ຮູບແບບສ່ວນຫຼຸດ <span class="text-rose-500">*</span></label>
              <select
                v-model="form.rewardType"
                class="h-9.5 w-full rounded-xl border border-line bg-white px-3 text-xs text-ink-950 focus:border-brand-500 focus:outline-none"
              >
                <option value="DISCOUNT_PERCENT">ຫຼຸດເປັນເປີເຊັນ (%)</option>
                <option value="DISCOUNT_AMOUNT">ຫຼຸດເປັນຈຳນວນເງິນ (₭)</option>
                <option v-if="form.type === 'DISCOUNT'" value="SPECIAL_PRICE">ຂາຍລາຄາພິເສດ (Fixed Campaign Price)</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-ink-900 mb-1">
                ມູນຄ່າສ່ວນຫຼຸດ / ລາຄາພິເສດ <span class="text-rose-500">*</span>
              </label>
              <div class="relative">
                <input
                  v-model="form.discountValue"
                  type="text"
                  class="h-9.5 w-full rounded-xl border border-line bg-white pl-3 pr-8 text-xs text-ink-950 font-bold focus:border-brand-500 focus:outline-none"
                  :placeholder="form.rewardType === 'DISCOUNT_PERCENT' ? '10' : '5,000'"
                  @input="handleDiscountValueInput"
                >
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-400">
                  {{ form.rewardType === 'DISCOUNT_PERCENT' ? '%' : '₭' }}
                </span>
              </div>
              <p class="mt-1 text-[0.7rem] text-ink-500">
                {{ form.rewardType === 'DISCOUNT_PERCENT' ? 'ປ້ອນ % (ເຊັ່ນ: 15)' : 'ປ້ອນຈຳນວນເງິນກີບ (ເຊັ່ນ: 5,000)' }}
              </p>
            </div>

            <div v-if="form.rewardType === 'DISCOUNT_PERCENT'">
              <label class="block text-xs font-bold text-ink-900 mb-1">ເພດານສ່ວນຫຼຸດສູງສຸດ (Max Discount Cap, ₭)</label>
              <div class="relative">
                <input
                  v-model="form.maxDiscountCap"
                  type="text"
                  class="h-9.5 w-full rounded-xl border border-line bg-white pl-3 pr-8 text-xs text-ink-950 focus:border-brand-500 focus:outline-none"
                  placeholder="50,000 (ຫວ່າງໄວ້ຖ້າບໍ່ຈຳກັດ)"
                  @input="handleMaxDiscountCapInput"
                >
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-400">₭</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Schedule & Period -->
        <div class="rounded-2xl border border-line bg-canvas/30 p-4 space-y-4">
          <h3 class="text-xs font-black uppercase tracking-wider text-ink-500">4. ໄລຍະເວລາ & ຊ່ວງເວລາ (Validity & Schedule)</h3>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-ink-900 mb-1">ວັນທີເລີ່ມຕົ້ນ (Start Date) <span class="text-rose-500">*</span></label>
              <input
                v-model="form.startDate"
                type="date"
                class="h-9.5 w-full rounded-xl border border-line bg-white px-3 text-xs text-ink-950 focus:border-brand-500 focus:outline-none"
              >
            </div>
            <div>
              <label class="block text-xs font-bold text-ink-900 mb-1">ວັນທີສິ້ນສຸດ (End Date) <span class="text-rose-500">*</span></label>
              <input
                v-model="form.endDate"
                type="date"
                class="h-9.5 w-full rounded-xl border border-line bg-white px-3 text-xs text-ink-950 focus:border-brand-500 focus:outline-none"
              >
            </div>
          </div>

          <!-- Happy Hour Times -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-xs font-bold text-ink-900 mb-1">ເວລາເລີ່ມຕົ້ນ (Happy Hour Start)</label>
              <input
                v-model="form.startTime"
                type="time"
                class="h-9.5 w-full rounded-xl border border-line bg-white px-3 text-xs text-ink-950 focus:border-brand-500 focus:outline-none"
              >
              <p class="mt-1 text-[0.7rem] text-ink-500">ຫວ່າງໄວ້ຖ້າໃຊ້ໄດ້ຕະຫຼອດມື້</p>
            </div>
            <div>
              <label class="block text-xs font-bold text-ink-900 mb-1">ເວລາສິ້ນສຸດ (Happy Hour End)</label>
              <input
                v-model="form.endTime"
                type="time"
                class="h-9.5 w-full rounded-xl border border-line bg-white px-3 text-xs text-ink-950 focus:border-brand-500 focus:outline-none"
              >
            </div>
          </div>

          <!-- Days of Week -->
          <div>
            <label class="block text-xs font-bold text-ink-900 mb-2">ວັນໃນອາທິດທີ່ສາມາດໃຊ້ໄດ້</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="d in daysOptions"
                :key="d.value"
                type="button"
                class="rounded-xl border px-3 py-1.5 text-xs font-bold transition"
                :class="form.daysOfWeek.includes(d.value) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line bg-white text-ink-500 hover:border-slate-300'"
                @click="toggleDay(d.value)"
              >
                {{ d.label }}
              </button>
            </div>
          </div>

          <!-- Customer Group Binding (Optional) -->
          <div v-if="customerGroups.length > 0" class="max-w-md">
            <label class="block text-xs font-bold text-ink-900 mb-1">ຜູກກັບກຸ່ມລູກຄ້າສະເພາະ (Customer Group Scope)</label>
            <Select2
              v-model="form.customerGroupId"
              :options="customerGroupSelectOptions"
              placeholder="ທຸກກຸ່ມລູກຄ້າ (All Customers)"
              search-placeholder="ຄົ້ນຫາກຸ່ມລູກຄ້າ..."
              clearable
            />
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
        <div class="flex items-center justify-end gap-3 border-t border-line px-6 py-4 bg-slate-50/50 rounded-b-3xl">
          <button
            type="button"
            class="rounded-xl border border-line bg-white px-4 py-2 text-xs font-bold text-ink-700 hover:bg-slate-50 transition"
            @click="showModal = false"
          >
            ຍົກເລີກ
          </button>
          <button
            type="button"
            :disabled="saving"
            class="inline-flex items-center gap-2 rounded-xl bg-[#5b4cf5] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#4a3bd9] transition disabled:opacity-50"
            @click="savePromotion"
          >
            <LoadingSpinner v-if="saving" class="size-4" />
            <span v-else>{{ modalMode === 'create' ? 'ສ້າງໂປຣໂມຊັ່ນ' : 'ບັນທຶກການແກ້ໄຂ' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Beautiful Delete Confirmation Dialog -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="showDeleteConfirm"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-sm"
        @click.self="closeDeleteConfirm"
      >
        <div class="relative w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-2xl space-y-5">
          <div class="flex items-start gap-4">
            <div class="grid size-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
              <AdminIcon name="alert" class="size-6" />
            </div>
            <div class="space-y-1">
              <h3 class="text-base font-black text-ink-950">ຢືນຢັນການລຶບໂປຣໂມຊັ່ນ</h3>
              <p class="text-xs text-ink-500 leading-relaxed">
                ທ່ານແນ່ໃຈແທ້ບໍ່ວ່າຕ້ອງການລຶບໂປຣໂມຊັ່ນ
                <span class="font-bold text-ink-900">"{{ promotionToDelete?.name }}"</span>?
                ຂໍ້ມູນໂປຣໂມຊັ່ນນີ້ຈະຖືກລຶບອອກຈາກລະບົບທັນທີ ແລະ ບໍ່ສາມາດກູ້ຄືນໄດ້.
              </p>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              :disabled="deleting"
              class="rounded-xl border border-line bg-white px-4 py-2.5 text-xs font-bold text-ink-700 hover:bg-slate-50 transition cursor-pointer"
              @click="closeDeleteConfirm"
            >
              ຍົກເລີກ
            </button>
            <button
              type="button"
              :disabled="deleting"
              class="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition shadow-sm cursor-pointer disabled:opacity-50"
              @click="confirmDelete"
            >
              <LoadingSpinner v-if="deleting" class="size-3.5 text-white" />
              <span>{{ deleting ? 'ກຳລັງລຶບ...' : 'ຢືນຢັນການລຶບ' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
