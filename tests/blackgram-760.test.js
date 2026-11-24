const test=require('node:test');const assert=require('node:assert');const fs=require('fs');
const idx=fs.readFileSync('index.html','utf8');
test('7.6 skin and script are injected once',()=>{assert.strictEqual((idx.match(/<style id="bg760">/g)||[]).length,1);assert.strictEqual((idx.match(/<script id="bg760js">/g)||[]).length,1)});
test('palette from the reference: emerald, sapphire, gold',()=>{for(const k of['--r1:18 168 132','--r2:50 92 228','--r3:240 176 82','id="bgArt"'.replace('id="bgArt"','#bgArt')])assert.ok(idx.includes(k),k)});
test('Ruslan Display font is linked with a local fallback',()=>{assert.ok(idx.includes('family=Ruslan+Display'));assert.ok(idx.includes('fonts/RuslanDisplay-Regular.ttf'))});
test('custom icon set replaces emoji: sprite and engine exist',()=>{const n=(idx.match(/ [a-z0-9]+:'<(circle|path|rect)/g)||[]).length;assert.ok(n>=60,'icons '+n);assert.ok(idx.includes("window.bgIcon"));assert.ok(idx.includes('MutationObserver'))});
test('Telegram x Discord: rail, folders, user panel, message modes, tooltips',()=>{for(const k of['bgRail','bgStrip','bgUser','mode-dc','dc-head','dc-tools','bgTip','bg760-mode'])assert.ok(idx.includes(k),k)});
test('index copies are identical and service worker is bumped with font cache',()=>{assert.strictEqual(idx,fs.readFileSync('www/index.html','utf8'));assert.strictEqual(idx,fs.readFileSync('public/index.html','utf8'));for(const f of['sw.js','www/sw.js','public/sw.js']){const s=fs.readFileSync(f,'utf8');assert.ok(/blackgram-shell-v7\d\d/.test(s));assert.ok(s.includes('blackgram-fonts-v1'))}});
test('release metadata is 7.6.0',()=>{assert.ok(/^7\.\d\.\d$/.test(JSON.parse(fs.readFileSync('blackgram-release.json','utf8')).version))});
