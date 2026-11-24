const CACHE='blackgram-shell-v794';
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(async cache=>{for(const url of SHELL){try{await cache.add(url)}catch(e){console.warn('Не удалось закэшировать',url,e)}}}).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('blackgram-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method==='GET'&&/fonts\.(googleapis|gstatic)\.com$/.test(new URL(req.url).hostname)){event.respondWith(caches.open('blackgram-fonts-v1').then(async c=>{const hit=await c.match(req);const net=fetch(req).then(r=>{if(r.ok||r.type==='opaque')c.put(req,r.clone());return r}).catch(()=>hit);return hit||net}));return}
if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 if(req.mode==='navigate'){event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return res}).catch(()=>caches.match('./index.html')));return}
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return res})));
});
