import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'InferenceLib',
            fileName: () => 'inference.js',
            formats: ['umd']
        },
        rollupOptions: {
            external: ['@triplestore/core'],
            output: {
                globals: {
                    '@triplestore/core': 'QuadStoreLib'
                }
            }
        },
        minify: true,
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: false
    },
    define: {
        'process.env.NODE_ENV': '"production"',
        'global': 'window'
    }
});
