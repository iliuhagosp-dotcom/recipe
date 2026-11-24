const test=require('node:test');const assert=require('node:assert');const fs=require('fs');
for(const f of['index.html','public/index.html','www/index.html'])test('ui fixes in '+f,()=>{const s=fs.readFileSync(f,'utf8');for(const k of['id="bg793"','pf-avwrap','pf-ph','.bubble.mine>small.muted','min-width:max-content'])assert.ok(s.includes(k),k)});
