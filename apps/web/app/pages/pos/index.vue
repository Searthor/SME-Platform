<script setup lang="ts">
import { errorMessage } from '~/utils/errors'
import type { Customer, CustomerGroup, CustomerList, PosQuote, PosSale, PosSessionSummary } from '~/types/api'
import { formatMoney } from '~/utils/money'
import { ApiClientError } from '~/services/api-client'

useHead({
  title: 'ຂາຍສິນຄ້າ (POS) - SmeFlow POS',
})

const api = useApiClient()
const auth = useAuthStore()
const toast = useToast()

// Types
type Branch = { id: string; name: string; code: string }
type PosRegister = { id: string; name: string; code: string; branchId: string }
type PosProductVariant = {
  variantId: string
  productId: string
  productName: string
  variantName: string
  sku: string | null
  barcodes: string[]
  unitId?: string
  unitName: string
  categoryId?: string
  categoryName: string
  unitCost: string
  sellingPrice: string
  trackStock: boolean
  availableStock: string
  imageUrl?: string
  isRecommended?: boolean
  groupPrices?: Array<{ customerGroupId: string; price: string }>
}

type PosSession = {
  id: string
  sessionNumber: string
  branchId: string
  registerId: string
  status: 'OPEN' | 'CLOSED'
  openedAt: string
  openedByUserId: string
  openingCash: string
  branch?: { id: string; name: string; code: string }
  register?: { id: string; name: string; code: string }
}

type CartItem = {
  variantId: string
  productId: string
  productName: string
  variantName: string
  unitId?: string
  unitName: string
  categoryId?: string
  /** Catalog price, shown only until the server quote arrives. */
  basePrice: number
  quantity: number
  availableStock: number
  trackStock: boolean
  imageUrl: string
}

/** A cart row as displayed: prices come from the server quote. */
type CartDisplayLine = CartItem & {
  key: string
  unitPrice: number
  lineSubtotal: number
  lineDiscount: number
  isPromoGift: boolean
}

type HeldOrder = {
  id: string
  table: string
  customer: string
  items: CartItem[]
  time: string
  total: number
}

// State
const loading = ref(true)
const branches = ref<Branch[]>([])
const selectedBranchId = ref<string>('')
const registers = ref<PosRegister[]>([])
const selectedRegisterId = ref<string>('')

// Current Active Shift
const activeSession = ref<PosSession | null>(null)
const loadingSession = ref(false)

// Open Shift Modal / Form
const openShiftModal = ref(false)
const openShiftForm = reactive({
  openingCash: '0',
  notes: '',
})
const openingShift = ref(false)

// Products Catalog
const products = ref<PosProductVariant[]>([])
const loadingProducts = ref(false)
const searchQuery = ref('')
const selectedCategory = ref('ທັງໝົດ')

// Cart & Order Options
const cartTab = ref<'CURRENT' | 'HELD'>('CURRENT')
const cart = ref<CartItem[]>([])
const heldOrders = ref<HeldOrder[]>([])

const customerName = ref('ລູກຄ້າທົ່ວໄປ')
const selectedCustomer = ref<Customer | null>(null)
const customers = ref<Customer[]>([])
const customerGroups = ref<CustomerGroup[]>([])
const customerSearchModal = ref(false)
const customerSearchQuery = ref('')
const isQuickAddingCustomer = ref(false)
const quickCustomerForm = reactive({
  name: '',
  phone: '',
  groupId: '',
})
const savingQuickCustomer = ref(false)
const selectedTable = ref('T01')
const orderNotes = ref('')

// Manual bill discount (requires sale.discount; validated and applied by the server)
const canDiscount = computed(() => auth.hasPermission('sale.discount'))
const discountType = ref<'AMOUNT' | 'PERCENT'>('AMOUNT')
const discountValue = ref<number>(0)

// Checkout Modal
const checkoutModal = ref(false)
const paymentMethod = ref<'CASH' | 'BANK_TRANSFER' | 'CARD' | 'OTHER'>('CASH')
const tenderedAmount = ref('')
const paymentReference = ref('')
const completingSale = ref(false)

// Receipt / Completed Sale Modal
const receiptModal = ref(false)
const completedSale = ref<PosSale | null>(null)

// Cash In/Out Modal
const cashMovementModal = ref(false)
const cashMovementForm = reactive({
  type: 'CASH_IN' as 'CASH_IN' | 'CASH_OUT',
  amount: '',
  reason: '',
})
const submittingMovement = ref(false)

// Close Shift / Z-Report Modal
const closeShiftModal = ref(false)
const closeShiftForm = reactive({
  closingCashCount: '',
  notes: '',
})
const shiftSummary = ref<PosSessionSummary | null>(null)
const loadingSummary = ref(false)
const closingShift = ref(false)

// Quick Add Product Modal
const addProductModal = ref(false)

// Curated Photos Map
const productImagesMap: Record<string, string> = {
  'ເອັດເປຣສໂຊ່ນ້ຳເຢັນ': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80',
  'ອາເມຣິກາໂນ້': 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=400&auto=format&fit=crop&q=80',
  'ລາເຕ້ເຢັນ': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&auto=format&fit=crop&q=80',
  'ຄາປູຊິໂນ້': 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&auto=format&fit=crop&q=80',
  'ມັດຊະລາເຕ້': 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&auto=format&fit=crop&q=80',
  'ຊາມະນາວ': 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop&q=80',
  'ຊາໄຂ່ມຸກ': 'https://images.unsplash.com/photo-1558857563-b37cb3372c05?w=400&auto=format&fit=crop&q=80',
  'ສະປັ້ນສະຕໍເບີຣີ່': 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&auto=format&fit=crop&q=80',
  'ຊັອກໂກແລັດເຢັນ': 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&auto=format&fit=crop&q=80',
  'ນົມສົດ': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80',
  'ເຂົ້າຜັດໄທ': 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&auto=format&fit=crop&q=80',
  'ສະເຕັກໄກ່': 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400&auto=format&fit=crop&q=80',
  'ພິຊຊ່າ': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&auto=format&fit=crop&q=80',
  'ເບີເກີ': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80',
  'ສະລັດຜັກ': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&auto=format&fit=crop&q=80',
  'ເຄັກຊັອກໂກແລັດ': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=80',
  'ເຄັກຊີສ': 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&auto=format&fit=crop&q=80',
  'ວັອຟເຟິ່ນ': 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=400&auto=format&fit=crop&q=80',
  'ຄຸກກີ້': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&auto=format&fit=crop&q=80',
  'ມັຟຟິນ': 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=400&auto=format&fit=crop&q=80',
}

const getProductImage = (name: string, category?: string) => {
  if (productImagesMap[name]) return productImagesMap[name]
  if (category === 'ເຄື່ອງດື່ມ') return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80'
  if (category === 'ອາຫານ') return 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&auto=format&fit=crop&q=80'
  if (category === 'ຂອງຫວານ') return 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&auto=format&fit=crop&q=80'
  return 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&auto=format&fit=crop&q=80'
}

// Categories list matching reference
const defaultCategories = [
  { id: 'ALL', name: 'ທັງໝົດ', icon: '🏪' },
  { id: 'DRINK', name: 'ເຄື່ອງດື່ມ', icon: '🧃' },
  { id: 'FOOD', name: 'ອາຫານ', icon: '🍱' },
  { id: 'DESSERT', name: 'ຂອງຫວານ', icon: '🍰' },
  { id: 'SUPPLY', name: 'ເຄື່ອງໃຊ້', icon: '🧴' },
]

const displayOrder = [
  'ເອັດເປຣສໂຊ່ນ້ຳເຢັນ',
  'ອາເມຣິກາໂນ້',
  'ລາເຕ້ເຢັນ',
  'ຄາປູຊິໂນ້',
  'ມັດຊະລາເຕ້',
  'ຊາມະນາວ',
  'ຊາໄຂ່ມຸກ',
  'ສະປັ້ນສະຕໍເບີຣີ່',
  'ຊັອກໂກແລັດເຢັນ',
  'ນົມສົດ',
  'ເຂົ້າຜັດໄທ',
  'ສະເຕັກໄກ່',
  'ພິຊຊ່າ',
  'ເບີເກີ',
  'ສະລັດຜັກ',
  'ເຄັກຊັອກໂກແລັດ',
  'ເຄັກຊີສ',
  'ວັອຟເຟິ່ນ',
  'ຄຸກກີ້',
  'ມັຟຟິນ',
]

