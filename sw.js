const CACHE='blackgram-shell-v3';
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  const url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==location.origin)return;
  event.respondWith(fetch(request).then(response=>{
    if(response.ok && request.mode==='navigate'){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put('./index.html',copy));
    }
    return response;
  }).catch(()=>caches.match(request).then(cached=>cached||caches.match('./index.html'))));
});
