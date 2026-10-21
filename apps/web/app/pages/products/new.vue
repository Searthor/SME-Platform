<script setup lang="ts">
import type { UploadedImage } from '~/components/forms/MultiImageUpload.vue'
import { ApiClientError } from '~/services/api-client'
import type { CatalogCategory, CatalogUnit, CustomerGroup, Product } from '~/types/api'
import { formatMoney, sanitizeDecimalInput, toApiDecimal } from '~/utils/money'

const route = useRoute()
const router = useRouter()
const api = useApiClient()
const auth = useAuthStore()
const { isCollapsed } = useSidebar()

const productId = computed(() => (route.query.id as string) || '')
const isEditing = computed(() => Boolean(productId.value))

useHead({
  title: computed(() => (isEditing.value ? 'ແກ້ໄຂສິນຄ້າ · SME Flow' : 'ເພີ່ມສິນຄ້າໃໝ່ · SME Flow')),
})

// Permissions
const canCreate = computed(() => auth.hasPermission('product.create'))
const canUpdate = computed(() => auth.hasPermission('product.update'))
const canSave = computed(() => (isEditing.value ? canUpdate.value : canCreate.value))

// Reference Data
const categories = ref<CatalogCategory[]>([])
const units = ref<CatalogUnit[]>([])
const customerGroups = ref<CustomerGroup[]>([])
const simpleGroupPrices = ref<Record<string, string>>({})
const loadingRefs = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const productVersion = ref(1)

// Form Data Types
type VariantFormItem = {
  id?: string
  name: string
  size: string
  color: string
  sku: string
  barcodesText: string
  cost: string
  sellingPrice: string
  minStock: string
  isDefault: boolean
  active: boolean
  image?: string
  showGroupPrices?: boolean
  groupPrices: Record<string, string>
}

type PackagingUnitFormItem = {
  unitId: string
  conversionRate: string
  sellingPrice: string
  barcode: string
}

// Form State
const productForm = reactive({
  name: '',
  description: '',
  categoryId: '',
  unitId: '',
  trackStock: true,
  taxCode: '',
  active: true,
  hasVariants: false,
  // Main Product Images
  images: [] as UploadedImage[],
  // Simple product fields
  sku: '',
  barcodesText: '',
  cost: '0',
  sellingPrice: '0',
  minStock: '0',
  // Packaging units
  packagingUnits: [] as PackagingUnitFormItem[],
  // Variants
  variants: [] as VariantFormItem[],
})

// Color Images Map: colorName -> base64 data url
const colorImages = ref<Record<string, string>>({})

// Variant Generator Presets & State
const generatorSizes = ref<string[]>([])
const generatorColors = ref<string[]>([])
const customSizeInput = ref('')
const customColorInput = ref('')
const generatorDefaultCost = ref('')
const generatorDefaultPrice = ref('')

const standardSizePresets = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'Free Size']
const standardColorPresets = [
  { name: 'ສີດຳ', hex: '#1e293b' },
  { name: 'ສີຂາວ', hex: '#f8fafc' },
  { name: 'ສີແດງ', hex: '#ef4444' },
  { name: 'ສີນ້ຳເງິນ', hex: '#3b82f6' },
  { name: 'ສີຂຽວ', hex: '#10b981' },
  { name: 'ສີເຫຼືອງ', hex: '#f59e0b' },
  { name: 'ສີເທົາ', hex: '#6b7280' },
  { name: 'ສີບົວ', hex: '#ec4899' },
]

function getColorHex(colorName: string): string {
  const found = standardColorPresets.find(c => c.name.toLowerCase() === colorName.toLowerCase())
  return found ? found.hex : '#94a3b8'
}

const toggleGeneratorSize = (size: string) => {
  if (generatorSizes.value.includes(size)) {
    generatorSizes.value = generatorSizes.value.filter(s => s !== size)
  } else {
    generatorSizes.value.push(size)
  }
}

const addCustomSize = () => {
  const val = customSizeInput.value.trim()
  if (val && !generatorSizes.value.includes(val)) {
    generatorSizes.value.push(val)
  }
  customSizeInput.value = ''
}

const toggleGeneratorColor = (color: string) => {
  if (generatorColors.value.includes(color)) {
    generatorColors.value = generatorColors.value.filter(c => c !== color)
  } else {
    generatorColors.value.push(color)
  }
}

const addCustomColor = () => {
  const val = customColorInput.value.trim()
  if (val && !generatorColors.value.includes(val)) {
    generatorColors.value.push(val)
  }
  customColorInput.value = ''
}

// Upload image specifically for a color option
function handleColorImageUpload(color: string, event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    alert('ກະລຸນາເລືອກໄຟລ໌ຮູບພາບ (PNG, JPG, WEBP)')
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('ຂະໜາດຮູບພາບໃຫຍ່ເກີນ 5MB')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string
    if (dataUrl) {
      colorImages.value[color] = dataUrl
      // Sync image to existing variants of this color
      productForm.variants.forEach((v) => {
        if (v.color.toLowerCase() === color.toLowerCase() && !v.image) {
          v.image = dataUrl
        }
      })
    }
  }
  reader.readAsDataURL(file)
  target.value = ''
}

function removeColorImage(color: string) {
  const currentImg = colorImages.value[color]
  colorImages.value = Object.fromEntries(
    Object.entries(colorImages.value).filter(([k]) => k !== color),
  )
  productForm.variants.forEach((v) => {
    if (v.color.toLowerCase() === color.toLowerCase() && v.image === currentImg) {
      v.image = undefined
    }
  })
}

// Upload image specifically for a single variant row
function handleVariantImageUpload(variantIndex: number, event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    alert('ກະລຸນາເລືອກໄຟລ໌ຮູບພາບ (PNG, JPG, WEBP)')
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string
    if (dataUrl && productForm.variants[variantIndex]) {
      productForm.variants[variantIndex].image = dataUrl
    }
  }
  reader.readAsDataURL(file)
  target.value = ''
}

// Active colors in the form (from generator or existing variants)
const activeColorsList = computed(() => {
  const set = new Set<string>()
  generatorColors.value.forEach(c => set.add(c))
  productForm.variants.forEach((v) => {
    if (v.color.trim()) set.add(v.color.trim())
  })
  return Array.from(set)
})

