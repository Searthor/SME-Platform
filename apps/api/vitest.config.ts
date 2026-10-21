import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts', 'test/**/*.e2e-spec.ts', 'test/**/*.integration-spec.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
})
