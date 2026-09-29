import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  esbuild: {
    // Component tests are .tsx; transform JSX without a React import.
    jsx: 'automatic',
  },
  test: {
    // Engine tests run in node. Component tests opt into happy-dom with a
    // docblock, so the fast majority are not slowed by a DOM they never touch.
    // happy-dom rather than jsdom: jsdom 30 requires an ES module from CJS,
    // which Node 20 cannot do.
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['lib/**/*.test.ts', 'components/**/*.test.tsx'],
  },
});
