<script setup lang="ts">
import { ApiClientError } from '~/services/api-client'
import type { Branch, BusinessInvitation, TenantMember, TenantRole } from '~/types/api'

useHead({ title: 'ສະມາຊິກທຸລະກິດ' })

const auth = useAuthStore()
const api = useApiClient()
const members = ref<TenantMember[]>([])
const roles = ref<TenantRole[]>([])
const branches = ref<Branch[]>([])
const invitations = ref<BusinessInvitation[]>([])
const loading = ref(true)
const savingId = ref<string | null>(null)
const errorMessage = ref('')
const successMessage = ref('')
const showCreate = ref(false)
const showInvite = ref(false)
const generatedInviteUrl = ref('')
const createForm = reactive({ identifier: '', allBranches: false, branchIds: [] as string[], roleIds: [] as string[] })
const inviteForm = reactive({ identifier: '', allBranches: false, branchIds: [] as string[], roleIds: [] as string[] })
const drafts = reactive<Record<string, { status: TenantMember['status']; allBranches: boolean; branchIds: string[]; roleIds: string[] }>>({})

const canManage = computed(() => auth.hasPermission('user.manage') && auth.hasPermission('role.view') && auth.hasPermission('branch.view'))
const messageFrom = (cause: unknown) => cause instanceof ApiClientError ? cause.message : 'ບໍ່ສາມາດດຳເນີນການໄດ້'

const syncDrafts = () => {
  for (const member of members.value) {
    drafts[member.id] = {
      status: member.status,
      allBranches: member.allBranches,
      branchIds: member.branchAccess.map(grant => grant.branchId),
      roleIds: member.roles.map(grant => grant.role.id),
    }
  }
}

const load = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    [members.value, roles.value, branches.value, invitations.value] = await Promise.all([
      api.get<TenantMember[]>('/memberships'),
      api.get<TenantRole[]>('/access-control/roles'),
      api.get<Branch[]>('/branches'),
      api.get<BusinessInvitation[]>('/membership-invitations'),
    ])
    syncDrafts()
  }
  catch (cause) {
    errorMessage.value = messageFrom(cause)
  }
  finally {
    loading.value = false
  }
}

const createInvitation = async () => {
  savingId.value = 'invite'
  errorMessage.value = ''
  generatedInviteUrl.value = ''
  try {
    const invitation = await api.post<BusinessInvitation>('/membership-invitations', inviteForm)
    generatedInviteUrl.value = `${window.location.origin}/accept-invitation/${invitation.token}`
    inviteForm.identifier = ''
    inviteForm.allBranches = false
    inviteForm.branchIds = []
    inviteForm.roleIds = []
    successMessage.value = 'ສ້າງຄຳເຊີນແລ້ວ ກະລຸນາສຳເນົາ link ກ່ອນປິດໜ້ານີ້'
    await load()
  } catch (cause) {
    errorMessage.value = messageFrom(cause)
  } finally {
    savingId.value = null
  }
}

const copyInvite = async () => {
  if (generatedInviteUrl.value) await navigator.clipboard.writeText(generatedInviteUrl.value)
}

const revokeInvitation = async (invitationId: string) => {
  savingId.value = invitationId
  errorMessage.value = ''
  try {
    await api.post(`/membership-invitations/${invitationId}/revoke`)
    successMessage.value = 'ຍົກເລີກຄຳເຊີນແລ້ວ'
    await load()
  } catch (cause) {
    errorMessage.value = messageFrom(cause)
  } finally {
    savingId.value = null
  }
}

onMounted(load)

const createMember = async () => {
  savingId.value = 'new'
  errorMessage.value = ''
  try {
    await api.post<TenantMember>('/memberships', createForm)
    createForm.identifier = ''
    createForm.allBranches = false
    createForm.branchIds = []
    createForm.roleIds = []
    showCreate.value = false
    successMessage.value = 'ເພີ່ມສະມາຊິກແລ້ວ'
    await load()
  }
  catch (cause) {
    errorMessage.value = messageFrom(cause)
  }
  finally {
    savingId.value = null
  }
}

const updateMember = async (memberId: string) => {
  const draft = drafts[memberId]
  if (!draft) return
  savingId.value = memberId
  errorMessage.value = ''
  try {
    await api.patch<TenantMember>(`/memberships/${memberId}`, draft)
    successMessage.value = 'ອັບເດດສິດສະມາຊິກແລ້ວ'
    await load()
  }
  catch (cause) {
    errorMessage.value = messageFrom(cause)
  }
  finally {
    savingId.value = null
  }
}
</script>

