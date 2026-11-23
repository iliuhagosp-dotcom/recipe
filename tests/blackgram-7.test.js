const test=require('node:test');const assert=require('node:assert');const fs=require('fs');
const idx=fs.readFileSync('index.html','utf8');
test('index copies are identical',()=>{assert.strictEqual(idx,fs.readFileSync('www/index.html','utf8'));assert.strictEqual(idx,fs.readFileSync('public/index.html','utf8'))});
test('7.0 skin, tags and FAB present',()=>{assert.ok(idx.includes('Blackgram 7.0'));assert.ok(idx.includes('BG7_TAGS'));assert.ok(idx.includes('bg7Fab'));assert.ok(idx.includes('data-tagset'))});
test('rules protect tags',()=>{const r=fs.readFileSync('firestore.rules','utf8');assert.ok(r.includes("'verified', 'tags'"));assert.ok(r.includes("!('tags' in request.resource.data)"))});
test('service worker cache bumped',()=>{for(const f of['sw.js','www/sw.js','public/sw.js'])assert.match(fs.readFileSync(f,'utf8'),/blackgram-shell-v7\d\d/)});
