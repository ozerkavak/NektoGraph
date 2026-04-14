import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'SparqlLib', // Global variable: window.SparqlLib
            fileName: 'sparql.browser',
            formats: ['umd']
        },
        rollupOptions: {
            // Externalize CORE to avoid double-bundling and instance mismatch
            external: ['@triplestore/core'],
            output: {
                globals: {
                    '@triplestore/core': 'window.QuadStoreLib' // Map import to global variable
                }
            }
        },
        minify: false, // Keep readable for now
        outDir: 'dist-browser'
    },
    plugins: [dts()],
    define: {
        'process.env.NODE_ENV': '"production"',
        // Some libraries might use global process
        'process': { env: {} }
    }
});
