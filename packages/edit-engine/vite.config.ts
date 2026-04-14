import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'QuadStoreEditEngine',
            fileName: (format) => `edit-engine.${format}.js`
        },
        sourcemap: true,
        rollupOptions: {
            external: ['@triplestore/core', '@triplestore/sparql', '@triplestore/inference'],
            output: {
                globals: {
                    '@triplestore/core': 'QuadStoreCore',
                    '@triplestore/sparql': 'QuadStoreSparql',
                    '@triplestore/inference': 'QuadStoreInference'
                }
            }
        }
    },
    // plugins: [dts({ rollupTypes: true })]
});
