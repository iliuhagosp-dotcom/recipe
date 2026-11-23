const {onDocumentCreated}=require('firebase-functions/v2/firestore');
const {onSchedule}=require('firebase-functions/v2/scheduler');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {getMessaging}=require('firebase-admin/messaging');
initializeApp();
const db=getFirestore();
exports.sendChatPush=onDocumentCreated({document:'chats/{chatId}/messages/{messageId}',region:'europe-west1',retry:true},async event=>{
 const msg=event.data?.data();if(!msg||!msg.senderId)return;
 const chatSnap=await db.doc(`chats/${event.params.chatId}`).get();if(!chatSnap.exists)return;
 const participants=Array.isArray(chatSnap.data().participants)?chatSnap.data().participants:[];
 const recipients=participants.filter(uid=>uid&&uid!==msg.senderId);if(!recipients.length)return;
 const senderSnap=await db.doc(`users/${msg.senderId}`).get();const sender=senderSnap.exists?senderSnap.data():{};
 const title=String(sender.name||sender.displayName||'Новое сообщение').slice(0,80);
 const body=String(msg.text||(msg.audioData?'🎙 Голосовое сообщение':msg.imageData?'📷 Фото':msg.fileUrl?'📎 Файл':'Новое сообщение')).slice(0,180);
 const users=await Promise.all(recipients.map(uid=>db.doc(`users/${uid}`).get()));const targets=[];
 for(const user of users){if(!user.exists||user.data().pushEnabled===false||(Array.isArray(user.data().mutedChats)&&user.data().mutedChats.includes(event.params.chatId)))continue;for(const token of (Array.isArray(user.data().fcmTokens)?user.data().fcmTokens:[]))targets.push({uid:user.id,token})}
 const invalid=[];
 for(let i=0;i<targets.length;i+=500){const batch=targets.slice(i,i+500);const result=await getMessaging().sendEachForMulticast({tokens:batch.map(x=>x.token),notification:{title,body},data:{chatId:event.params.chatId,senderId:msg.senderId},webpush:{fcmOptions:{link:'/'},notification:{icon:'/icons/icon-192.png',tag:event.params.chatId}}});result.responses.forEach((r,j)=>{if(!r.success&&['messaging/registration-token-not-registered','messaging/invalid-registration-token'].includes(r.error?.code))invalid.push(batch[j])})}
 await Promise.all(invalid.map(async x=>{const ref=db.doc(`users/${x.uid}`);const snap=await ref.get();await ref.update({fcmTokens:(snap.data()?.fcmTokens||[]).filter(t=>t!==x.token)})}));
});


// Blackgram 6.0: deliver scheduled messages once per minute.
exports.deliverScheduledMessages=onSchedule({schedule:'every 1 minutes',region:'europe-west1',timeZone:'Europe/Chisinau',retryCount:3},async()=>{
 const now=new Date();
 const pending=await db.collection('scheduledMessages').where('status','==','pending').limit(100).get();
 for(const item of pending.docs){
  const data=item.data();
  if(!data.scheduledAt||data.scheduledAt.toDate()>now)continue;
  // Atomically claim the task so overlapping scheduler invocations cannot both send it.
  const claimed=await db.runTransaction(async tx=>{
   const fresh=await tx.get(item.ref);
   if(!fresh.exists||fresh.data().status!=='pending')return false;
   tx.update(item.ref,{status:'processing',claimedAt:new Date()});
   return true;
  });
  if(!claimed)continue;
  try{
   const chatRef=db.doc(`chats/${data.chatId}`),chat=await chatRef.get();
   if(!chat.exists||!Array.isArray(chat.data().participants)||!chat.data().participants.includes(data.senderId)){
    await item.ref.update({status:'failed',failureReason:'not_chat_member',processedAt:new Date()});continue;
   }
   const messageRef=db.collection('chats').doc(data.chatId).collection('messages').doc(`scheduled_${item.id}`);
   try{
    await messageRef.create({text:String(data.text||'').slice(0,4000),senderId:data.senderId,senderName:String(data.senderName||'Пользователь').slice(0,80),createdAt:new Date(),scheduled:true});
   }catch(error){
    // If a previous invocation created the deterministic message document, do not duplicate it.
    if(error.code!=='already-exists'&&error.code!==6)throw error;
   }
   await chatRef.update({lastText:String(data.text||'').slice(0,100),lastSenderId:data.senderId,lastAt:new Date()});
   await item.ref.update({status:'sent',sentAt:new Date()});
  }catch(error){
   console.error('Scheduled message delivery failed',item.id,error);
   await item.ref.update({status:'failed',failureReason:String(error.message||'delivery_failed').slice(0,180),processedAt:new Date()}).catch(()=>{});
  }
 }
});


