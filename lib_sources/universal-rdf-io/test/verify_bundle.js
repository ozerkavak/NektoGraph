const fs = require('fs');
const path = require('path');
const N3 = require('n3'); // For data factory comparison

// Mock Browser Environment
global.window = {};
global.self = global.window;

// Load Bundle
const bundlePath = path.resolve(__dirname, '../dist-browser/universal-rdf-io.browser.umd.js');
console.log('Loading Bundle from:', bundlePath);

let lib;
const exported = require(bundlePath);

if (exported && exported.UniversalParser) {
    console.log('Detected CommonJS export');
    lib = exported;
} else if (global.window.UniversalRDF) {
    console.log('Detected Global export');
    lib = global.window.UniversalRDF;
} else {
    // Try default export if applicable
    if (exported && exported.default && exported.default.UniversalParser) {
        lib = exported.default;
    }
}

if (!lib) {
    console.error('FAILED: UniversalRDF global not found in bundle.');
    process.exit(1);
}

const parser = new lib.UniversalParser();
const serializer = new lib.UniversalSerializer();
const { DataFactory } = N3;

async function runTests() {
    console.log('--- SENTINEL VERIFICATION ---');

    // TEST 1: COMPLIANCE (Import - Regression)
    console.log('[Test 1] Import Regression (TTL)');
    const ttlContent = '<http://s> <http://p> <http://o> .';
    let count = 0;
    await parser.parse(ttlContent, 'Turtle', (q) => {
        if (q.subject.value === 'http://s') count++;
    });
    if (count !== 1) throw new Error('TTL parsing failed');
    console.log('  -> PASS');

    // TEST 2: COMPLIANCE (Import - JSON-LD using embedded parser)
    console.log('[Test 2] Import Regression (JSON-LD)');
    const jsonldContent = JSON.stringify({
        "@id": "http://s2",
        "http://p": { "@id": "http://o2" }
    });
    count = 0;
    await parser.parse(jsonldContent, 'JSON-LD', (q) => {
        if (q.subject.value === 'http://s2') count++;
    });
    if (count !== 1) throw new Error('JSON-LD parsing failed');
    console.log('  -> PASS');

    // TEST 3: NEW FEATURE (Export - JSON-LD)
    console.log('[Test 3] Export Feature (JSON-LD)');
    const quads = [
        DataFactory.quad(
            DataFactory.namedNode('http://e1'),
            DataFactory.namedNode('http://p1'),
            DataFactory.literal('Export Test')
        )
    ];

    const jsonOutput = await serializer.serialize(quads, { format: 'JSON-LD' });
    console.log('  -> Raw JSON-LD Output:', JSON.stringify(jsonOutput));
    if (!jsonOutput || (typeof jsonOutput === 'string' && !jsonOutput.includes('http://e1'))) {
        console.log('  -> FAILED: Output does not contain expected identifier');
        throw new Error('JSON-LD Export verification failed');
    }
    console.log('  -> PASS');

    // TEST 4: NEGATIVE TEST (RDF/XML - Unsupported)
    console.log('[Test 4] Export Feature (RDF/XML - Expect Failure)');
    try {
        await serializer.serialize(quads, { format: 'RDF/XML' });
        throw new Error('RDF/XML should have failed');
    } catch (e) {
        if (e.message.includes('not available')) {
            console.log('  -> PASS (Correctly Error: ' + e.message + ')');
        } else {
            throw e;
        }
    }

    console.log('--- ALL TESTS PASSED ---');
}

runTests().then(() => {
    process.exit(0);
}).catch(e => {
    console.error('SENTINEL CRITICAL FAILURE');
    console.error(e.stack || e);
    process.exit(1);
});
