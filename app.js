import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc,
  updateDoc, deleteDoc, serverTimestamp, runTransaction, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Konfigurasi Firebase Web App. API key web bukan password admin.
// Atur keamanan database melalui Firestore Rules.
const firebaseConfig = {
  apiKey: "AIzaSyA7nsVpFqnxa3tFheNfRvksTD0UqftTqgw",
  authDomain: "mobile-legendkomunitas.firebaseapp.com",
  projectId: "mobile-legendkomunitas",
  storageBucket: "mobile-legendkomunitas.firebasestorage.app",
  messagingSenderId: "968818166880",
  appId: "1:968818166880:web:ba6066885d606edae74705",
  measurementId: "G-EWXFPP9929"
};

// EmailJS: ganti TEMPLATE_ID jika masih memakai ID template uji.
const EMAILJS_SERVICE_ID = "service_52ukn1s";
const EMAILJS_TEMPLATE_ID = "__ejs-test-mail-service__";
const EMAILJS_PUBLIC_KEY = "DzKlzGMlDG28VkA7U";
const emailjsConfigured = Boolean(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID &&
  EMAILJS_PUBLIC_KEY && !EMAILJS_TEMPLATE_ID.includes("test-mail"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const postsRef = collection(db, "posts");
const $ = s => document.querySelector(s);
const form = $("#postForm"), feed = $("#feed"), formMessage = $("#formMessage");
let currentFilter = "all", posts = [], ready = false, isRegister = false, unsubscribePosts;

const escapeHtml = (v="") => String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const selectedCategory = () => document.querySelector('input[name="category"]:checked').value;
function formatTime(ts) {
  if (!ts?.toDate) return "Baru saja";
  return new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(ts.toDate());
}
function setAuthUI(user) {
  $("#authForm").classList.toggle("hidden", !!user);
  $("#accountInfo").classList.toggle("hidden", !user);
  $("#signedInAs").textContent = user ? `Masuk sebagai: ${user.email}` : "";
  $("#authTitle").textContent = user ? "Akun aktif" : (isRegister ? "Buat akun baru" : "Masuk ke akun");
  $("#authPanel").classList.toggle("logged-in", !!user);
  document.querySelectorAll("#postForm input,#postForm select,#postForm textarea,#postForm button").forEach(el => el.disabled = !user);
  if (!user) formMessage.textContent = "Masuk terlebih dahulu untuk membuat postingan atau membalas.";
}
$("#toggleAuth").addEventListener("click", () => {
  isRegister = !isRegister;
  $("#authTitle").textContent = isRegister ? "Buat akun baru" : "Masuk ke akun";
  $("#authSubmit").textContent = isRegister ? "Daftar akun" : "Masuk";
  $("#toggleAuth").textContent = isRegister ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar";
  $("#authPassword").autocomplete = isRegister ? "new-password" : "current-password";
  $("#authMessage").textContent = "";
});
$("#authForm").addEventListener("submit", async e => {
  e.preventDefault();
  const email=$("#authEmail").value.trim(), password=$("#authPassword").value;
  const btn=$("#authSubmit"); btn.disabled=true; btn.textContent="Memproses...";
  try {
    if (isRegister) await createUserWithEmailAndPassword(auth,email,password);
    else await signInWithEmailAndPassword(auth,email,password);
    $("#authMessage").textContent = "Berhasil masuk. Selamat bergabung!";
    $("#authForm").reset();
  } catch(err) {
    const messages = {
      "auth/email-already-in-use":"Email sudah terdaftar. Silakan masuk.",
      "auth/invalid-email":"Format email tidak valid.",
      "auth/weak-password":"Password minimal 6 karakter.",
      "auth/invalid-credential":"Email atau password salah.",
      "auth/user-not-found":"Akun tidak ditemukan. Silakan daftar.",
      "auth/wrong-password":"Password salah."
    };
    $("#authMessage").textContent = messages[err.code] || `Gagal: ${err.message}`;
  } finally { btn.disabled=false; btn.textContent=isRegister?"Daftar akun":"Masuk"; }
});
$("#logoutBtn").addEventListener("click", async()=>{try{await signOut(auth)}catch(e){alert(e.message)}});

document.querySelectorAll('input[name="category"]').forEach(input=>input.addEventListener("change",()=>{
  $("#likeFields").classList.toggle("hidden",selectedCategory()!=="like");
  $("#mabarFields").classList.toggle("hidden",selectedCategory()!=="mabar");
}));
document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{
  document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t===tab));
  currentFilter=tab.dataset.filter; render();
}));

