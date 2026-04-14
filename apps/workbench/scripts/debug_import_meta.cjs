
const fs = require('fs');
const path = require('path');

const INDEX_HTML = path.resolve(__dirname, '../../../publish/index.html');
const content = fs.readFileSync(INDEX_HTML, 'utf8');

const regex = /import\.meta/g;
let match;

console.log('--- DEBUG IMPORT.META ---');
while ((match = regex.exec(content)) !== null) {
    console.log(`Match found at index: ${match.index}`);
    // Show context
    const start = Math.max(0, match.index - 50);
    const end = Math.min(content.length, match.index + 50);
    console.log(`Context: ...${content.slice(start, end)}...`);
    console.log('-------------------');
}