// Generate combinations of variants
const generateVariantCombinations = () => {
  if (generatorSizes.value.length === 0 && generatorColors.value.length === 0) {
    alert('ກະລຸນາເລືອກຂະໜາດ ຫຼື ສີ ຢ່າງໜ້ອຍ 1 ລາຍການກ່ອນສ້າງ')
    return
  }

  const sizes = generatorSizes.value.length > 0 ? generatorSizes.value : ['']
  const colors = generatorColors.value.length > 0 ? generatorColors.value : ['']
  const baseSku = productForm.name
    .trim()
    .replace(/\s+/g, '-')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 10) || 'SKU'

  const newVariants: VariantFormItem[] = []

  for (const color of colors) {
    for (const size of sizes) {
      const nameParts: string[] = []
      if (size) nameParts.push(`Size ${size}`)
      if (color) nameParts.push(color)
      const variantName = nameParts.join(' / ') || 'ຮູບແບບ'

      const skuParts = [baseSku]
      if (color) skuParts.push(color.replace(/\s+/g, '').toUpperCase().slice(0, 4))
      if (size) skuParts.push(size.replace(/\s+/g, '').toUpperCase())
      const sku = skuParts.join('-')

      const variantImg = color ? colorImages.value[color] : undefined

      newVariants.push({
        name: variantName,
        size: size || '',
        color: color || '',
        sku,
        barcodesText: '',
        cost: generatorDefaultCost.value || productForm.cost || '0',
        sellingPrice: generatorDefaultPrice.value || productForm.sellingPrice || '0',
        minStock: productForm.minStock || '0',
        isDefault: newVariants.length === 0,
        active: true,
        image: variantImg,
        showGroupPrices: false,
        groupPrices: {},
      })
    }
  }

  productForm.variants = newVariants
  productForm.hasVariants = true
}

const addVariantRow = () => {
  const isFirst = productForm.variants.length === 0
  productForm.variants.push({
    name: `ຮູບແບບທີ ${productForm.variants.length + 1}`,
    size: '',
    color: '',
    sku: '',
    barcodesText: '',
    cost: productForm.cost || '0',
    sellingPrice: productForm.sellingPrice || '0',
    minStock: productForm.minStock || '0',
    isDefault: isFirst,
    active: true,
    showGroupPrices: false,
    groupPrices: {},
  })
  productForm.hasVariants = true
}

const countConfiguredGroupPrices = (v: VariantFormItem) => {
  if (!v.groupPrices) return 0
  return Object.values(v.groupPrices).filter(p => p && p.trim() && Number(p.replace(/,/g, '')) > 0).length
}

const applyGroupPricesToAll = (sourceIndex: number) => {
  const sourcePrices = productForm.variants[sourceIndex]?.groupPrices
  if (!sourcePrices) return
  productForm.variants.forEach((v, idx) => {
    if (idx !== sourceIndex) {
      v.groupPrices = { ...sourcePrices }
    }
  })
}

const removeVariantRow = (index: number) => {
  productForm.variants.splice(index, 1)
  if (productForm.variants.length > 0 && !productForm.variants.some(v => v.isDefault)) {
    const first = productForm.variants[0]
    if (first) first.isDefault = true
  }
}

const setDefaultVariant = (index: number) => {
  productForm.variants.forEach((v, i) => {
    v.isDefault = i === index
  })
}

// Packaging units
const addPackagingUnitRow = () => {
  productForm.packagingUnits.push({
    unitId: '',
    conversionRate: '1',
    sellingPrice: '',
    barcode: '',
  })
}

const removePackagingUnitRow = (index: number) => {
  productForm.packagingUnits.splice(index, 1)
}

// Load initial reference data and product if editing
onMounted(async () => {
  loadingRefs.value = true
  try {
    const [categoryResult, unitResult, groupResult] = await Promise.all([
      api.get<CatalogCategory[]>('/catalog/categories'),
      api.get<CatalogUnit[]>('/catalog/units'),
      api.get<CustomerGroup[]>('/customer-groups').catch(() => [] as CustomerGroup[]),
    ])
    categories.value = categoryResult
    units.value = unitResult
    customerGroups.value = (groupResult || []).filter(g => g.active && g.code !== 'GENERAL' && !g.name.includes('ທົ່ວໄປ'))

    // If unitId is empty and units exist, default to first active unit
    if (!productForm.unitId && units.value.length > 0) {
      const activeUnit = units.value.find(u => u.active) || units.value[0]
      if (activeUnit) productForm.unitId = activeUnit.id
    }

    // If editing existing product
    if (productId.value) {
      await loadProduct(productId.value)
    }
  } catch (cause) {
    errorMessage.value = cause instanceof ApiClientError ? cause.message : 'ບໍ່ສາມາດໂຫຼດຂໍ້ມູນໄດ້'
  } finally {
    loadingRefs.value = false
  }
})

async function loadProduct(id: string) {
  try {
    const p = await api.get<Product>(`/products/${id}`)
    productVersion.value = p.version

    const hasMultipleVariants = p.variants.length > 1 || Boolean(p.variants[0]?.size || p.variants[0]?.color)
    const defaultVar = p.variants.find(v => v.isDefault) || p.variants[0]

    productForm.name = p.name
    productForm.description = p.description || ''
    productForm.categoryId = p.categoryId || ''
    productForm.unitId = p.unitId
    productForm.trackStock = p.trackStock
    productForm.taxCode = p.taxCode || ''
    productForm.active = p.active
    productForm.hasVariants = hasMultipleVariants

    // Simple fields from default variant
    productForm.sku = defaultVar?.sku || ''
    productForm.barcodesText = defaultVar?.barcodes?.map(b => b.barcode).join(', ') || ''
    productForm.cost = defaultVar?.cost || '0'
    productForm.sellingPrice = defaultVar?.sellingPrice || '0'
    productForm.minStock = defaultVar?.minStock || '0'

    // Load simple group prices
    simpleGroupPrices.value = {}
    defaultVar?.groupPrices?.forEach((gp) => {
      simpleGroupPrices.value[gp.customerGroupId] = gp.price
    })

    // Packaging units
    productForm.packagingUnits = (p.packagingUnits || []).map(pu => ({
      unitId: pu.unitId,
      conversionRate: pu.conversionRate,
      sellingPrice: pu.sellingPrice || '',
      barcode: pu.barcode || '',
    }))

    // Variants
    productForm.variants = p.variants.map((v) => {
      const gpMap: Record<string, string> = {}
      v.groupPrices?.forEach((gp) => {
        gpMap[gp.customerGroupId] = gp.price
      })
      return {
        id: v.id,
        name: v.name || '',
        size: v.size || '',
        color: v.color || '',
        sku: v.sku || '',
        barcodesText: v.barcodes?.map(b => b.barcode).join(', ') || '',
        cost: v.cost,
        sellingPrice: v.sellingPrice,
        minStock: v.minStock,
        isDefault: v.isDefault,
        active: v.active,
        showGroupPrices: false,
        groupPrices: gpMap,
      }
    })

    // Collect colors from existing variants
    p.variants.forEach((v) => {
      if (v.color && !generatorColors.value.includes(v.color)) {
        generatorColors.value.push(v.color)
      }
      if (v.size && !generatorSizes.value.includes(v.size)) {
        generatorSizes.value.push(v.size)
      }
    })
  } catch (cause) {
    errorMessage.value = cause instanceof ApiClientError ? cause.message : 'ບໍ່ສາມາດໂຫຼດຂໍ້ມູນສິນຄ້ານີ້ໄດ້'
  }
}

