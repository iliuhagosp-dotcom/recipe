const test=require('node:test');const assert=require('node:assert');const fs=require('fs');
const idx=fs.readFileSync('index.html','utf8'),fn=fs.readFileSync('functions/index.js','utf8'),rules=fs.readFileSync('firestore.rules','utf8');
test('gift and wallet client code present once',()=>{for(const k of['function bgGiftShop(','function bgWalletInit(','function bgPaintGift(','async function bgGiftsTab(','id="bg780"','id="controlWallet"','id="walletGive"'])assert.strictEqual(idx.split(k).length-1,1,k)});
test('wallet tab is owner-only in admin panel',()=>{assert.ok(idx.includes("${owner?'<button type=\"button\" data-ct=\"wallet\">"))});
test('server functions exist; grant is owner-only',()=>{for(const k of['exports.claimDaily','exports.sendGift','exports.adminGrantSparks'])assert.ok(fn.includes(k),k);const g=fn.slice(fn.indexOf('exports.adminGrantSparks'));assert.ok(g.indexOf('OWNER_EMAIL')>0&&g.indexOf('OWNER_EMAIL')<g.indexOf('runTransaction'))});
test('rules: wallets cannot be written by clients',()=>{const w=rules.slice(rules.indexOf('match /wallets/{uid}'));assert.ok(/allow write: if false/.test(w.slice(0,400)))});
test('client gift ids match server catalog',()=>{const ids=[...idx.matchAll(/\{id:'(\w+)',name:'[^']+',rar:/g)].map(m=>m[1]);assert.ok(ids.length>=25,String(ids.length));for(const i of ids)assert.ok(new RegExp('\\b'+i+':\\{p:').test(fn),i)});
test('index copies identical',()=>{assert.strictEqual(idx,fs.readFileSync('www/index.html','utf8'));assert.strictEqual(idx,fs.readFileSync('public/index.html','utf8'))});
