<script setup lang="ts">
import {
  buildUiStyleString,
  getUiSizeConfig,
  getUiThemeConfig,
  UI_PREFERENCES_COOKIE_KEY,
  UI_PREFERENCES_STORAGE_KEY,
} from '~/utils/ui-preferences'

const { preferences } = useUiPreferences()

const activeTheme = computed(() => getUiThemeConfig(preferences.value.theme))
const activeSize = computed(() => getUiSizeConfig(preferences.value.size))
const activeStyle = computed(() => buildUiStyleString(preferences.value))

const antiFlashScript = `(function(){try{var ck=document.cookie.match(/(?:^|; )${UI_PREFERENCES_COOKIE_KEY}=([^;]*)/);var raw=ck?decodeURIComponent(ck[1]):localStorage.getItem('${UI_PREFERENCES_STORAGE_KEY}');if(!raw)return;var p=typeof raw==='string'?JSON.parse(raw):raw;var t={blue:{b100:'#dbeafe',b500:'#3b82f6',b600:'#2563eb',b700:'#1d4ed8'},emerald:{b100:'#dff5eb',b500:'#0b9470',b600:'#087c5e',b700:'#09634e'},violet:{b100:'#ede9fe',b500:'#8b5cf6',b600:'#7c3aed',b700:'#6d28d9'},amber:{b100:'#fef3c7',b500:'#f59e0b',b600:'#d97706',b700:'#b45309'},rose:{b100:'#ffe4e6',b500:'#f43f5e',b600:'#e11d48',b700:'#be123c'},indigo:{b100:'#ecebff',b500:'#7568ff',b600:'#5b4cf5',b700:'#4a3bd9'}};var s={compact:'15px',default:'16px',comfortable:'17px'};var cfg=t[p.theme];var sz=s[p.size];var el=document.documentElement;if(cfg){el.dataset.uiTheme=p.theme;el.style.setProperty('--color-brand-100',cfg.b100);el.style.setProperty('--color-brand-500',cfg.b500);el.style.setProperty('--color-brand-600',cfg.b600);el.style.setProperty('--color-brand-700',cfg.b700);}if(sz){el.dataset.uiSize=p.size;el.style.setProperty('--ui-root-font-size',sz);}}catch(e){}})();`

const { locale } = useI18n()

useHead(() => ({
  titleTemplate: (title) => title ? `${title} · SME Flow` : 'SME Flow',
  meta: [
    { name: 'description', content: 'ລະບົບຈັດການທຸລະກິດສຳລັບ SME' },
    { name: 'theme-color', content: activeTheme.value.brand700 },
  ],
  htmlAttrs: {
    lang: locale.value,
    'data-ui-size': activeSize.value.value,
    'data-ui-theme': activeTheme.value.value,
    style: activeStyle.value,
  },
  script: [
    {
      innerHTML: antiFlashScript,
      tagPosition: 'head',
    },
  ],
}))
</script>

<template>
  <NuxtLoadingIndicator :color="activeTheme.brand500" :height="3" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ToastContainer />
</template>
