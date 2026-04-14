import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    resolve: {
        alias: {
            '@triplestore/uri': resolve(__dirname, '../uri-utils/src/index.ts'),
            '@triplestore/rdf-factory': resolve(__dirname, '../rdf-factory/src/index.ts')
        }
    },
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'UniversalRDF', // Global variable: window.UniversalRDF
            fileName: () => 'universal-rdf-io.browser.js',
            formats: ['umd']
        },
        rollupOptions: {
            // BUNDLE EVERYTHING (No external)
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
    },
    plugins: [
        dts({ 
            include: ['src'],
            insertTypesEntry: true
        })
    ]
});
