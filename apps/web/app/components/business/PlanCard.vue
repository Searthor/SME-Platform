<script setup lang="ts">
import type { PlanFeature } from '~/types/ui'
import { formatDecimalString } from '~/utils/money'

const props = withDefaults(defineProps<{
  name: string
  /** Decimal string, e.g. "29.00". Display only; billing is computed on the backend. */
  price: string
  currency?: string
  period?: string
  description?: string
  features?: PlanFeature[]
  highlighted?: boolean
  current?: boolean
  badge?: string
}>(), {
  currency: 'USD', period: undefined, description: undefined, features: () => [],
  highlighted: false, current: false, badge: undefined,
})

defineEmits<{ select: [] }>()
const { t } = useI18n()
const priceText = computed(() => formatDecimalString(props.price) || props.price)
</script>

<template>
  <article
    class="relative flex flex-col rounded-2xl border bg-white p-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-pop"
    :class="highlighted ? 'border-brand-600 ring-2 ring-brand-600/20' : 'border-line'"
  >
    <span v-if="badge || highlighted" class="brand-gradient absolute -top-3 left-6 rounded-full px-3 py-0.5 text-xs font-bold text-white">
      {{ badge ?? t('ui.popular', 'ຍອດນິຍົມ') }}
    </span>
    <h3 class="text-lg font-bold text-ink-900">{{ name }}</h3>
    <p v-if="description" class="mt-1 text-sm text-ink-500">{{ description }}</p>
    <p class="mt-4 flex items-baseline gap-1">
      <span class="text-3xl font-extrabold text-ink-900 tabular-nums">{{ priceText }}</span>
      <span class="text-sm font-semibold text-ink-500">{{ currency }}<template v-if="period"> / {{ period }}</template></span>
    </p>
    <ul class="mt-5 flex-1 space-y-2.5 text-sm">
      <li v-for="feature in features" :key="feature.label" class="flex items-start gap-2" :class="feature.included === false ? 'text-ink-400 line-through' : 'text-ink-700'">
        <AdminIcon :name="feature.included === false ? 'x' : 'check'" class="mt-0.5 size-4 shrink-0" :class="feature.included === false ? 'text-ink-400' : 'text-emerald-600'" />
        {{ feature.label }}
      </li>
    </ul>
    <BaseButton class="mt-6 w-full" :variant="current ? 'secondary' : 'primary'" :disabled="current" @click="$emit('select')">
      {{ current ? t('ui.current_plan', 'ແຜນປັດຈຸບັນ') : t('ui.choose_plan', 'ເລືອກແຜນ') }}
    </BaseButton>
  </article>
</template>
