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
 for(const user of users){if(!user.exists||user.data().pushEnabled===false)continue;for(const token of (Array.isArray(user.data().fcmTokens)?user.data().fcmTokens:[]))targets.push({uid:user.id,token})}
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
