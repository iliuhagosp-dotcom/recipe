const test=require('node:test');const assert=require('node:assert');const fs=require('fs');
const idx=fs.readFileSync('index.html','utf8');
test('18+ photo marking present',()=>{for(const k of['bg9Nsfw','bg9-sens','bg9-veil','sensitive:true','sendMsgDoc=async function','paintMessage=function'])assert.ok(idx.includes(k),k)});
test('index copies are identical',()=>{assert.strictEqual(idx,fs.readFileSync('www/index.html','utf8'));assert.strictEqual(idx,fs.readFileSync('public/index.html','utf8'))});
