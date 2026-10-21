<script setup lang="ts">
import type { TenantRole } from '~/types/api'

withDefaults(defineProps<{
  roles: TenantRole[]
  label?: string
  disabled?: boolean
  error?: string
}>(), { label: undefined, disabled: false, error: undefined })

/** Selected role ids. Single mode = array of length 0|1 is not needed: use `multiple` for checkboxes. */
const model = defineModel<string[]>({ default: () => [] })
const multiple = defineModel<boolean>('multiple', { default: true })

const { t } = useI18n()

const toggle = (id: string) => {
  if (!multiple.value) { model.value = [id]; return }
  model.value = model.value.includes(id) ? model.value.filter(item => item !== id) : [...model.value, id]
}
</script>

<template>
  <fieldset class="space-y-2" :disabled="disabled">
    <legend v-if="label" class="mb-1 text-sm font-semibold text-ink-900">{{ label }}</legend>
    <div class="grid gap-2 sm:grid-cols-2">
      <label
        v-for="role in roles"
        :key="role.id"
        class="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition"
        :class="model.includes(role.id) ? 'border-brand-600 bg-brand-100/50' : 'border-line bg-white hover:bg-canvas'"
      >
        <input
          :type="multiple ? 'checkbox' : 'radio'"
          class="mt-0.5 size-4 accent-brand-600"
          :checked="model.includes(role.id)"
          @change="toggle(role.id)"
        >
        <span class="min-w-0 flex-1">
          <span class="flex items-center gap-2 text-sm font-semibold text-ink-900">
            {{ role.name }}
            <span v-if="role.isSystem" class="rounded bg-canvas px-1.5 py-0.5 text-[0.65rem] font-bold text-ink-500 uppercase">system</span>
          </span>
          <span class="mt-0.5 block text-xs text-ink-500">{{ role.permissions.length }} {{ t('ui.selected', 'permissions') }}</span>
        </span>
      </label>
    </div>
    <p v-if="error" class="text-xs font-medium text-rose-600" role="alert">{{ error }}</p>
  </fieldset>
</template>
