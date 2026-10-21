<script setup lang="ts">
import { uiSizes, uiThemes } from '~/utils/ui-preferences'

const { preferences, setSize, setTheme, reset } = useUiPreferences()
const { t } = useI18n()
</script>

<template>
  <details class="group relative">
    <summary
      class="focus-ring grid size-8 cursor-pointer list-none place-items-center rounded-lg border border-[#e4e9e6] text-[#65716d] marker:hidden hover:bg-[#f8faf9] hover:text-brand-700"
      :title="t('pref.button_tooltip')"
      :aria-label="t('pref.button_tooltip')"
    >
      <AdminIcon name="settings" class="size-3.5" />
    </summary>

    <div class="absolute top-10 right-0 z-50 w-64 rounded-xl border border-[#e1e7e4] bg-white p-3 shadow-[0_16px_45px_rgb(16_37_31_/_14%)]">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-[0.68rem] font-extrabold text-[#25322e]">{{ t('pref.title') }}</p>
          <p class="mt-0.5 text-[0.56rem] text-[#8a9591]">{{ t('pref.hint') }}</p>
        </div>
        <button type="button" class="text-[0.54rem] font-bold text-brand-600 hover:text-brand-700" @click="reset">{{ t('pref.default') }}</button>
      </div>

      <fieldset class="mt-3">
        <legend class="text-[0.58rem] font-bold text-[#65716d]">{{ t('pref.size') }}</legend>
        <div class="mt-1.5 grid grid-cols-3 gap-1">
          <button
            v-for="option in uiSizes"
            :key="option.value"
            type="button"
            class="focus-ring h-7 rounded-md border px-1 text-[0.54rem] font-bold transition"
            :class="preferences.size === option.value ? 'border-brand-500 bg-brand-100 text-brand-700' : 'border-[#e5e9e7] text-[#71807a] hover:bg-[#f7f9f8]'"
            :aria-pressed="preferences.size === option.value"
            @click="setSize(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </fieldset>

      <fieldset class="mt-3 border-t border-[#edf0ee] pt-3">
        <legend class="text-[0.58rem] font-bold text-[#65716d]">{{ t('pref.color') }}</legend>
        <div class="mt-2 flex items-center justify-between gap-2">
          <button
            v-for="theme in uiThemes"
            :key="theme.value"
            type="button"
            class="focus-ring grid size-7 place-items-center rounded-full border-2 transition hover:scale-110"
            :class="preferences.theme === theme.value ? 'border-[#26332f]' : 'border-transparent'"
            :title="theme.label"
            :aria-label="theme.label"
            :aria-pressed="preferences.theme === theme.value"
            @click="setTheme(theme.value)"
          >
            <span class="grid size-5 place-items-center rounded-full text-[0.58rem] font-black text-white" :style="{ backgroundColor: theme.swatch }">
              {{ preferences.theme === theme.value ? '✓' : '' }}
            </span>
          </button>
        </div>
      </fieldset>
    </div>
  </details>
</template>
