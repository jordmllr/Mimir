import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    globals: true,
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'test/', 'design_documents/']
    }
  }
})
