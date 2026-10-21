<script setup lang="ts">
import type { DataTableColumn, PlanFeature, SelectOption, SortState, TabItem } from '~/types/ui'
import type { TenantAuditLog, TenantRole } from '~/types/api'

useHead({ title: 'Design System & Component Library' })

const { t } = useI18n()
const toast = useToast()

// Tabs
const activeTab = ref('layout')
const tabs: TabItem[] = [
  { key: 'layout', label: 'Layout' },
  { key: 'data', label: 'Data' },
  { key: 'forms', label: 'Forms' },
  { key: 'overlay', label: 'Overlay' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'business', label: 'Business' },
  { key: 'security', label: 'Security' },
]

// Data table state
const tableSearch = ref('')
const tablePage = ref(1)
const tableSort = ref<SortState>(null)
const selectedRows = ref<string[]>([])
const tableColumns: DataTableColumn[] = [
  { key: 'id', label: '#', align: 'left', class: 'w-12 font-mono' },
  { key: 'name', label: 'ທຸລະກິດ (Business)', sortable: true },
  { key: 'owner', label: 'ເຈົ້າຂອງ (Owner)' },
  { key: 'plan', label: 'ແຜນ (Plan)', sortable: true },
  { key: 'status', label: 'ສະຖານະ (Status)' },
]
const mockRows = ref([
  { id: '1', name: 'Sabaidee Coffee', owner: 'Bounmy S.', plan: 'Pro', status: 'ACTIVE' },
  { id: '2', name: 'Mekong Mini Mart', owner: 'Manivanh K.', plan: 'Business', status: 'ACTIVE' },
  { id: '3', name: 'Vientiane Service', owner: 'Somphone V.', plan: 'Starter', status: 'PENDING' },
  { id: '4', name: 'Lao Fashion Store', owner: 'Dala P.', plan: 'Pro', status: 'INACTIVE' },
  { id: '5', name: 'Green Farm Laos', owner: 'Vieng S.', plan: 'Business', status: 'ACTIVE' },
])

// Form state
const textInput = ref('Sabaidee Coffee')
const selectValue = ref('restaurant')
const selectOptions: SelectOption[] = [
  { value: 'restaurant', label: 'ຮ້ານອາຫານ / ເຄື່ອງດື່ມ' },
  { value: 'retail', label: 'ຮ້ານຄ້າຂາຍຍ່ອຍ' },
  { value: 'service', label: 'ບໍລິການ' },
]
const dateValue = ref('2026-10-15')
const checkboxValue = ref(true)
const switchValue = ref(true)
const uploadedFile = ref<File | null>(null)
const currencyAmount = ref('18420.00')

// Overlay state
const showModal = ref(false)
const showDrawer = ref(false)
const showConfirm = ref(false)

// Business plan state
const sampleFeatures: PlanFeature[] = [
  { label: 'ຈັດການສິນຄ້າບໍ່ຈຳກັດ' },
  { label: 'ຫຼາຍສາຂາ (Multi-branch)' },
  { label: 'ລະບົບລາຍງານຂັ້ນສູງ' },
  { label: 'API Integration', included: false },
]

// Security state
const sampleRoles: TenantRole[] = [
  { id: 'role-1', businessId: 'b1', code: 'OWNER', name: 'ເຈົ້າຂອງ (Owner)', isSystem: true, createdAt: '', updatedAt: '', permissions: [{ permissionCode: 'all' }], _count: { members: 1 } },
  { id: 'role-2', businessId: 'b1', code: 'MANAGER', name: 'ຜູ້ຈັດການ (Manager)', isSystem: false, createdAt: '', updatedAt: '', permissions: [{ permissionCode: 'catalog' }, { permissionCode: 'orders' }], _count: { members: 3 } },
  { id: 'role-3', businessId: 'b1', code: 'CASHIER', name: 'ພະນັກງານຂາຍ (Cashier)', isSystem: false, createdAt: '', updatedAt: '', permissions: [{ permissionCode: 'pos' }], _count: { members: 5 } },
]
const selectedRoleIds = ref<string[]>(['role-2'])

