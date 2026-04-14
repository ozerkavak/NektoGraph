import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'HoverCardLib',
            fileName: () => 'hover_card.js',
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
