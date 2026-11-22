const test=require('node:test');const assert=require('node:assert');const fs=require('fs');
const idx=fs.readFileSync('index.html','utf8');
test('index copies are identical',()=>{assert.strictEqual(idx,fs.readFileSync('www/index.html','utf8'));assert.strictEqual(idx,fs.readFileSync('public/index.html','utf8'))});
test('7.1 features present',()=>{for(const k of['bg8WrapRow','bg8Bump','bg8Decorate','bg8PinMessage','bg8-swico','bg8-call-ui','bg8RecomputePeople','bg8AddContact','bg8-online','bg8-typing'])assert.ok(idx.includes(k),k)});
test('people list is built from contacts only',()=>{assert.ok(idx.includes('bg8RecomputePeople();renderPeople()'));assert.ok(!idx.includes('people=allUsers.filter(p=>p.id!==currentUser.uid&&!p.blocked&&!p.privateProfile);renderPeople()'))});
test('module script parses',()=>{const m=idx.match(/<script type="module">([\s\S]*?)<\/script>/);fs.writeFileSync('/tmp/bg-module.mjs',m[1]);require('child_process').execFileSync(process.execPath,['--check','/tmp/bg-module.mjs'])});
test('rules allow pinnedMsg and function honours mute',()=>{assert.ok(fs.readFileSync('firestore.rules','utf8').includes("'pinnedMsg'"));assert.ok(fs.readFileSync('functions/index.js','utf8').includes('mutedChats'))});
