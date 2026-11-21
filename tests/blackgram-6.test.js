const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('index.html','utf8');
const fn = fs.readFileSync('functions/index.js','utf8');
const rules = fs.readFileSync('firestore.rules','utf8');
const script = html.match(/<script type="module">([\s\S]*?)<\/script>/)?.[1];

function featureCatalog(){
  const start=script.indexOf('const BG6_FEATURES=');
  const end=script.indexOf('];',start)+1;
  return vm.runInNewContext(script.slice(start+'const BG6_FEATURES='.length,end));
}
function calculator(){
  const start=script.indexOf('function bg6Calculate(expr){');
  const end=script.indexOf('\nfunction bg6SendText',start);
  const sandbox={};
  vm.runInNewContext(script.slice(start,end)+';this.calc=bg6Calculate;',sandbox);
  return sandbox.calc;
}

test('Blackgram module parses as JavaScript',()=>{
  assert.ok(script && script.includes('Blackgram 6.0'));
  const {spawnSync}=require('node:child_process');
  const temp='/tmp/blackgram-6-module-check.mjs';
  fs.writeFileSync(temp,script);
  const r=spawnSync(process.execPath,['--check',temp],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
});
test('Mega Center contains 30 unique features',()=>{
  const list=featureCatalog();
  assert.equal(list.length,30);
  assert.equal(new Set(list.map(x=>x[0])).size,30);
});
test('calculator respects precedence and parentheses',()=>{
  const calc=calculator();
  assert.equal(calc('12*8'),96);
  assert.equal(calc('(12+8)/4'),5);
  assert.equal(calc('10-2*3'),4);
});
test('calculator rejects code and division by zero',()=>{
  const calc=calculator();
  assert.throws(()=>calc('alert(1)'));
  assert.throws(()=>calc('2/0'));
});
test('scheduled delivery is present and only sends to chat members',()=>{
  assert.match(fn,/exports\.deliverScheduledMessages=onSchedule/);
  assert.match(fn,/participants\.includes\(data\.senderId\)/);
});
test('Firestore rules protect private and shared feature collections',()=>{
  assert.match(rules,/match \/users\/{uid}\/bg6\/{itemId}/);
  assert.match(rules,/match \/chats\/{chatId}\/bg6notes\/{itemId}/);
  assert.match(rules,/match \/scheduledMessages\/{id}/);
});

test('all 30 catalog entries have a feature handler',()=>{
  const list=featureCatalog();
  for(const [id] of list) assert.match(script,new RegExp('case \\\'?'+id+'\\\'?\\s*:'),`Missing handler for ${id}`);
});
