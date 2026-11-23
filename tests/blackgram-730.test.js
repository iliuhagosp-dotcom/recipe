const test=require('node:test');const assert=require('node:assert');const fs=require('fs');
const idx=fs.readFileSync('index.html','utf8');
test('telegram shell present',()=>{for(const k of['id="bg730"','tgDrawer','tgBurger','tgAttach','tgEmojiPane','tgMic','tg-rip','Blackgram 7.4'])assert.ok(idx.includes(k),k)});
test('drawer menu only triggers existing buttons',()=>{for(const id of['profileBtn','newGroup','channelBtn','savedBtn','bg5Catalog','bg5Stickers','bg5Archive','bg5Username','privacyBtn','bg5Blocklist','themeBtn','bg5Support','adminBtn','logout'])assert.ok(idx.includes('id=\"'+id+'\"'),id)});
test('index copies are identical',()=>{assert.strictEqual(idx,fs.readFileSync('www/index.html','utf8'));assert.strictEqual(idx,fs.readFileSync('public/index.html','utf8'))});