// Blackgram 7.1.4: публичная копия профиля без e-mail и FCM-токенов.
const {onDocumentWritten,onDocumentDeleted}=require('firebase-functions/v2/firestore');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const {FieldValue}=require('firebase-admin/firestore');
const crypto=require('crypto');
const OWNER_EMAIL='iliuhagosp@gmail.com';
const PUBLIC_FIELDS=['username','usernameLower','photoURL','verified','tags','role','blocked','privateProfile','status','musicStatus','profileEffect','createdAt','banner','photos','privacy','about','birthday'];
function buildPublicProfile(u){
 const email=String(u.email||'').trim().toLowerCase();
 let name=String(u.name||'').trim();if(!name||name.includes('@'))name=(name||email).split('@')[0]||'Пользователь';
 const pub={name:name.slice(0,80),owner:email===OWNER_EMAIL,emailHash:email?crypto.createHash('sha256').update(email).digest('hex'):FieldValue.delete()};
 for(const k of PUBLIC_FIELDS)pub[k]=u[k]===undefined?FieldValue.delete():u[k];
 return pub;
}
const stable=(o,keys)=>JSON.stringify(keys.map(k=>{const v=o?.[k];return v&&v.toMillis?v.toMillis():(v&&v._delegate?null:v)??null}));
async function syncOne(uid,u){
 const ref=db.doc(`publicProfiles/${uid}`);
 if(!u){await ref.delete().catch(()=>{});return}
 const pub=buildPublicProfile(u),cur=await ref.get(),keys=['name','owner','emailHash',...PUBLIC_FIELDS];
 const next={};for(const k of keys)next[k]=pub[k] instanceof FieldValue?null:pub[k];
 if(cur.exists&&stable(cur.data(),keys)===stable(next,keys))return;
 await ref.set(pub,{merge:true});
}
exports.syncPublicProfile=onDocumentWritten({document:'users/{uid}',region:'europe-west1'},async event=>{
 await syncOne(event.params.uid,event.data?.after?.exists?event.data.after.data():null);
});
// Одноразовое заполнение для уже существующих пользователей: вызывает владелец.
exports.backfillPublicProfiles=onCall({region:'europe-west1'},async request=>{
 if(String(request.auth?.token?.email||'').toLowerCase()!==OWNER_EMAIL)throw new HttpsError('permission-denied','owner only');
 const snap=await db.collection('users').get();let n=0;
 for(const d of snap.docs){await syncOne(d.id,d.data());n++}
 return {synced:n};
});
// Удаление группы или канала администратором убирает и всю переписку.
exports.cleanupDeletedChat=onDocumentDeleted({document:'chats/{chatId}',region:'europe-west1'},async event=>{
 await db.recursiveDelete(db.doc(`chats/${event.params.chatId}`));
});

// ===== Blackgram 7.8: Искры (внутренняя валюта) и подарки =====
// Баланс хранится только в wallets/{uid}; клиент его менять не может (правила: write false).
const SPARK_START=100,SPARK_DAILY=10,SPARK_STREAK7=50,GIFTS_PER_DAY=10;
const GIFTS={rose:{p:5,n:'Роза'},cake:{p:8,n:'Торт'},bear:{p:10,n:'Мишка'},rocket:{p:15,n:'Ракета'},heart:{p:30,n:'Сердце'},star:{p:40,n:'Звезда'},box:{p:60,n:'Коробка'},crown:{p:100,n:'Корона',limit:200},trophy:{p:150,n:'Кубок'},diamond:{p:250,n:'Алмаз',limit:100},coffee:{p:5,n:'Кофе'},balloon:{p:6,n:'Шарик'},tulip:{p:6,n:'Тюльпан'},pizza:{p:8,n:'Пицца'},icecream:{p:8,n:'Мороженое'},cat:{p:12,n:'Котик'},guitar:{p:15,n:'Гитара'},fireworks:{p:15,n:'Салют'},
 moon:{p:35,n:'Луна'},clover:{p:35,n:'Клевер'},rainbow:{p:45,n:'Радуга'},flame:{p:50,n:'Пламя'},bolt:{p:120,n:'Молния',limit:300},planet:{p:180,n:'Планета'},ring:{p:300,n:'Кольцо',limit:50}};
