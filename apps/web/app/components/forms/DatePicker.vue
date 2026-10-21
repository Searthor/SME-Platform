<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  label?: string
  hint?: string
  error?: string
  required?: boolean
  optional?: boolean
  min?: string
  max?: string
  disabled?: boolean
}>(), { label: undefined, hint: undefined, error: undefined, required: false, optional: false, min: undefined, max: undefined, disabled: false })

/** ISO date string (YYYY-MM-DD) — timezone-neutral, safe to send to the API as-is. */
const model = defineModel<string>({ default: '' })
const id = useId()
</script>

<template>
  <FormField :label="label" :hint="hint" :error="error" :required="required" :optional="optional" :for="id" :class="$attrs.class as string">
    <div class="relative">
      <input
        :id="id"
        v-model="model"
        v-bind="{ ...$attrs, class: undefined }"
        type="date"
        :min="min"
        :max="max"
        :disabled="disabled"
        :required="required"
        :aria-invalid="error ? true : undefined"
        class="admin-field pr-10 disabled:cursor-not-allowed disabled:bg-canvas"
        :class="error ? 'border-rose-400' : ''"
      >
      <AdminIcon name="calendar" class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-500" />
    </div>
  </FormField>
</template>
