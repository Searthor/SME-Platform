export type ApiSuccess<T> = {
  success: true
  data: T
  meta: { requestId?: string }
}

export type ApiFailure = {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
  meta?: { requestId?: string }
}

export type AuthSession = {
  accessToken: string
  expiresIn: number
  csrfToken: string
}

export type PublicUser = {
  id: string
  displayName: string
  locale: string
  status: 'ACTIVE' | 'DISABLED'
  platformRole: 'USER' | 'SUPERADMIN'
  createdAt: string
}

export type PlatformSettings = {
  id: string
  platformName: string
  supportEmail: string | null
  defaultLocale: string
  defaultCurrencyCode: 'LAK' | 'THB' | 'USD'
  defaultTimezone: string
  allowRegistration: boolean
  version: number
  updatedAt: string
}

export type PlatformBusiness = BusinessSummary & {
  createdAt: string
  updatedAt: string
  _count: { branches: number; members: number }
}

export type BusinessSummary = {
  id: string
  name: string
  currencyCode: string
  timezone: string
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED'
}

export type Membership = {
  id: string
  businessId: string
  userId: string
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED'
  allBranches: boolean
  authorizationVersion: number
  business: BusinessSummary
  branchAccess: Array<{ branchId: string }>
}

export type AuthMe = {
  user: PublicUser
  memberships: Membership[]
}

export type Branch = {
  id: string
  businessId: string
  code: string
  name: string
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
}

export type TenantBusiness = BusinessSummary & {
  createdAt: string
  updatedAt: string
}

export type Permission = {
  code: string
  description: string
  module: string
}

export type TenantRole = {
  id: string
  businessId: string
  code: string
  name: string
  isSystem: boolean
  createdAt: string
  updatedAt: string
  permissions: Array<{ permissionCode: string }>
  _count: { members: number }
}

export type TenantMember = {
  id: string
  businessId: string
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED'
  allBranches: boolean
  authorizationVersion: number
  createdAt: string
  user: {
    id: string
    displayName: string
    locale: string
    status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED'
    identities: Array<{ type: 'EMAIL' | 'PHONE'; normalizedValue: string; verifiedAt: string | null }>
  }
  branchAccess: Array<{ branchId: string }>
  roles: Array<{ role: Pick<TenantRole, 'id' | 'code' | 'name' | 'isSystem'> }>
}

export type BusinessInvitation = {
  id: string
  businessId: string
  identityType: 'EMAIL' | 'PHONE'
  normalizedIdentity: string
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED'
  allBranches: boolean
  expiresAt: string
  acceptedAt: string | null
  createdAt: string
  token?: string
  branchAccess: Array<{ branchId: string }>
  roles: Array<{ role: Pick<TenantRole, 'id' | 'code' | 'name' | 'isSystem'> }>
}

export type InvitationPreview = {
  businessName: string
  identityType: 'EMAIL' | 'PHONE'
  normalizedIdentity: string
  expiresAt: string
  accountExists: boolean
}

export type UserSessionSummary = {
  id: string
  deviceName: string | null
  ipAddress: string | null
  userAgent: string | null
  lastUsedAt: string | null
  expiresAt: string
  createdAt: string
  current: boolean
}

export type TenantAuditLog = {
  id: string
  action: string
  entityType: string
  entityId: string | null
  before: unknown
  after: unknown
  requestId: string | null
  createdAt: string
  user: { id: string; displayName: string } | null
}

export type CatalogCategory = {
  id: string
  businessId: string
  parentId: string | null
  name: string
  archivedAt: string | null
}

export type CatalogUnit = {
  id: string
  businessId: string
  code: string
  name: string
  decimalPlaces: number
  active: boolean
}

export type ProductVariantGroupPrice = {
  id?: string
  customerGroupId: string
  price: string
  customerGroup?: { id: string; name: string; code: string }
}

export type ProductVariant = {
  id: string
  name: string | null
  size: string | null
  color: string | null
  sku: string | null
  cost: string
  sellingPrice: string
  minStock: string
  stock?: string
  isDefault: boolean
  active: boolean
  barcodes: Array<{ id: string; barcode: string }>
  groupPrices?: ProductVariantGroupPrice[]
}

export type PackagingUnit = {
  id: string
  unitId: string
  conversionRate: string
  sellingPrice: string | null
  barcode: string | null
  unit?: { id: string; code: string; name: string; decimalPlaces: number }
}

export type Product = {
  id: string
  businessId: string
  name: string
  description: string | null
  categoryId: string | null
  unitId: string
  trackStock: boolean
  taxCode: string | null
  active: boolean
  archivedAt: string | null
  version: number
  totalStock?: string | null
  category: { id: string; name: string } | null
  unit: { id: string; code: string; name: string; decimalPlaces: number }
  packagingUnits: PackagingUnit[]
  variants: ProductVariant[]
}

export type ProductList = { items: Product[]; total: number; page: number; limit: number }

export type CustomerGroup = {
  id: string
  name: string
  code: string
  description?: string | null
  discountPercent: number
  isDefault: boolean
  active: boolean
  customerCount?: number
  boundProductsCount?: number
  createdAt?: string
  updatedAt?: string
}

export type PriceGroup = CustomerGroup

export type GroupBoundProduct = {
  id: string
  variantId: string
  customerGroupId: string
  groupPrice: string
  productId: string
  productName: string
  variantName: string
  size?: string
  color?: string
  sku?: string
  normalPrice: string
  cost: string
  unitName: string
  categoryName: string
  barcodes: string[]
}

