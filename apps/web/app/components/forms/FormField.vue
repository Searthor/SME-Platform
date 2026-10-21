<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  hint?: string
  error?: string
  required?: boolean
  optional?: boolean
  /** id of the control this label points to. */
  for?: string
}>(), { label: undefined, hint: undefined, error: undefined, required: false, optional: false, for: undefined })

const { t } = useI18n()
</script>

<template>
  <div class="block">
    <label v-if="label" :for="$props.for" class="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-600">
      {{ label }}
      <span v-if="required" class="text-rose-500" aria-hidden="true">*</span>
      <span v-else-if="optional" class="font-normal text-slate-400">({{ t('ui.optional') }})</span>
    </label>
    <slot />
    <p v-if="error" role="alert" class="mt-1.5 text-[0.68rem] font-semibold text-rose-600">{{ error }}</p>
    <p v-else-if="hint" class="mt-1.5 text-[0.68rem] text-ink-500">{{ hint }}</p>
  </div>
</template>
