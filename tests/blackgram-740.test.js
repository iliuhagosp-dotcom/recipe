const test=require('node:test');const assert=require('node:assert');const fs=require('fs');
const idx=fs.readFileSync('index.html','utf8');
test('flat telegram skin, no leftover gradient skin',()=>{assert.ok(idx.includes('Blackgram 7.4 — Telegram redesign'));assert.ok(!idx.includes('Blackgram 7.2 — Telegram-style gradient'));assert.ok(idx.includes('--tg-out:'));assert.ok(idx.includes("'#ff885e','#ff516a'"))});
test('message time is inline and input has no focus box',()=>{assert.ok(idx.includes('.bubble .msgmeta{float:right'));assert.ok(idx.includes('.send input:focus-visible{outline:0!important'))});
test('auth tabs keep active state',()=>{assert.ok(idx.includes(':not(.seg button):not(#pwToggle)'))});