export type Customer = {
  id: string
  groupId?: string | null
  code?: string | null
  name: string
  phone?: string | null
  email?: string | null
  taxNumber?: string | null
  address?: string | null
  creditLimit?: string
  notes?: string | null
  active: boolean
  group?: {
    id: string
    name: string
    code: string
    discountPercent: number
  } | null
  createdAt?: string
  updatedAt?: string
}

export type CustomerList = {
  items: Customer[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type PromotionType = 'DISCOUNT' | 'BUY_X_GET_Y' | 'BUNDLE_CROSS' | 'BILL_TOTAL'
export type PromotionRewardType = 'DISCOUNT_PERCENT' | 'DISCOUNT_AMOUNT' | 'SPECIAL_PRICE' | 'FREE_ITEM'

export type PromotionItem = {
  id: string
  promotionId: string
  productId?: string | null
  variantId?: string | null
  unitId?: string | null
  categoryId?: string | null
  isTrigger: boolean
  product?: { id: string; name: string } | null
  variant?: { id: string; name: string; sku?: string } | null
  unit?: { id: string; name: string } | null
  category?: { id: string; name: string } | null
}

export type Promotion = {
  id: string
  businessId: string
  code: string
  name: string
  description?: string | null
  type: PromotionType
  startDate: string
  endDate: string
  startTime?: string | null
  endTime?: string | null
  daysOfWeek: number[]
  minQuantity: string
  minAmount: string
  rewardType: PromotionRewardType
  discountValue: string
  rewardQuantity: string
  rewardDiscountPercent: string
  rewardProductId?: string | null
  rewardVariantId?: string | null
  rewardUnitId?: string | null
  rewardProduct?: { id: string; name: string } | null
  rewardVariant?: { id: string; name: string; sku?: string } | null
  rewardUnit?: { id: string; name: string } | null
  maxDiscountCap?: string | null
  usageLimit?: number | null
  usedCount: number
  active: boolean
  branchId?: string | null
  customerGroupId?: string | null
  items: PromotionItem[]
  createdAt?: string
  updatedAt?: string
}

export type PromotionList = {
  items: Promotion[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type CartEvaluationResult = {
  appliedPromotions: Array<{
    id: string
    name: string
    code: string
    type: string
    discountAmount: string
    description: string
  }>
  lineDiscounts: Record<string, string>
  freeGifts: Array<{
    promotionId: string
    promotionName: string
    variantId: string
    productId?: string
    unitId?: string
    quantity: string
    unitPrice: string
    discountAmount: string
  }>
  billDiscount: string
  totalDiscount: string
}


type RefSummary = { id: string; name: string; code: string }
export type SalePaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'OTHER'

export type PosSaleListItem = {
  id: string
  saleNumber: string
  branchId: string
  branch: RefSummary
  warehouseId: string
  warehouse: RefSummary
  customerName: string | null
  currencyCode: string
  subtotal: string
  discountAmount: string
  grandTotal: string
  paidAmount: string
  changeAmount: string
  lifecycleStatus: 'COMPLETED' | 'CANCELLED'
  paymentStatus: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID'
  itemCount: number
  payments: Array<{ method: SalePaymentMethod; amount: string }>
  soldAt: string
}

export type PosSaleList = { items: PosSaleListItem[]; total: number; page: number; limit: number; totalPages: number }

export type PosSale = Omit<PosSaleListItem, 'itemCount' | 'payments'> & {
  sessionId: string | null
  session: { id: string; sessionNumber: string; status: 'OPEN' | 'CLOSED' } | null
  customerId: string | null
  cashierUserId: string
  notes: string | null
  items: Array<{
    id: string
    variantId: string
    productName: string
    variantName: string | null
    sku: string | null
    unitName: string
    quantity: string
    unitCost: string
    unitPrice: string
    discountAmount: string
    subtotal: string
    totalAmount: string
  }>
  payments: Array<{
    id: string
    method: SalePaymentMethod
    amount: string
    tenderedAmount: string | null
    changeAmount: string | null
    reference: string | null
    paidAt: string
  }>
}

export type PosSessionListItem = {
  id: string
  sessionNumber: string
  branchId: string
  branch: RefSummary
  registerId: string
  register: RefSummary
  status: 'OPEN' | 'CLOSED'
  openedAt: string
  closedAt: string | null
  openingCash: string
  closingCashCount: string | null
  expectedCash: string | null
  cashDifference: string | null
  totalSalesCount: number
  totalNetSales: string
  totalCashSales: string
  totalBankSales: string
  notes: string | null
}

export type PosSessionList = { items: PosSessionListItem[]; total: number; limit: number; offset: number }

export type PosSessionSummary = {
  sessionId: string
  sessionNumber: string
  status: 'OPEN' | 'CLOSED'
  branch: { id: string; name: string }
  register: { id: string; name: string; code: string }
  openedBy: { id: string; name?: string }
  closedBy?: { id: string; name?: string } | null
  openedAt: string
  closedAt?: string | null
  openingCash: string
  cashIn: string
  cashOut: string
  netCashMovements: string
  salesCount: number
  grossSales: string
  totalDiscount: string
  netSales: string
  cashSales: string
  bankSales: string
  otherSales: string
  expectedCash: string
  closingCashCount?: string | null
  cashDifference?: string | null
  notes?: string | null
  cashMovements: Array<{ id: string; type: 'CASH_IN' | 'CASH_OUT'; amount: string; reason: string; createdAt: string }>
}
