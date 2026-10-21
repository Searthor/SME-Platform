export default defineNuxtPlugin(() => {
  useUiPreferences().initialize()
  useI18n().initialize()
  useSidebar().initialize()
})


