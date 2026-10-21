import tailwindcss from '@tailwindcss/vite'

const apiServerUrl = process.env.NUXT_API_SERVER_URL ?? 'http://localhost:3003'

export default defineNuxtConfig({
  modules: ['@pinia/nuxt', '@nuxt/eslint'],
  compatibilityDate: '2026-08-24',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      link: [
        { rel: 'preload', href: '/fonts/PhetsarathOT-Regular.ttf', as: 'font', type: 'font/ttf', crossorigin: '' },
      ],
    },
  },
  components: [{ path: '~/components', pathPrefix: false }],
  runtimeConfig: {
    public: {
      apiBase: '/api/v1',
    },
  },
  routeRules: {
    '/api/v1/**': { proxy: `${apiServerUrl}/api/v1/**` },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  typescript: {
    strict: true,
  },
})
