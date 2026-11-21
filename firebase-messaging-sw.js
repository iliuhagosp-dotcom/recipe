/* Firebase Cloud Messaging background worker for Blackgram. */
importScripts('https://www.gstatic.com/firebasejs/13.3.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/13.3.0/firebase-messaging-compat.js');
firebase.initializeApp({apiKey:'AIzaSyC8ib7JhKn-Q2ltqHD0bEhTHx21HId2FSw',authDomain:'blackgram-35ecf.firebaseapp.com',projectId:'blackgram-35ecf',storageBucket:'blackgram-35ecf.firebasestorage.app',messagingSenderId:'607142975760',appId:'1:607142975760:web:cbbefd79ce7d07215aed95a'});
const messaging=firebase.messaging();
messaging.onBackgroundMessage(payload=>{const n=payload.notification||{},d=payload.data||{};self.registration.showNotification(n.title||'Blackgram',{body:n.body||'Тебе пришло новое сообщение',icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',tag:d.chatId||'blackgram-message',data:{url:'./',chatId:d.chatId||''},renotify:true})});
self.addEventListener('notificationclick',event=>{event.notification.close();const target=new URL(event.notification.data?.url||'./',self.location.origin).href;event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{for(const client of clients)if('focus'in client){client.navigate(target);return client.focus()}return self.clients.openWindow(target)}))});
