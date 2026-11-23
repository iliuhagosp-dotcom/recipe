const test=require('node:test');const assert=require('node:assert');const fs=require('fs');
const idx=fs.readFileSync('index.html','utf8');
test('aurora layer present',()=>{for(const k of['Blackgram 7.5 — Aurora','--grad:linear-gradient','backdrop-filter:blur(18px)','@keyframes auPulse','prefers-reduced-motion','overflow-x:hidden'])assert.ok(idx.includes(k),k)});
test('no broken leftovers',()=>{assert.ok(!idx.includes('stroke:url(#none)'));assert.ok(!idx.includes('#people:empty::before'))});
test('index copies are identical',()=>{assert.strictEqual(idx,fs.readFileSync('www/index.html','utf8'));assert.strictEqual(idx,fs.readFileSync('public/index.html','utf8'))});