<template>
  <div class="space-y-5">
    <section class="flex items-end justify-between gap-4">
      <div><p class="text-[0.66rem] font-extrabold tracking-[0.12em] text-brand-600 uppercase">Access management</p><h1 class="mt-1 text-xl font-black">ສະມາຊິກທຸລະກິດ</h1><p class="mt-1 text-xs text-ink-500">ກຳນົດ Role ແລະຂອບເຂດສາຂາໃຫ້ແຕ່ລະຄົນ.</p></div>
      <div v-if="canManage" class="flex gap-2"><button type="button" class="rounded-lg border border-brand-700/20 bg-white px-3 py-2 text-[0.68rem] font-extrabold text-brand-700" @click="showCreate = !showCreate; showInvite = false">ເພີ່ມ account ທີ່ມີແລ້ວ</button><button type="button" class="rounded-lg bg-brand-700 px-3 py-2 text-[0.68rem] font-extrabold text-white" @click="showInvite = !showInvite; showCreate = false">ສ້າງຄຳເຊີນ</button></div>
    </section>

    <div v-if="errorMessage" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{{ errorMessage }}</div>
    <div v-if="successMessage" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{{ successMessage }}</div>

    <form v-if="showCreate" class="rounded-xl border border-brand-500/20 bg-white p-4 shadow-sm" @submit.prevent="createMember">
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="sm:col-span-2"><span class="mb-1 block text-[0.64rem] font-bold">Email ຫຼື E.164 phone ຂອງ user ທີ່ມີບັນຊີແລ້ວ</span><input v-model="createForm.identifier" required class="admin-field"></label>
        <fieldset><legend class="text-[0.64rem] font-bold">Role</legend><label v-for="role in roles" :key="role.id" class="mt-2 flex items-center gap-2 text-xs"><input v-model="createForm.roleIds" type="checkbox" :value="role.id" class="accent-brand-700">{{ role.name }}</label></fieldset>
        <fieldset><legend class="text-[0.64rem] font-bold">ຂອບເຂດສາຂາ</legend><label class="mt-2 flex items-center gap-2 text-xs"><input v-model="createForm.allBranches" type="checkbox" class="accent-brand-700">ທຸກສາຂາ</label><template v-if="!createForm.allBranches"><label v-for="branch in branches" :key="branch.id" class="mt-2 flex items-center gap-2 text-xs"><input v-model="createForm.branchIds" type="checkbox" :value="branch.id" class="accent-brand-700">{{ branch.name }}</label></template></fieldset>
      </div>
      <button class="mt-4 rounded-lg bg-brand-700 px-4 py-2 text-xs font-extrabold text-white" :disabled="savingId === 'new'">ບັນທຶກ</button>
    </form>

    <form v-if="showInvite" class="rounded-xl border border-brand-500/20 bg-white p-4 shadow-sm" @submit.prevent="createInvitation">
      <h2 class="text-sm font-extrabold">ສ້າງ invitation link</h2>
      <p class="mt-1 text-[0.64rem] text-ink-500">Link ມີອາຍຸ 7 ມື້ ແລະຈະສະແດງ token ພຽງຄັ້ງດຽວ.</p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="sm:col-span-2"><span class="mb-1 block text-[0.64rem] font-bold">Email ຫຼື E.164 phone ຂອງຜູ້ຖືກເຊີນ</span><input v-model="inviteForm.identifier" required class="admin-field"></label>
        <fieldset><legend class="text-[0.64rem] font-bold">Role</legend><label v-for="role in roles" :key="role.id" class="mt-2 flex items-center gap-2 text-xs"><input v-model="inviteForm.roleIds" type="checkbox" :value="role.id" class="accent-brand-700">{{ role.name }}</label></fieldset>
        <fieldset><legend class="text-[0.64rem] font-bold">ຂອບເຂດສາຂາ</legend><label class="mt-2 flex items-center gap-2 text-xs"><input v-model="inviteForm.allBranches" type="checkbox" class="accent-brand-700">ທຸກສາຂາ</label><template v-if="!inviteForm.allBranches"><label v-for="branch in branches" :key="branch.id" class="mt-2 flex items-center gap-2 text-xs"><input v-model="inviteForm.branchIds" type="checkbox" :value="branch.id" class="accent-brand-700">{{ branch.name }}</label></template></fieldset>
      </div>
      <button class="mt-4 rounded-lg bg-brand-700 px-4 py-2 text-xs font-extrabold text-white" :disabled="savingId === 'invite'">ສ້າງ link</button>
    </form>

    <div v-if="generatedInviteUrl" class="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <p class="text-xs font-extrabold text-emerald-800">Invitation link — ສຳເນົາດຽວນີ້</p>
      <div class="mt-2 flex gap-2"><input :value="generatedInviteUrl" readonly class="admin-field min-w-0 flex-1"><button type="button" class="rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white" @click="copyInvite">ສຳເນົາ</button></div>
    </div>

    <div v-if="loading" class="grid min-h-48 place-items-center rounded-xl border bg-white text-brand-600"><LoadingSpinner /></div>
    <section v-else class="space-y-3">
      <article v-for="member in members" :key="member.id" class="rounded-xl border border-ink-950/7 bg-white p-4 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div><h2 class="text-sm font-extrabold">{{ member.user.displayName }}</h2><p class="mt-0.5 text-[0.62rem] text-ink-500">{{ member.user.identities[0]?.normalizedValue || member.user.id }} · auth v{{ member.authorizationVersion }}</p></div>
          <select v-if="drafts[member.id]" v-model="drafts[member.id]!.status" class="h-8 rounded-lg border border-ink-950/10 px-2 text-[0.64rem]" :disabled="!canManage"><option value="ACTIVE">ACTIVE</option><option value="SUSPENDED">SUSPENDED</option><option value="INVITED">INVITED</option></select>
        </div>
        <div v-if="drafts[member.id]" class="mt-4 grid gap-4 border-t border-ink-950/7 pt-4 sm:grid-cols-2">
          <fieldset><legend class="text-[0.62rem] font-bold text-ink-700">Role</legend><div class="mt-2 flex flex-wrap gap-3"><label v-for="role in roles" :key="role.id" class="flex items-center gap-1.5 text-[0.66rem]"><input v-model="drafts[member.id]!.roleIds" type="checkbox" :value="role.id" :disabled="!canManage" class="accent-brand-700">{{ role.name }}</label></div></fieldset>
          <fieldset><legend class="text-[0.62rem] font-bold text-ink-700">ຂອບເຂດສາຂາ</legend><label class="mt-2 flex items-center gap-1.5 text-[0.66rem]"><input v-model="drafts[member.id]!.allBranches" type="checkbox" :disabled="!canManage" class="accent-brand-700">ທຸກສາຂາ</label><div v-if="!drafts[member.id]!.allBranches" class="mt-2 flex flex-wrap gap-3"><label v-for="branch in branches" :key="branch.id" class="flex items-center gap-1.5 text-[0.66rem]"><input v-model="drafts[member.id]!.branchIds" type="checkbox" :value="branch.id" :disabled="!canManage" class="accent-brand-700">{{ branch.name }}</label></div></fieldset>
        </div>
        <button v-if="canManage" type="button" class="mt-4 rounded-lg bg-brand-700 px-3 py-2 text-[0.64rem] font-extrabold text-white disabled:opacity-60" :disabled="savingId === member.id" @click="updateMember(member.id)">ບັນທຶກສິດ</button>
      </article>
    </section>

    <section v-if="!loading" class="overflow-hidden rounded-xl border border-ink-950/7 bg-white shadow-sm">
      <div class="border-b border-ink-950/7 px-4 py-3"><h2 class="text-sm font-extrabold">ຄຳເຊີນ ({{ invitations.length }})</h2></div>
      <div v-if="invitations.length" class="divide-y divide-ink-950/7"><article v-for="invitation in invitations" :key="invitation.id" class="flex flex-wrap items-center justify-between gap-3 p-4"><div><p class="text-xs font-extrabold">{{ invitation.normalizedIdentity }}</p><p class="mt-1 text-[0.62rem] text-ink-500">{{ invitation.status }} · {{ invitation.allBranches ? 'ທຸກສາຂາ' : `${invitation.branchAccess.length} ສາຂາ` }} · ໝົດອາຍຸ {{ new Date(invitation.expiresAt).toLocaleDateString('lo-LA') }}</p></div><button v-if="canManage && invitation.status === 'PENDING'" type="button" class="rounded-md border border-red-200 px-2.5 py-1.5 text-[0.62rem] font-bold text-red-700" :disabled="savingId === invitation.id" @click="revokeInvitation(invitation.id)">ຍົກເລີກ</button></article></div>
      <p v-else class="p-4 text-xs text-ink-500">ຍັງບໍ່ມີຄຳເຊີນ</p>
    </section>
  </div>
</template>
