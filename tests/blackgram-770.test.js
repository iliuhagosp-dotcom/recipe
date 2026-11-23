const test=require('node:test');const assert=require('node:assert');const fs=require('fs');
const idx=fs.readFileSync('index.html','utf8');
test('7.7 profile photo tools exist once',()=>{for(const k of['function bgCrop(','function bgUpload(','function bgViewer(','function bgProfileExtras(','function bgEditProfile(','id="bg770"'])assert.strictEqual(idx.split(k).length-1,1,k)});
test('storage import has deleteObject',()=>{assert.ok(/uploadBytesResumable,getDownloadURL,deleteObject\}/.test(idx))});
test('public profile function syncs new fields',()=>{const f=fs.readFileSync('functions/index.js','utf8');for(const k of['banner','photos','privacy'])assert.ok(f.includes("'"+k+"'"),k)});
test('index copies identical',()=>{assert.strictEqual(idx,fs.readFileSync('www/index.html','utf8'));assert.strictEqual(idx,fs.readFileSync('public/index.html','utf8'))});