const filteredProducts = computed(() => {
  let list = [...products.value]
  if (selectedCategory.value !== 'ທັງໝົດ') {
    list = list.filter(p => p.categoryName === selectedCategory.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(p =>
      p.productName.toLowerCase().includes(q) ||
      p.variantName.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      p.barcodes.some(b => b.toLowerCase().includes(q))
    )
  }
  list.sort((a, b) => {
    const idxA = displayOrder.indexOf(a.productName)
    const idxB = displayOrder.indexOf(b.productName)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.productName.localeCompare(b.productName)
  })
  return list
})

const selectedPriceGroupId = ref<string>('')

// Server quote: the single source of prices, promotions, discounts and totals (MON-003)
const saleQuote = ref<PosQuote | null>(null)
const quotedKey = ref('')
const quoting = ref(false)
const quoteError = ref('')

const manualDiscountRequest = computed(() =>
  canDiscount.value && discountValue.value > 0
    ? { type: discountType.value, value: String(discountValue.value) }
    : undefined,
)

const quoteRequest = computed(() => ({
  branchId: selectedBranchId.value,
  customerId: selectedCustomer.value?.id || undefined,
  priceGroupId: selectedPriceGroupId.value || undefined,
  manualDiscount: manualDiscountRequest.value,
  items: cart.value.map(i => ({ variantId: i.variantId, quantity: String(i.quantity) })),
}))
const quoteKey = computed(() => JSON.stringify(quoteRequest.value))
const quoteReady = computed(() => cart.value.length > 0 && !quoting.value && !quoteError.value && quotedKey.value === quoteKey.value)

const fetchQuote = async () => {
  if (cart.value.length === 0 || !selectedBranchId.value) {
    saleQuote.value = null
    quotedKey.value = ''
    quoteError.value = ''
    return
  }
  const key = quoteKey.value
  quoting.value = true
  try {
    const quote = await api.post<PosQuote>('/pos/quote', quoteRequest.value)
    if (key !== quoteKey.value) return // cart changed meanwhile; a newer request is on its way
    saleQuote.value = quote
    quotedKey.value = key
    quoteError.value = ''
  } catch (err) {
    if (key === quoteKey.value) quoteError.value = errorMessage(err, 'ບໍ່ສາມາດຄິດໄລ່ລາຄາໄດ້')
  } finally {
    if (key === quoteKey.value) quoting.value = false
  }
}

let quoteTimer: ReturnType<typeof setTimeout> | null = null
watch(quoteKey, () => {
  if (quoteTimer) clearTimeout(quoteTimer)
  quoteTimer = setTimeout(fetchQuote, 250)
})

const quoteLineFor = (variantId: string) =>
  saleQuote.value?.lines.find(line => line.variantId === variantId && !line.isPromoGift)

const cartDisplayLines = computed<CartDisplayLine[]>(() => {
  const lines: CartDisplayLine[] = cart.value.map((item) => {
    const quoted = quoteLineFor(item.variantId)
    return {
      ...item,
      key: item.variantId,
      unitPrice: quoted ? Number(quoted.unitPrice) : item.basePrice,
      lineSubtotal: quoted ? Number(quoted.subtotal) : item.basePrice * item.quantity,
      lineDiscount: quoted ? Number(quoted.discountAmount) : 0,
      isPromoGift: false,
    }
  })
  for (const gift of saleQuote.value?.lines.filter(line => line.isPromoGift) ?? []) {
    const pInfo = products.value.find(p => p.variantId === gift.variantId)
    lines.push({
      key: `gift-${gift.promotionId}-${gift.variantId}`,
      variantId: gift.variantId,
      productId: gift.productId,
      productName: gift.productName,
      variantName: gift.variantName ?? '',
      unitName: gift.unitName,
      basePrice: 0,
      quantity: Number(gift.quantity),
      availableStock: Number(pInfo?.availableStock ?? 0),
      trackStock: pInfo?.trackStock ?? false,
      imageUrl: pInfo?.imageUrl || getProductImage(gift.productName, pInfo?.categoryName ?? 'ທົ່ວໄປ'),
      unitPrice: 0,
      lineSubtotal: 0,
      lineDiscount: 0,
      isPromoGift: true,
    })
  }
  return lines
})

// Display-only numbers; the amounts sent to the API are the quote's decimal strings
const cartSubtotal = computed(() =>
  saleQuote.value ? Number(saleQuote.value.subtotal) : cart.value.reduce((sum, item) => sum + item.basePrice * item.quantity, 0))
const computedDiscount = computed(() => (saleQuote.value ? Number(saleQuote.value.discountAmount) : 0))
const cartGrandTotal = computed(() => (saleQuote.value ? Number(saleQuote.value.grandTotal) : cartSubtotal.value))

watch(cartGrandTotal, (total) => {
  if (checkoutModal.value && paymentMethod.value === 'CASH') tenderedAmount.value = formatMoney(total)
})

const cartItemCount = computed(() => {
  return cart.value.reduce((sum, item) => sum + item.quantity, 0)
})

const changeAmount = computed(() => {
  if (paymentMethod.value !== 'CASH') return 0
  const tendered = Number(tenderedAmount.value.replace(/,/g, '')) || 0
  return Math.max(0, tendered - cartGrandTotal.value)
})

const closingCashDifference = computed(() => {
  if (!shiftSummary.value) return 0
  const counted = Number(closeShiftForm.closingCashCount.replace(/,/g, '')) || 0
  const expected = Number(shiftSummary.value.expectedCash) || 0
  return counted - expected
})

const selectCustomer = (c: Customer | null) => {
  selectedCustomer.value = c
  customerName.value = c ? c.name : 'ລູກຄ້າທົ່ວໄປ'
  customerSearchModal.value = false
}

const clearSelectedCustomer = () => {
  selectCustomer(null)
}

const filteredCustomers = computed(() => {
  const q = customerSearchQuery.value.trim().toLowerCase()
  if (!q) return customers.value
  return customers.value.filter((c) => {
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.group && c.group.name.toLowerCase().includes(q))
    )
  })
})

const handleQuickAddCustomer = async () => {
  if (!quickCustomerForm.name.trim()) {
    toast.error('ແຈ້ງເຕືອນ', 'ກະລຸນາປ້ອນຊື່ລູກຄ້າ')
    return
  }
  savingQuickCustomer.value = true
  try {
    const created = await api.post<Customer>('/customers', {
      name: quickCustomerForm.name.trim(),
      phone: quickCustomerForm.phone.trim() || undefined,
      groupId: quickCustomerForm.groupId || undefined,
    })
    customers.value.unshift(created)
    selectCustomer(created)
    toast.success('ສຳເລັດ', `ເພີ່ມລູກຄ້າ "${created.name}" ສຳເລັດແລ້ວ`)
    quickCustomerForm.name = ''
    quickCustomerForm.phone = ''
    quickCustomerForm.groupId = ''
    isQuickAddingCustomer.value = false
  } catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດເພີ່ມລູກຄ້າໄດ້'))
  } finally {
    savingQuickCustomer.value = false
  }
}

const loadCustomersAndGroups = async () => {
  try {
    const [custListRes, grpList] = await Promise.all([
      api.get<CustomerList>('/customers?limit=100').catch(() => ({ items: [], total: 0, page: 1, limit: 100, totalPages: 0 })),
      api.get<CustomerGroup[]>('/customer-groups').catch(() => [] as CustomerGroup[]),
    ])
    customers.value = custListRes.items || []
    customerGroups.value = (grpList || []).filter(g => g.active)
  } catch {
    // silent fallback
  }
}

// Initial Fetch
const fetchInitial = async () => {
  loading.value = true
  try {
    const brRes = await api.get<Branch[]>('/branches')
    branches.value = brRes || []
    if (branches.value.length > 0 && !selectedBranchId.value) {
      selectedBranchId.value = branches.value[0]!.id
    }
    await Promise.all([
      onBranchChange(),
      loadCustomersAndGroups(),
    ])
  } catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດໂຫຼດຂໍ້ມູນເລີ່ມຕົ້ນໄດ້'))
  } finally {
    loading.value = false
  }
}

const onBranchChange = async () => {
  if (!selectedBranchId.value) return
  loadingSession.value = true
  try {
    const [regs, curSession] = await Promise.all([
      api.get<PosRegister[]>(`/pos/registers?branchId=${selectedBranchId.value}`),
      api.get<PosSession | null>(`/pos/sessions/current?branchId=${selectedBranchId.value}`),
    ])
    registers.value = regs || []
    if (registers.value.length > 0 && registers.value[0]) {
      selectedRegisterId.value = registers.value[0].id
    }
    activeSession.value = curSession

    await loadProducts()
  } catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດກວດສອບກະຂາຍໄດ້'))
  } finally {
    loadingSession.value = false
  }
}

const loadProducts = async () => {
  if (!selectedBranchId.value) return
  loadingProducts.value = true
  try {
    const items = await api.get<PosProductVariant[]>(`/pos/products?branchId=${selectedBranchId.value}`)
    products.value = (items || []).map(p => ({
      ...p,
      imageUrl: getProductImage(p.productName, p.categoryName),
      isRecommended: ['ເອັດເປຣສໂຊ່ນ້ຳເຢັນ', 'ຊາໄຂ່ມຸກ'].includes(p.productName),
    }))
  } catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດໂຫຼດລາຍການສິນຄ້າໄດ້'))
  } finally {
    loadingProducts.value = false
  }
}

const handleOpenShift = async () => {
  if (!selectedBranchId.value) {
    toast.error('ແຈ້ງເຕືອນ', 'ກະລຸນາເລືອກສາຂາ')
    return
  }
  openingShift.value = true
  try {
    const rawOpeningCash = openShiftForm.openingCash.replace(/,/g, '')
    const session = await api.post<PosSession>('/pos/sessions/open', {
      branchId: selectedBranchId.value,
      registerId: selectedRegisterId.value || undefined,
      openingCash: rawOpeningCash || '0',
      notes: openShiftForm.notes?.trim() || undefined,
    })
    activeSession.value = session
    openShiftModal.value = false
    toast.success('ສຳເລັດ', `ເປີດກະຂາຍສຳເລັດແລ້ວ: ${session.sessionNumber}`)
    await loadProducts()
  } catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດເປີດກະຂາຍໄດ້'))
  } finally {
    openingShift.value = false
  }
}

const addToCart = (product: PosProductVariant) => {
  const stock = Number(product.availableStock) || 0
  const existing = cart.value.find(item => item.variantId === product.variantId)

  if (product.trackStock) {
    const currentQty = existing ? existing.quantity : 0
    if (currentQty + 1 > stock) {
      toast.warning('ສິນຄ້າບໍ່ພໍ', `ສິນຄ້າ "${product.productName}" ມີໃນສາງພຽງ ${stock}`)
      return
    }
  }

  const basePrice = Number(product.sellingPrice) || 0

  if (existing) {
    existing.quantity += 1
  } else {
    cart.value.push({
      variantId: product.variantId,
      productId: product.productId,
      productName: product.productName,
      variantName: product.variantName,
      unitId: product.unitId,
      unitName: product.unitName,
      categoryId: product.categoryId,
      basePrice,
      quantity: 1,
      availableStock: stock,
      trackStock: product.trackStock,
      imageUrl: product.imageUrl || getProductImage(product.productName, product.categoryName),
    })
  }
}

const updateItemQuantity = (line: CartDisplayLine, delta: number) => {
  const item = cart.value.find(i => i.variantId === line.variantId)
  if (!item) return
  const newQty = item.quantity + delta
  if (newQty <= 0) {
    removeItem(line)
    return
  }
  if (item.trackStock && newQty > item.availableStock) {
    toast.warning('ສິນຄ້າບໍ່ພໍ', `ມີໃນສາງພຽງ ${item.availableStock}`)
    return
  }
  item.quantity = newQty
}

