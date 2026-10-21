<script setup lang="ts">
import { ApiClientError } from '~/services/api-client'
import type { Branch, TenantBusiness } from '~/types/api'

useHead({ title: 'ຈັດການທຸລະກິດ ແລະ ສາຂາ · SmeFlow' })

const auth = useAuthStore()
const api = useApiClient()
const toast = useToast()

const business = ref<TenantBusiness | null>(null)
const branches = ref<Branch[]>([])
const loading = ref(true)
const switchingId = ref<string | null>(null)
const branchSearch = ref('')

// Branch Create Modal State
const showCreateBranchModal = ref(false)
const createBranchSaving = ref(false)
const createBranchForm = reactive({ code: '', name: '' })

// Branch Edit Modal State
const showEditBranchModal = ref(false)
const editBranchSaving = ref(false)
const editingBranchId = ref<string | null>(null)
const editBranchForm = reactive({
  code: '',
  name: '',
  status: 'ACTIVE' as Branch['status'],
})

const canManage = computed(() => auth.hasPermission('branch.manage'))
const canManageBusiness = computed(() => auth.hasPermission('business.manage'))

const messageFrom = (cause: unknown) =>
  cause instanceof ApiClientError ? cause.message : 'ບໍ່ສາມາດດຳເນີນການໄດ້ ກະລຸນາລອງໃໝ່'

const load = async () => {
  loading.value = true
  try {
    const [branchData, bizData] = await Promise.all([
      api.get<Branch[]>('/branches'),
      auth.hasPermission('business.manage') ? api.get<TenantBusiness>('/business') : Promise.resolve(null),
    ])
    branches.value = branchData
    business.value = bizData
  } catch (cause) {
    toast.error('ບໍ່ສາມາດໂຫຼດຂໍ້ມູນໄດ້', messageFrom(cause))
  } finally {
    loading.value = false
  }
}

onMounted(load)

// Switch active workspace
const switchWorkspace = async (businessId: string) => {
  if (businessId === auth.activeBusinessId) return
  switchingId.value = businessId
  try {
    await auth.selectBusiness(businessId)
    toast.success('ປ່ຽນທຸລະກິດສຳເລັດ', 'ກຳລັງໂຫຼດຂໍ້ມູນທຸລະກິດໃໝ່...')
    await load()
  } catch (cause) {
    toast.error('ບໍ່ສາມາດປ່ຽນທຸລະກິດໄດ້', messageFrom(cause))
  } finally {
    switchingId.value = null
  }
}

// Branch actions
const openCreateBranch = () => {
  createBranchForm.code = ''
  createBranchForm.name = ''
  showCreateBranchModal.value = true
}

const submitCreateBranch = async () => {
  if (!createBranchForm.code.trim() || !createBranchForm.name.trim()) return
  createBranchSaving.value = true
  try {
    await api.post<Branch>('/branches', {
      code: createBranchForm.code.trim().toUpperCase(),
      name: createBranchForm.name.trim(),
    })
    showCreateBranchModal.value = false
    toast.success('ສ້າງສາຂາສຳເລັດ', `ເພີ່ມສາຂາ “${createBranchForm.name}” ເຂົ້າໃນລະບົບແລ້ວ`)
    await load()
  } catch (cause) {
    toast.error('ບໍ່ສາມາດສ້າງສາຂາໄດ້', messageFrom(cause))
  } finally {
    createBranchSaving.value = false
  }
}

const openEditBranch = (branch: Branch) => {
  editingBranchId.value = branch.id
  editBranchForm.code = branch.code
  editBranchForm.name = branch.name
  editBranchForm.status = branch.status
  showEditBranchModal.value = true
}

