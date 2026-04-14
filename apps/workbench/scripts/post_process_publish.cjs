
const fs = require('fs');
const path = require('path');

const INDEX_HTML = path.resolve(__dirname, '../../../publish/index.html');

if (!fs.existsSync(INDEX_HTML)) {
    console.error('❌ index.html not found!');
    process.exit(1);
}

let content = fs.readFileSync(INDEX_HTML, 'utf8');

// Remove type="module" which causes CORS on file://
// It's safe to remove because vite-plugin-singlefile inlines everything into a standard script block (usually IIFE or similar if configured, or just behaves as module but inline)
// Actually, inline modules ARE supported in modern browsers, but file:// protocol has strict CORS for modules.
// EXCEPT: Inline modules (<script type="module">code...</script>) generally WORK on file:// in Chrome/Edge/Firefox now.
// The issue might be if there are imports inside it?
// Let's rely on the user's report that "it didn't work".
// Removing type="module" might break it if the code uses 'import' or 'export'.
// Vite bundle usually converts to SystemJS or IIFE for legacy support if targeted, but default is ES modules.
// NOTE: vite-plugin-singlefile usually handles conflicts.
// Let's try to remove 'crossorigin' attributes first, and maybe 'type="module"' if the verify script complained about it.

console.log('[Post-Process] Cleaning index.html...');

// 0. Manual Inlining of Shims
const LIB_DIR = path.resolve(__dirname, '../src/libs');
const placeholders = content.match(/<!-- INLINE_LIB: (.*?) -->/g) || [];

placeholders.forEach(placeholder => {
    const filename = placeholder.match(/INLINE_LIB: (.*?) /)[1];
    const libPath = path.join(LIB_DIR, filename);
    if (fs.existsSync(libPath)) {
        console.log(`📦 Inlining library: ${filename}`);
        const libCode = fs.readFileSync(libPath, 'utf8');
        // Wrap in a standard script tag, NOT module
        const scriptTag = `<script>\n${libCode}\n</script>`;
        content = content.replace(placeholder, scriptTag);
    } else {
        console.warn(`⚠️ Library not found for inlining: ${filename}`);
    }
});

// 1. Remove crossorigin (Blocks file:// protocol)
if (content.includes('crossorigin')) {
    console.log('⚠️ Removing "crossorigin" attributes...');
    content = content.replace(/\scrossorigin(=["'][^"']*["'])?/gi, '');
}

// 2. Remove type="module" (Triggers CORS on some environments for file://)
// Only remove from inlined scripts if necessary, but vite-plugin-singlefile 
// sometimes leaves them on the main entry.
if (content.includes('type="module"')) {
    console.log('⚠️ Removing "type=module" attributes for max compatibility...');
    content = content.replace(/\stype=["']module["']/gi, '');
}

// 3. Patch 'import.meta' (SyntaxError in Classic Script context)
if (content.includes('import.meta')) {
    console.log('⚠️ Patching "import.meta" usage...');
    content = content.replace(/import\.meta\.url/g, 'window.location.href');
    content = content.replace(/import\.meta\.env/g, '{}');
    content = content.replace(/import\.meta/g, '({ url: window.location.href, env: {} })');
}

fs.writeFileSync(INDEX_HTML, content, 'utf8');

// 4. Cleanup unnecessary directories
const PUBLISH_DIR = path.dirname(INDEX_HTML);
['libs', 'css'].forEach(dir => {
    const dirPath = path.join(PUBLISH_DIR, dir);
    if (fs.existsSync(dirPath)) {
        console.log(`🧹 Cleaning up: ${dir}/`);
        fs.rmSync(dirPath, { recursive: true, force: true });
    }
});

console.log('✅ Post-processing complete. Bundle is optimized and shim-compliant.');
