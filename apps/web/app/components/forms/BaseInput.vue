<script setup lang="ts">
defineOptions({ inheritAttrs: false })

withDefaults(defineProps<{
  label?: string
  hint?: string
  error?: string
  required?: boolean
  optional?: boolean
  type?: string
  placeholder?: string
  disabled?: boolean
}>(), {
  label: undefined, hint: undefined, error: undefined, required: false, optional: false,
  type: 'text', placeholder: undefined, disabled: false,
})

const model = defineModel<string>({ default: '' })
const id = useId()
</script>

<template>
  <FormField :label="label" :hint="hint" :error="error" :required="required" :optional="optional" :for="id" :class="$attrs.class as string">
    <div class="relative">
      <span v-if="$slots.icon" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-500"><slot name="icon" /></span>
      <input
        :id="id"
        v-model="model"
        v-bind="{ ...$attrs, class: undefined }"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        :aria-invalid="error ? true : undefined"
        class="admin-field disabled:cursor-not-allowed disabled:bg-canvas disabled:opacity-70"
        :class="[$slots.icon ? 'pl-10' : '', error ? 'border-rose-400 focus-visible:border-rose-500' : '']"
      >
    </div>
  </FormField>
</template>
