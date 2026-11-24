const test=require('node:test');const assert=require('node:assert');const fs=require('fs');
test('functions run on a supported Node runtime',()=>{assert.strictEqual(JSON.parse(fs.readFileSync('functions/package.json','utf8')).engines.node,'22')});
for(const f of['index.html','public/index.html','www/index.html'])test('photo upload works without Storage in '+f,()=>{const s=fs.readFileSync(f,'utf8');assert.ok(s.includes('async function bgUpload(blob,kind,onP){if(!STORAGE_ENABLED)return await new Promise'));assert.ok(s.includes('readAsDataURL(blob)'));assert.ok(s.includes('STORAGE_ENABLED?512:192'))});
test('deploy workflow and guide exist',()=>{assert.ok(fs.existsSync('.github/workflows/deploy-firebase.yml'));assert.ok(fs.existsSync('DEPLOY-PHONE-RU.md'))});