const removeItem = (line: CartDisplayLine) => {
  if (line.isPromoGift) return
  cart.value = cart.value.filter(i => i.variantId !== line.variantId)
}

const clearCart = () => {
  cart.value = []
  discountValue.value = 0
  orderNotes.value = ''
  selectedCustomer.value = null
  customerName.value = 'ລູກຄ້າທົ່ວໄປ'
}

const holdOrder = () => {
  if (cart.value.length === 0) return
  heldOrders.value.push({
    id: `HOLD-${Date.now().toString().slice(-4)}`,
    table: selectedTable.value,
    customer: customerName.value,
    items: [...cart.value],
    time: new Date().toLocaleTimeString('lo-LA', { hour: '2-digit', minute: '2-digit' }),
    total: cartGrandTotal.value,
  })
  toast.success('ບັນທຶກຄຳສັ່ງແລ້ວ', `ໂຕະ: ${selectedTable.value}`)
  clearCart()
}

const restoreHeldOrder = (order: HeldOrder) => {
  cart.value = [...order.items]
  selectedTable.value = order.table
  customerName.value = order.customer
  heldOrders.value = heldOrders.value.filter(o => o.id !== order.id)
  cartTab.value = 'CURRENT'
}

const setDiscountType = (type: 'AMOUNT' | 'PERCENT') => {
  discountType.value = type
}

const applyQuickDiscount = (pct: number) => {
  discountType.value = 'PERCENT'
  discountValue.value = pct
}

const openCheckout = (method?: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'OTHER') => {
  if (cart.value.length === 0) {
    toast.warning('ແຈ້ງເຕືອນ', 'ກະລຸນາເລືອກສິນຄ້າໃສ່ກະຕ່າກ່ອນ')
    return
  }
  paymentMethod.value = method || 'CASH'
  tenderedAmount.value = formatMoney(cartGrandTotal.value)
  paymentReference.value = ''
  pendingSaleKey = null
  checkoutModal.value = true
}

// Reused only while retrying a sale whose outcome is unknown (network failure or 5xx), so the
// server returns the original sale instead of charging and deducting stock twice.
let pendingSaleKey: string | null = null

const isOutcomeUnknown = (err: unknown) =>
  err instanceof ApiClientError && (err.code === 'NETWORK_ERROR' || (err.statusCode ?? 500) >= 500)

const handleCompleteSale = async () => {
  if (cart.value.length === 0) return
  if (!activeSession.value) {
    toast.error('ຜິດພາດ', 'ບໍ່ພົບກະຂາຍທີ່ກຳລັງເປີດຢູ່')
    return
  }

  // Charge only what the server has priced for exactly this cart
  if (!quoteReady.value) await fetchQuote()
  const quote = saleQuote.value
  if (!quote || !quoteReady.value) {
    toast.error('ຜິດພາດ', quoteError.value || 'ກຳລັງຄິດໄລ່ລາຄາ ກະລຸນາລອງໃໝ່')
    return
  }

  const tenderedInput = tenderedAmount.value.replace(/,/g, '').trim() || quote.grandTotal
  if (paymentMethod.value === 'CASH' && Number(tenderedInput) < Number(quote.grandTotal)) {
    toast.error('ຍອດເງິນບໍ່ພໍ', 'ຈຳນວນເງິນສົດທີ່ຮັບມາໜ້ອຍກວ່າຍອດລວມທີ່ຕ້ອງຊຳລະ')
    return
  }

  completingSale.value = true
  try {
    const mappedMethod = paymentMethod.value === 'CARD' ? 'OTHER' : paymentMethod.value

    // Intent only: the server re-prices the cart and refuses the sale if its total differs
    const payload = {
      ...quoteRequest.value,
      posSessionId: activeSession.value.id,
      customerName: selectedCustomer.value
        ? selectedCustomer.value.name
        : (customerName.value.trim() ? `${customerName.value.trim()} (ໂຕະ: ${selectedTable.value})` : undefined),
      notes: orderNotes.value.trim() || undefined,
      expectedGrandTotal: quote.grandTotal,
      payments: Number(quote.grandTotal) > 0
        ? [{
            method: mappedMethod,
            amount: quote.grandTotal,
            tenderedAmount: paymentMethod.value === 'CASH' ? tenderedInput : undefined,
            reference: paymentReference.value?.trim() || undefined,
          }]
        : [],
    }

    pendingSaleKey ??= crypto.randomUUID()
    const res = await api.post<PosSale>('/pos/sales', payload, { idempotencyKey: pendingSaleKey })
    pendingSaleKey = null
    completedSale.value = res
    checkoutModal.value = false
    receiptModal.value = true
    toast.success('ຊຳລະສຳເລັດ', `ອອກໃບບິນ: ${res.saleNumber}`)

    loadProducts()
    clearCart()
  } catch (err) {
    if (!isOutcomeUnknown(err)) pendingSaleKey = null
    if (err instanceof ApiClientError && err.code === 'SALE_TOTAL_CHANGED') {
      await fetchQuote()
      toast.warning('ລາຄາມີການປ່ຽນແປງ', 'ກະລຸນາກວດຍອດໃໝ່ກ່ອນຮັບເງິນ')
      return
    }
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດບັນທຶກການຂາຍໄດ້'))
  } finally {
    completingSale.value = false
  }
}

// Cash Movement
const openCashMovement = () => {
  cashMovementForm.type = 'CASH_IN'
  cashMovementForm.amount = ''
  cashMovementForm.reason = ''
  cashMovementModal.value = true
}

const handleCashMovement = async () => {
  if (!activeSession.value) return
  const amountNum = Number(cashMovementForm.amount.replace(/,/g, ''))
  if (!amountNum || amountNum <= 0) {
    toast.error('ຜິດພາດ', 'ກະລຸນາປ້ອນຈຳນວນເງິນທີ່ຖືກຕ້ອງ')
    return
  }
  if (!cashMovementForm.reason.trim()) {
    toast.error('ຜິດພາດ', 'ກະລຸນາໃສ່ເຫດຜົນການເອົາເງິນເຂົ້າ/ອອກ')
    return
  }

  submittingMovement.value = true
  try {
    await api.post(`/pos/sessions/${activeSession.value.id}/cash-movement`, {
      type: cashMovementForm.type,
      amount: String(amountNum),
      reason: cashMovementForm.reason.trim(),
    })
    toast.success('ສຳເລັດ', `ບັນທຶກ ${cashMovementForm.type === 'CASH_IN' ? 'ເງິນເຂົ້າ' : 'ເງິນອອກ'} ສຳເລັດ`)
    cashMovementModal.value = false
    const cur = await api.get<PosSession>(`/pos/sessions/current?branchId=${selectedBranchId.value}`)
    activeSession.value = cur
  } catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດບັນທຶກການເຄື່ອນໄຫວເງິນສົດໄດ້'))
  } finally {
    submittingMovement.value = false
  }
}

// Close Shift
const openCloseShift = async () => {
  if (!activeSession.value) return
  closeShiftForm.closingCashCount = ''
  closeShiftForm.notes = ''
  closeShiftModal.value = true
  loadingSummary.value = true
  try {
    const summary = await api.get<PosSessionSummary>(`/pos/sessions/${activeSession.value.id}/summary`)
    shiftSummary.value = summary
    closeShiftForm.closingCashCount = formatMoney(summary.expectedCash)
  } catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດດຶງລາຍງານສະຫຼຸບຍອດກະໄດ້'))
  } finally {
    loadingSummary.value = false
  }
}

const handleCloseShift = async () => {
  if (!activeSession.value) return
  closingShift.value = true
  try {
    const rawCount = closeShiftForm.closingCashCount.replace(/,/g, '')
    await api.post(`/pos/sessions/${activeSession.value.id}/close`, {
      closingCashCount: rawCount || '0',
      notes: closeShiftForm.notes?.trim() || undefined,
    })
    toast.success('ປິດກະສຳເລັດ', `ປິດກະ ${activeSession.value.sessionNumber} ຮຽບຮ້ອຍແລ້ວ`)
    activeSession.value = null
    closeShiftModal.value = false
    onBranchChange()
  } catch (err) {
    toast.error('ຜິດພາດ', errorMessage(err, 'ບໍ່ສາມາດປິດກະຂາຍໄດ້'))
  } finally {
    closingShift.value = false
  }
}

const printReceipt = () => {
  window.print()
}

const currentTime = ref('')
const currentDate = ref('')

const updateClock = () => {
  const now = new Date()
  const days = ['ອາທິດ', 'ຈັນ', 'ອັງຄານ', 'ພຸດ', 'ພະຫັດ', 'ສຸກ', 'ເສົາ']
  const months = ['ມ.ກ.', 'ກ.ພ.', 'ມີ.ນ.', 'ເມ.ສ.', 'ພ.ພ.', 'ມິ.ຖ.', 'ກ.ລ.', 'ສ.ຫ.', 'ກ.ຍ.', 'ຕ.ລ.', 'ພ.ຈ.', 'ທ.ວ.']
  
  const dayName = days[now.getDay()]
  const dayNum = now.getDate()
  const monthName = months[now.getMonth()]
  const year = now.getFullYear()
  
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')

  currentDate.value = `${dayName} ${dayNum} ${monthName} ${year}`
  currentTime.value = `${hours}:${minutes}`
}

