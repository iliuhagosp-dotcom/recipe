const test=require('node:test');const assert=require('node:assert');const fs=require('fs');
test('only one menu button remains in every index copy',()=>{for(const f of['index.html','public/index.html','www/index.html']){const s=fs.readFileSync(f,'utf8');assert.ok(!s.includes('id="menuBtn"'),f);assert.ok(!s.includes("$('menuBtn')"),f);assert.strictEqual(s.split('id="tgBurger"').length-1,1,f)}});
