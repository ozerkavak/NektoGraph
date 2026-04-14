import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@triplestore/core': resolve(__dirname, '../../lib_sources/quadstore-core/src/index.ts'),
      '@triplestore/session': resolve(__dirname, '../session/src/index.ts'),
      '@triplestore/inference': resolve(__dirname, '../../lib_sources/inference/src/index.ts'),
      '@triplestore/sparql': resolve(__dirname, '../sparql/src/index.ts'),
    },
  },
});