const dayKey=()=>Math.floor(Date.now()/864e5);
exports.claimDaily=onCall({region:'europe-west1'},async req=>{
 const uid=req.auth?.uid;if(!uid)throw new HttpsError('unauthenticated','Нужно войти');
 const wRef=db.doc(`wallets/${uid}`);
 return db.runTransaction(async tx=>{
  const w=await tx.get(wRef),d=w.data()||{},day=dayKey();let got=0,welcome=false,streak=d.streak||0;const upd={};
  if(!d.welcome){got+=SPARK_START;welcome=true;upd.welcome=true}
  if(d.lastDay!==day){streak=d.lastDay===day-1?streak+1:1;got+=streak%7===0?SPARK_STREAK7:SPARK_DAILY;upd.lastDay=day;upd.streak=streak}
  const bal=d.balance||0;if(!got)return {balance:bal,claimed:0,streak};
  upd.balance=bal+got;tx.set(wRef,upd,{merge:true});
  tx.set(wRef.collection('log').doc(),{type:welcome?'welcome_daily':'daily',amount:got,streak,createdAt:FieldValue.serverTimestamp()});
  return {balance:bal+got,claimed:got,streak,welcome};
 });
});
exports.sendGift=onCall({region:'europe-west1'},async req=>{
 const uid=req.auth?.uid;if(!uid)throw new HttpsError('unauthenticated','Нужно войти');
 const {chatId,giftId}=req.data||{},g=GIFTS[giftId];
 if(!g||typeof chatId!=='string'||!chatId)throw new HttpsError('invalid-argument','Неверный подарок');
 const note=String(req.data?.note||'').slice(0,120),anon=!!req.data?.anonymous;
 const chatRef=db.doc(`chats/${chatId}`),wRef=db.doc(`wallets/${uid}`),sRef=db.doc(`giftStock/${giftId}`),meRef=db.doc(`users/${uid}`);
 return db.runTransaction(async tx=>{
  const [chat,w,st,me]=await Promise.all([tx.get(chatRef),tx.get(wRef),tx.get(sRef),tx.get(meRef)]);
  const c=chat.data();if(!chat.exists||c.kind!=='personal'||!Array.isArray(c.participants)||!c.participants.includes(uid))throw new HttpsError('permission-denied','Подарок можно отправить только в личном чате');
  const to=c.participants.find(x=>x!==uid);if(!to)throw new HttpsError('invalid-argument','Нельзя дарить себе');
  const m=me.data()||{};if(m.blocked)throw new HttpsError('permission-denied','Аккаунт заблокирован');
  const d=w.data()||{},bal=d.balance||0,day=dayKey(),today=d.giftsDay===day?(d.giftsToday||0):0;
  if(today>=GIFTS_PER_DAY)throw new HttpsError('resource-exhausted','Лимит подарков на сегодня исчерпан');
  if(bal<g.p)throw new HttpsError('failed-precondition','Недостаточно Искр');
  const sold=st.data()?.sold||0;if(g.limit&&sold>=g.limit)throw new HttpsError('failed-precondition','Тираж этого подарка закончился');
  const name=String(m.name||'Пользователь').slice(0,80),ts=FieldValue.serverTimestamp();
  tx.set(wRef,{balance:bal-g.p,giftsDay:day,giftsToday:today+1},{merge:true});
  tx.set(wRef.collection('log').doc(),{type:'gift_sent',amount:-g.p,giftId,to,createdAt:ts});
  if(g.limit)tx.set(sRef,{sold:sold+1},{merge:true});
  tx.set(db.collection(`users/${to}/gifts`).doc(),{giftId,from:anon?null:uid,fromName:anon?'':name,anonymous:anon,note,pinned:false,createdAt:ts});
  tx.set(db.collection(`chats/${chatId}/messages`).doc(),{gift:giftId,text:'🎁 Подарок: '+g.n,note,senderId:uid,senderName:name,createdAt:ts});
  tx.update(chatRef,{lastText:'🎁 Подарок: '+g.n,lastSenderId:uid,lastAt:ts});
  return {balance:bal-g.p};
 });
});
// Накрутка валюты: только владелец (проверка по email из токена).
exports.adminGrantSparks=onCall({region:'europe-west1'},async req=>{
 if(String(req.auth?.token?.email||'').toLowerCase()!==OWNER_EMAIL)throw new HttpsError('permission-denied','Только для владельца');
 const {uid,amount,reason}=req.data||{},n=Math.trunc(Number(amount));
 if(typeof uid!=='string'||!uid||!Number.isFinite(n)||n===0||Math.abs(n)>1000000)throw new HttpsError('invalid-argument','Неверная сумма');
 const uRef=db.doc(`users/${uid}`),wRef=db.doc(`wallets/${uid}`);
 const res=await db.runTransaction(async tx=>{
  const [u,w]=await Promise.all([tx.get(uRef),tx.get(wRef)]);if(!u.exists)throw new HttpsError('not-found','Пользователь не найден');
  const bal=w.data()?.balance||0;if(bal+n<0)throw new HttpsError('failed-precondition','Баланс не может стать отрицательным');
  tx.set(wRef,{balance:bal+n},{merge:true});
  tx.set(wRef.collection('log').doc(),{type:'admin_grant',amount:n,by:req.auth.uid,reason:String(reason||'').slice(0,100),createdAt:FieldValue.serverTimestamp()});
  return {balance:bal+n,name:u.data().name||u.data().email||''};
 });
 await db.collection('adminLog').add({by:req.auth.uid,byName:'Владелец',targetId:uid,targetName:res.name,action:'sparks_grant',extra:(n>0?'+':'')+n+(reason?' · '+String(reason).slice(0,100):''),createdAt:FieldValue.serverTimestamp()});
 return {balance:res.balance};
});