const submitEditBranch = async () => {
  if (!editingBranchId.value || !editBranchForm.code.trim() || !editBranchForm.name.trim()) return
  editBranchSaving.value = true
  try {
    await api.patch<Branch>(`/branches/${editingBranchId.value}`, {
      code: editBranchForm.code.trim().toUpperCase(),
      name: editBranchForm.name.trim(),
      status: editBranchForm.status,
    })
    showEditBranchModal.value = false
    toast.success('ອັບເດດສາຂາສຳເລັດ', `ບັນທຶກຂໍ້ມູນສາຂາ “${editBranchForm.name}” ແລ້ວ`)
    await load()
  } catch (cause) {
    toast.error('ບໍ່ສາມາດອັບເດດສາຂາໄດ້', messageFrom(cause))
  } finally {
    editBranchSaving.value = false
  }
}

// Filtered Branches
const filteredBranches = computed(() => {
  const q = branchSearch.value.trim().toLowerCase()
  if (!q) return branches.value
  return branches.value.filter(
    b => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q),
  )
})
</script>

<template>
  <div class="space-y-6">
    <!-- PAGE HEADER -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-[0.66rem] font-extrabold tracking-[0.14em] text-[#5b4cf5] uppercase">
          Tenant & Workspace Management
        </p>
        <h1 class="mt-1 text-2xl font-black tracking-tight text-ink-950">
          ຈັດການທຸລະກິດ ແລະ ສາຂາ
        </h1>
        <p class="mt-1 text-xs text-ink-500">
          ພາບລວມໂຄງສ້າງທຸລະກິດ, ບັນຊີສາຂາ ແລະ ການຕັ້ງຄ່າທົ່ວໄປທັງໝົດ
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <BaseButton
          v-if="canManageBusiness"
          variant="secondary"
          to="/settings/business/edit"
        >
          <template #icon>
            <AdminIcon name="settings" class="size-4 text-slate-500" />
          </template>
          ແກ້ໄຂຂໍ້ມູນທຸລະກິດ
        </BaseButton>

        <BaseButton
          variant="primary"
          to="/settings/business/new"
        >
          <template #icon>
            <AdminIcon name="plus" class="size-4" />
          </template>
          ເພີ່ມທຸລະກິດໃໝ່
        </BaseButton>
      </div>
    </div>

    <!-- LOADING STATE -->
    <div v-if="loading" class="grid min-h-64 place-items-center rounded-3xl border border-line bg-white shadow-card">
      <div class="flex flex-col items-center gap-3">
        <LoadingSpinner class="size-8 text-[#5b4cf5]" />
        <span class="text-xs font-bold text-slate-500">ກຳລັງໂຫຼດຂໍ້ມູນທຸລະກິດ...</span>
      </div>
    </div>

    <template v-else>
      <!-- TOP SUMMARY STATS CARDS -->
      <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="rounded-2xl border border-line bg-white p-4.5 shadow-card transition hover:shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-[0.68rem] font-bold text-slate-500 uppercase">ທຸລະກິດຫຼັກ</span>
            <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[0.62rem] font-extrabold text-emerald-700">
              ACTIVE
            </span>
          </div>
          <p class="mt-2 text-lg font-black text-ink-950 truncate">
            {{ business?.name || auth.activeBusiness?.name || '—' }}
          </p>
          <p class="mt-0.5 text-[0.68rem] text-slate-400">
            Tenant ID: {{ (business?.id || auth.activeBusinessId)?.slice(0, 8) }}...
          </p>
        </div>

        <div class="rounded-2xl border border-line bg-white p-4.5 shadow-card transition hover:shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-[0.68rem] font-bold text-slate-500 uppercase">ສະກຸນເງິນ & ເຂດເວລາ</span>
            <span class="rounded-full bg-indigo-50 px-2 py-0.5 text-[0.62rem] font-extrabold text-[#5b4cf5]">
              {{ business?.currencyCode || 'LAK' }}
            </span>
          </div>
          <p class="mt-2 text-lg font-black text-ink-950 truncate">
            {{ business?.timezone || 'Asia/Vientiane' }}
          </p>
          <p class="mt-0.5 text-[0.68rem] text-slate-400">
            ຮອງຮັບອັດຕາແລກປ່ຽນຫຼາຍສະກຸນ
          </p>
        </div>

        <div class="rounded-2xl border border-line bg-white p-4.5 shadow-card transition hover:shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-[0.68rem] font-bold text-slate-500 uppercase">ຈຳນວນສາຂາ</span>
            <span class="rounded-full bg-amber-50 px-2 py-0.5 text-[0.62rem] font-extrabold text-amber-700">
              {{ branches.filter(b => b.status === 'ACTIVE').length }} ເປີດໃຊ້ງານ
            </span>
          </div>
          <p class="mt-2 text-lg font-black text-ink-950">
            {{ branches.length }} <span class="text-xs font-normal text-slate-500">ສາຂາທັງໝົດ</span>
          </p>
          <p class="mt-0.5 text-[0.68rem] text-slate-400">
            ຮອງຮັບການແຍກສາງ ແລະ POS
          </p>
        </div>

        <div class="rounded-2xl border border-line bg-white p-4.5 shadow-card transition hover:shadow-md">
          <div class="flex items-center justify-between">
            <span class="text-[0.68rem] font-bold text-slate-500 uppercase">ທຸລະກິດຂອງທ່ານ</span>
            <span class="rounded-full bg-purple-50 px-2 py-0.5 text-[0.62rem] font-extrabold text-purple-700">
              Workspaces
            </span>
          </div>
          <p class="mt-2 text-lg font-black text-ink-950">
            {{ auth.memberships.length }} <span class="text-xs font-normal text-slate-500">ທຸລະກິດ</span>
          </p>
          <p class="mt-0.5 text-[0.68rem] text-slate-400">
            ປ່ຽນ Workspace ໄດ້ຕະຫຼອດເວລາ
          </p>
        </div>
      </section>

      <!-- ACTIVE BUSINESS PROFILE SHOWCASE CARD -->
      <section class="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-7">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
          <div class="flex items-center gap-4">
            <div class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#4a3bd9] via-[#5b4cf5] to-[#7568ff] font-black text-2xl text-white shadow-md shadow-[#5b4cf5]/25">
              {{ (business?.name || auth.activeBusiness?.name || 'S').charAt(0).toUpperCase() }}
            </div>
            <div>
              <div class="flex items-center gap-2.5">
                <h2 class="text-xl font-black text-ink-950">
                  {{ business?.name || auth.activeBusiness?.name }}
                </h2>
                <span class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[0.65rem] font-black text-emerald-700 border border-emerald-200">
                  ກຳລັງໃຊ້ງານ (Active)
                </span>
              </div>
              <p class="mt-1 text-xs text-slate-500">
                ສະກຸນເງິນຫຼັກ: <span class="font-bold text-slate-700">{{ business?.currencyCode }}</span> ·
                ເຂດເວລາ: <span class="font-bold text-slate-700">{{ business?.timezone }}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <BaseButton
              v-if="canManageBusiness"
              variant="secondary"
              to="/settings/business/edit"
            >
              <template #icon>
                <AdminIcon name="edit" class="size-3.5" />
              </template>
              ແກ້ໄຂ Profile
            </BaseButton>
          </div>
        </div>

        <!-- Meta Grid -->
        <div class="mt-6 grid gap-4 sm:grid-cols-3 text-xs">
          <div class="rounded-2xl border border-line/60 bg-canvas/40 p-4">
            <span class="text-[0.68rem] font-bold text-slate-400 block mb-1">ປະເພດລະບົບ</span>
            <span class="font-black text-slate-800">SME Multi-Branch Platform</span>
            <span class="mt-0.5 text-[0.68rem] text-slate-500 block">ແຍກສາງ, ສະຕັອກ, POS, ແລະ ລາຍງານ</span>
          </div>

          <div class="rounded-2xl border border-line/60 bg-canvas/40 p-4">
            <span class="text-[0.68rem] font-bold text-slate-400 block mb-1">ຄວາມປອດໄພຂອງຂໍ້ມູນ</span>
            <span class="font-black text-slate-800 flex items-center gap-1.5">
              <span class="size-2 rounded-full bg-emerald-500"></span>
              Tenant Isolated (RLS Encrypted)
            </span>
            <span class="mt-0.5 text-[0.68rem] text-slate-500 block">ແຍກຖານຂໍ້ມູນຕາມ TenantContext</span>
          </div>

          <div class="rounded-2xl border border-line/60 bg-canvas/40 p-4">
            <span class="text-[0.68rem] font-bold text-slate-400 block mb-1">ວັນທີສ້າງຕັ້ງ</span>
            <span class="font-black text-slate-800">
              {{ business?.createdAt ? new Date(business.createdAt).toLocaleDateString('lo-LA') : '—' }}
            </span>
            <span class="mt-0.5 text-[0.68rem] text-slate-500 block">ລະບົບ Cloud ພ້ອມໃຊ້ງານ</span>
          </div>
        </div>
      </section>

      <!-- USER'S WORKSPACES LIST (SWITCHER) -->
      <section class="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-7">
        <div class="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h2 class="text-base font-black text-ink-950">ທຸລະກິດທັງໝົດຂອງທ່ານ (Your Workspaces)</h2>
            <p class="text-xs text-slate-500">
              ທ່ານສາມາດປ່ຽນສະຫຼັບໄປໃຊ້ງານທຸລະກິດ ຫຼື ຮ້ານຄ້າອື່ນທີ່ທ່ານເປັນສະມາຊິກໄດ້ທັນທີ
            </p>
          </div>
          <BaseButton variant="secondary" size="sm" to="/settings/business/new">
            <template #icon>
              <AdminIcon name="plus" class="size-3.5" />
            </template>
            ເພີ່ມທຸລະກິດ
          </BaseButton>
        </div>

        <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="membership in auth.memberships"
            :key="membership.id"
            class="relative flex flex-col justify-between rounded-2xl border p-4.5 transition-all"
            :class="membership.businessId === auth.activeBusinessId
              ? 'border-[#5b4cf5] bg-[#ecebff]/30 shadow-md shadow-[#5b4cf5]/10 ring-2 ring-[#5b4cf5]/20'
              : 'border-line bg-white hover:border-slate-300 hover:shadow-sm'"
          >
            <div>
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#4a3bd9] to-[#7568ff] font-black text-sm text-white shadow-sm">
                    {{ membership.business.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="min-w-0">
                    <h3 class="font-extrabold text-slate-900 truncate text-sm">
                      {{ membership.business.name }}
                    </h3>
                    <p class="text-[0.68rem] text-slate-500">
                      {{ membership.business.currencyCode }} · {{ membership.business.timezone }}
                    </p>
                  </div>
                </div>

                <span
                  v-if="membership.businessId === auth.activeBusinessId"
                  class="rounded-full bg-[#5b4cf5] px-2 py-0.5 text-[0.6rem] font-black text-white shrink-0"
                >
                  ກຳລັງໃຊ້ງານ
                </span>
              </div>
            </div>

            <div class="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
              <span class="text-[0.65rem] text-slate-400 font-medium">
                {{ membership.allBranches ? 'ເຂົ້າເຖິງທຸກສາຂາ' : 'ຈຳກັດສາຂາ' }}
              </span>

              <button
                v-if="membership.businessId !== auth.activeBusinessId"
                type="button"
                class="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-[#5b4cf5] hover:text-white transition active:scale-95 cursor-pointer"
                :disabled="switchingId === membership.businessId"
                @click="switchWorkspace(membership.businessId)"
              >
                <LoadingSpinner v-if="switchingId === membership.businessId" class="size-3.5" />
                <span>{{ switchingId === membership.businessId ? 'ກຳລັງປ່ຽນ...' : 'ປ່ຽນໄປໃຊ້ງານ' }}</span>
              </button>
            </div>
          </div>

          <!-- Add new business card shortcut -->
          <NuxtLink
            to="/settings/business/new"
            class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-canvas/30 p-6 text-center transition hover:border-[#5b4cf5] hover:bg-white group"
          >
            <div class="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 group-hover:bg-[#ecebff] group-hover:text-[#5b4cf5] transition">
              <AdminIcon name="plus" class="size-5" />
            </div>
            <p class="mt-2 text-xs font-black text-slate-700 group-hover:text-[#5b4cf5]">
              ສ້າງທຸລະກິດໃໝ່ (New Workspace)
            </p>
            <p class="mt-0.5 text-[0.65rem] text-slate-400">
              ເພີ່ມຮ້ານຄ້າ ຫຼື ບໍລິສັດໃໝ່
            </p>
          </NuxtLink>
        </div>
      </section>

      <!-- BRANCH MANAGEMENT SECTION -->
      <section class="rounded-3xl border border-line bg-white p-6 shadow-card sm:p-7">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
          <div>
            <h2 class="text-base font-black text-ink-950">
              ລາຍການສາຂາທັງໝົດ ({{ branches.length }})
            </h2>
            <p class="text-xs text-slate-500">
              ກຳນົດສາຂາຫຼັກ ແລະ ສາຂາຍ່ອຍສຳລັບການແຍກສາງ, ການຂາຍ ແລະ ຜູ້ຮັບຜິດຊອບ
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <div class="relative w-full sm:w-64">
              <AdminIcon name="search" class="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                v-model="branchSearch"
                type="search"
                placeholder="ຄົ້ນຫາຊື່ ຫຼື ລະຫັດສາຂາ..."
                class="h-9 w-full rounded-xl border border-line bg-canvas/40 pr-3 pl-8.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#5b4cf5] focus:bg-white focus:outline-none"
              >
            </div>

            <BaseButton
              v-if="canManage"
              variant="primary"
              size="sm"
              @click="openCreateBranch"
            >
              <template #icon>
                <AdminIcon name="plus" class="size-3.5" />
              </template>
              ເພີ່ມສາຂາໃໝ່
            </BaseButton>
          </div>
        </div>

        <!-- Branches Table -->
        <div class="mt-4 overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="border-b border-line text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th class="p-3">ລະຫັດສາຂາ</th>
                <th class="p-3">ຊື່ສາຂາ</th>
                <th class="p-3">ສະຖານະ</th>
                <th class="p-3">ວັນທີສ້າງ</th>
                <th class="p-3 text-right">ຈັດການ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr
                v-for="branch in filteredBranches"
                :key="branch.id"
                class="hover:bg-slate-50/60 transition"
              >
                <td class="p-3 font-mono font-bold text-slate-700">
                  <span class="rounded bg-slate-100 px-2 py-0.5 text-[0.7rem] border border-slate-200">
                    {{ branch.code }}
                  </span>
                </td>
                <td class="p-3 font-extrabold text-ink-950 flex items-center gap-2">
                  <span>🏢</span>
                  <span>{{ branch.name }}</span>
                  <span
                    v-if="branch.code === 'MAIN'"
                    class="rounded-full bg-indigo-50 px-2 py-0.5 text-[0.6rem] font-black text-[#5b4cf5]"
                  >
                    ສາຂາຫຼັກ
                  </span>
                </td>
                <td class="p-3">
                  <span
                    class="rounded-full px-2.5 py-0.5 text-[0.65rem] font-black"
                    :class="branch.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'"
                  >
                    {{ branch.status === 'ACTIVE' ? 'ໃຊ້ງານ (Active)' : 'ປິດໃຊ້ງານ (Inactive)' }}
                  </span>
                </td>
                <td class="p-3 text-slate-500 text-[0.7rem]">
                  {{ new Date(branch.createdAt).toLocaleDateString('lo-LA') }}
                </td>
                <td class="p-3 text-right">
                  <button
                    v-if="canManage"
                    type="button"
                    class="text-[#5b4cf5] hover:text-[#4a3bd9] font-bold hover:underline cursor-pointer"
                    @click="openEditBranch(branch)"
                  >
                    ແກ້ໄຂ
                  </button>
                </td>
              </tr>

              <tr v-if="!filteredBranches.length">
                <td colspan="5" class="py-8 text-center text-slate-400">
                  ບໍ່ພົບຂໍ້ມູນສາຂາທີ່ຄົ້ນຫາ
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>

    <!-- CREATE BRANCH MODAL -->
    <div
      v-if="showCreateBranchModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
      @click.self="showCreateBranchModal = false"
    >
      <div class="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <header class="flex items-center justify-between border-b border-line pb-3.5">
          <h2 class="text-base font-black text-slate-900">ເພີ່ມສາຂາໃໝ່</h2>
          <button
            type="button"
            class="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            @click="showCreateBranchModal = false"
          >
            ✕
          </button>
        </header>

        <form class="mt-5 space-y-4" @submit.prevent="submitCreateBranch">
          <label class="block">
            <span class="mb-1.5 block text-xs font-bold text-slate-700">ລະຫັດສາຂາ (Branch Code) *</span>
            <input
              v-model="createBranchForm.code"
              required
              maxlength="40"
              placeholder="ເຊັ່ນ: BRANCH-02, DONGDOK"
              class="admin-field uppercase font-mono"
            >
            <span class="mt-1 block text-[0.65rem] text-slate-400">ໃຊ້ເປັນລະຫັດອ້າງອີງສາງ ແລະ ໃບບິນ</span>
          </label>

          <label class="block">
            <span class="mb-1.5 block text-xs font-bold text-slate-700">ຊື່ສາຂາ (Branch Name) *</span>
            <input
              v-model="createBranchForm.name"
              required
              maxlength="160"
              placeholder="ເຊັ່ນ: ສາຂາດົງໂດກ, ສາຂາວຽງຈັນເຊັນເຕີ"
              class="admin-field"
            >
          </label>

          <footer class="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
            <BaseButton
              variant="secondary"
              type="button"
              :disabled="createBranchSaving"
              @click="showCreateBranchModal = false"
            >
              ຍົກເລີກ
            </BaseButton>
            <BaseButton
              variant="primary"
              type="submit"
              :loading="createBranchSaving"
            >
              ບັນທຶກສາຂາ
            </BaseButton>
          </footer>
        </form>
      </div>
    </div>

    <!-- EDIT BRANCH MODAL -->
    <div
      v-if="showEditBranchModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
      @click.self="showEditBranchModal = false"
    >
      <div class="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <header class="flex items-center justify-between border-b border-line pb-3.5">
          <h2 class="text-base font-black text-slate-900">ແກ້ໄຂສາຂາ</h2>
          <button
            type="button"
            class="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            @click="showEditBranchModal = false"
          >
            ✕
          </button>
        </header>

        <form class="mt-5 space-y-4" @submit.prevent="submitEditBranch">
          <label class="block">
            <span class="mb-1.5 block text-xs font-bold text-slate-700">ລະຫັດສາຂາ *</span>
            <input
              v-model="editBranchForm.code"
              required
              maxlength="40"
              class="admin-field uppercase font-mono"
            >
          </label>

          <label class="block">
            <span class="mb-1.5 block text-xs font-bold text-slate-700">ຊື່ສາຂາ *</span>
            <input
              v-model="editBranchForm.name"
              required
              maxlength="160"
              class="admin-field"
            >
          </label>

          <label class="flex items-center gap-2 pt-1 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              v-model="editBranchForm.status"
              type="checkbox"
              true-value="ACTIVE"
              false-value="INACTIVE"
              class="size-4 accent-[#5b4cf5] rounded"
            >
            <span>ເປີດໃຊ້ງານສາຂານີ້ (Active Status)</span>
          </label>

          <footer class="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
            <BaseButton
              variant="secondary"
              type="button"
              :disabled="editBranchSaving"
              @click="showEditBranchModal = false"
            >
              ຍົກເລີກ
            </BaseButton>
            <BaseButton
              variant="primary"
              type="submit"
              :loading="editBranchSaving"
            >
              ບັນທຶກການແກ້ໄຂ
            </BaseButton>
          </footer>
        </form>
      </div>
    </div>
  </div>
</template>