async function loadReplies(postId) {
  try {
    const snap=await getDocs(query(collection(db,"posts",postId,"replies"),orderBy("createdAt","asc")));
    return snap.docs.map(d=>({id:d.id,...d.data()}));
  } catch(e) { console.warn("Balasan belum dapat dimuat",e); return []; }
}
async function render() {
  const filtered=posts.filter(p=>currentFilter==="all"||p.category===currentFilter);
  $("#feedTitle").textContent=currentFilter==="like"?"Tukaran Like":currentFilter==="mabar"?"Cari Teman Mabar":"Semua Postingan";
  $("#postCount").textContent=`${filtered.length} POST`;
  if(!ready){feed.innerHTML='<div class="loading">Menghubungkan ke komunitas...</div>';return}
  if(!filtered.length){feed.innerHTML='<div class="empty"><b>Belum ada postingan</b>Jadilah yang pertama berbagi di komunitas ML Squad! ✨</div>';return}
  feed.innerHTML=filtered.map(p=>{
    const like=p.category==="like", own=auth.currentUser&&p.ownerUid===auth.currentUser.uid;
    const detail=like?`<span>💚 ${escapeHtml(p.target||"Saling like profil")}</span>`:`<span>🏆 ${escapeHtml(p.rank||"-")}</span><span>🎯 ${escapeHtml(p.role||"-")}</span>`;
    return `<article class="post" data-post="${p.id}">
      <div class="post-top"><span class="badge ${like?"":"mabar"}">${like?"💚 TUKARAN LIKE":"🎮 CARI TEMAN MABAR"}</span><span class="status ${p.done?"done":""}">${p.done?"● SELESAI":"● MENCARI"}</span></div>
      <div class="player"><h3>${escapeHtml(p.nickname)}</h3><span class="time">${formatTime(p.createdAt)}</span></div>
      <div class="details"><span>ID: ${escapeHtml(p.playerId)}</span><span>Zone: ${escapeHtml(p.zoneId)}</span>${detail}</div>
      ${p.note?`<p class="note">${escapeHtml(p.note)}</p>`:""}
      <div class="post-actions">
        <button class="reply-btn" data-action="reply" data-id="${p.id}" ${!auth.currentUser?"disabled":""}>↩ Balas</button>
        <button data-action="done" data-id="${p.id}" ${!own||p.done?"disabled":""}>${like?"Selesai tukaran":"Sudah dapat teman"}</button>
        <button data-action="delete" data-id="${p.id}" ${!own?"disabled":""}>Hapus</button>
      </div>
      <div class="reply-area" id="replies-${p.id}"><div class="loading">Memuat balasan...</div></div>
    </article>`;
  }).join("");
  for (const p of filtered) {
    const area=$(`#replies-${CSS.escape(p.id)}`);
    if(!area) continue;
    const replies=await loadReplies(p.id);
    area.innerHTML=`<b style="font-size:11px;color:var(--muted)">💬 ${replies.length} balasan</b>
      <div class="reply-list">${replies.map(r=>`<div class="reply-item"><b>${escapeHtml(r.email||"Pemain")}</b><br>${escapeHtml(r.text||"")}</div>`).join("")}</div>
      ${auth.currentUser?`<form class="reply-form" data-post="${p.id}"><input name="reply" maxlength="300" required placeholder="Tulis balasan..."><button type="submit">Kirim balasan</button></form>`:`<p class="privacy">Masuk untuk membalas postingan.</p>`}`;
  }
}
feed.addEventListener("click",async e=>{
  const b=e.target.closest("button[data-action]"); if(!b||b.disabled)return;
  const p=posts.find(x=>x.id===b.dataset.id); if(!p)return;
  if(!auth.currentUser){alert("Silakan masuk terlebih dahulu.");return}
  try{
    if(b.dataset.action==="reply"){
      const area=$(`#replies-${CSS.escape(p.id)}`);
      area.scrollIntoView({behavior:"smooth",block:"center"});
      area.querySelector("input")?.focus();
    }
    if(b.dataset.action==="done"){
      if(p.ownerUid!==auth.currentUser.uid)return;
      await updateDoc(doc(db,"posts",p.id),{done:true});
    }
    if(b.dataset.action==="delete"){
      if(p.ownerUid!==auth.currentUser.uid)return;
      if(confirm("Hapus postingan ini?"))await deleteDoc(doc(db,"posts",p.id));
    }
  }catch(err){alert("Aksi gagal: "+err.message)}
});
feed.addEventListener("submit",async e=>{
  const f=e.target.closest(".reply-form"); if(!f)return;
  e.preventDefault();
  const p=f.dataset.post, text=f.elements.reply.value.trim(), btn=f.querySelector("button");
  if(!text||!auth.currentUser)return;
  btn.disabled=true;btn.textContent="Mengirim...";
  try{
    await addDoc(collection(db,"posts",p,"replies"),{
      text,uid:auth.currentUser.uid,email:auth.currentUser.email||"Pemain",createdAt:serverTimestamp()
    });
    await render();
  }catch(err){alert("Balasan gagal dikirim. Periksa Firestore Rules: "+err.message);btn.disabled=false;btn.textContent="Kirim balasan"}
});

