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
            name: 'SparqlParserLite',
            fileName: () => 'sparql-parser-lite.browser.js',
            formats: ['umd']
        },
        rollupOptions: {
            external: [],
            output: {
                globals: {}
            }
        },
        minify: true,
        outDir: resolve(__dirname, 'dist'),
        emptyOutDir: false
    }
});
