import { defineConfig } from 'vite';
import { builtinModules } from 'module';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@triplestore/core': path.resolve(__dirname, '../quadstore-core/src/index.ts'),
      '@triplestore/io': path.resolve(__dirname, '../universal-rdf-io/src/index.ts'),
      '@triplestore/search': path.resolve(__dirname, '../search/src/search.ts'),
      '@triplestore/generator': path.resolve(__dirname, '../generator/src/generator.ts'),
      '@triplestore/inference': path.resolve(__dirname, '../inference/src/index.ts'),
      '@triplestore/hover': path.resolve(__dirname, '../hover_card/src/index.ts'),
      '@triplestore/sparql': path.resolve(__dirname, '../../packages/sparql/src/index.ts'),
      '@triplestore/edit-engine': path.resolve(__dirname, '../../packages/edit-engine/src/index.ts'),
      '@triplestore/session': path.resolve(__dirname, '../../packages/session/src/index.ts'),
      '@triplestore/3dview': path.resolve(__dirname, '../../packages/3dview/src/index.ts'),
      '@triplestore/maintenance': path.resolve(__dirname, '../../packages/maintenance/src/index.ts'),
      '@triplestore/window-manager': path.resolve(__dirname, '../window-manager/src/index.ts'),
      '@triplestore/events': path.resolve(__dirname, '../../packages/events/index.ts'),
      '@triplestore/kg-triple': path.resolve(__dirname, '../../packages/kg-triple/src/index.ts'),
      '@triplestore/data-sync': path.resolve(__dirname, '../../packages/data-sync/src/index.ts'),
      '@triplestore/graph-selector': path.resolve(__dirname, '../../packages/graph-selector/src/index.ts'),
      '@triplestore/uri': path.resolve(__dirname, '../uri-utils/src/index.ts'),
      '@triplestore/rdf-factory': path.resolve(__dirname, '../rdf-factory/src/index.ts'),
      '@triplestore/sparql-parser': path.resolve(__dirname, '../sparql-parser-lite/src/index.ts')
    }
  },
  build: {
    ssr: true,
    lib: {
      entry: {
        server: 'src/index.ts'
      },
      formats: ['cjs']
    },
    outDir: '../../publish/Server',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`)
      ],
      output: {
        entryFileNames: '[name].js'
      }
    }
  }
});