let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  updateClock()
  timer = setInterval(updateClock, 1000)
  fetchInitial()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="h-full flex flex-col min-h-0 overflow-hidden">
    <!-- SHIFT GATE: When No Active Shift -->
    <div v-if="!activeSession && !loadingSession" class="flex-1 flex items-center justify-center p-4">
      <div class="w-full max-w-lg rounded-3xl border border-slate-200/90 bg-white p-7 text-center shadow-xl">
        <div class="mx-auto grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-600 text-3xl shadow-inner">
          🛒
        </div>
        <h2 class="mt-4 text-xl font-black text-slate-900">ເລີ່ມຕົ້ນເປີດກະຂາຍໜ້າຮ້ານ (Open Shift)</h2>
        <p class="mt-1 text-xs text-slate-500 leading-relaxed">
          ກະລຸນາກວດສອບເງິນທອນຕັ້ງຕົ້ນໃນລິ້ນຊັກເງິນສົດ (Float Cash) ກ່ອນເລີ່ມຕົ້ນຂາຍສິນຄ້າ
        </p>

        <div class="mt-6 space-y-4 text-left">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">ສາຂາ</label>
              <select
                v-model="selectedBranchId"
                class="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold text-slate-900 focus:border-brand-500 focus:outline-none"
                @change="onBranchChange"
              >
                <option v-for="b in branches" :key="b.id" :value="b.id">
                  {{ b.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1">ເຄົາເຕີ້ / ເຄື່ອງ POS</label>
              <select
                v-model="selectedRegisterId"
                class="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-bold text-slate-900 focus:border-brand-500 focus:outline-none"
              >
                <option v-for="r in registers" :key="r.id" :value="r.id">
                  {{ r.name }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs font-bold text-slate-700">ເງິນສົດເລີ່ມຕົ້ນ / ເງິນທອນ (LAK)</label>
              <span class="text-[0.7rem] text-slate-400">ກີບ (LAK)</span>
            </div>
            <div class="relative">
              <input
                v-model="openShiftForm.openingCash"
                type="text"
                placeholder="0"
                class="w-full h-12 rounded-xl border border-slate-200 bg-white px-3 pr-10 text-lg font-black text-slate-900 text-right focus:border-brand-500 focus:outline-none shadow-2xs"
                @input="openShiftForm.openingCash = formatMoney(openShiftForm.openingCash)"
              >
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₭</span>
            </div>

            <!-- Quick presets -->
            <div class="mt-2 flex flex-wrap gap-1.5">
              <button
                v-for="amt in [0, 100000, 200000, 500000, 1000000]"
                :key="amt"
                type="button"
                class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.7rem] font-bold text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition"
                @click="openShiftForm.openingCash = formatMoney(amt)"
              >
                {{ amt === 0 ? '0 ₭' : `+${formatMoney(amt)}` }}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="mt-6 w-full rounded-2xl bg-[#5b4cf5] hover:bg-[#4d3ee3] py-3.5 text-sm font-black text-white shadow-lg shadow-brand-500/25 transition active:scale-[0.99] disabled:opacity-50"
          :disabled="openingShift"
          @click="handleOpenShift"
        >
          <span v-if="openingShift">ກຳລັງເປີດກະ...</span>
          <span v-else>🚀 ເປີດກະຂາຍເລີ່ມຕົ້ນ (Open Shift)</span>
        </button>
      </div>
    </div>

    <!-- MAIN ACTIVE POS WORKSPACE (Side by Side Exact Reference Layout) -->
    <div v-else-if="activeSession" class="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
      <!-- TOP HEADER BAR: Title, Search, Online, Clock -->
      <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200/90 shadow-2xs shrink-0">
        <!-- Title & Subtitle -->
        <div class="min-w-0">
          <h1 class="text-base font-black text-slate-900 truncate">ຂາຍສິນຄ້າ (POS)</h1>
          <p class="text-[0.68rem] text-slate-400 truncate">ຈັດການການຂາຍຢ່າງງ່າຍດາຍ ແລະ ວ່ອງໄວ</p>
        </div>

        <!-- Search input with Ctrl+K -->
        <div class="relative flex-1 max-w-md">
          <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="ຄົ້ນຫາສິນຄ້າ... (ຊື່ ຫຼື ລະຫັດ)"
            class="w-full h-9.5 rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-16 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none transition"
          >
          <span class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[0.62rem] font-bold text-slate-400">Ctrl + K</span>
        </div>

        <!-- Actions & Live Clock -->
        <div class="flex items-center gap-2.5 shrink-0">
          <div class="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-emerald-700 text-xs font-bold">
            <span class="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span class="text-[0.7rem]">Online</span>
          </div>
          <div class="hidden xl:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs text-slate-700 font-bold">
            <span>📅 {{ currentDate }}</span>
            <span class="text-slate-300">|</span>
            <span class="font-mono text-slate-900">{{ currentTime }}</span>
          </div>
        </div>
      </div>

      <!-- WORKSPACE ROW: Catalog & Cart -->
      <div class="flex-1 flex gap-4 min-h-0 overflow-hidden">
        <!-- CENTER: CATALOG & CATEGORIES (Left Column) -->
        <div class="flex-1 flex flex-col min-w-0 bg-transparent gap-3 min-h-0 overflow-hidden">
        <!-- Category Filter Tabs + Add Product Button -->
        <div class="flex items-center justify-between gap-2 shrink-0">
          <!-- Category Pills -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              v-for="cat in defaultCategories"
              :key="cat.id"
              type="button"
              class="flex items-center gap-1.5 shrink-0 rounded-xl px-4 py-2 text-xs font-black transition shadow-2xs cursor-pointer select-none"
              :class="selectedCategory === cat.name ? 'bg-[#5b4cf5] text-white shadow-md shadow-[#5b4cf5]/25' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'"
              @click="selectedCategory = cat.name"
            >
              <span>{{ cat.icon }}</span>
              <span>{{ cat.name }}</span>
            </button>
          </div>

          <!-- Add Product Button -->
          <button
            type="button"
            class="flex items-center gap-1.5 shrink-0 rounded-xl bg-indigo-500 hover:bg-indigo-600 px-3.5 py-2 text-xs font-black text-white shadow-sm transition"
            @click="addProductModal = true"
          >
            <span>+</span>
            <span>ເພີ່ມສິນຄ້າ</span>
          </button>
        </div>

        <!-- Shift Bar status mini -->
        <div class="flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 text-xs shrink-0">
          <div class="flex items-center gap-2.5">
            <span class="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span class="font-black text-slate-800">{{ activeSession.sessionNumber }}</span>
            <span class="text-slate-400">|</span>
            <span class="text-slate-600 font-medium">{{ activeSession.branch?.name }}</span>
            <span class="text-slate-400">|</span>
            <span class="text-slate-500">ເງິນເປີດກະ: <b>{{ formatMoney(activeSession.openingCash) }} ₭</b></span>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[0.7rem] font-bold text-slate-700 hover:bg-slate-100"
              @click="openCashMovement"
            >
              💰 ເງິນເຂົ້າ/ອອກ
            </button>
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-[0.7rem] font-bold text-slate-700 hover:bg-slate-100"
              @click="openCloseShift"
            >
              📊 Z-Report / ປິດກະ
            </button>
          </div>
        </div>

        <!-- 5-Column Product Cards Grid -->
        <div class="flex-1 min-h-0 overflow-y-auto pr-1">
          <div v-if="loadingProducts" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">
            <div v-for="i in 10" :key="i" class="h-44 rounded-2xl bg-white border border-slate-100 animate-pulse" />
          </div>

          <div v-else-if="filteredProducts.length === 0" class="h-64 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <p class="text-sm font-bold text-slate-600">ບໍ່ພົບສິນຄ້າ</p>
            <p class="mt-1 text-xs text-slate-400">ລອງຄົ້ນຫາດ້ວຍຄຳສັບອື່ນ ຫຼື ກົດປຸ່ມ + ເພີ່ມສິນຄ້າ</p>
          </div>

          <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5 pb-4">
            <div
              v-for="prod in filteredProducts"
              :key="prod.variantId"
              class="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-brand-500 cursor-pointer select-none active:scale-[0.98]"
              @click="addToCart(prod)"
            >
              <!-- Image container -->
              <div class="relative h-28 sm:h-32 w-full bg-slate-100 overflow-hidden">
                <img
                  :src="prod.imageUrl"
                  :alt="prod.productName"
                  class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                >
                <!-- Badge: ແນະນຳ (Recommended) -->
                <span
                  v-if="prod.isRecommended"
                  class="absolute top-2 left-2 rounded-md bg-[#f97316] px-2 py-0.5 text-[0.62rem] font-black text-white shadow-sm"
                >
                  ແນະນຳ
                </span>

                <!-- Favorite Heart Button -->
                <button
                  type="button"
                  class="absolute top-2 right-2 grid size-6.5 place-items-center rounded-full bg-white/80 backdrop-blur-xs text-slate-600 hover:text-rose-500 transition shadow-xs text-xs"
                  @click.stop
                >
                  ♥
                </button>
              </div>

              <!-- Content details -->
              <div class="p-3">
                <h4 class="text-xs font-black text-slate-900 group-hover:text-brand-600 transition truncate leading-snug">
                  {{ prod.productName }}
                </h4>
                <div class="mt-1.5 flex items-baseline justify-between">
                  <span class="text-sm font-black text-slate-900">
                    ₭ {{ formatMoney(prod.sellingPrice) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: ORDER & CART PANEL (Exact Reference Layout) -->
      <div class="w-80 sm:w-96 xl:w-[420px] 2xl:w-[450px] shrink-0 rounded-3xl border border-slate-200/90 bg-white shadow-xl flex flex-col h-full max-h-full min-h-0 overflow-hidden">
        <!-- Cart Top Tabs -->
        <div class="grid grid-cols-2 border-b border-slate-200 bg-slate-50/50 text-xs font-black text-center shrink-0">
          <button
            type="button"
            class="py-3 transition relative"
            :class="cartTab === 'CURRENT' ? 'text-[#5b4cf5] bg-white border-b-2 border-[#5b4cf5]' : 'text-slate-500 hover:text-slate-800'"
            @click="cartTab = 'CURRENT'"
          >
            <span>ຄຳສັ່ງປັດຈຸບັນ ({{ cartItemCount }})</span>
          </button>
          <button
            type="button"
            class="py-3 transition relative"
            :class="cartTab === 'HELD' ? 'text-[#5b4cf5] bg-white border-b-2 border-[#5b4cf5]' : 'text-slate-500 hover:text-slate-800'"
            @click="cartTab = 'HELD'"
          >
            <span>ລາຍການທີ່ຈ່ອງ ({{ heldOrders.length }})</span>
          </button>
        </div>

        <!-- Customer & Table Selector Row -->
        <div class="p-3 border-b border-slate-100 flex items-center gap-2 shrink-0">
          <!-- Customer Dropdown / Selector -->
          <div
            class="flex-1 flex items-center justify-between gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs hover:border-[#5b4cf5]/40 hover:bg-slate-100/60 cursor-pointer transition select-none"
            @click="customerSearchModal = true"
          >
            <div class="flex items-center gap-1.5 min-w-0 flex-1">
              <span class="text-slate-400 shrink-0">👤</span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="block text-[0.62rem] text-slate-400 leading-tight">ລູກຄ້າ</span>
                  <span
                    v-if="selectedCustomer?.group"
                    class="rounded px-1.5 py-0.2 text-[0.58rem] font-bold"
                    :class="selectedCustomer.group.discountPercent > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-purple-100 text-[#5b4cf5]'"
                  >
                    {{ selectedCustomer.group.name }}
                    <template v-if="selectedCustomer.group.discountPercent > 0">
                      (-{{ selectedCustomer.group.discountPercent }}%)
                    </template>
                  </span>
                </div>
                <p class="font-black text-slate-900 truncate leading-tight">
                  {{ selectedCustomer ? selectedCustomer.name : 'ລູກຄ້າທົ່ວໄປ' }}
                </p>
              </div>
            </div>

            <button
              v-if="selectedCustomer"
              type="button"
              class="size-5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 grid place-items-center text-xs shrink-0"
              title="ຍົກເລີກການເລືອກລູກຄ້າ"
              @click.stop="clearSelectedCustomer"
            >
              ✕
            </button>
            <span v-else class="text-[0.65rem] text-[#5b4cf5] font-bold shrink-0">ເລືອກ</span>
          </div>

          <!-- Price Group / Channel Dropdown (In-store, Foodpanda, Grab...) -->
          <div class="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/70 px-2 py-1.5 text-xs">
            <span class="text-xs">🏷️</span>
            <div class="min-w-0">
              <span class="block text-[0.62rem] text-slate-400 leading-tight">ກຸ່ມລາຄາ</span>
              <select
                v-model="selectedPriceGroupId"
                class="bg-transparent font-black text-slate-900 focus:outline-none text-xs cursor-pointer"
              >
                <option value="">ລາຄາໜ້າຮ້ານ (Default)</option>
                <option
                  v-for="grp in customerGroups.filter(g => !g.isDefault && g.code !== 'STOREFRONT')"
                  :key="grp.id"
                  :value="grp.id"
                >
                  {{ grp.name }}
                </option>
              </select>
            </div>
          </div>

          <!-- Table Dropdown -->
          <div class="w-20 flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/70 px-2 py-1.5 text-xs">
            <span class="text-slate-400">🪑</span>
            <div class="min-w-0 flex-1">
              <span class="block text-[0.62rem] text-slate-400 leading-tight">ໂຕະ</span>
              <select
                v-model="selectedTable"
                class="w-full bg-transparent font-black text-slate-900 focus:outline-none"
              >
                <option value="T01">T01</option>
                <option value="T02">T02</option>
                <option value="T03">T03</option>
                <option value="T04">T04</option>
                <option value="T05">T05</option>
                <option value="TAKEAWAY">ຫໍ່ກັບ</option>
              </select>
            </div>
          </div>

          <!-- More options button -->
          <button
            type="button"
            class="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
            title="ຕົວເລືອກເພີ່ມເຕີມ"
          >
            ⋮
          </button>
        </div>

        <!-- Cart Items List / Held Orders Tab Content -->
        <div class="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5">
          <!-- HELD ORDERS TAB -->
          <template v-if="cartTab === 'HELD'">
            <div v-if="heldOrders.length === 0" class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <span class="text-3xl mb-1">📋</span>
              <p class="text-xs font-bold text-slate-600">ບໍ່ມີລາຍການທີ່ຈ່ອງໄວ້</p>
            </div>
            <div
              v-for="order in heldOrders"
              :key="order.id"
              class="rounded-2xl border border-slate-200 p-3 bg-slate-50/70 space-y-1.5"
            >
              <div class="flex justify-between items-center text-xs font-black">
                <span class="text-brand-600">ໂຕະ: {{ order.table }} ({{ order.id }})</span>
                <span class="text-slate-500">{{ order.time }}</span>
              </div>
              <p class="text-xs text-slate-600">{{ order.customer }} • {{ order.items.length }} ລາຍການ</p>
              <div class="flex justify-between items-center pt-1 border-t border-slate-200">
                <span class="text-xs font-black text-slate-900">₭ {{ formatMoney(order.total) }}</span>
                <button
                  type="button"
                  class="rounded-lg bg-[#5b4cf5] px-2.5 py-1 text-[0.7rem] font-bold text-white hover:bg-[#4a3bd9]"
                  @click="restoreHeldOrder(order)"
                >
                  ເປີດບິນຄືນ
                </button>
              </div>
            </div>
          </template>

          <!-- CURRENT CART ITEMS -->
          <template v-else>
            <div v-if="cart.length === 0" class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <span class="text-4xl mb-2">🛒</span>
              <p class="text-xs font-bold text-slate-600">ຍັງບໍ່ມີສິນຄ້າໃນກະຕ່າ</p>
              <p class="text-[0.68rem] text-slate-400 mt-0.5">ຄລິກສິນຄ້າດ້ານຊ້າຍເພື່ອເພີ່ມລາຍການ</p>
            </div>

            <!-- Item rows -->
            <div
              v-for="item in cartDisplayLines"
              :key="item.key"
              class="flex items-center justify-between gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition"
            >
              <!-- Square Image -->
              <img
                :src="item.imageUrl"
                :alt="item.productName"
                class="size-11 rounded-xl object-cover shrink-0 border border-slate-100"
              >

              <!-- Name & Price -->
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <p class="text-xs font-black text-slate-900 truncate leading-snug">{{ item.productName }}</p>
                  <span
                    v-if="item.isPromoGift"
                    class="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[0.62rem] font-bold text-emerald-700 border border-emerald-200"
                  >
                    ແຖມຟຣີ
                  </span>
                </div>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <p class="text-[0.68rem] font-black" :class="item.isPromoGift ? 'text-emerald-600' : 'text-slate-800'">
                    {{ item.isPromoGift ? '₭ 0' : `₭ ${formatMoney(item.unitPrice)}` }}
                  </p>
                  <span v-if="item.unitPrice < item.basePrice && !item.isPromoGift" class="text-[0.6rem] text-slate-400 line-through font-medium">
                    ₭ {{ formatMoney(item.basePrice) }}
                  </span>
                  <span
                    v-if="item.lineDiscount > 0"
                    class="rounded bg-rose-50 px-1 text-[0.62rem] font-bold text-rose-600"
                  >
                    -₭ {{ formatMoney(item.lineDiscount) }}
                  </span>
                </div>
              </div>

              <!-- Stepper: [ - ] [ qty ] [ + ] -->
              <div class="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shrink-0 shadow-2xs">
                <template v-if="item.isPromoGift">
                  <span class="px-2 text-center text-xs font-black text-emerald-700">x {{ item.quantity }}</span>
                </template>
                <template v-else>
                  <button
                    type="button"
                    class="grid size-6 place-items-center rounded text-slate-600 hover:bg-slate-100 text-xs font-black transition"
                    @click="updateItemQuantity(item, -1)"
                  >
                    -
                  </button>
                  <span class="w-6 text-center text-xs font-black text-slate-900">{{ item.quantity }}</span>
                  <button
                    type="button"
                    class="grid size-6 place-items-center rounded text-slate-600 hover:bg-slate-100 text-xs font-black transition"
                    @click="updateItemQuantity(item, 1)"
                  >
                    +
                  </button>
                </template>
              </div>

              <!-- Line Total -->
              <div class="w-16 text-right shrink-0">
                <span class="text-xs font-black" :class="item.isPromoGift ? 'text-emerald-600' : 'text-slate-900'">
                  {{ item.isPromoGift ? 'ຟຣີ' : `₭ ${formatMoney(item.lineSubtotal)}` }}
                </span>
              </div>

              <!-- Trash Red Button -->
              <button
                type="button"
                class="grid size-6 place-items-center text-slate-300 hover:text-rose-500 transition text-sm shrink-0"
                title="ລຶບ"
                @click="removeItem(item)"
              >
                🗑
              </button>
            </div>
          </template>
        </div>

        <!-- Compact Additional Section ("ເພີ່ມເຕີມ") -->
        <div class="px-3 py-2 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <input
            v-model="orderNotes"
            type="text"
            placeholder="ໝາຍເຫດຄຳສັ່ງ..."
            class="w-full h-8 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 transition shadow-2xs"
          >
        </div>

        <!-- Totals & Payment Summary -->
        <div class="p-3 border-t border-slate-200 bg-white space-y-2 shrink-0">
          <!-- Subtotal -->
          <div class="flex justify-between text-xs text-slate-600">
            <span>ລາຄາລວມ:</span>
            <span class="font-bold text-slate-900">₭ {{ formatMoney(cartSubtotal) }}</span>
          </div>

          <!-- Applied Promotions Ribbons -->
          <div v-if="saleQuote && saleQuote.appliedPromotions.length > 0" class="space-y-1.5 pt-0.5">
            <div
              v-for="ap in saleQuote.appliedPromotions"
              :key="ap.id"
              class="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[0.7rem] text-emerald-800"
            >
              <div class="flex items-center gap-1 font-bold truncate">
                <span>🎉</span>
                <span class="truncate">{{ ap.name }}</span>
              </div>
              <span v-if="Number(ap.discountAmount) > 0" class="font-black text-emerald-700 shrink-0">
                -₭ {{ formatMoney(ap.discountAmount) }}
              </span>
              <span v-else class="font-black text-emerald-700 shrink-0">
                ແຖມຟຣີ
              </span>
            </div>
          </div>

          <!-- Discount (if any) -->
          <div v-if="computedDiscount > 0" class="flex justify-between text-xs text-emerald-600 font-bold">
            <span>ສ່ວນຫຼຸດທັງໝົດ:</span>
            <span>-₭ {{ formatMoney(computedDiscount) }}</span>
          </div>

          <p v-if="quoteError" class="rounded-xl bg-rose-50 px-2.5 py-1.5 text-[0.7rem] font-bold text-rose-600">
            {{ quoteError }}
          </p>

          <!-- Grand Total Banner (Blue/Purple Box) -->
          <div class="rounded-2xl bg-[#eff2fe] px-3.5 py-2.5 flex items-center justify-between border border-[#d8e0fc]">
            <span class="text-xs font-black text-[#3730a3]">ຍອດທີ່ຮັບຊຳລະ:</span>
            <span class="text-xl font-black text-[#4338ca]">₭ {{ formatMoney(cartGrandTotal) }}</span>
          </div>

          <!-- Exactly Two Action Buttons: Hold Order & Pay -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              class="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-black text-slate-800 hover:bg-slate-50 transition shadow-2xs disabled:opacity-50"
              :disabled="cart.length === 0"
              @click="holdOrder"
            >
              <span>📌</span>
              <span>ບັນທຶກໄປໃນລາຍການຈອງ</span>
            </button>
            <button
              type="button"
              class="flex items-center justify-center gap-1.5 rounded-xl bg-[#5b4cf5] hover:bg-[#4d3ee3] py-2.5 text-xs font-black text-white shadow-md shadow-[#5b4cf5]/25 transition active:scale-[0.98] disabled:opacity-50"
              :disabled="cart.length === 0"
              @click="openCheckout('CASH')"
            >
              <span>💳</span>
              <span>ຊຳລະເງິນ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- CHECKOUT PAYMENT MODAL (ENLARGED & 2-COLUMN) -->
    <div
      v-if="checkoutModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 md:p-6 backdrop-blur-xs"
    >
      <div class="w-full max-w-4xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div class="flex items-center gap-3">
            <div class="grid size-11 place-items-center rounded-2xl bg-[#eff2fe] text-[#4338ca] text-xl font-bold">
              💳
            </div>
            <div>
              <h3 class="text-lg md:text-xl font-black text-slate-900 leading-tight">ຊຳລະເງິນ (Checkout)</h3>
              <p class="text-xs text-slate-500 mt-0.5">ກວດສອບຍອດເງິນ, ສ່ວນຫຼຸດ ແລະ ເລືອກຊ່ອງທາງການຊຳລະ</p>
            </div>
          </div>
          <button
            type="button"
            class="grid size-9 place-items-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-lg font-bold transition"
            @click="checkoutModal = false"
          >
            ✕
          </button>
        </div>

        <!-- 2-Column Responsive Grid -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <!-- LEFT COLUMN: Discounts, Extras, and Order Summary -->
          <div class="md:col-span-5 space-y-4">
            <!-- Manual discount: only for members with sale.discount; the server validates it again -->
            <div v-if="canDiscount" class="rounded-2xl border border-slate-200/90 bg-slate-50/80 p-4 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span class="text-sm">🏷️</span>
                  <span>ສ່ວນຫຼຸດລູກຄ້າ:</span>
                </span>
                <div class="flex items-center gap-1.5">
                  <input
                    v-model.number="discountValue"
                    type="number"
                    min="0"
                    placeholder="0"
                    class="w-28 h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-right text-xs font-black text-slate-900 focus:border-brand-500 focus:outline-none"
                  >
                  <div class="flex rounded-xl border border-slate-200 bg-white p-0.5 text-xs font-bold">
                    <button
                      type="button"
                      class="px-2.5 py-1 rounded-lg transition"
                      :class="discountType === 'AMOUNT' ? 'bg-[#5b4cf5] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'"
                      @click="setDiscountType('AMOUNT')"
                    >
                      ₭
                    </button>
                    <button
                      type="button"
                      class="px-2.5 py-1 rounded-lg transition"
                      :class="discountType === 'PERCENT' ? 'bg-[#5b4cf5] text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-100'"
                      @click="setDiscountType('PERCENT')"
                    >
                      %
                    </button>
                  </div>
                </div>
              </div>

              <!-- Quick Discount Presets -->
              <div class="flex items-center gap-1.5 flex-wrap pt-1">
                <span class="text-[0.7rem] text-slate-400 font-semibold">ສ່ວນຫຼຸດດ່ວນ:</span>
                <button
                  v-for="pct in [0, 5, 10, 15, 20]"
                  :key="pct"
                  type="button"
                  class="px-2.5 py-1 rounded-lg border text-xs font-bold transition"
                  :class="discountType === 'PERCENT' && discountValue === pct ? 'border-[#5b4cf5] bg-[#eff2fe] text-[#4338ca]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'"
                  @click="applyQuickDiscount(pct)"
                >
                  {{ pct === 0 ? 'ບໍ່ຫຼຸດ (0%)' : `${pct}%` }}
                </button>
              </div>
            </div>

            <!-- Price Breakdown & Grand Total Banner -->
            <div class="rounded-2xl bg-[#eff2fe] border border-[#d8e0fc] p-4 space-y-2">
              <div class="flex justify-between text-xs text-slate-600">
                <span>ລາຄາລວມ:</span>
                <span class="font-bold text-slate-900">₭ {{ formatMoney(cartSubtotal) }}</span>
              </div>
              <!-- Applied Promotions in Checkout -->
              <div v-if="saleQuote && saleQuote.appliedPromotions.length > 0" class="space-y-1.5 py-1">
                <div
                  v-for="ap in saleQuote.appliedPromotions"
                  :key="ap.id"
                  class="flex items-center justify-between rounded-xl border border-emerald-300 bg-white px-2.5 py-1.5 text-xs text-emerald-800"
                >
                  <span class="font-bold">🎉 {{ ap.name }}</span>
                  <span class="font-black text-emerald-700">
                    {{ Number(ap.discountAmount) > 0 ? `-₭ ${formatMoney(ap.discountAmount)}` : 'ແຖມຟຣີ' }}
                  </span>
                </div>
              </div>

              <div v-if="computedDiscount > 0" class="flex justify-between text-xs text-emerald-600 font-bold">
                <span>ສ່ວນຫຼຸດລວມທັງໝົດ:</span>
                <span>-₭ {{ formatMoney(computedDiscount) }}</span>
              </div>
              <p v-if="quoteError" class="rounded-xl bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-600">
                {{ quoteError }}
              </p>

              <div class="pt-2.5 border-t border-[#d8e0fc] flex items-center justify-between">
                <div>
                  <span class="block text-xs font-black text-[#3730a3]">ຍອດທີ່ຕ້ອງຊຳລະ:</span>
                  <span class="text-[0.68rem] text-slate-500 font-medium">ລວມທັງໝົດ</span>
                </div>
                <span class="text-2xl md:text-3xl font-black text-[#4338ca]">₭ {{ formatMoney(cartGrandTotal) }}</span>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN: Payment Method, Details, and Action -->
          <div class="md:col-span-7 space-y-4">
            <!-- Payment Method Tabs -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-2">ເລືອກຮູບແບບການຊຳລະ:</label>
              <div class="grid grid-cols-4 gap-2.5">
                <button
                  type="button"
                  class="rounded-2xl border p-3 text-center transition flex flex-col items-center gap-1.5"
                  :class="paymentMethod === 'CASH' ? 'border-[#5b4cf5] bg-[#eff2fe] text-[#4338ca] ring-2 ring-brand-500/20 shadow-xs' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                  @click="paymentMethod = 'CASH'"
                >
                  <span class="text-2xl">💵</span>
                  <span class="text-xs font-black">ເງິນສົດ</span>
                </button>

                <button
                  type="button"
                  class="rounded-2xl border p-3 text-center transition flex flex-col items-center gap-1.5"
                  :class="paymentMethod === 'CARD' ? 'border-[#5b4cf5] bg-[#eff2fe] text-[#4338ca] ring-2 ring-brand-500/20 shadow-xs' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                  @click="paymentMethod = 'CARD'"
                >
                  <span class="text-2xl">💳</span>
                  <span class="text-xs font-black">ບັດ</span>
                </button>

                <button
                  type="button"
                  class="rounded-2xl border p-3 text-center transition flex flex-col items-center gap-1.5"
                  :class="paymentMethod === 'BANK_TRANSFER' ? 'border-[#5b4cf5] bg-[#eff2fe] text-[#4338ca] ring-2 ring-brand-500/20 shadow-xs' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                  @click="paymentMethod = 'BANK_TRANSFER'"
                >
                  <span class="text-2xl">📱</span>
                  <span class="text-xs font-black">QR Code</span>
                </button>

                <button
                  type="button"
                  class="rounded-2xl border p-3 text-center transition flex flex-col items-center gap-1.5"
                  :class="paymentMethod === 'OTHER' ? 'border-[#5b4cf5] bg-[#eff2fe] text-[#4338ca] ring-2 ring-brand-500/20 shadow-xs' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                  @click="paymentMethod = 'OTHER'"
                >
                  <span class="text-2xl">🔘</span>
                  <span class="text-xs font-black">ອື່ນໆ</span>
                </button>
              </div>
            </div>

            <!-- Cash Payment Details -->
            <div v-if="paymentMethod === 'CASH'" class="space-y-3.5">
              <div>
                <div class="flex items-center justify-between mb-1.5">
                  <label class="text-xs font-bold text-slate-700">ຈຳນວນເງິນສົດທີ່ຮັບມາ:</label>
                  <button
                    type="button"
                    class="text-xs font-bold text-[#5b4cf5] hover:underline"
                    @click="tenderedAmount = formatMoney(cartGrandTotal)"
                  >
                    ຮັບພໍດີ (₭ {{ formatMoney(cartGrandTotal) }})
                  </button>
                </div>
                <div class="relative">
                  <input
                    v-model="tenderedAmount"
                    type="text"
                    class="w-full h-14 rounded-2xl border border-slate-200 px-4 pr-12 text-right text-2xl font-black text-slate-900 focus:border-brand-500 focus:outline-none shadow-2xs"
                    placeholder="0"
                    @input="tenderedAmount = formatMoney(tenderedAmount)"
                  >
                  <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">₭</span>
                </div>

                <!-- Quick Cash Presets -->
                <div class="mt-2.5 grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    class="rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                    @click="tenderedAmount = formatMoney(cartGrandTotal)"
                  >
                    ພໍດີ
                  </button>
                  <button
                    v-for="preset in [20000, 50000, 100000, 200000, 500000, 1000000]"
                    :key="preset"
                    type="button"
                    class="rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                    @click="tenderedAmount = formatMoney(preset)"
                  >
                    ₭ {{ formatMoney(preset) }}
                  </button>
                </div>
              </div>

              <!-- Change Display -->
              <div class="rounded-2xl bg-amber-50 border border-amber-200/90 p-4 flex items-center justify-between">
                <div>
                  <span class="block text-xs font-black text-amber-900">ເງິນທອນ (Change):</span>
                  <span class="text-[0.68rem] text-amber-700">ເງິນສົດທີ່ຕ້ອງທອນລູກຄ້າ</span>
                </div>
                <span class="text-2xl md:text-3xl font-black text-amber-800">₭ {{ formatMoney(changeAmount) }}</span>
              </div>
            </div>

            <!-- Bank / QR Details -->
            <div v-else-if="paymentMethod === 'BANK_TRANSFER'" class="space-y-3.5 text-center">
              <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 flex flex-col items-center">
                <span class="text-5xl">📱</span>
                <p class="mt-2 text-sm font-bold text-slate-800">ສະແກນ QR ຜ່ານ BCEL One / ທຸກທະນາຄານ</p>
                <p class="text-xs text-slate-500 mt-0.5">ຍອດຊຳລະ: <b class="text-[#4338ca] text-base">₭ {{ formatMoney(cartGrandTotal) }}</b></p>
              </div>
              <input
                v-model="paymentReference"
                type="text"
                placeholder="ເລກອ້າງອີງ / Ref No (ທາງເລືອກ)"
                class="w-full h-11 rounded-2xl border border-slate-200 px-4 text-xs font-semibold focus:border-brand-500 focus:outline-none"
              >
            </div>

            <!-- Card / Other Details -->
            <div v-else class="space-y-3.5">
              <div class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-center">
                <p class="text-xs font-bold text-slate-700">ຊຳລະຜ່ານ {{ paymentMethod === 'CARD' ? 'ບັດເຄຣດິດ / ເດບິດ' : 'ຊ່ອງທາງອື່ນໆ' }}</p>
                <p class="text-sm font-black text-[#4338ca] mt-1">₭ {{ formatMoney(cartGrandTotal) }}</p>
              </div>
              <input
                v-model="paymentReference"
                type="text"
                placeholder="ເລກອ້າງອີງ / ລະຫັດທຸລະກຳ / ໝາຍເຫດ"
                class="w-full h-11 rounded-2xl border border-slate-200 px-4 text-xs font-semibold focus:border-brand-500 focus:outline-none"
              >
            </div>

            <!-- Confirmation Button -->
            <button
              type="button"
              class="w-full rounded-2xl bg-[#5b4cf5] hover:bg-[#4d3ee3] h-13 text-sm md:text-base font-black text-white shadow-lg shadow-brand-500/25 transition active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              :disabled="completingSale || !quoteReady"
              @click="handleCompleteSale"
            >
              <span v-if="completingSale">ກຳລັງບັນທຶກ...</span>
              <span v-else-if="!quoteReady">ກຳລັງຄິດໄລ່ລາຄາ...</span>
              <span v-else>✅ ຢືນຢັນການຊຳລະ (₭ {{ formatMoney(cartGrandTotal) }})</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- SALE SUCCESS / RECEIPT MODAL -->
    <div
      v-if="receiptModal && completedSale"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center">
        <div class="mx-auto grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-600 text-xl">
          ✓
        </div>
        <h3 class="mt-2 text-base font-black text-slate-900">ຂາຍສຳເລັດແລ້ວ!</h3>
        <p class="text-xs text-slate-500">ເລກທີໃບບິນ: <b class="text-slate-800">{{ completedSale.saleNumber }}</b></p>

        <!-- Receipt Box -->
        <div class="my-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-left text-xs font-mono space-y-1.5">
          <div class="text-center font-bold pb-2 border-b border-dashed border-slate-300">
            <p class="text-sm font-black">SmeFlow POS</p>
            <p class="text-[0.65rem] text-slate-500">{{ completedSale.branch?.name }}</p>
            <p class="text-[0.6rem] text-slate-400">ໂຕະ: {{ selectedTable }}</p>
          </div>

          <div class="py-1 border-b border-dashed border-slate-300 space-y-1">
            <div v-for="item in completedSale.items" :key="item.id" class="flex justify-between">
              <span>{{ item.productName }} x{{ item.quantity }}</span>
              <span>{{ formatMoney(item.totalAmount) }}</span>
            </div>
          </div>

          <div class="pt-1 space-y-1">
            <div class="flex justify-between font-bold">
              <span>ຍອດລວມ (Total):</span>
              <span>₭ {{ formatMoney(completedSale.grandTotal) }}</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>ຮັບເງິນມາ:</span>
              <span>₭ {{ formatMoney(completedSale.paidAmount) }}</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>ເງິນທອນ:</span>
              <span>₭ {{ formatMoney(completedSale.changeAmount) }}</span>
            </div>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            type="button"
            class="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            @click="printReceipt"
          >
            🖨️ ພິມໃບບິນ
          </button>
          <button
            type="button"
            class="flex-1 rounded-xl bg-[#5b4cf5] py-2.5 text-xs font-bold text-white hover:bg-[#4d3ee3]"
            @click="receiptModal = false; completedSale = null"
          >
            ຂາຍຕໍ່ໄປ (Next)
          </button>
        </div>
      </div>
    </div>

    <!-- CASH IN/OUT MODAL -->
    <div
      v-if="cashMovementModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 class="text-base font-black text-slate-900">ບັນທຶກເງິນເຂົ້າ / ເງິນອອກ (Cash Movement)</h3>
          <button type="button" class="text-slate-400 hover:text-slate-600 text-lg" @click="cashMovementModal = false">✕</button>
        </div>

        <div class="my-4 space-y-3">
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="rounded-xl border p-2.5 text-center text-xs font-bold transition"
              :class="cashMovementForm.type === 'CASH_IN' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20' : 'border-slate-200 bg-white text-slate-600'"
              @click="cashMovementForm.type = 'CASH_IN'"
            >
              📥 ເອົາເງິນເຂົ້າ (Cash In)
            </button>
            <button
              type="button"
              class="rounded-xl border p-2.5 text-center text-xs font-bold transition"
              :class="cashMovementForm.type === 'CASH_OUT' ? 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/20' : 'border-slate-200 bg-white text-slate-600'"
              @click="cashMovementForm.type = 'CASH_OUT'"
            >
              📤 ເອົາເງິນອອກ (Cash Out)
            </button>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ຈຳນວນເງິນ (LAK)</label>
            <input
              v-model="cashMovementForm.amount"
              type="text"
              placeholder="0"
              class="w-full h-11 rounded-xl border border-slate-200 px-3 text-right font-black text-base text-slate-900 focus:outline-none"
              @input="cashMovementForm.amount = formatMoney(cashMovementForm.amount)"
            >
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">ເຫດຜົນ / ລາຍລະອຽດ</label>
            <input
              v-model="cashMovementForm.reason"
              type="text"
              placeholder="ເຊັ່ນ: ເພີ່ມເງິນທອນ, ຊື້ເຄື່ອງໃຊ້ເຂົ້າຮ້ານ..."
              class="w-full h-10 rounded-xl border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none"
            >
          </div>
        </div>

        <button
          type="button"
          class="w-full rounded-2xl bg-[#5b4cf5] hover:bg-[#4d3ee3] py-3 text-xs font-black text-white disabled:opacity-50"
          :disabled="submittingMovement"
          @click="handleCashMovement"
        >
          <span v-if="submittingMovement">ກຳລັງບັນທຶກ...</span>
          <span v-else>ບັນທຶກລາຍການ</span>
        </button>
      </div>
    </div>

    <!-- CLOSE SHIFT & Z-REPORT MODAL -->
    <div
      v-if="closeShiftModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div class="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl my-8">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 class="text-base font-black text-slate-900">ລາຍງານສະຫຼຸບຍອດກະ (Z-Report)</h3>
            <p class="text-[0.68rem] text-slate-400">{{ activeSession?.sessionNumber }}</p>
          </div>
          <button type="button" class="text-slate-400 hover:text-slate-600 text-lg" @click="closeShiftModal = false">✕</button>
        </div>

        <div v-if="loadingSummary" class="py-12 text-center text-xs text-slate-400">
          ກຳລັງຄຳນວນສະຫຼຸບຍອດກະຂາຍ...
        </div>

        <div v-else-if="shiftSummary" class="my-4 space-y-4">
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
              <span class="text-slate-400 font-semibold">ເງິນເປີດກະ:</span>
              <p class="text-sm font-black text-slate-800 mt-0.5">₭ {{ formatMoney(shiftSummary.openingCash) }}</p>
            </div>
            <div class="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
              <span class="text-slate-400 font-semibold">ຈຳນວນບິນຂາຍ:</span>
              <p class="text-sm font-black text-slate-800 mt-0.5">{{ shiftSummary.salesCount }} ບິນ</p>
            </div>
            <div class="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3">
              <span class="text-emerald-700 font-semibold">ຍອດຂາຍເງິນສົດ:</span>
              <p class="text-sm font-black text-emerald-800 mt-0.5">₭ {{ formatMoney(shiftSummary.cashSales) }}</p>
            </div>
            <div class="rounded-2xl border border-blue-200 bg-blue-50/60 p-3">
              <span class="text-blue-700 font-semibold">ຍອດຂາຍໂອນ:</span>
              <p class="text-sm font-black text-blue-800 mt-0.5">₭ {{ formatMoney(shiftSummary.bankSales) }}</p>
            </div>
          </div>

          <div class="rounded-2xl bg-amber-50 border border-amber-200 p-4">
            <div class="flex justify-between items-center">
              <span class="text-xs font-bold text-amber-900">ເງິນສົດທີ່ຄວນມີໃນລິ້ນຊັກ:</span>
              <span class="text-lg font-black text-amber-900">₭ {{ formatMoney(shiftSummary.expectedCash) }}</span>
            </div>
          </div>

          <div class="border-t border-slate-200 pt-3 space-y-2">
            <label class="block text-xs font-black text-slate-800">
              ຈຳນວນເງິນສົດຕົວຈິງທີ່ນັບໄດ້
            </label>
            <div class="relative">
              <input
                v-model="closeShiftForm.closingCashCount"
                type="text"
                placeholder="0"
                class="w-full h-12 rounded-xl border border-slate-300 px-3 pr-10 text-right text-lg font-black text-slate-900 focus:border-brand-500 focus:outline-none"
                @input="closeShiftForm.closingCashCount = formatMoney(closeShiftForm.closingCashCount)"
              >
              <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₭</span>
            </div>

            <div
              class="rounded-xl p-3 text-xs font-bold flex items-center justify-between"
              :class="{
                'bg-emerald-100 text-emerald-800': closingCashDifference === 0,
                'bg-blue-100 text-blue-800': closingCashDifference > 0,
                'bg-rose-100 text-rose-800': closingCashDifference < 0,
              }"
            >
              <span>ສ່ວນຕ່າງ:</span>
              <span class="font-black">
                <template v-if="closingCashDifference === 0">✅ ຍອດຕົງພໍດີ</template>
                <template v-else-if="closingCashDifference > 0">⬆️ ເງິນເກີນ +₭ {{ formatMoney(closingCashDifference) }}</template>
                <template v-else>⬇️ ເງິນຂາດ ₭ {{ formatMoney(closingCashDifference) }}</template>
              </span>
            </div>
          </div>
        </div>

        <div class="flex gap-2 mt-4">
          <button
            type="button"
            class="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
            @click="closeShiftModal = false"
          >
            ຍົກເລີກ
          </button>
          <button
            type="button"
            class="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 py-3 text-xs font-black text-white disabled:opacity-50"
            :disabled="closingShift"
            @click="handleCloseShift"
          >
            <span v-if="closingShift">ກຳລັງປິດກະ...</span>
            <span v-else>🔒 ຢືນຢັນປິດກະຂາຍ</span>
          </button>
        </div>
      </div>
    </div>

    <!-- CUSTOMER SEARCH & QUICK ADD MODAL -->
    <div
      v-if="customerSearchModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
    >
      <div class="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div>
            <h3 class="text-base font-black text-slate-900 flex items-center gap-2">
              <span>👥</span>
              <span>ເລືອກລູກຄ້າ / ສະມາຊິກ (Customer & VIP)</span>
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              ເລືອກລູກຄ້າເພື່ອຮັບລາຄາພິເສດ ຫຼື ສ່ວນຫຼຸດຕາມກຸ່ມ
            </p>
          </div>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-600 text-lg size-8 grid place-items-center rounded-full hover:bg-slate-100"
            @click="customerSearchModal = false"
          >
            ✕
          </button>
        </div>

        <!-- Mode Toggle: Search vs Quick Add -->
        <div class="grid grid-cols-2 p-1 bg-slate-100 rounded-xl my-3 text-xs font-bold text-center shrink-0">
          <button
            type="button"
            class="py-2 rounded-lg transition"
            :class="!isQuickAddingCustomer ? 'bg-white text-[#5b4cf5] shadow-xs' : 'text-slate-600 hover:text-slate-900'"
            @click="isQuickAddingCustomer = false"
          >
            🔍 ຄົ້ນຫາລູກຄ້າ
          </button>
          <button
            type="button"
            class="py-2 rounded-lg transition"
            :class="isQuickAddingCustomer ? 'bg-white text-[#5b4cf5] shadow-xs' : 'text-slate-600 hover:text-slate-900'"
            @click="isQuickAddingCustomer = true"
          >
            ➕ ລົງທະບຽນໃໝ່
          </button>
        </div>

        <!-- TAB 1: SEARCH & SELECT CUSTOMER -->
        <div v-if="!isQuickAddingCustomer" class="flex-1 min-h-0 flex flex-col space-y-3">
          <!-- Search input -->
          <div class="relative shrink-0">
            <input
              v-model="customerSearchQuery"
              type="text"
              placeholder="ຄົ້ນຫາຕາມຊື່, ເບີໂທ, ລະຫັດລູກຄ້າ..."
              class="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#5b4cf5] transition"
              autofocus
            >
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
          </div>

          <!-- Customer List Scrollable Area -->
          <div class="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
            <!-- Option: General Customer (Default) -->
            <div
              class="flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer select-none"
              :class="!selectedCustomer
                ? 'border-[#5b4cf5] bg-[#faf9ff]'
                : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'"
              @click="selectCustomer(null)"
            >
              <div class="flex items-center gap-3">
                <span class="grid size-9 place-items-center rounded-xl bg-slate-100 text-sm">👤</span>
                <div>
                  <h4 class="text-xs font-black text-slate-900">ລູກຄ້າທົ່ວໄປ (Default Price)</h4>
                  <p class="text-[0.68rem] text-slate-500">ຂາຍຕາມລາຄາປົກກະຕິ Default (ບໍ່ມີລາຄາກຸ່ມ)</p>
                </div>
              </div>
              <span v-if="!selectedCustomer" class="text-xs font-black text-[#5b4cf5]">✓ ເລືອກແລ້ວ</span>
            </div>

            <!-- List of loaded customers -->
            <div
              v-for="c in filteredCustomers"
              :key="c.id"
              class="flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer select-none"
              :class="selectedCustomer?.id === c.id
                ? 'border-[#5b4cf5] bg-[#faf9ff]'
                : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'"
              @click="selectCustomer(c)"
            >
              <div class="flex items-center gap-3 min-w-0 flex-1">
                <span class="grid size-9 place-items-center rounded-xl bg-purple-50 text-xs font-bold text-[#5b4cf5] shrink-0">
                  {{ (c.name || 'C').slice(0, 2).toUpperCase() }}
                </span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <h4 class="text-xs font-black text-slate-900 truncate">{{ c.name }}</h4>
                    <span
                      v-if="c.group"
                      class="rounded-full px-2 py-0.5 text-[0.62rem] font-bold shrink-0"
                      :class="c.group.discountPercent > 0
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-purple-50 text-[#5b4cf5] border border-purple-200'"
                    >
                      {{ c.group.name }}
                      <template v-if="c.group.discountPercent > 0">
                        (-{{ c.group.discountPercent }}%)
                      </template>
                    </span>
                  </div>
                  <p class="text-[0.68rem] text-slate-500 mt-0.5 truncate">
                    <span v-if="c.phone">📞 {{ c.phone }}</span>
                    <span v-if="c.code" class="ml-2 font-mono text-slate-400">#{{ c.code }}</span>
                  </p>
                </div>
              </div>
              <span v-if="selectedCustomer?.id === c.id" class="text-xs font-black text-[#5b4cf5] shrink-0">
                ✓ ເລືອກແລ້ວ
              </span>
            </div>

            <div
              v-if="filteredCustomers.length === 0"
              class="py-8 text-center text-xs text-slate-400"
            >
              ບໍ່ພົບລູກຄ້າທີ່ກົງກັບຄຳຄົ້ນຫາ
            </div>
          </div>
        </div>

        <!-- TAB 2: QUICK REGISTER CUSTOMER -->
        <div v-else class="flex-1 min-h-0 overflow-y-auto space-y-3.5 pt-1">
          <label class="block">
            <span class="mb-1 block text-xs font-bold text-slate-700">
              ຊື່ລູກຄ້າ <span class="text-rose-500">*</span>
            </span>
            <input
              v-model="quickCustomerForm.name"
              type="text"
              class="admin-field text-xs h-10"
              placeholder="ເຊັ່ນ: ທ້າວ ສົມສັກ, ຮ້ານ ມີໄຊ"
              required
            >
          </label>

          <label class="block">
            <span class="mb-1 block text-xs font-bold text-slate-700">ເບີໂທລະສັບ</span>
            <input
              v-model="quickCustomerForm.phone"
              type="tel"
              class="admin-field text-xs h-10 font-mono"
              placeholder="ເຊັ່ນ: 020 5555 1234"
            >
          </label>

          <label class="block">
            <span class="mb-1 block text-xs font-bold text-slate-700">ກຸ່ມລູກຄ້າ (Customer Group)</span>
            <select
              v-model="quickCustomerForm.groupId"
              class="admin-field text-xs h-10"
            >
              <option value="">ເລືອກກຸ່ມລູກຄ້າ (ຫຼື ປະຫວ່າງໄວ້ເປັນກຸ່ມເລີ່ມຕົ້ນ)...</option>
              <option
                v-for="grp in customerGroups"
                :key="grp.id"
                :value="grp.id"
              >
                {{ grp.name }} {{ grp.discountPercent > 0 ? `(ຫຼຸດ ${grp.discountPercent}%)` : '' }}
              </option>
            </select>
          </label>

          <div class="flex gap-2 pt-2">
            <button
              type="button"
              class="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              @click="isQuickAddingCustomer = false"
            >
              ກັບຄືນ
            </button>
            <button
              type="button"
              class="flex-1 rounded-xl bg-[#5b4cf5] py-2.5 text-xs font-black text-white hover:bg-[#4a3bd9] disabled:opacity-50 transition"
              :disabled="savingQuickCustomer"
              @click="handleQuickAddCustomer"
            >
              <span v-if="savingQuickCustomer">ກຳລັງບັນທຶກ...</span>
              <span v-else>💾 ບັນທຶກ & ເລືອກທັນທີ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