form.addEventListener("submit",async e=>{
  e.preventDefault();
  const user=auth.currentUser;
  if(!user){formMessage.textContent="Masuk terlebih dahulu.";return}
  const category=selectedCategory(), data={
    category,nickname:$("#nickname").value.trim(),playerId:$("#playerId").value.trim(),
    zoneId:$("#zoneId").value.trim(),note:(category==="like"?$("#likeNote").value:$("#mabarNote").value).trim(),
    done:false,ownerUid:user.uid,createdAt:serverTimestamp()
  };
  if(!data.nickname||!data.playerId||!data.zoneId){formMessage.textContent="Lengkapi nama, ID, dan Zone ID.";return}
  if(!/^\d+$/.test(data.playerId)||!/^\d+$/.test(data.zoneId)){formMessage.textContent="ID dan Zone ID harus berupa angka.";return}
  if(category==="like")data.target=$("#likeTarget").value;
  else{data.rank=$("#rank").value;data.role=$("#role").value}
  const btn=form.querySelector('button[type="submit"]');btn.disabled=true;btn.textContent="Memublikasikan...";
  try{
    const postRef=doc(postsRef);
    const rateRef=doc(db,"rateLimits",user.uid);
    await runTransaction(db,async tx=>{
      const rate=await tx.get(rateRef);
      const last=rate.exists()?rate.data().lastPostAt?.toMillis():null;
      if(last && Date.now()-last<5*60*1000){
        const remaining=Math.ceil((5*60*1000-(Date.now()-last))/1000);
        throw new Error(`Batas posting: tunggu ${Math.ceil(remaining/60)} menit lagi sebelum membuat postingan berikutnya.`);
      }
      tx.set(rateRef,{uid:user.uid,lastPostAt:serverTimestamp()});
      tx.set(postRef,data);
    });
    form.reset();$("#likeFields").classList.remove("hidden");$("#mabarFields").classList.add("hidden");
    formMessage.textContent="Postingan berhasil dipublikasikan! 🎉";
    if(emailjsConfigured&&window.emailjs){
      try{await window.emailjs.send(EMAILJS_SERVICE_ID,EMAILJS_TEMPLATE_ID,{
        nickname:data.nickname,player_id:data.playerId,zone_id:data.zoneId,
        category_name:category==="like"?"Tukaran Like":"Cari Teman Mabar",
        target:data.target||"-",rank:data.rank||"-",role:data.role||"-",note:data.note||"-",post_id:postRef.id
      },{publicKey:EMAILJS_PUBLIC_KEY})}catch(err){console.warn("EmailJS:",err)}
    }
  }catch(err){formMessage.textContent=err.message.includes("Batas posting")?err.message:"Gagal memublikasikan. "+err.message}
  finally{btn.disabled=false;btn.textContent="Publikasikan postingan ↗"}
});

$("#copyDana").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText("082191523276");$("#copyMessage").textContent="Nomor DANA berhasil disalin."}
  catch{$("#copyMessage").textContent="Nomor DANA: 082191523276"}
});
$("#year").textContent=new Date().getFullYear();
onAuthStateChanged(auth,user=>{
  setAuthUI(user);
  if(unsubscribePosts)unsubscribePosts();
  unsubscribePosts=onSnapshot(query(postsRef,orderBy("createdAt","desc")),snap=>{
    posts=snap.docs.map(d=>({id:d.id,...d.data()}));ready=true;render();
  },err=>{
    console.error(err);ready=true;
    feed.innerHTML='<div class="empty"><b>Belum bisa memuat postingan</b>Periksa Firestore Database dan Rules.</div>';
  });
});