// Submit Product Form
const submitProduct = async () => {
  saving.value = true
  errorMessage.value = ''
  try {
    const packagingUnitsPayload = productForm.packagingUnits
      .filter(pu => pu.unitId.trim())
      .map(pu => ({
        unitId: pu.unitId,
        conversionRate: pu.conversionRate || '1.000000',
        sellingPrice: pu.sellingPrice.trim() ? toApiDecimal(pu.sellingPrice.replace(/,/g, ''), 4) : undefined,
        barcode: pu.barcode.trim() || undefined,
      }))

    type VariantPayload = {
      id?: string
      name?: string
      size?: string
      color?: string
      sku?: string
      cost: string
      sellingPrice: string
      minStock: string
      isDefault: boolean
      active: boolean
      barcodes: string[]
      groupPrices?: Array<{ customerGroupId: string; price: string }>
    }
    let variantsPayload: VariantPayload[] | undefined

    if (productForm.hasVariants && productForm.variants.length > 0) {
      variantsPayload = productForm.variants.map(v => ({
        id: v.id || undefined,
        name: v.name.trim() || undefined,
        size: v.size.trim() || undefined,
        color: v.color.trim() || undefined,
        sku: v.sku.trim() || undefined,
        cost: toApiDecimal(String(v.cost || '0').replace(/,/g, ''), 4),
        sellingPrice: toApiDecimal(String(v.sellingPrice || '0').replace(/,/g, ''), 4),
        minStock: toApiDecimal(String(v.minStock || '0').replace(/,/g, ''), 6),
        isDefault: v.isDefault,
        active: v.active,
        barcodes: v.barcodesText
          .split(/[,\n]/)
          .map(b => b.trim())
          .filter(Boolean),
        groupPrices: Object.entries(v.groupPrices || {})
          .filter(([_, price]) => price && price.trim() && Number(price.replace(/,/g, '')) > 0)
          .map(([customerGroupId, price]) => ({
            customerGroupId,
            price: toApiDecimal(price.replace(/,/g, ''), 4),
          })),
      }))
    } else {
      variantsPayload = [
        {
          sku: productForm.sku.trim() || undefined,
          cost: toApiDecimal(String(productForm.cost || '0').replace(/,/g, ''), 4),
          sellingPrice: toApiDecimal(String(productForm.sellingPrice || '0').replace(/,/g, ''), 4),
          minStock: toApiDecimal(String(productForm.minStock || '0').replace(/,/g, ''), 6),
          isDefault: true,
          active: productForm.active,
          barcodes: productForm.barcodesText
            .split(/[,\n]/)
            .map(b => b.trim())
            .filter(Boolean),
          groupPrices: Object.entries(simpleGroupPrices.value)
            .filter(([_, price]) => price && price.trim() && Number(price.replace(/,/g, '')) > 0)
            .map(([customerGroupId, price]) => ({
              customerGroupId,
              price: toApiDecimal(price.replace(/,/g, ''), 4),
            })),
        },
      ]
    }

    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim() || undefined,
      categoryId: productForm.categoryId || undefined,
      unitId: productForm.unitId,
      trackStock: productForm.trackStock,
      taxCode: productForm.taxCode.trim() || undefined,
      active: productForm.active,
      variants: variantsPayload,
      packagingUnits: packagingUnitsPayload.length > 0 ? packagingUnitsPayload : undefined,
    }

    if (isEditing.value && productId.value) {
      await api.patch<Product>(`/products/${productId.value}`, {
        ...payload,
        version: productVersion.value,
      })
    } else {
      await api.post<Product>('/products', payload)
    }

    // Success -> Navigate back to products list
    await router.push('/products')
  } catch (cause) {
    errorMessage.value = cause instanceof ApiClientError ? cause.message : 'ບໍ່ສາມາດບັນທຶກສິນຄ້າໄດ້ ກະລຸນາກວດສອບຂໍ້ມູນ'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="w-full space-y-6 pb-24">
    <!-- Top Bar: Navigation & Title -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <div class="flex items-center gap-2 text-xs text-slate-500">
          <NuxtLink to="/products" class="hover:text-[#5b4cf5] hover:underline flex items-center gap-1 font-semibold">
            <span>← ສິນຄ້າທັງໝົດ</span>
          </NuxtLink>
          <span>/</span>
          <span class="font-bold text-slate-800">{{ isEditing ? 'ແກ້ໄຂສິນຄ້າ' : 'ເພີ່ມສິນຄ້າໃໝ່' }}</span>
        </div>
        <h1 class="text-xl font-black text-slate-900 tracking-tight">
          {{ isEditing ? 'ແກ້ໄຂສິນຄ້າ' : 'ເພີ່ມສິນຄ້າໃໝ່ (Create Product)' }}
        </h1>
        <p class="text-xs text-slate-500">
          ຕັ້ງຄ່າຂໍ້ມູນພື້ນຖານ, ຮູບພາບ, ລາຄາ, ຮູບແບບສີ-ຂະໜາດ (Variants) ແລະ ຫົວໜ່ວຍຍ່ອຍ/ຂາຍຍົກ
        </p>
      </div>

      <!-- Header Action Buttons -->
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/products"
          class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          ຍົກເລີກ
        </NuxtLink>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl bg-[#5b4cf5] px-6 py-2.5 text-xs font-bold text-white shadow-[0_4px_14px_rgba(91,76,245,0.35)] hover:bg-[#4a3bd9] transition disabled:opacity-50"
          :disabled="saving || !canSave"
          @click="submitProduct"
        >
          <span v-if="saving" class="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          <span>{{ saving ? 'ກຳລັງບັນທຶກ...' : (isEditing ? 'ບັນທຶກການແກ້ໄຂ' : 'ບັນທຶກສິນຄ້າໃໝ່') }}</span>
        </button>
      </div>
    </div>

    <!-- Error Alert Banner -->
    <div
      v-if="errorMessage"
      class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <span>⚠️</span>
        <span>{{ errorMessage }}</span>
      </div>
      <button type="button" class="text-rose-500 hover:text-rose-700 font-bold" @click="errorMessage = ''">✕</button>
    </div>

    <!-- MAIN FORM -->
    <form class="space-y-6" @submit.prevent="submitProduct">
      <!-- ==================================================== -->
      <!-- SECTION 0: ຮູບພາບສິນຄ້າ (MAIN PRODUCT IMAGES) -->
      <!-- ==================================================== -->
      <section class="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
        <div class="border-b border-slate-100 pb-3">
          <h2 class="text-sm font-black text-slate-900 flex items-center gap-2">
            <span class="grid size-6 place-items-center rounded-lg bg-[#ecebff] text-xs font-bold text-[#5b4cf5]">0</span>
            <span>ຮູບພາບສິນຄ້າຫຼັກ (Product Images)</span>
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            ອັບໂຫຼດຮູບພາບລວມຂອງສິນຄ້າ (ສາມາດເລືອກໄດ້ຫຼາຍຮູບພ້ອມກັນ, ຮູບທຳອິດຈະເປັນຮູບໜ້າປົກ)
          </p>
        </div>

        <MultiImageUpload
          v-model="productForm.images"
          label="ອັບໂຫຼດຮູບພາບສິນຄ້າ"
          hint="ຮອງຮັບໄຟລ໌ PNG, JPG, WEBP ສູງສຸດ 5MB. ສາມາດເລືອກໄດ້ຫຼາຍຮູບພ້ອມກັນ"
          :max-images="10"
        />
      </section>

      <!-- ==================================================== -->
      <!-- SECTION 1: ຂໍ້ມູນພື້ນຖານສິນຄ້າ (BASIC INFORMATION) -->
      <!-- ==================================================== -->
      <section class="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
        <div class="border-b border-slate-100 pb-3">
          <h2 class="text-sm font-black text-slate-900 flex items-center gap-2">
            <span class="grid size-6 place-items-center rounded-lg bg-[#ecebff] text-xs font-bold text-[#5b4cf5]">1</span>
            <span>ຂໍ້ມູນພື້ນຖານສິນຄ້າ (Basic Information)</span>
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">
            ກຳນົດຊື່ສິນຄ້າ, ຫົວໜ່ວຍຫຼັກ, ໝວດໝູ່ ແລະ ລາຍລະອຽດ
          </p>
        </div>

        <div class="grid gap-4.5 sm:grid-cols-2">
          <!-- Product Name -->
          <label class="block">
            <span class="mb-2 block text-xs font-semibold text-slate-600">
              ຊື່ສິນຄ້າ <span class="text-rose-500">*</span>
            </span>
            <input
              v-model="productForm.name"
              required
              class="admin-field"
              placeholder="ເຊັ່ນ: ເສື້ອຢືດຄໍມົນ, ນ້ຳອັດລົມ"
            >
          </label>

          <!-- Base Unit Select2 -->
          <div class="block">
            <Select2
              v-model="productForm.unitId"
              :options="units.filter(u => u.active).map(u => ({ value: u.id, label: u.name, sublabel: u.code }))"
              label="ຫົວໜ່ວຍຫຼັກ (Base Unit)"
              required
              placeholder="ເລືອກຫົວໜ່ວຍ..."
              search-placeholder="ຄົ້ນຫາຫົວໜ່ວຍ..."
            />
          </div>

          <!-- Category Select2 -->
          <div class="block">
            <Select2
              v-model="productForm.categoryId"
              :options="[{ value: '', label: 'ບໍ່ລະບຸໝວດໝູ່' }, ...categories.map(c => ({ value: c.id, label: c.name }))]"
              label="ໝວດໝູ່ສິນຄ້າ"
              placeholder="ເລືອກໝວດໝູ່..."
              search-placeholder="ຄົ້ນຫາໝວດໝູ່..."
            />
          </div>

          <!-- Tax Code -->
          <label class="block">
            <span class="mb-2 block text-xs font-semibold text-slate-600">ລະຫັດພາສີ (Tax Code - ຖ້າມີ)</span>
            <input v-model="productForm.taxCode" class="admin-field font-mono" placeholder="VAT-7, NONE">
          </label>

          <!-- Description -->
          <label class="block sm:col-span-2">
            <span class="mb-2 block text-xs font-semibold text-slate-600">ລາຍລະອຽດສິນຄ້າ</span>
            <textarea
              v-model="productForm.description"
              class="admin-field min-h-20"
              placeholder="ລາຍລະອຽດເພີ່ມເຕີມກ່ຽວກັບສິນຄ້າ..."
            />
          </label>

          <!-- Checkboxes: Track stock & Active -->
          <div class="sm:col-span-2 flex flex-wrap gap-6 pt-1 text-xs font-semibold text-slate-700">
            <label class="flex items-center gap-2.5 cursor-pointer">
              <input v-model="productForm.trackStock" type="checkbox" class="size-4.5 accent-[#5b4cf5] rounded">
              <span>ຕິດຕາມສະຕັອກສິນຄ້າ (Track Stock)</span>
            </label>
            <label class="flex items-center gap-2.5 cursor-pointer">
              <input v-model="productForm.active" type="checkbox" class="size-4.5 accent-[#5b4cf5] rounded">
              <span>ເປີດໃຊ້ງານທັນທີ (Active)</span>
            </label>
          </div>
        </div>
      </section>

      <!-- ==================================================== -->
      <!-- SECTION 2: ລາຄາ, ຕົ້ນທຶນ ແລະ ຮູບແບບ VARIANT -->
      <!-- ==================================================== -->
      <section class="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 class="text-sm font-black text-slate-900 flex items-center gap-2">
              <span class="grid size-6 place-items-center rounded-lg bg-[#ecebff] text-xs font-bold text-[#5b4cf5]">2</span>
              <span>ລາຄາ, ຕົ້ນທຶນ ແລະ ຮູບແບບ Variant</span>
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              ກຳນົດລາຄາຂາຍ, ຕົ້ນທຶນ ແລະ ສ້າງຮູບແບບສິນຄ້າຫຼາຍສີ/ຂະໜາດ
            </p>
          </div>

          <!-- Toggle: Has Variants -->
          <label class="inline-flex items-center gap-2.5 cursor-pointer rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-2 hover:bg-slate-100 transition">
            <input v-model="productForm.hasVariants" type="checkbox" class="size-4.5 accent-[#5b4cf5] rounded">
            <span class="text-xs font-bold text-slate-800">ສິນຄ້ານີ້ມີຫຼາຍຂະໜາດ / ຫຼາຍສີ (Variants)</span>
          </label>
        </div>

        <!-- SIMPLE PRODUCT FIELDS (When hasVariants is FALSE) -->
        <div v-if="!productForm.hasVariants" class="grid gap-4.5 sm:grid-cols-3 rounded-2xl border border-slate-200/60 bg-slate-50/30 p-5">
          <label class="block">
            <span class="mb-2 block text-xs font-semibold text-slate-600">SKU</span>
            <input v-model="productForm.sku" class="admin-field font-mono" placeholder="ເຊັ່ນ: TSH-001">
          </label>

          <label class="block">
            <span class="mb-2 block text-xs font-semibold text-slate-600">Barcode (ແຍກດ້ວຍ comma)</span>
            <input v-model="productForm.barcodesText" class="admin-field font-mono" placeholder="885001234, 885001235">
          </label>

          <FormattedNumberInput
            v-model="productForm.cost"
            label="ຕົ້ນທຶນ (Cost)"
            suffix="₭"
            required
            placeholder="0"
            :scale="4"
          />

          <FormattedNumberInput
            v-model="productForm.sellingPrice"
            label="ລາຄາຂາຍ (Price)"
            suffix="₭"
            required
            placeholder="0"
            :scale="4"
          />

          <FormattedNumberInput
            v-model="productForm.minStock"
            label="ຈຳນວນຂັ້ນຕ່ຳ (Min Stock)"
            suffix="ຫົວໜ່ວຍ"
            required
            placeholder="0"
            :scale="2"
          />

          <!-- CUSTOMER GROUP PRICING FOR SIMPLE PRODUCT -->
          <div v-if="customerGroups.length > 0" class="sm:col-span-3 mt-1 pt-4 border-t border-slate-200/70">
            <div class="flex items-center justify-between mb-3">
              <div>
                <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span class="text-[#5b4cf5]">🏷️</span>
                  <span>ລາຄາພິເສດຕາມກຸ່ມລູກຄ້າ (Customer Group Pricing)</span>
                </span>
                <p class="text-[0.68rem] text-slate-500 mt-0.5">
                  ກຳນົດລາຄາຂາຍສະເພາະໃຫ້ແຕ່ລະກຸ່ມລູກຄ້າພິເສດ (ສຳລັບລູກຄ້າທົ່ວໄປແມ່ນໃຊ້ລາຄາຂາຍປົກກະຕິ Default ທີ່ລະບຸດ້ານເທິງ)
                </p>
              </div>
            </div>

            <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <div
                v-for="grp in customerGroups"
                :key="grp.id"
                class="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs hover:border-[#5b4cf5]/40 transition"
              >
                <div class="flex items-center justify-between mb-1.5">
                  <span class="text-xs font-bold text-slate-800">{{ grp.name }}</span>
                  <span
                    v-if="grp.discountPercent > 0"
                    class="rounded-full bg-emerald-50 text-emerald-600 px-2 py-0.5 text-[0.65rem] font-bold border border-emerald-200/60"
                  >
                    ຫຼຸດ {{ grp.discountPercent }}%
                  </span>
                  <span v-else class="text-[0.65rem] text-slate-400">
                    ລາຄາປົກກະຕິ
                  </span>
                </div>
                <FormattedNumberInput
                  v-model="simpleGroupPrices[grp.id]"
                  :placeholder="grp.discountPercent > 0 ? `ອັດຕະໂນມັດ (-${grp.discountPercent}%)` : 'ໃຊ້ລາຄາປົກກະຕິ'"
                  suffix="₭"
                  :scale="4"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- MULTI-VARIANT BUILDER (When hasVariants is TRUE) -->
        <div v-else class="space-y-6">
          <!-- 1. VARIANT ASSISTANT TOOLBOX -->
          <div class="rounded-2xl border border-[#5b4cf5]/20 bg-[#faf9ff] p-5 space-y-4">
            <div class="flex items-center justify-between border-b border-[#5b4cf5]/15 pb-2.5">
              <span class="text-xs font-black text-[#4338ca] flex items-center gap-1.5">
                <span>⚡</span>
                <span>ຕົວຊ່ວຍສ້າງ Variants ດ່ວນ (Variant Assistant)</span>
              </span>
              <button
                type="button"
                class="rounded-xl bg-[#5b4cf5] px-3.5 py-1.5 text-xs font-black text-white hover:bg-[#4a3bd9] shadow-[0_3px_10px_rgba(91,76,245,0.25)] transition"
                @click="generateVariantCombinations"
              >
                ສ້າງລາຍການອັດຕະໂນມັດ
              </button>
            </div>

            <!-- Sizes Selector -->
            <div>
              <span class="block text-[0.68rem] font-bold text-slate-700 mb-1.5">ເລືອກຂະໜາດ (Sizes):</span>
              <div class="flex flex-wrap gap-1.5 items-center">
                <button
                  v-for="s in standardSizePresets"
                  :key="s"
                  type="button"
                  class="rounded-lg px-2.5 py-1 text-[0.68rem] font-bold transition"
                  :class="generatorSizes.includes(s)
                    ? 'bg-[#5b4cf5] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'"
                  @click="toggleGeneratorSize(s)"
                >
                  {{ s }}
                </button>
                <input
                  v-model="customSizeInput"
                  class="h-7.5 w-24 rounded-lg border border-slate-200 bg-white px-2.5 text-[0.68rem] outline-none focus:border-[#5b4cf5]"
                  placeholder="+ ຂະໜາດໃໝ່"
                  @keyup.enter.prevent="addCustomSize"
                >
                <button
                  type="button"
                  class="h-7.5 rounded-lg bg-white border border-slate-200 px-2.5 text-[0.68rem] font-bold text-[#5b4cf5] hover:bg-slate-50"
                  @click="addCustomSize"
                >
                  ເພີ່ມ
                </button>
              </div>
            </div>

            <!-- Colors Selector -->
            <div>
              <span class="block text-[0.68rem] font-bold text-slate-700 mb-1.5">ເລືອກສີ (Colors):</span>
              <div class="flex flex-wrap gap-1.5 items-center">
                <button
                  v-for="c in standardColorPresets"
                  :key="c.name"
                  type="button"
                  class="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[0.68rem] font-bold transition"
                  :class="generatorColors.includes(c.name)
                    ? 'bg-[#5b4cf5] text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'"
                  @click="toggleGeneratorColor(c.name)"
                >
                  <span class="size-2.5 rounded-full border border-black/20" :style="{ backgroundColor: c.hex }" />
                  {{ c.name }}
                </button>
                <input
                  v-model="customColorInput"
                  class="h-7.5 w-24 rounded-lg border border-slate-200 bg-white px-2.5 text-[0.68rem] outline-none focus:border-[#5b4cf5]"
                  placeholder="+ ສີໃໝ່"
                  @keyup.enter.prevent="addCustomColor"
                >
                <button
                  type="button"
                  class="h-7.5 rounded-lg bg-white border border-slate-200 px-2.5 text-[0.68rem] font-bold text-[#5b4cf5] hover:bg-slate-50"
                  @click="addCustomColor"
                >
                  ເພີ່ມ
                </button>
              </div>
            </div>

            <!-- Default Price & Cost for Fast Generation -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-[#5b4cf5]/15">
              <FormattedNumberInput
                v-model="generatorDefaultCost"
                label="ຕົ້ນທຶນເລີ່ມຕົ້ນ (Cost)"
                suffix="₭"
                placeholder="0"
                :scale="4"
              />
              <FormattedNumberInput
                v-model="generatorDefaultPrice"
                label="ລາຄາຂາຍເລີ່ມຕົ້ນ (Price)"
                suffix="₭"
                placeholder="0"
                :scale="4"
              />
            </div>
          </div>

          <!-- ==================================================== -->
          <!-- 2. COLOR OPTION IMAGE UPLOAD (ອັບໂຫລດຮູບຕາມແຕ່ລະສີ) -->
          <!-- ==================================================== -->
          <div class="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-4">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 class="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span>🎨</span>
                  <span>ຮູບພາບຕາມແຕ່ລະສີ (Color Option Images)</span>
                </h3>
                <p class="text-[0.68rem] text-slate-500 mt-0.5">
                  ອັບໂຫຼດຮູບພາບສະເພາະສຳລັບແຕ່ລະສີ (ຮູບຈະຖືກນຳໃຊ້ກັບທຸກຮູບແບບທີ່ມີສີນີ້ໂດຍອັດຕະໂນມັດ)
                </p>
              </div>
              <span class="rounded-full bg-[#ecebff] px-2.5 py-0.5 text-[0.65rem] font-bold text-[#5b4cf5]">
                {{ activeColorsList.length }} ສີ
              </span>
            </div>

            <div v-if="activeColorsList.length === 0" class="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
              ກະລຸນາເລືອກ ຫຼື ເພີ່ມສີໃນຕົວຊ່ວຍຂ້າງເທິງ ເພື່ອອັບໂຫຼດຮູບຕາມສີ
            </div>

            <!-- Grid of Color Cards with Dedicated Image Upload -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div
                v-for="color in activeColorsList"
                :key="color"
                class="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/50 p-3 hover:border-[#5b4cf5]/40 transition"
              >
                <!-- Thumbnail or Upload Button -->
                <div class="relative shrink-0">
                  <div
                    v-if="colorImages[color]"
                    class="relative size-16 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs group"
                  >
                    <img :src="colorImages[color]" :alt="color" class="size-full object-cover">
                    <!-- Delete Button Overlay -->
                    <button
                      type="button"
                      class="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-rose-600 text-white text-[0.65rem] font-bold shadow-xs hover:bg-rose-700 transition"
                      title="ລຶບຮູບສີນີ້"
                      @click="removeColorImage(color)"
                    >
                      ✕
                    </button>
                  </div>

                  <!-- Empty Image State: Trigger Upload -->
                  <label
                    v-else
                    class="grid size-16 place-items-center rounded-xl border-2 border-dashed border-slate-300 bg-white hover:border-[#5b4cf5] hover:bg-[#faf9ff] cursor-pointer transition text-center p-1"
                    title="ຄລິກເພື່ອອັບຮູບສີນີ້"
                  >
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      class="hidden"
                      @change="handleColorImageUpload(color, $event)"
                    >
                    <div class="flex flex-col items-center gap-0.5 text-slate-400 hover:text-[#5b4cf5]">
                      <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                      <span class="text-[0.6rem] font-bold">ອັບຮູບ</span>
                    </div>
                  </label>
                </div>

                <!-- Color Info & Actions -->
                <div class="min-w-0 flex-1 space-y-1">
                  <div class="flex items-center gap-1.5">
                    <span
                      class="size-3.5 rounded-full border border-black/20 shrink-0"
                      :style="{ backgroundColor: getColorHex(color) }"
                    />
                    <span class="text-xs font-bold text-slate-900 truncate">{{ color }}</span>
                  </div>

                  <div class="flex items-center gap-2">
                    <label class="text-[0.65rem] font-bold text-[#5b4cf5] hover:underline cursor-pointer">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        class="hidden"
                        @change="handleColorImageUpload(color, $event)"
                      >
                      {{ colorImages[color] ? 'ປ່ຽນຮູບ' : 'ເລືອກຮູບ' }}
                    </label>
                    <button
                      v-if="colorImages[color]"
                      type="button"
                      class="text-[0.65rem] font-bold text-rose-500 hover:underline"
                      @click="removeColorImage(color)"
                    >
                      ລຶບ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ==================================================== -->
          <!-- 3. VARIANTS TABLE -->
          <!-- ==================================================== -->
          <div class="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs">
            <div class="flex items-center justify-between p-3.5 border-b border-slate-200/80 bg-slate-50/70">
              <span class="text-xs font-bold text-slate-800">
                ລາຍການ Variant ທັງໝົດ ({{ productForm.variants.length }} ລາຍການ)
              </span>
              <button
                type="button"
                class="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                @click="addVariantRow"
              >
                + ເພີ່ມແຖວເອງ
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs min-w-[52rem]">
                <thead class="bg-slate-50/50 text-[0.68rem] text-slate-500 font-bold border-b border-slate-200/80">
                  <tr>
                    <th class="p-2.5 text-center w-12">Default</th>
                    <th class="p-2.5 w-16 text-center">ຮູບພາບ</th>
                    <th class="p-2.5">ຊື່ Variant *</th>
                    <th class="p-2.5 w-20">Size</th>
                    <th class="p-2.5 w-24">Color</th>
                    <th class="p-2.5 w-28">SKU</th>
                    <th class="p-2.5 w-28 text-right">ຕົ້ນທຶນ *</th>
                    <th class="p-2.5 w-28 text-right">ລາຄາຂາຍ *</th>
                    <th v-if="customerGroups.length > 0" class="p-2.5 text-center w-24">ລາຄາກຸ່ມ</th>
                    <th class="p-2.5 min-w-24">Barcode</th>
                    <th class="p-2.5 w-10 text-right" />
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  <template v-for="(v, vIdx) in productForm.variants" :key="vIdx">
                    <tr class="hover:bg-slate-50/40">
                      <!-- Default Radio -->
                      <td class="p-2.5 text-center">
                        <input
                          type="radio"
                          name="defaultVariantRadio"
                          :checked="v.isDefault"
                          class="accent-[#5b4cf5] cursor-pointer size-4"
                          @change="setDefaultVariant(vIdx)"
                        >
                      </td>

                      <!-- Variant Image Thumbnail / Color Image -->
                      <td class="p-2.5 text-center">
                        <label class="relative inline-block size-9 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:border-[#5b4cf5] transition">
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            class="hidden"
                            @change="handleVariantImageUpload(vIdx, $event)"
                          >
                          <img
                            v-if="v.image || (v.color && colorImages[v.color])"
                            :src="v.image || colorImages[v.color]"
                            class="size-full object-cover"
                            :alt="v.name"
                          >
                          <div v-else class="grid size-full place-items-center text-slate-300 hover:text-[#5b4cf5]">
                            <svg class="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        </label>
                      </td>

                      <!-- Variant Name -->
                      <td class="p-2.5">
                        <input v-model="v.name" required class="admin-field h-8 text-xs min-w-28" placeholder="ຊື່ variant">
                      </td>

                      <!-- Size -->
                      <td class="p-2.5">
                        <input v-model="v.size" class="admin-field h-8 text-xs w-20" placeholder="Size">
                      </td>

                      <!-- Color -->
                      <td class="p-2.5">
                        <div class="flex items-center gap-1.5">
                          <span
                            v-if="v.color"
                            class="size-2.5 rounded-full border border-black/20 shrink-0"
                            :style="{ backgroundColor: getColorHex(v.color) }"
                          />
                          <input v-model="v.color" class="admin-field h-8 text-xs w-20" placeholder="Color">
                        </div>
                      </td>

                      <!-- SKU -->
                      <td class="p-2.5">
                        <input v-model="v.sku" class="admin-field h-8 text-xs min-w-24 font-mono" placeholder="SKU">
                      </td>

                      <!-- Cost -->
                      <td class="p-2.5">
                        <input
                          :value="v.cost ? sanitizeDecimalInput(String(v.cost), 4).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''"
                          required
                          inputmode="decimal"
                          class="admin-field h-8 text-xs w-28 text-right font-mono"
                          placeholder="0"
                          @input="(e) => {
                            const raw = (e.target as HTMLInputElement).value.replace(/,/g, '')
                            v.cost = sanitizeDecimalInput(raw, 4)
                          }"
                        >
                      </td>

                      <!-- Selling Price -->
                      <td class="p-2.5">
                        <input
                          :value="v.sellingPrice ? sanitizeDecimalInput(String(v.sellingPrice), 4).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''"
                          required
                          inputmode="decimal"
                          class="admin-field h-8 text-xs w-28 font-bold text-right font-mono"
                          placeholder="0"
                          @input="(e) => {
                            const raw = (e.target as HTMLInputElement).value.replace(/,/g, '')
                            v.sellingPrice = sanitizeDecimalInput(raw, 4)
                          }"
                        >
                      </td>

                      <!-- Group Prices Toggle Button -->
                      <td v-if="customerGroups.length > 0" class="p-2.5 text-center">
                        <button
                          type="button"
                          class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[0.68rem] font-bold border transition"
                          :class="countConfiguredGroupPrices(v) > 0
                            ? 'bg-[#ecebff] text-[#5b4cf5] border-[#5b4cf5]/30'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'"
                          @click="v.showGroupPrices = !v.showGroupPrices"
                        >
                          <span>🏷️</span>
                          <span>{{ countConfiguredGroupPrices(v) > 0 ? `${countConfiguredGroupPrices(v)} ກຸ່ມ` : 'ຕັ້ງລາຄາ' }}</span>
                        </button>
                      </td>

                      <!-- Barcode -->
                      <td class="p-2.5">
                        <input v-model="v.barcodesText" class="admin-field h-8 text-xs min-w-24 font-mono" placeholder="Barcode">
                      </td>

                      <!-- Remove Row -->
                      <td class="p-2.5 text-right">
                        <button
                          type="button"
                          class="text-rose-500 hover:text-rose-700 font-bold px-2 py-1"
                          title="ລຶບແຖວນີ້"
                          @click="removeVariantRow(vIdx)"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>

                    <!-- EXPANDABLE ROW: CUSTOMER GROUP PRICING FOR THIS VARIANT -->
                    <tr v-if="customerGroups.length > 0 && v.showGroupPrices" class="bg-indigo-50/20">
                      <td :colspan="customerGroups.length > 0 ? 11 : 10" class="p-3 border-b border-indigo-100">
                        <div class="rounded-xl border border-indigo-200/80 bg-white p-3.5 space-y-2.5 shadow-2xs">
                          <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                              <span class="text-xs font-bold text-slate-800">
                                ລາຄາພິເສດຕາມກຸ່ມ: <span class="text-[#5b4cf5]">{{ v.name || 'Variant' }}</span>
                              </span>
                              <span class="text-[0.68rem] text-slate-400">
                                (ລາຄາປົກກະຕິ: {{ formatMoney(v.sellingPrice) }} ₭)
                              </span>
                            </div>
                            <button
                              v-if="productForm.variants.length > 1"
                              type="button"
                              class="text-[0.68rem] font-bold text-[#5b4cf5] hover:underline"
                              @click="applyGroupPricesToAll(vIdx)"
                            >
                              ຄັດລອກລາຄາກຸ່ມນີ້ໃສ່ທຸກ Variant
                            </button>
                          </div>
                          <div class="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                            <div
                              v-for="grp in customerGroups"
                              :key="grp.id"
                              class="rounded-lg border border-slate-200/80 bg-slate-50/60 p-2.5"
                            >
                              <div class="flex items-center justify-between mb-1">
                                <span class="text-xs font-bold text-slate-700">{{ grp.name }}</span>
                                <span v-if="grp.discountPercent > 0" class="text-[0.65rem] font-bold text-emerald-600">
                                  ຫຼຸດ {{ grp.discountPercent }}%
                                </span>
                              </div>
                              <input
                                :value="v.groupPrices[grp.id] ? sanitizeDecimalInput(String(v.groupPrices[grp.id]), 4).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''"
                                inputmode="decimal"
                                class="admin-field h-7.5 text-xs text-right font-mono"
                                :placeholder="grp.discountPercent > 0 ? `ອັດຕະໂນມັດ (-${grp.discountPercent}%)` : 'ໃຊ້ລາຄາປົກກະຕິ'"
                                @input="(e) => {
                                  const raw = (e.target as HTMLInputElement).value.replace(/,/g, '')
                                  v.groupPrices[grp.id] = sanitizeDecimalInput(raw, 4)
                                }"
                              >
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <!-- ==================================================== -->
      <!-- SECTION 3: ຫຼາຍຫົວໜ່ວຍ (PACKAGING & CONVERSION UNITS) -->
      <!-- ==================================================== -->
      <section class="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 class="text-sm font-black text-slate-900 flex items-center gap-2">
              <span class="grid size-6 place-items-center rounded-lg bg-[#ecebff] text-xs font-bold text-[#5b4cf5]">3</span>
              <span>ຫຼາຍຫົວໜ່ວຍ / ຫົວໜ່ວຍຂາຍຍົກ-ຍ່ອຍ (Packaging Units)</span>
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              ກຳນົດຫົວໜ່ວຍບັນຈຸເພີ່ມເຕີມ ເຊັ່ນ: 1 ແພັກ = 6 ອັນ, 1 ລັງ = 24 ອັນ ພ້ອມລາຄາຂາຍ ແລະ Barcode ສະເພາະ
            </p>
          </div>
          <button
            type="button"
            class="rounded-xl border border-[#5b4cf5]/30 bg-white px-3.5 py-1.5 text-xs font-bold text-[#5b4cf5] hover:bg-[#faf9ff] transition"
            @click="addPackagingUnitRow"
          >
            + ເພີ່ມຫົວໜ່ວຍຂາຍ
          </button>
        </div>

        <div v-if="productForm.packagingUnits.length" class="space-y-3">
          <div
            v-for="(pu, pIdx) in productForm.packagingUnits"
            :key="pIdx"
            class="grid grid-cols-1 sm:grid-cols-4 gap-3.5 items-end rounded-2xl border border-slate-200 bg-slate-50/40 p-4"
          >
            <div class="block">
              <Select2
                v-model="pu.unitId"
                :options="units.filter(u => u.active).map(u => ({ value: u.id, label: u.name, sublabel: u.code }))"
                label="ຫົວໜ່ວຍ"
                required
                size="sm"
                placeholder="ເລືອກ..."
              />
            </div>

            <FormattedNumberInput
              v-model="pu.conversionRate"
              label="ຈຳນວນທຽບເທົ່າຫົວໜ່ວຍຫຼັກ"
              required
              placeholder="ເຊັ່ນ: 6, 12, 24"
              :scale="2"
            />

            <FormattedNumberInput
              v-model="pu.sellingPrice"
              label="ລາຄາຂາຍ (ກີບ - ຖ້າມີ)"
              suffix="₭"
              placeholder="ເຊັ່ນ: 55,000"
              :scale="2"
            />

            <div class="flex items-center gap-2">
              <label class="flex-1 block">
                <span class="mb-2 block text-xs font-semibold text-slate-600">Barcode ສະເພາະ</span>
                <input v-model="pu.barcode" class="admin-field font-mono text-xs" placeholder="Barcode">
              </label>
              <button
                type="button"
                class="mb-0.5 rounded-xl border border-rose-200 bg-white p-2.5 text-rose-500 hover:bg-rose-50 transition"
                title="ລຶບຫົວໜ່ວຍນີ້"
                @click="removePackagingUnitRow(pIdx)"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
        <p v-else class="text-xs text-slate-400 italic">
          ຍັງບໍ່ມີຫົວໜ່ວຍຂາຍເພີ່ມເຕີມ (ໃຊ້ຫົວໜ່ວຍຫຼັກຢ່າງດຽວ)
        </p>
      </section>

      <!-- STICKY BOTTOM ACTIONS BAR -->
      <div
        class="fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 sm:px-5 py-3.5 shadow-lg transition-all duration-300"
        :class="isCollapsed ? 'lg:pl-[5.85rem]' : 'lg:pl-[16rem]'"
      >
        <div class="w-full flex items-center justify-between">
          <div class="flex items-center gap-2 text-xs text-slate-500">
            <span class="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ພ້ອມບັນທຶກຂໍ້ມູນສິນຄ້າ</span>
          </div>

          <div class="flex items-center gap-3">
            <NuxtLink
              to="/products"
              class="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              ຍົກເລີກ
            </NuxtLink>
            <button
              type="submit"
              class="inline-flex items-center gap-2 rounded-xl bg-[#5b4cf5] px-7 py-2.5 text-xs font-bold text-white shadow-[0_4px_14px_rgba(91,76,245,0.35)] hover:bg-[#4a3bd9] transition disabled:opacity-50"
              :disabled="saving || !canSave"
            >
              <span v-if="saving" class="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>{{ saving ? 'ກຳລັງບັນທຶກ...' : (isEditing ? 'ບັນທຶກການແກ້ໄຂ' : 'ບັນທຶກສິນຄ້າໃໝ່') }}</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>
