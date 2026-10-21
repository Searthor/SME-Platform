<script setup lang="ts">
const props = withDefaults(defineProps<{
  total: number
  pageSize?: number
}>(), { pageSize: 10 })

const page = defineModel<number>({ default: 1 })
const { t } = useI18n()

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const from = computed(() => (props.total === 0 ? 0 : (page.value - 1) * props.pageSize + 1))
const to = computed(() => Math.min(props.total, page.value * props.pageSize))

/** Window of page numbers with `null` marking an ellipsis gap. */
const pages = computed<(number | null)[]>(() => {
  const last = pageCount.value
  const current = page.value
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1)
  const set = new Set([1, last, current - 1, current, current + 1])
  const sorted = [...set].filter(n => n >= 1 && n <= last).sort((a, b) => a - b)
  const out: (number | null)[] = []
  sorted.forEach((n, i) => {
    const prev = sorted[i - 1]
    if (prev !== undefined && n - prev > 1) out.push(null)
    out.push(n)
  })
  return out
})

const go = (target: number) => { page.value = Math.min(pageCount.value, Math.max(1, target)) }

watch(pageCount, (count) => { if (page.value > count) page.value = count })
</script>

<template>
  <nav class="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-500" :aria-label="t('ui.page', 'ໜ້າ')">
    <p>{{ t('ui.showing', 'ສະແດງ') }} {{ from }} {{ t('ui.to', 'ຫາ') }} {{ to }} {{ t('ui.of', 'ຈາກ') }} {{ total }} {{ t('ui.results', 'ລາຍການ') }}</p>
    <ul class="flex items-center gap-1">
      <li>
        <button type="button" class="focus-ring pager-btn" :disabled="page <= 1" :aria-label="t('ui.prev', 'ກ່ອນໜ້າ')" @click="go(page - 1)">
          <AdminIcon name="chevron-left" class="size-4" />
        </button>
      </li>
      <li v-for="(item, index) in pages" :key="`${item ?? 'gap'}-${index}`">
        <span v-if="item === null" class="px-1.5 text-ink-400">…</span>
        <button
          v-else
          type="button"
          class="focus-ring pager-btn min-w-8 px-2 font-semibold"
          :class="item === page ? 'border-brand-600 bg-brand-600 text-white hover:bg-brand-600' : ''"
          :aria-current="item === page ? 'page' : undefined"
          @click="go(item)"
        >
          {{ item }}
        </button>
      </li>
      <li>
        <button type="button" class="focus-ring pager-btn" :disabled="page >= pageCount" :aria-label="t('ui.next', 'ຖັດໄປ')" @click="go(page + 1)">
          <AdminIcon name="chevron-right" class="size-4" />
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.pager-btn {
  display: inline-grid;
  height: 2rem;
  min-width: 2rem;
  place-items: center;
  border-radius: 0.5rem;
  border: 1px solid var(--color-line);
  background: white;
  color: var(--color-ink-700, #334155);
  transition: background-color 0.15s;
}
.pager-btn:hover:not(:disabled) { background: var(--color-canvas); }
.pager-btn:disabled { cursor: not-allowed; opacity: 0.45; }
</style>
