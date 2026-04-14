
const fs = require('fs');
const path = require('path');

const INDEX_HTML = path.resolve(__dirname, '../../../publish/index.html');
const content = fs.readFileSync(INDEX_HTML, 'utf8');

const tagName = 'script';
const attrName = 'src';
const regex = new RegExp(`<${tagName}[^>]*\\s${attrName}=["']([^"']+)["']`, 'gi');
let match;

console.log('--- DEBUG MATCHES ---');
while ((match = regex.exec(content)) !== null) {
    console.log(`Match found: ${match[0]}`);
    console.log(`Captured group: ${match[1]}`);
    console.log(`Index: ${match.index}`);
    // Show context
    const start = Math.max(0, match.index - 50);
    const end = Math.min(content.length, match.index + match[0].length + 50);
    console.log(`Context: ...${content.slice(start, end)}...`);
    console.log('-------------------');
}
