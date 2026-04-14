import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'WindowManager',
      fileName: () => 'window-manager.js',
      formats: ['es']
    },
    cssCodeSplit: false,
    rollupOptions: {
      external: [], // No external dependencies
      output: {
        globals: {}
      }
    },
    minify: true,
    emptyOutDir: false,
    outDir: resolve(__dirname, 'dist')
  },
  plugins: [dts({ include: ['src'] })]
});
