<script setup lang="ts">
const { currentLocale, supportedLocales, setLocale, t } = useI18n()

const detailsRef = ref<HTMLDetailsElement | null>(null)

const select = (code: typeof supportedLocales[number]['code']) => {
  setLocale(code)
  if (detailsRef.value) {
    detailsRef.value.removeAttribute('open')
  }
}
</script>

<template>
  <details ref="detailsRef" class="group relative">
    <summary
      class="focus-ring flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-[#e4e9e6] px-2.5 text-[0.62rem] font-bold text-[#65716d] marker:hidden hover:border-[#ced7d3] hover:bg-[#f8faf9] hover:text-brand-700"
      :title="t('lang.language_settings')"
      :aria-label="t('lang.language_settings')"
    >
      <span aria-hidden="true" class="text-xs">{{ currentLocale.flag }}</span>
      <span class="max-w-[5.5rem] truncate">{{ currentLocale.nativeName }}</span>
      <svg class="size-2.5 opacity-60 transition-transform group-open:rotate-180" viewBox="0 0 12 12" fill="none">
        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </summary>

    <div class="absolute top-10 right-0 z-50 w-52 rounded-xl border border-[#e1e7e4] bg-white p-2 shadow-[0_16px_45px_rgb(16_37_31_/_14%)]">
      <div class="border-b border-[#edf0ee] px-2 pb-2 pt-1">
        <p class="text-[0.65rem] font-extrabold text-[#25322e]">{{ t('lang.select_language') }}</p>
        <p class="text-[0.54rem] text-[#8a9591]">{{ currentLocale.name }} ({{ currentLocale.code }})</p>
      </div>

      <div class="mt-1.5 space-y-0.5">
        <button
          v-for="item in supportedLocales"
          :key="item.code"
          type="button"
          class="focus-ring flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition"
          :class="item.code === currentLocale.code ? 'bg-brand-100 font-extrabold text-brand-700' : 'text-[#55635e] hover:bg-[#f7f9f8] hover:text-[#17211e]'"
          @click="select(item.code)"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm" aria-hidden="true">{{ item.flag }}</span>
            <div class="min-w-0">
              <span class="block text-[0.65rem] leading-tight font-bold">{{ item.nativeName }}</span>
              <span class="block text-[0.52rem] leading-tight opacity-70">{{ item.name }}</span>
            </div>
          </div>
          <span v-if="item.code === currentLocale.code" class="text-xs font-black text-brand-700">✓</span>
        </button>
      </div>
    </div>
  </details>
</template>
