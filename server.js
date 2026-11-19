
const express = require("express");
const http = require("http");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "CHANGE_THIS_SECRET_BEFORE_DEPLOY";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "").toLowerCase();
const db = new Database(process.env.DB_FILE || "blackgram.sqlite");
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL,
 email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user',
 blocked INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS chats (
 id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'personal',
 created_by INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS members (
 chat_id INTEGER NOT NULL, user_id INTEGER NOT NULL, PRIMARY KEY(chat_id,user_id)
);
CREATE TABLE IF NOT EXISTS messages (
 id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
 body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);
const q = (sql) => db.prepare(sql);
app.use(express.json({limit:"1mb"}));
app.use(express.static(path.join(__dirname,"public")));

function tokenFor(user){ return jwt.sign({id:user.id},SECRET,{expiresIn:"30d"}); }
function publicUser(u){ return {id:u.id,username:u.username,email:u.email,role:u.role,blocked:!!u.blocked}; }
function auth(req,res,next){
 const h=req.headers.authorization||"";
 try {
  const payload=jwt.verify(h.replace(/^Bearer\s+/i,""),SECRET);
  const user=q("SELECT * FROM users WHERE id=?").get(payload.id);
  if(!user || user.blocked) return res.status(401).json({error:"Аккаунт недоступен"});
  req.user=user; next();
 } catch { return res.status(401).json({error:"Войдите в аккаунт"}); }
}
function admin(req,res,next){ if(req.user.role!=="admin") return res.status(403).json({error:"Только для администратора"}); next(); }

app.post("/api/register",(req,res)=>{
 const username=String(req.body.username||"").trim().slice(0,32);
 const email=String(req.body.email||"").trim().toLowerCase();
 const password=String(req.body.password||"");
 if(username.length<2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length<8)
  return res.status(400).json({error:"Укажи имя, корректную почту и пароль от 8 символов"});
 try {
  const role=email===ADMIN_EMAIL && ADMIN_EMAIL ? "admin" : "user";
  const info=q("INSERT INTO users(username,email,password,role) VALUES(?,?,?,?)")
   .run(username,email,bcrypt.hashSync(password,12),role);
  const user=q("SELECT * FROM users WHERE id=?").get(info.lastInsertRowid);
  const chat=q("INSERT INTO chats(title,kind,created_by) VALUES(?,?,?)").run("Избранное","saved",user.id);
  q("INSERT INTO members(chat_id,user_id) VALUES(?,?)").run(chat.lastInsertRowid,user.id);
  res.json({token:tokenFor(user),user:publicUser(user)});
 } catch(e){ res.status(409).json({error:"Эта почта уже зарегистрирована"}); }
});
app.post("/api/login",(req,res)=>{
 const email=String(req.body.email||"").trim().toLowerCase(), password=String(req.body.password||"");
 const user=q("SELECT * FROM users WHERE email=?").get(email);
 if(!user || !bcrypt.compareSync(password,user.password)) return res.status(401).json({error:"Неверная почта или пароль"});
 if(user.blocked) return res.status(403).json({error:"Аккаунт заблокирован"});
 res.json({token:tokenFor(user),user:publicUser(user)});
});
app.get("/api/me",auth,(req,res)=>res.json({user:publicUser(req.user)}));
app.get("/api/users",auth,(req,res)=>{
 const users=q("SELECT id,username,email,role FROM users WHERE id<>? AND blocked=0 ORDER BY username").all(req.user.id);
 res.json({users});
});
app.get("/api/chats",auth,(req,res)=>{
 const chats=q(`SELECT c.id,c.title,c.kind,
 (SELECT body FROM messages WHERE chat_id=c.id ORDER BY id DESC LIMIT 1) last_message,
 (SELECT created_at FROM messages WHERE chat_id=c.id ORDER BY id DESC LIMIT 1) last_time
 FROM chats c JOIN members m ON m.chat_id=c.id WHERE m.user_id=? ORDER BY COALESCE(last_time,c.created_at) DESC`).all(req.user.id);
 res.json({chats});
});
app.post("/api/chats",auth,(req,res)=>{
 const title=String(req.body.title||"").trim().slice(0,60);
 const kind=["group","channel"].includes(req.body.kind)?req.body.kind:"personal";
 const ids=[...new Set([req.user.id,...(Array.isArray(req.body.userIds)?req.body.userIds.map(Number):[])])];
 if(title.length<2) return res.status(400).json({error:"Название слишком короткое"});
 const tx=db.transaction(()=>{
  const info=q("INSERT INTO chats(title,kind,created_by) VALUES(?,?,?)").run(title,kind,req.user.id);
  const id=info.lastInsertRowid;
  const add=q("INSERT OR IGNORE INTO members(chat_id,user_id) VALUES(?,?)");
  ids.forEach(uid=>{if(q("SELECT id FROM users WHERE id=? AND blocked=0").get(uid))add.run(id,uid)});
  return id;
 });
 const id=tx();
 const chat=q("SELECT id,title,kind FROM chats WHERE id=?").get(id);
 res.json({chat});
});
app.get("/api/chats/:id/messages",auth,(req,res)=>{
 const id=Number(req.params.id);
 if(!q("SELECT 1 FROM members WHERE chat_id=? AND user_id=?").get(id,req.user.id)) return res.status(403).json({error:"Нет доступа к чату"});
 const messages=q(`SELECT m.id,m.body,m.created_at,u.id user_id,u.username FROM messages m JOIN users u ON u.id=m.user_id WHERE m.chat_id=? ORDER BY m.id DESC LIMIT 100`).all(id).reverse();
 res.json({messages});
});
app.post("/api/chats/:id/messages",auth,(req,res)=>{
 const id=Number(req.params.id), body=String(req.body.body||"").trim().slice(0,4000);
 if(!body) return res.status(400).json({error:"Пустое сообщение"});
 if(!q("SELECT 1 FROM members WHERE chat_id=? AND user_id=?").get(id,req.user.id)) return res.status(403).json({error:"Нет доступа к чату"});
 const info=q("INSERT INTO messages(chat_id,user_id,body) VALUES(?,?,?)").run(id,req.user.id,body);
 const msg=q(`SELECT m.id,m.chat_id,m.body,m.created_at,u.id user_id,u.username FROM messages m JOIN users u ON u.id=m.user_id WHERE m.id=?`).get(info.lastInsertRowid);
 io.to("chat:"+id).emit("message",msg);
 res.json({message:msg});
});
app.get("/api/admin/users",auth,admin,(req,res)=>{
 res.json({users:q("SELECT id,username,email,role,blocked,created_at FROM users ORDER BY id DESC").all()});
});
app.patch("/api/admin/users/:id",auth,admin,(req,res)=>{
 const id=Number(req.params.id);
 if(id===req.user.id) return res.status(400).json({error:"Нельзя заблокировать самого себя"});
 const blocked=req.body.blocked?1:0;
 q("UPDATE users SET blocked=? WHERE id=?").run(blocked,id);
 res.json({ok:true});
});
app.get("/api/admin/stats",auth,admin,(req,res)=>{
 res.json({users:q("SELECT COUNT(*) n FROM users").get().n,chats:q("SELECT COUNT(*) n FROM chats").get().n,messages:q("SELECT COUNT(*) n FROM messages").get().n});
});

io.use((socket,next)=>{
 try {
  const p=jwt.verify(socket.handshake.auth.token,SECRET);
  const user=q("SELECT * FROM users WHERE id=? AND blocked=0").get(p.id);
  if(!user) return next(new Error("unauthorized"));
  socket.user=user; next();
 } catch { next(new Error("unauthorized")); }
});
io.on("connection",socket=>{
 socket.on("join-chat",id=>{
  id=Number(id);
  if(q("SELECT 1 FROM members WHERE chat_id=? AND user_id=?").get(id,socket.user.id)) socket.join("chat:"+id);
 });
});
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
server.listen(PORT,()=>console.log("Blackgram listening on "+PORT));
