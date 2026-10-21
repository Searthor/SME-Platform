<script setup lang="ts">
import type { AdminIconName } from '~/types/ui'

const props = withDefaults(
  defineProps<{
    id?: string
    title: string
    value: string | number
    change?: string
    changeType?: 'positive' | 'negative' | 'neutral'
    changeNote?: string
    icon: AdminIconName
    colorTheme?: 'indigo' | 'emerald' | 'amber' | 'sky' | 'rose'
    iconBg?: string
    iconColor?: string
    waveColor?: string
    barGradientStart?: string
    barGradientEnd?: string
  }>(),
  {
    id: undefined,
    change: undefined,
    changeType: 'positive',
    changeNote: undefined,
    colorTheme: 'indigo',
    iconBg: undefined,
    iconColor: undefined,
    waveColor: undefined,
    barGradientStart: undefined,
    barGradientEnd: undefined,
  },
)

// Auto ID for gradient isolation
const generatedId = useId()
const cardId = computed(() => props.id || generatedId)

// Color themes preset
const themeConfig = computed(() => {
  switch (props.colorTheme) {
    case 'emerald':
      return {
        iconBg: 'bg-gradient-to-br from-[#d1fae5] to-[#a7f3d0]',
        iconColor: 'text-[#059669]',
        waveColor: '#10b981',
        barGradientStart: '#047857',
        barGradientEnd: '#34d399',
      }
    case 'amber':
      return {
        iconBg: 'bg-gradient-to-br from-[#fef3c7] to-[#fde68a]',
        iconColor: 'text-[#d97706]',
        waveColor: '#f59e0b',
        barGradientStart: '#b45309',
        barGradientEnd: '#fbbf24',
      }
    case 'sky':
      return {
        iconBg: 'bg-gradient-to-br from-[#e0f2fe] to-[#bae6fd]',
        iconColor: 'text-[#0284c7]',
        waveColor: '#0ea5e9',
        barGradientStart: '#0369a1',
        barGradientEnd: '#38bdf8',
      }
    case 'rose':
      return {
        iconBg: 'bg-gradient-to-br from-[#ffe4e6] to-[#fecdd3]',
        iconColor: 'text-[#e11d48]',
        waveColor: '#f43f5e',
        barGradientStart: '#be123c',
        barGradientEnd: '#fb7185',
      }
    case 'indigo':
    default:
      return {
        iconBg: 'bg-gradient-to-br from-[#ede9fe] to-[#dfd9fe]',
        iconColor: 'text-[#5b4cf5]',
        waveColor: '#8b5cf6',
        barGradientStart: '#6d28d9',
        barGradientEnd: '#a78bfa',
      }
  }
})

const activeIconBg = computed(() => props.iconBg || themeConfig.value.iconBg)
const activeIconColor = computed(() => props.iconColor || themeConfig.value.iconColor)
const activeWaveColor = computed(() => props.waveColor || themeConfig.value.waveColor)
const activeBarStart = computed(() => props.barGradientStart || themeConfig.value.barGradientStart)
const activeBarEnd = computed(() => props.barGradientEnd || themeConfig.value.barGradientEnd)
</script>

<template>
  <article
    class="relative flex min-h-[102px] items-start gap-3.5 overflow-hidden rounded-2xl border border-line bg-white p-4.5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop sm:p-5"
  >
    <!-- Left Icon Container (compacted) -->
    <div
      class="relative z-10 grid size-10 shrink-0 place-items-center rounded-xl shadow-2xs sm:size-11"
      :class="[activeIconBg, activeIconColor]"
    >
      <AdminIcon :name="icon" class="size-5 sm:size-5.5" />
    </div>

    <!-- Right Content Info (compacted title & value) -->
    <div class="relative z-10 min-w-0 flex-1 pr-6 sm:pr-8">
      <p class="truncate text-xs font-medium text-slate-500">
        {{ title }}
      </p>
      <p class="mt-1 text-xl font-bold tracking-tight text-slate-900 leading-tight sm:text-2xl">
        {{ value }}
      </p>

      <div v-if="change" class="mt-2 flex flex-wrap items-center gap-1 text-[11px] sm:text-xs">
        <span
          class="font-bold shrink-0"
          :class="[
            changeType === 'negative'
              ? 'text-rose-600'
              : changeType === 'neutral'
                ? 'text-slate-500'
                : 'text-emerald-500',
          ]"
        >
          {{ change }}
        </span>
        <span v-if="changeNote" class="font-normal text-slate-400 truncate">
          {{ changeNote }}
        </span>
      </div>
    </div>

    <!-- Background Pattern Layer: Fluid Wave + Shorter Gradient Capsule Bars (strictly inside wave) -->
    <svg
      viewBox="0 0 320 110"
      preserveAspectRatio="none"
      class="pointer-events-none absolute inset-0 h-full w-full"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <!-- Wave gradient -->
        <linearGradient :id="`wave-grad-${cardId}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" :stop-color="activeWaveColor" stop-opacity="0.02" />
          <stop offset="45%" :stop-color="activeWaveColor" stop-opacity="0.06" />
          <stop offset="100%" :stop-color="activeWaveColor" stop-opacity="0.20" />
        </linearGradient>

        <!-- Wave hill gradient -->
        <linearGradient :id="`wave-soft-${cardId}`" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" :stop-color="activeWaveColor" stop-opacity="0.12" />
          <stop offset="100%" :stop-color="activeWaveColor" stop-opacity="0.01" />
        </linearGradient>

        <!-- Vertical bars gradient -->
        <linearGradient :id="`bar-grad-${cardId}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="activeBarStart" stop-opacity="0.80" />
          <stop offset="100%" :stop-color="activeBarEnd" stop-opacity="0.35" />
        </linearGradient>
      </defs>

      <!-- Layer 1: Base low wave across bottom -->
      <path
        d="M 0 100 C 50 94, 100 104, 160 98 C 220 92, 260 84, 320 70 L 320 110 L 0 110 Z"
        :fill="activeWaveColor"
        fill-opacity="0.04"
      />

      <!-- Layer 2: Main fluid wave rising upward on the right into a rounded crest -->
      <path
        d="M 0 104 C 70 100, 140 108, 185 98 C 230 88, 258 56, 288 38 C 304 28, 314 30, 320 32 L 320 110 L 0 110 Z"
        :fill="`url(#wave-grad-${cardId})`"
      />

      <!-- Layer 3: Hill soft inner contour for depth -->
      <path
        d="M 140 106 C 190 102, 240 82, 280 50 C 300 36, 312 36, 320 38 L 320 110 L 140 110 Z"
        :fill="`url(#wave-soft-${cardId})`"
      />

      <!-- 5 Vertical Pill Bars (Shorter, staying completely inside the wave boundary) -->
      <rect x="256" y="88" width="5" height="18" rx="2.5" :fill="`url(#bar-grad-${cardId})`" />
      <rect x="268" y="78" width="5" height="28" rx="2.5" :fill="`url(#bar-grad-${cardId})`" />
      <rect x="280" y="66" width="5" height="40" rx="2.5" :fill="`url(#bar-grad-${cardId})`" />
      <rect x="292" y="54" width="5" height="52" rx="2.5" :fill="`url(#bar-grad-${cardId})`" />
      <rect x="304" y="42" width="5" height="64" rx="2.5" :fill="`url(#bar-grad-${cardId})`" />
    </svg>
  </article>
</template>
