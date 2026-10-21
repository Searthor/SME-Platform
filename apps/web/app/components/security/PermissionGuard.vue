<script setup lang="ts">
/**
 * UX-only gate: hides UI the user cannot use. The API remains the authority and
 * re-checks every permission server-side.
 */
const props = withDefaults(defineProps<{
  permission: string | string[]
  /** `any`: at least one permission; `all`: every permission. */
  mode?: 'any' | 'all'
}>(), { mode: 'any' })

const auth = useAuthStore()

const allowed = computed(() => {
  const required = Array.isArray(props.permission) ? props.permission : [props.permission]
  if (required.length === 0) return true
  return props.mode === 'all'
    ? required.every(code => auth.hasPermission(code))
    : required.some(code => auth.hasPermission(code))
})
</script>

<template>
  <slot v-if="allowed" />
  <slot v-else name="fallback" />
</template>
