<script setup lang="ts">
import { ApiClientError } from '~/services/api-client'
import type { Permission, TenantRole } from '~/types/api'

useHead({ title: 'Role ແລະ Permission' })

const auth = useAuthStore()
const api = useApiClient()
const permissions = ref<Permission[]>([])
const roles = ref<TenantRole[]>([])
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const selectedRoleId = ref<string | null>(null)
const createForm = reactive({ code: '', name: '', permissionCodes: [] as string[] })
const editForm = reactive({ name: '', permissionCodes: [] as string[] })

const canManage = computed(() => auth.hasPermission('role.manage'))
const selectedRole = computed(() => roles.value.find(role => role.id === selectedRoleId.value) ?? null)
const groupedPermissions = computed(() => {
  const groups: Record<string, Permission[]> = {}
  for (const permission of permissions.value) (groups[permission.module] ??= []).push(permission)
  return Object.entries(groups)
})
const messageFrom = (cause: unknown) => cause instanceof ApiClientError ? cause.message : 'ບໍ່ສາມາດດຳເນີນການໄດ້'

const load = async () => {
  loading.value = true
  try {
    [permissions.value, roles.value] = await Promise.all([
      api.get<Permission[]>('/access-control/permissions'),
      api.get<TenantRole[]>('/access-control/roles'),
    ])
  }
  catch (cause) {
    errorMessage.value = messageFrom(cause)
  }
  finally {
    loading.value = false
  }
}

onMounted(load)

const chooseRole = (role: TenantRole) => {
  selectedRoleId.value = role.id
  editForm.name = role.name
  editForm.permissionCodes = role.permissions.map(item => item.permissionCode)
}

const createRole = async () => {
  saving.value = true
  errorMessage.value = ''
  try {
    await api.post<TenantRole>('/access-control/roles', createForm)
    createForm.code = ''
    createForm.name = ''
    createForm.permissionCodes = []
    successMessage.value = 'ສ້າງ Role ແລ້ວ'
    await load()
  }
  catch (cause) {
    errorMessage.value = messageFrom(cause)
  }
  finally {
    saving.value = false
  }
}

const updateRole = async () => {
  if (!selectedRole.value || selectedRole.value.isSystem) return
  saving.value = true
  errorMessage.value = ''
  try {
    await api.patch<TenantRole>(`/access-control/roles/${selectedRole.value.id}`, editForm)
    successMessage.value = 'ອັບເດດ Role ແລ້ວ; session ຂອງສະມາຊິກຈະກວດ authorization version ໃໝ່.'
    selectedRoleId.value = null
    await load()
  }
  catch (cause) {
    errorMessage.value = messageFrom(cause)
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <section><p class="text-[0.66rem] font-extrabold tracking-[0.12em] text-brand-600 uppercase">Authorization</p><h1 class="mt-1 text-xl font-black">Role ແລະ Permission</h1><p class="mt-1 text-xs text-ink-500">ລະບົບກວດ permission code, ບໍ່ໄດ້ hard-code ຊື່ Role.</p></section>
    <div v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{{ errorMessage }}</div>
    <div v-if="successMessage" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{{ successMessage }}</div>
    <div v-if="loading" class="grid min-h-48 place-items-center rounded-xl border bg-white text-brand-600"><LoadingSpinner /></div>

    <template v-else>
      <section class="grid gap-3 sm:grid-cols-3">
        <button v-for="role in roles" :key="role.id" type="button" class="rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-brand-500/30" :class="selectedRoleId === role.id ? 'border-brand-500 ring-2 ring-brand-500/10' : 'border-ink-950/7'" @click="chooseRole(role)">
          <div class="flex items-start justify-between"><div><h2 class="text-sm font-extrabold">{{ role.name }}</h2><p class="mt-0.5 text-[0.6rem] text-ink-500">{{ role.code }}</p></div><span v-if="role.isSystem" class="rounded bg-brand-100 px-1.5 py-0.5 text-[0.5rem] font-bold text-brand-700">SYSTEM</span></div>
          <p class="mt-3 text-[0.62rem] text-ink-500">{{ role.permissions.length }} permissions · {{ role._count.members }} members</p>
        </button>
      </section>

      <section v-if="selectedRole" class="rounded-xl border border-ink-950/7 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between"><div><h2 class="text-sm font-extrabold">{{ selectedRole.name }}</h2><p class="text-[0.6rem] text-ink-500">{{ selectedRole.isSystem ? 'System role ຖືກປ້ອງກັນຈາກການແກ້ໄຂ' : 'Custom tenant role' }}</p></div><button type="button" class="text-xs text-ink-500" @click="selectedRoleId = null">✕</button></div>
        <form class="mt-4" @submit.prevent="updateRole">
          <label><span class="mb-1 block text-[0.62rem] font-bold">ຊື່ Role</span><input v-model="editForm.name" class="admin-field" :disabled="selectedRole.isSystem || !canManage"></label>
          <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <fieldset v-for="[moduleName, modulePermissions] in groupedPermissions" :key="moduleName" class="rounded-lg border border-ink-950/7 p-3"><legend class="px-1 text-[0.6rem] font-extrabold text-brand-700 uppercase">{{ moduleName }}</legend><label v-for="permission in modulePermissions" :key="permission.code" class="mt-2 flex items-start gap-2 text-[0.62rem]"><input v-model="editForm.permissionCodes" type="checkbox" :value="permission.code" :disabled="selectedRole.isSystem || !canManage" class="mt-0.5 accent-brand-700"><span><span class="font-bold">{{ permission.code }}</span><span class="block text-[0.56rem] text-ink-500">{{ permission.description }}</span></span></label></fieldset>
          </div>
          <button v-if="canManage && !selectedRole.isSystem" class="mt-4 rounded-lg bg-brand-700 px-4 py-2 text-xs font-extrabold text-white" :disabled="saving">ບັນທຶກ Role</button>
        </form>
      </section>

      <form v-if="canManage" class="rounded-xl border border-ink-950/7 bg-white p-4 shadow-sm" @submit.prevent="createRole">
        <h2 class="text-sm font-extrabold">ສ້າງ Custom Role</h2>
        <div class="mt-3 grid gap-3 sm:grid-cols-2"><label><span class="mb-1 block text-[0.62rem] font-bold">Code</span><input v-model="createForm.code" required placeholder="ACCOUNTANT" class="admin-field uppercase"></label><label><span class="mb-1 block text-[0.62rem] font-bold">ຊື່</span><input v-model="createForm.name" required class="admin-field"></label></div>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><fieldset v-for="[moduleName, modulePermissions] in groupedPermissions" :key="moduleName" class="rounded-lg border border-ink-950/7 p-3"><legend class="px-1 text-[0.6rem] font-extrabold text-brand-700 uppercase">{{ moduleName }}</legend><label v-for="permission in modulePermissions" :key="permission.code" class="mt-2 flex items-center gap-2 text-[0.62rem]"><input v-model="createForm.permissionCodes" type="checkbox" :value="permission.code" class="accent-brand-700">{{ permission.code }}</label></fieldset></div>
        <button class="mt-4 rounded-lg bg-brand-700 px-4 py-2 text-xs font-extrabold text-white" :disabled="saving">ສ້າງ Role</button>
      </form>
    </template>
  </div>
</template>
