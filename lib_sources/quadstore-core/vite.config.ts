import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [
        dts({
            insertTypesEntry: true,
            outDir: resolve(__dirname, 'dist')
        })
    ],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'QuadStoreLib', // Global variable: window.QuadStoreLib
            fileName: () => 'quadstore-core.browser.js',
            formats: ['umd']
        },
        rollupOptions: {
            // No external: Bundle core engine logic
            external: [],
            output: {
                globals: {}
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