const sampleLogs: TenantAuditLog[] = [
  { id: 'log-1', action: 'PRODUCT_CREATE', entityType: 'Product', entityId: 'p-1', before: null, after: null, requestId: 'r1', createdAt: new Date().toISOString(), user: { id: 'u1', displayName: 'Admin Demo' } },
  { id: 'log-2', action: 'BRANCH_UPDATE', entityType: 'Branch', entityId: 'b-1', before: null, after: null, requestId: 'r2', createdAt: new Date(Date.now() - 3600000).toISOString(), user: { id: 'u2', displayName: 'Somsak V.' } },
]
</script>

<template>
  <div class="space-y-8">
    <PageHeader
      title="UI Component Library & Theme System"
      eyebrow="SmeFlow Design System"
      description="ລະບົບ Components ທີ່ແຍກຕາມ 7 ກຸ່ມມາດຕະຖານ ເພື່ອໃຫ້ທັງລະບົບໃຊ້ theme ດຽວກັນແບບສະເໝີພາບ"
      :breadcrumbs="[{ label: t('nav.dashboard'), to: '/dashboard' }, { label: 'Design System' }]"
    >
      <template #actions>
        <BaseButton variant="primary" @click="toast.success('ທົດສອບ Toast ສຳເລັດ!', 'ລະບົບ Toast ເຮັດວຽກປົກກະຕິ')">
          <template #icon><AdminIcon name="check" class="size-4" /></template>
          ທົດສອບ Toast
        </BaseButton>
      </template>
    </PageHeader>

    <!-- Category Tabs -->
    <BaseTabs v-model="activeTab" :tabs="tabs" />

    <!-- 1. LAYOUT GROUP -->
    <section v-if="activeTab === 'layout'" class="space-y-6">
      <BaseCard title="1. Layout Group Components" subtitle="Sidebar, Navbar, Breadcrumb, PageHeader">
        <div class="space-y-6">
          <div>
            <h4 class="mb-2 text-xs font-bold text-ink-500 uppercase tracking-wider">AppBreadcrumb</h4>
            <AppBreadcrumb :items="[{ label: 'ໜ້າຫຼັກ', to: '/dashboard' }, { label: 'ຕັ້ງຄ່າ', to: '/settings/business' }, { label: 'ຈັດການສາຂາ' }]" />
          </div>

          <div>
            <h4 class="mb-2 text-xs font-bold text-ink-500 uppercase tracking-wider">PageHeader (ຕົວຢ່າງ)</h4>
            <div class="rounded-2xl border border-line bg-canvas/40 p-4">
              <PageHeader
                title="ຈັດການຂໍ້ມູນທຸລະກິດ"
                eyebrow="Settings"
                description="ແກ້ໄຂຊື່ທຸລະກິດ, ສະກຸນເງິນ, ທີ່ຢູ່ ແລະ ຂໍ້ມູນຕິດຕໍ່"
              >
                <template #actions>
                  <BaseButton variant="secondary">ຍົກເລີກ</BaseButton>
                  <BaseButton variant="primary">ບັນທຶກ</BaseButton>
                </template>
              </PageHeader>
            </div>
          </div>
        </div>
      </BaseCard>
    </section>

    <!-- 2. DATA GROUP -->
    <section v-else-if="activeTab === 'data'" class="space-y-6">
      <BaseCard title="2. Data Group Components" subtitle="DataTable, Pagination, SearchInput, FilterBar, Sort">
        <div class="space-y-4">
          <FilterBar v-model:search="tableSearch" search-placeholder="ຄົ້ນຫາຊື່ທຸລະກິດ...">
            <template #actions>
              <BaseButton variant="secondary" size="sm">
                <template #icon><AdminIcon name="filter" class="size-3.5" /></template>
                ຕົວກອງ
              </BaseButton>
            </template>
          </FilterBar>

          <div class="rounded-2xl border border-line overflow-hidden">
            <DataTable
              v-model:selected="selectedRows"
              v-model:sort="tableSort"
              :columns="tableColumns"
              :rows="mockRows"
              selectable
            >
              <template #cell-status="{ value }">
                <StatusBadge :status="String(value)" />
              </template>
              <template #actions="{ row }">
                <div class="flex items-center justify-end gap-1">
                  <BaseButton variant="ghost" size="sm" @click="toast.info(`ກວດເບິ່ງ: ${row.name}`)">
                    <AdminIcon name="eye" class="size-4" />
                  </BaseButton>
                  <BaseButton variant="ghost" size="sm" @click="toast.info(`ແກ້ໄຂ: ${row.name}`)">
                    <AdminIcon name="edit" class="size-4" />
                  </BaseButton>
                </div>
              </template>
            </DataTable>
          </div>

          <Pagination v-model="tablePage" :total="48" :page-size="5" />
        </div>
      </BaseCard>
    </section>

    <!-- 3. FORMS GROUP -->
    <section v-else-if="activeTab === 'forms'" class="space-y-6">
      <BaseCard title="3. Forms Group Components" subtitle="Input, Select, DatePicker, Checkbox, Switch, FileUpload">
        <div class="grid gap-6 md:grid-cols-2">
          <BaseInput v-model="textInput" label="ຊື່ທຸລະກິດ *" hint="ຊື່ທີ່ສະແດງໃນໃບບິນ" placeholder="ປ້ອນຊື່ທຸລະກິດ...">
            <template #icon><AdminIcon name="building" class="size-4" /></template>
          </BaseInput>

          <BaseSelect v-model="selectValue" :options="selectOptions" label="ປະເພດທຸລະກິດ *" />

          <DatePicker v-model="dateValue" label="ວັນທີເປີດທຸລະກິດ" />

          <CurrencyInput v-model="currencyAmount" label="ຍອດເງິນລາຍເດືອນ" currency="USD" />

          <div class="space-y-3">
            <label class="block text-xs font-bold text-ink-900">ຕົວເລືອກຕ່າງໆ</label>
            <BaseCheckbox v-model="checkboxValue" label="ເປີດຮັບການແຈ້ງເຕືອນຜ່ານອີເມວ" />
            <BaseSwitch v-model="switchValue" label="ເປີດໃຊ້ງານສະຖານະ Active" />
          </div>

          <FileUpload v-model="uploadedFile" label="ໂລໂກ້ທຸລະກິດ" hint="PNG, JPG ຂະໜາດບໍ່ເກີນ 5MB" accept="image/*" />
        </div>
      </BaseCard>
    </section>

    <!-- 4. OVERLAY GROUP -->
    <section v-else-if="activeTab === 'overlay'" class="space-y-6">
      <BaseCard title="4. Overlay Group Components" subtitle="Modal, Drawer, ConfirmDialog, Popover">
        <div class="flex flex-wrap items-center gap-3">
          <BaseButton variant="primary" @click="showModal = true">ເປີດ Modal</BaseButton>
          <BaseButton variant="secondary" @click="showDrawer = true">ເປີດ Drawer</BaseButton>
          <BaseButton variant="danger" @click="showConfirm = true">ເປີດ Confirm Dialog</BaseButton>

          <BasePopover align="left">
            <template #trigger="{ toggle }">
              <BaseButton variant="secondary" @click="toggle">
                ເມນູ Popover ▼
              </BaseButton>
            </template>
            <template #default="{ close }">
              <div class="p-1 space-y-1">
                <button type="button" class="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-canvas" @click="close(); toast.info('Export PDF')">Export PDF</button>
                <button type="button" class="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg hover:bg-canvas" @click="close(); toast.info('Export Excel')">Export Excel</button>
              </div>
            </template>
          </BasePopover>
        </div>

        <!-- BaseModal Instance -->
        <BaseModal v-model="showModal" title="ຕົວຢ່າງ Modal" description="ກ່ອງຂໍ້ຄວາມ Modal ແບບຕອບສະໜອງ">
          <p class="text-sm text-ink-700">ນີ້ແມ່ນເນື້ອຫາພາຍໃນ Modal ທີ່ໃຊ້ theme tokens ດຽວກັນກັບທັງເວັບໄຊ.</p>
          <template #footer="{ close }">
            <BaseButton variant="secondary" @click="close">ປິດ</BaseButton>
            <BaseButton variant="primary" @click="close">ບັນທຶກ</BaseButton>
          </template>
        </BaseModal>

        <!-- BaseDrawer Instance -->
        <BaseDrawer v-model="showDrawer" title="ຕົວຢ່າງ Drawer" description="Drawer ເລື່ອນອອກມາຈາກຂວາມື">
          <div class="space-y-4">
            <BaseInput label="ຫົວຂໍ້ດ່ວນ" placeholder="ປ້ອນຂໍ້ມູນ..." />
            <BaseSelect label="ສະຖານະ" :options="selectOptions" />
          </div>
          <template #footer="{ close }">
            <BaseButton variant="secondary" @click="close">ປິດ</BaseButton>
            <BaseButton variant="primary" @click="close">ບັນທຶກ</BaseButton>
          </template>
        </BaseDrawer>

        <!-- ConfirmDialog Instance -->
        <ConfirmDialog
          v-model="showConfirm"
          title="ຢືນຢັນການລຶບ?"
          message="ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການດຳເນີນການນີ້? ຂໍ້ມູນຈະບໍ່ສາມາດກູ້ຄືນໄດ້."
          tone="danger"
          confirm-label="ຢືນຢັນລຶບ"
          @confirm="toast.error('ລຶບຂໍ້ມູນສຳເລັດ')"
        />
      </BaseCard>
    </section>

    <!-- 5. FEEDBACK GROUP -->
    <section v-else-if="activeTab === 'feedback'" class="space-y-6">
      <BaseCard title="5. Feedback Group Components" subtitle="Toast, Alert, Skeleton, EmptyState">
        <div class="space-y-6">
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-ink-500 uppercase tracking-wider">BaseAlert Variations</h4>
            <BaseAlert tone="success" title="ສຳເລັດ">ບັນທຶກຂໍ້ມູນທຸລະກິດຮຽບຮ້ອຍແລ້ວ</BaseAlert>
            <BaseAlert tone="warning" title="ຄຳເຕືອນ">ກະລຸນາກວດສອບເອກະສານກ່ອນໝົດອາຍຸ</BaseAlert>
            <BaseAlert tone="danger" title="ຜິດພາດ" dismissible>ບໍ່ສາມາດເຊື່ອມຕໍ່ກັບເຊີບເວີໄດ້</BaseAlert>
            <BaseAlert tone="info" title="ແຈ້ງການ">ລະບົບຈະອັບເດດໃນຄືນວັນເສົາ</BaseAlert>
          </div>

          <div>
            <h4 class="mb-2 text-xs font-bold text-ink-500 uppercase tracking-wider">Skeleton Loader</h4>
            <div class="space-y-2">
              <SkeletonBlock class="h-4 w-3/4" />
              <SkeletonBlock class="h-4 w-1/2" />
              <SkeletonBlock class="h-10 w-full" rounded="lg" />
            </div>
          </div>

          <div>
            <h4 class="mb-2 text-xs font-bold text-ink-500 uppercase tracking-wider">EmptyState</h4>
            <div class="rounded-2xl border border-line bg-canvas/30">
              <EmptyState title="ຍັງບໍ່ມີຂໍ້ມູນສິນຄ້າ" description="ກະລຸນາກົດປຸ່ມດ້ານລຸ່ມເພື່ອເພີ່ມສິນຄ້າໃໝ່">
                <BaseButton variant="primary" size="sm">+ ເພີ່ມສິນຄ້າ</BaseButton>
              </EmptyState>
            </div>
          </div>
        </div>
      </BaseCard>
    </section>

    <!-- 6. BUSINESS GROUP -->
    <section v-else-if="activeTab === 'business'" class="space-y-6">
      <BaseCard title="6. Business Group Components" subtitle="StatCard, StatusBadge, CurrencyInput, PlanCard, TenantSwitcher">
        <div class="space-y-6">
          <div>
            <h4 class="mb-3 text-xs font-bold text-ink-500 uppercase tracking-wider">StatCard (KPI Card with Background Wave & Bars)</h4>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Businesses"
                value="248"
                change="↑ 12.5%"
                change-note="from last month"
                icon="building"
                color-theme="indigo"
              />
              <StatCard
                title="Active Businesses"
                value="216"
                change="↑ 8.2%"
                change-note="from last month"
                icon="users"
                color-theme="emerald"
              />
              <StatCard
                title="Monthly Revenue"
                value="$18,420"
                change="↑ 18.4%"
                change-note="from last month"
                icon="card"
                color-theme="amber"
              />
              <StatCard
                title="Total Users"
                value="1,284"
                change="↑ 6.3%"
                change-note="from last month"
                icon="users"
                color-theme="sky"
              />
            </div>
          </div>
          <div>
            <h4 class="mb-2 text-xs font-bold text-ink-500 uppercase tracking-wider">StatusBadge Variations</h4>
            <div class="flex flex-wrap gap-2">
              <StatusBadge status="ACTIVE" />
              <StatusBadge status="PENDING" />
              <StatusBadge status="INACTIVE" />
              <StatusBadge status="SUSPENDED" />
              <StatusBadge status="COMPLETED" />
              <StatusBadge status="IN_TRANSIT" />
            </div>
          </div>

          <div>
            <h4 class="mb-3 text-xs font-bold text-ink-500 uppercase tracking-wider">PlanCard Examples</h4>
            <div class="grid gap-5 md:grid-cols-3">
              <PlanCard
                name="Starter"
                price="9.00"
                currency="USD"
                period="ເດືອນ"
                description="ເໝາະສຳລັບທຸລະກິດຂະໜາດນ້ອຍ"
                :features="sampleFeatures"
                @select="toast.success('ເລືອກແຜນ Starter')"
              />
              <PlanCard
                name="Business"
                price="29.00"
                currency="USD"
                period="ເດືອນ"
                highlighted
                description="ເໝາະສຳລັບທຸລະກິດກຳລັງເຕີບໂຕ"
                :features="sampleFeatures"
                @select="toast.success('ເລືອກແຜນ Business')"
              />
              <PlanCard
                name="Pro"
                price="79.00"
                currency="USD"
                period="ເດືອນ"
                description="ສຳລັບທຸລະກິດຂະໜາດໃຫຍ່"
                :features="sampleFeatures"
                @select="toast.success('ເລືອກແຜນ Pro')"
              />
            </div>
          </div>
        </div>
      </BaseCard>
    </section>

    <!-- 7. SECURITY GROUP -->
    <section v-else-if="activeTab === 'security'" class="space-y-6">
      <BaseCard title="7. Security Group Components" subtitle="PermissionGuard, RoleSelector, AuditLog">
        <div class="space-y-6">
          <div>
            <h4 class="mb-2 text-xs font-bold text-ink-500 uppercase tracking-wider">RoleSelector</h4>
            <RoleSelector v-model="selectedRoleIds" :roles="sampleRoles" label="ເລືອກບົດບາດຜູ້ໃຊ້" />
          </div>

          <div>
            <h4 class="mb-2 text-xs font-bold text-ink-500 uppercase tracking-wider">AuditLog</h4>
            <div class="rounded-2xl border border-line bg-white overflow-hidden">
              <AuditLog :logs="sampleLogs" />
            </div>
          </div>
        </div>
      </BaseCard>
    </section>
  </div>
</template>
