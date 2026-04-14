import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'QuadStoreDataSync',
            fileName: (format) => `data-sync.${format}.js`
        },
        sourcemap: true,
        rollupOptions: {
            external: ['@triplestore/core', '@triplestore/events'],
            output: {
                globals: {
                    '@triplestore/core': 'QuadStoreCore',
                    '@triplestore/events': 'QuadStoreEvents'
                }
            }
        }
    }
});

