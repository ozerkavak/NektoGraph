import { defineConfig } from 'vite';
import path from 'path';
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
    base: './',
    plugins: [viteSingleFile()],
    resolve: {
        alias: {
            // V6 Standard: Direct Source Linking for Global Bundling & Tree-Shaking.
            // As per .agents/rules/bundle-policy.md - NO SHIMS.
            '@triplestore/core': path.resolve(__dirname, '../../lib_sources/quadstore-core/src/index.ts'),
            '@triplestore/io': path.resolve(__dirname, '../../lib_sources/universal-rdf-io/src/index.ts'),
            '@triplestore/search': path.resolve(__dirname, '../../lib_sources/search/src/search.ts'),
            '@triplestore/generator': path.resolve(__dirname, '../../lib_sources/generator/src/generator.ts'),
            '@triplestore/inference': path.resolve(__dirname, '../../lib_sources/inference/src/index.ts'),
            '@triplestore/hover': path.resolve(__dirname, '../../lib_sources/hover_card/src/index.ts'),
            '@triplestore/sparql': path.resolve(__dirname, '../../packages/sparql/src/index.ts'),
            // Internal packages (source-level):
            '@triplestore/edit-engine': path.resolve(__dirname, '../../packages/edit-engine/src/index.ts'),
            '@triplestore/session': path.resolve(__dirname, '../../packages/session/src/index.ts'),
            '@triplestore/3dview': path.resolve(__dirname, '../../packages/3dview/src/index.ts'),
            '@triplestore/maintenance': path.resolve(__dirname, '../../packages/maintenance/src/index.ts'),
            '@triplestore/window-manager': path.resolve(__dirname, '../../lib_sources/window-manager/src/index.ts'),
            '@triplestore/events': path.resolve(__dirname, '../../packages/events/index.ts'),
            '@triplestore/kg-triple': path.resolve(__dirname, '../../packages/kg-triple/src/index.ts'),
            '@triplestore/data-sync': path.resolve(__dirname, '../../packages/data-sync/src/index.ts'),
            '@triplestore/graph-selector': path.resolve(__dirname, '../../packages/graph-selector/src/index.ts'),
            '@triplestore/uri': path.resolve(__dirname, '../../lib_sources/uri-utils/src/index.ts'),
            '@triplestore/rdf-factory': path.resolve(__dirname, '../../lib_sources/rdf-factory/src/index.ts'),
            '@triplestore/sparql-parser': path.resolve(__dirname, '../../lib_sources/sparql-parser-lite/src/index.ts')
        }
    },
    server: {
        port: 3000,
        strictPort: true,
        allowedHosts: ['.trycloudflare.com']
    },
    preview: {
        port: 3000,
        strictPort: true,
        allowedHosts: ['.trycloudflare.com']
    },
    build: {
        minify: true,
        rollupOptions: {
            output: {
                format: 'iife', // Force IIFE to avoid "type=module" and "import.meta" issues
                inlineDynamicImports: true, // Required for IIFE with dynamic imports
            }
        }
    }
});
