import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/search.ts'),
            name: 'SearchLib',
            fileName: () => 'search.js',
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
    plugins: [
        dts({ 
            include: ['src'],
            insertTypesEntry: true
        })
    ]
});
