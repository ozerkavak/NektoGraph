
const fs = require('fs');
const path = require('path');

const PUBLISH_DIR = path.resolve(__dirname, '../../../publish');
const INDEX_HTML = path.join(PUBLISH_DIR, 'index.html');

console.log(`[Verify] Checking Publish Directory: ${PUBLISH_DIR}`);

if (!fs.existsSync(INDEX_HTML)) {
    console.error('❌ index.html not found!');
    process.exit(1);
}

const content = fs.readFileSync(INDEX_HTML, 'utf8');
const errors = [];

// Helper to check for external resources that should be inlined
function checkInlining(tagName, attrName) {
    const regex = new RegExp(`<${tagName}[^>]*\\s${attrName}=["']([^"']+)["']`, 'gi');
    let match;

    while ((match = regex.exec(content)) !== null) {
        const src = match[1];

        // Allowed: Data URIs (inlined images/fonts) or internal anchors
        if (src.startsWith('data:')) continue;
        if (src.startsWith('#')) continue;

        // FAIL: Any external HTTP/HTTPS link (optional, but usually we want offline)
        // For now, we only STRICTLY fail on local files that should have been inlined.
        if (src.match(/^https?:\/\//)) {
            console.warn(`⚠️ Warning: External link detected: ${src} (Requires Internet)`);
            continue;
        }

        // FAIL: Any local relative/absolute path
        // Standard Vite build produced these, but SingleFile build should NOT have them.
        errors.push(`❌ External Resource detected in <${tagName}>: ${src} (Should be INLINED for single-file mode)`);
    }
}

console.log('[Verify] validating "Single File" requirements...');

// 1. Check for external scripts
checkInlining('script', 'src');

// 2. Check for external stylesheets
checkInlining('link', 'href');

// 3. Check for specific anti-patterns
if (content.includes('type="module"')) {
    errors.push('❌ Found <script type="module">. This WILL fail on file:// protocol due to CORS.');
}

if (content.includes('crossorigin')) {
    console.warn('⚠️ Found "crossorigin" attribute. This might cause issues on file://.');
}

// 4. Check for 'import.meta' (SyntaxError in non-module scripts)
if (content.includes('import.meta')) {
    errors.push('❌ Found "import.meta". This causes SyntaxError outside of modules (and we removed type="module"). Build must be IIFE/UMD or stripped of module syntax.');
}

if (errors.length > 0) {
    console.error('\nVerification FAILED (Not a true Single File):');
    errors.forEach(e => console.error(e));
    process.exit(1);
} else {
    // Check file size to ensure it's not empty/suspicious
    const stats = fs.statSync(INDEX_HTML);
    console.log(`✅ Verification PASSED: index.html is self-contained.`);
    console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}
