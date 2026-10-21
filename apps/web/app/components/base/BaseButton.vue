<script setup lang="ts">
type Variant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{
  variant?: Variant
  size?: Size
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  disabled?: boolean
  block?: boolean
  /** Render as a NuxtLink when provided. */
  to?: string
}>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  loading: false,
  disabled: false,
  block: false,
  to: undefined,
})

const variantClass: Record<Variant, string> = {
  primary: 'bg-[#5b4cf5] text-white shadow-[0_4px_14px_rgba(91,76,245,0.35)] hover:bg-[#4a3bd9]',
  secondary: 'border border-line bg-white text-slate-800 hover:bg-slate-50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  warning: 'bg-amber-500 text-white hover:bg-amber-600',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
}
const sizeClass: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-[0.7rem]',
  md: 'h-10 gap-2 px-4 text-xs',
  lg: 'h-12 gap-2 px-6 text-sm',
}

const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <NuxtLink
    v-if="to && !isDisabled"
    :to="to"
    class="focus-ring inline-flex items-center justify-center rounded-xl font-extrabold whitespace-nowrap transition active:scale-[0.98]"
    :class="[variantClass[variant], sizeClass[size], block ? 'w-full' : '']"
  >
    <slot name="icon" />
    <slot />
  </NuxtLink>
  <button
    v-else
    :type="type"
    :disabled="isDisabled"
    :aria-busy="loading || undefined"
    class="focus-ring inline-flex items-center justify-center rounded-xl font-extrabold whitespace-nowrap transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:scale-100"
    :class="[variantClass[variant], sizeClass[size], block ? 'w-full' : '']"
  >
    <LoadingSpinner v-if="loading" class="size-4" />
    <slot v-else name="icon" />
    <slot />
  </button>
</template>
