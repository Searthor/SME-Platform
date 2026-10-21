<script setup lang="ts">
import type { DataTableColumn, SortState } from '~/types/ui'

type Row = Record<string, unknown>

const props = withDefaults(defineProps<{
  columns: DataTableColumn[]
  rows: Row[]
  rowKey?: string
  loading?: boolean
  selectable?: boolean
  skeletonRows?: number
  caption?: string
}>(), { rowKey: 'id', loading: false, selectable: false, skeletonRows: 5, caption: undefined })

/** Selected row keys. */
const selected = defineModel<string[]>('selected', { default: () => [] })
/** Current sort. Sorting itself is delegated to the parent (server-side friendly). */
const sort = defineModel<SortState>('sort', { default: null })

const { t } = useI18n()

const keyOf = (row: Row): string => String(row[props.rowKey])
const allSelected = computed(() => props.rows.length > 0 && props.rows.every(row => selected.value.includes(keyOf(row))))

const toggleAll = () => {
  selected.value = allSelected.value ? [] : props.rows.map(keyOf)
}
const toggleRow = (row: Row) => {
  const key = keyOf(row)
  selected.value = selected.value.includes(key) ? selected.value.filter(k => k !== key) : [...selected.value, key]
}

const toggleSort = (column: DataTableColumn) => {
  if (!column.sortable) return
  if (sort.value?.key !== column.key) sort.value = { key: column.key, direction: 'asc' }
  else if (sort.value.direction === 'asc') sort.value = { key: column.key, direction: 'desc' }
  else sort.value = null
}

const ariaSort = (column: DataTableColumn): 'ascending' | 'descending' | 'none' | undefined => {
  if (!column.sortable) return undefined
  if (sort.value?.key !== column.key) return 'none'
  return sort.value.direction === 'asc' ? 'ascending' : 'descending'
}

const alignClass = (column: DataTableColumn) =>
  column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'

const cellValue = (row: Row, key: string): string => {
  const value = row[key]
  return value === null || value === undefined ? '—' : String(value)
}

const colspan = computed(() => props.columns.length + (props.selectable ? 1 : 0) + 1)
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-max border-collapse text-sm">
      <caption v-if="caption" class="sr-only">{{ caption }}</caption>
      <thead>
        <tr class="border-b border-line bg-canvas/60 text-xs font-semibold tracking-wide text-ink-500 uppercase">
          <th v-if="selectable" class="w-10 px-4 py-3">
            <input type="checkbox" class="size-4 rounded accent-brand-600" :checked="allSelected" :aria-label="t('ui.select_all', 'ເລືອກທັງໝົດ')" @change="toggleAll">
          </th>
          <th
            v-for="column in columns"
            :key="column.key"
            scope="col"
            class="px-4 py-3"
            :class="[alignClass(column), column.class]"
            :aria-sort="ariaSort(column)"
          >
            <button
              v-if="column.sortable"
              type="button"
              class="focus-ring inline-flex items-center gap-1 rounded uppercase hover:text-ink-900"
              :class="sort?.key === column.key ? 'text-brand-700' : ''"
              @click="toggleSort(column)"
            >
              {{ column.label }}
              <AdminIcon :name="sort?.key === column.key ? (sort.direction === 'asc' ? 'chevron-up' : 'chevron-down') : 'sort'" class="size-3.5" />
            </button>
            <template v-else>{{ column.label }}</template>
          </th>
          <th v-if="$slots.actions" class="w-px px-4 py-3 text-right">
            <span class="sr-only">{{ t('ui.actions', 'Actions') }}</span>
          </th>
          <th v-else class="hidden" />
        </tr>
      </thead>
      <tbody class="divide-y divide-line">
        <template v-if="loading">
          <tr v-for="n in skeletonRows" :key="`sk-${n}`">
            <td v-for="m in colspan" :key="m" class="px-4 py-3.5"><SkeletonBlock class="h-4 w-full max-w-40" /></td>
          </tr>
        </template>
        <tr v-else-if="rows.length === 0">
          <td :colspan="colspan" class="px-4 py-2">
            <slot name="empty"><EmptyState /></slot>
          </td>
        </tr>
        <template v-else>
          <tr
            v-for="row in rows"
            :key="keyOf(row)"
            class="transition-colors hover:bg-brand-100/30"
            :class="selected.includes(keyOf(row)) ? 'bg-brand-100/50' : ''"
          >
            <td v-if="selectable" class="px-4 py-3">
              <input type="checkbox" class="size-4 rounded accent-brand-600" :checked="selected.includes(keyOf(row))" :aria-label="t('ui.selected', 'ເລືອກ')" @change="toggleRow(row)">
            </td>
            <td v-for="column in columns" :key="column.key" class="px-4 py-3 text-ink-900" :class="[alignClass(column), column.class]">
              <slot :name="`cell-${column.key}`" :row="row" :value="row[column.key]">{{ cellValue(row, column.key) }}</slot>
            </td>
            <td v-if="$slots.actions" class="px-4 py-3 text-right whitespace-nowrap"><slot name="actions" :row="row" /></td>
            <td v-else class="hidden" />
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
