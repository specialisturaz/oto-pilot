import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Global test setup
    setupFiles: ['./tests/setup.ts'],

    // Test file patterns
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],

    // Environment per-project
    environment: 'node',

    // Environment overrides: frontend tests run in jsdom
    environmentMatchGlobs: [
      ['tests/unit/frontend/**', 'jsdom'],
    ],

    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/backend/utils/**',
        'src/backend/middleware/**',
        'src/backend/modules/**/**.service.ts',
        'src/backend/modules/**/**.controller.ts',
        'src/frontend/lib/**',
      ],
      exclude: [
        'node_modules',
        'tests',
        'dist',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },

    // Timeouts
    testTimeout: 15000,
    hookTimeout: 15000,

    // Globals (describe, it, expect without imports)
    globals: true,

    // Path aliases – mirror root tsconfig and frontend tsconfig
    alias: {
      '@backend': path.resolve(__dirname, 'src/backend'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@agents': path.resolve(__dirname, 'agents'),
      '@': path.resolve(__dirname, 'src/frontend'),
    },
  },
});
