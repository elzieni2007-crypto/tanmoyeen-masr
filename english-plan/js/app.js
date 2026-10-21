/* ربط الخطة بـ Firebase: تسجيل الدخول، بيانات المشارك، والحفظ */
/* ---------- views ---------- */
const GOVS = ["القاهرة","الجيزة","الإسكندرية","القليوبية","الشرقية","الدقهلية","الغربية","المنوفية","البحيرة","كفر الشيخ","دمياط","بورسعيد","الإسماعيلية","السويس","الفيوم","بني سويف","المنيا","أسيوط","سوهاج","قنا","الأقصر","أسوان","البحر الأحمر","الوادي الجديد","مطروح","شمال سيناء","جنوب سيناء","خارج مصر"];
(function(){ const g = $("pGov"); g.innerHTML = '<option value="">اختار</option>'; GOVS.forEach(x=>{ const o = document.createElement("option"); o.textContent = x; g.appendChild(o); }); })();
if (Store.demo) $("demoBar").hidden = false;

function show(v){
  ["loadingView","authView","profileView","planView"].forEach(id => $(id).hidden = id !== v);
  document.body.classList.toggle("in-plan", v === "planView");
  const cta = $("cta");
  if (v === "planView"){ cta.textContent = "ابدأ مهام النهارده ←"; cta.href = "#today"; }
  else { cta.textContent = "سجّل وابدأ رحلتك ←"; cta.href = "#start"; }
}

/* ---------- auth ---------- */
let mode = "up", me = null, profile = null;
const LOGIN_FAIL = "الإيميل أو كلمة السر مش مظبوطين، أو الإيميل ده مالوش حساب لسه. اتأكد من الإيميل حرف حرف، ولو أول مرة تسجل اختار «حساب جديد». لو نسيت كلمة السر دوس «نسيت كلمة السر».";
const LS_EMAIL = "tm-eng-last-email";
const lsGet = k => { try { return localStorage.getItem(k) || ""; } catch(e){ return ""; } };
const lsSet = (k,v) => { try { localStorage.setItem(k, v); } catch(e){} };
const ERR = {
  "auth/email-already-in-use":"الإيميل ده متسجل قبل كده. اختار «عندي حساب» وادخل بيه.",
  "auth/invalid-email":"الإيميل مكتوب غلط، راجعه.",
  "auth/weak-password":"كلمة السر لازم تكون ٦ حروف على الأقل.",
  "auth/wrong-password":LOGIN_FAIL,
  "auth/user-not-found":LOGIN_FAIL,
  "auth/invalid-credential":LOGIN_FAIL,
  "auth/invalid-login-credentials":LOGIN_FAIL,
  "tm/google-in-app":"الدخول بـGoogle مش متاح جوه تطبيق الموبايل. سجّل بالإيميل وكلمة السر، ولو حسابك اتعمل بـGoogle قبل كده دوس «نسيت كلمة السر» واعمل كلمة سر لنفس الإيميل.",
  "auth/popup-blocked":"المتصفح منع نافذة Google. سجّل بالإيميل وكلمة السر، أو افتح الصفحة من Chrome.",
  "auth/operation-not-supported-in-this-environment":"الدخول بـGoogle مش متاح هنا. سجّل بالإيميل وكلمة السر.",
  "auth/web-storage-unsupported":"المتصفح ده مانع الحفظ، فالدخول مش هيفضل محفوظ. افتح الصفحة من Chrome أو من تطبيق تنمويين مصر.",
  "auth/too-many-requests":"محاولات كتير ورا بعض. استنى دقايق وجرب تاني.",
  "auth/popup-closed-by-user":"اتقفلت نافذة Google قبل ما تكمل. جرّب تاني.",
  "auth/network-request-failed":"مفيش اتصال بالإنترنت. اتأكد من النت وجرب تاني."
};
const errText = e => ERR[e && e.code] || "حصلت مشكلة: " + ((e && e.message) || "جرب تاني");
function setMode(m){
  mode = m;
  $("tabUp").setAttribute("aria-selected", String(m === "up"));
  $("tabIn").setAttribute("aria-selected", String(m === "in"));
  $("authSubmit").textContent = m === "up" ? "إنشاء حساب" : "دخول";
  $("aPass").autocomplete = m === "up" ? "new-password" : "current-password";
  $("forgot").hidden = m === "up";
  $("authErr").hidden = true; $("authOk").hidden = true;
}
$("tabUp").addEventListener("click", ()=>setMode("up"));
$("tabIn").addEventListener("click", ()=>setMode("in"));
function authFail(e){
  $("authErr").textContent = errText(e); $("authErr").hidden = false; $("authSubmit").disabled = false;
  const c = e && e.code;
  if (mode === "in" && ERR[c] === LOGIN_FAIL) addSwitch("أول مرة؟ اعمل حساب جديد بنفس الإيميل", "up");
  if (mode === "up" && c === "auth/email-already-in-use") addSwitch("ادخل بالحساب ده", "in");
}
function addSwitch(label, to){
  const b = document.createElement("button"); b.type = "button"; b.textContent = label;
  b.style.cssText = "display:block;margin-top:8px;background:none;border:0;padding:0;color:inherit;font:inherit;font-weight:700;text-decoration:underline;cursor:pointer";
  b.onclick = () => { const em = $("aEmail").value; setMode(to); $("aEmail").value = em; $("aPass").focus(); };
  $("authErr").appendChild(b);
}
$("authForm").addEventListener("submit", async ev=>{
  ev.preventDefault();
  const e = $("aEmail").value.trim(), p = $("aPass").value;
  $("authErr").hidden = true; $("authOk").hidden = true;
  if (!/^\S+@\S+\.\S+$/.test(e)) return authFail({code:"auth/invalid-email"});
  if (p.length < 6) return authFail({code:"auth/weak-password"});
  $("authSubmit").disabled = true;
  try { await (mode === "up" ? Store.signUp(e,p) : Store.signIn(e,p)); lsSet(LS_EMAIL, e); } catch(err){ authFail(err); }
});
$("googleBtn").addEventListener("click", async ()=>{ $("authErr").hidden = true; try { await Store.google(); } catch(err){ authFail(err); } });
$("forgot").addEventListener("click", async ()=>{
  const e = $("aEmail").value.trim();
  if (!/^\S+@\S+\.\S+$/.test(e)){ $("authErr").textContent = "اكتب إيميلك الأول، وبعدين دوس «نسيت كلمة السر»."; $("authErr").hidden = false; return; }
  try { await Store.reset(e); $("authOk").textContent = "لو الإيميل " + e + " عليه حساب عندنا، هيوصلك لينك تغيير كلمة السر خلال دقايق. بص في Spam وPromotions، والرسالة جاية من noreply@tanmoyeen-masr26.firebaseapp.com. استخدم آخر رسالة بس، لأن اللينكات القديمة بتبطل. ولو ما وصلش حاجة، يبقى غالبًا الإيميل ده مالوش حساب: اختار «حساب جديد»."; $("authOk").hidden = false; } catch(err){ authFail(err); }
});
$("logout").addEventListener("click", ()=>Store.signOut());

/* ---------- profile ---------- */
$("profileForm").addEventListener("submit", async ev=>{
  ev.preventDefault();
  const v = id => $(id).value.trim();
  const need = [["pNameAr","الاسم بالعربي"],["pNameEn","الاسم بالإنجليزي"],["pPhone","رقم الموبايل"],["pGov","المحافظة"],["pLevel","المستوى"],["pStart","يوم البداية"]];
  const miss = need.filter(([id]) => !v(id)).map(x=>x[1]);
  if (miss.length){ $("profErr").textContent = "كمّل: " + miss.join("، "); $("profErr").hidden = false; return; }
  if (!/^[0-9+\s-]{8,20}$/.test(v("pPhone"))){ $("profErr").textContent = "رقم الموبايل مكتوب غلط."; $("profErr").hidden = false; return; }
  $("profErr").hidden = true; $("profSubmit").disabled = true;
  const data = {nameAr:v("pNameAr"), nameEn:v("pNameEn"), phone:v("pPhone"), gov:v("pGov"), org:v("pOrg"), job:v("pJob"), level:v("pLevel"), start:v("pStart"), mode:$("pMode").value || "2h", email:me.email, days:{}, ratings:{}, quiz:{}, act:{}};
  try { await Store.create(me.uid, data); profile = data; startPlan(); }
  catch(err){ $("profErr").textContent = errText(err); $("profErr").hidden = false; }
  $("profSubmit").disabled = false;
});

/* ---------- plan ---------- */
function startPlan(){
  state = {
    start: profile.start || iso(today0()), name: profile.nameEn || "", nameAr: profile.nameAr || "",
    level: profile.level || "", mode: profile.mode || "2h",
    days: profile.days || {}, ratings: profile.ratings || {}, quiz: profile.quiz || {},
    pre: profile.pre || null, post: profile.post || null, preSkip: !!profile.preSkip
  };
  viewDay = todayIndex(); viewWeek = Math.ceil(viewDay/7); openKey = null;
  $("whoName").textContent = profile.nameAr || me.email; $("who").hidden = false;
  show("planView"); renderAll(); setSave("محفوظ في حسابك");
}
function setSave(t){ $("saveState").textContent = t; }
let saveTimer = null, chain = Promise.resolve();
function queueSave(){
  if (!me) return;
  setSave("جاري الحفظ…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(()=>{
    const data = JSON.parse(JSON.stringify({
      start: state.start, nameEn: state.name, nameAr: state.nameAr, level: state.level, mode: state.mode,
      days: state.days, ratings: state.ratings, quiz: state.quiz || {}, pre: state.pre || null, post: state.post || null, preSkip: !!state.preSkip
    }));
    data.act = {[iso(today0())]: true};
    chain = chain.then(()=>Store.save(me.uid, data)).then(
      ()=>setSave("محفوظ في حسابك"),
      ()=>setSave("ما اتحفظش. اتأكد من النت، وأي تعديل جديد هيتحفظ تاني."));
  }, 900);
}

/* ---------- community card ---------- */
(function(){
  const C = window.COMMUNITY || {}, b = $("waBtn");
  if (C.whatsapp){ b.href = C.whatsapp; } else { b.textContent = "اللينك هيتضاف قريب"; b.classList.add("off"); b.removeAttribute("href"); }
  $("clubInfo").textContent = C.club || "نادي المحادثة الأسبوعي: نص ساعة كلام إنجليزي مع متطوع من المجتمع. المواعيد هتتعلن في الجروب.";
})();

/* ---------- زرار الرجوع بتاع الموبايل ----------
   أول ما الصفحة تفتح بنحط خطوة «قاعدة» قبلها. أي رجوع من الخطة بيوصل للقاعدة
   فبنودّي الشخص لرئيسية تنمويين مصر، بدل ما التطبيق يقفل لو الخطة اتفتحت من لينك مباشر. */
(function(){
  // جاي من التطبيق؟ يبقى نرجع خطوة لورا (الرئيسية زي ما سابها)، غير كده نفتح الرئيسية
  const fromApp = (() => { try { const r = new URL(document.referrer); return r.origin === location.origin && (r.pathname === new URL("../", location.href).pathname || r.pathname === new URL("../index.html", location.href).pathname); } catch(e){ return false; } })();
  window.tmBackToApp = atBase => {
    if (fromApp){ try { history.go(atBase ? -1 : -2); return; } catch(e){} }
    location.replace("../index.html");
  };
  try {
    if (!history.replaceState) return;
    const st = history.state || {};
    if (!st.epBase && !st.ep){ history.replaceState({epBase:1}, ""); history.pushState({ep:1}, ""); }
    else if (st.epBase){ history.pushState({ep:1}, ""); }
    window.addEventListener("popstate", e => {
      if (e.state && e.state.epBase) window.tmBackToApp(true);
    });
  } catch(e){}
})();

/* ---------- النطق جوه التطبيق ----------
   كل جمل الخطة ليها ملفات صوت جاهزة في english-plan/audio (صوت إنجليزي طبيعي).
   زرار «اسمع» بيشغلها جوه الصفحة بدل Google Translate. لو جملة مش موجودة في الملفات،
   الزرار بيشتغل زي الأول. */
(function(){
  const BASE = "audio/";
  let man = null, manP = null, cur = null, failT = null;
  const players = {};
  const load = () => manP || (manP = fetch(BASE + "index.json").then(r => r.ok ? r.json() : {}).catch(() => ({})).then(j => (man = j || {})));
  load();
  const keyOf = t => {
    let k = String(t || "").replace(/…/g, "...").trim();
    try { const n = typeof nameOr === "function" ? nameOr() : ""; if (n && n !== "[your name]" && k.includes(n)) k = k.split(n).join("[your name]"); } catch(e){}
    return k;
  };
  function stop(){
    clearTimeout(failT);
    if (!cur) return;
    try { cur.a.pause(); } catch(e){}
    cur.btn.classList.remove("on");
    cur = null;
  }
  function play(ent, btn){
    const g = ent[0], st = ent[1], du = ent[2];
    let a = players[g];
    if (!a){
      a = players[g] = new Audio(BASE + "a" + g + ".mp3"); a.preload = "auto";
      const a2 = a;
      ["loadedmetadata","canplay","progress","seeked","timeupdate"].forEach(ev => a2.addEventListener(ev, () => { if (cur && cur.a === a2) cur.tick(); }));
    }
    stop();
    try { speechSynthesis.cancel(); } catch(e){}
    const end = st + du + 0.12;
    const inWin = () => a.currentTime >= st - 0.3 && a.currentTime <= st + 0.6;
    // بنفضل ساكتين لحد ما نوصل لبداية الجملة جوه الملف، وبعدين نطلع الصوت
    const seek = () => {
      if (cur !== me) return;
      if (a.seeking) return;
      if (!inWin()){ try { a.currentTime = st; } catch(e){} return; }
      a.muted = false;
    };
    const me = {a, btn, tick: () => {
      if (a.muted || a.seeking){ seek(); return; }
      if (a.currentTime >= end || a.currentTime < st - 0.5) stop();
    }};
    cur = me; btn.classList.add("on");
    a.muted = true;
    if (a.readyState >= 1) seek();
    // play() لازم يتنادى جوه الضغطة نفسها عشان الآيفون والتطبيق يسمحوا بالصوت
    const pr = a.play();
    if (pr && pr.catch) pr.catch(() => { if (cur === me){ stop(); if (typeof toast === "function") toast("الصوت ما اشتغلش. اتأكد إن صوت الموبايل مفتوح وجرب تاني."); } });
    // لو التحميل اتأخر جدًا (نت ضعيف)
    failT = setTimeout(() => { if (cur === me && a.readyState < 2){ stop(); if (typeof toast === "function") toast("الصوت بيحمّل ببطء. استنى ثواني وجرب تاني."); } }, 15000);
  }
  document.addEventListener("click", e => {
    const btn = e.target && e.target.closest ? e.target.closest("a.say") : null;
    if (!btn) return;
    const text = (btn.getAttribute("aria-label") || "").replace(/^اسمع النطق:\s*/, "");
    if (!man){
      e.preventDefault(); e.stopPropagation();
      load().then(() => { if (man[keyOf(text)]) play(man[keyOf(text)], btn); else btn.click(); });
      return;
    }
    const ent = man[keyOf(text)];
    if (!ent) return;
    e.preventDefault(); e.stopPropagation();
    if (cur && cur.btn === btn){ stop(); return; }
    play(ent, btn);
  }, true);
})();

/* ---------- boot ---------- */
(function(){
  // جوه تطبيق الموبايل: نخفي زرار Google (Google بتمنعه جوه التطبيق وبيطلع صفحة بيضا)
  if (Store.inApp){
    $("googleBtn").hidden = true; $("googleBtn").style.display = "none";
    const or = document.querySelector("#authCard .or"); if (or) or.textContent = "سجّل بالإيميل وكلمة السر";
  }
  // زرار إظهار كلمة السر عشان أخطاء الكتابة على الموبايل
  const pw = $("aPass"), t = document.createElement("button");
  t.type = "button"; t.textContent = "إظهار كلمة السر";
  t.style.cssText = "align-self:flex-start;margin-top:-4px;background:none;border:0;padding:0;font:inherit;font-size:.85rem;text-decoration:underline;cursor:pointer;opacity:.8";
  t.onclick = () => { const v = pw.type === "password"; pw.type = v ? "text" : "password"; t.textContent = v ? "إخفاء كلمة السر" : "إظهار كلمة السر"; };
  pw.closest("label").after(t);
  // لو الجهاز ده دخل قبل كده: نكتب الإيميل ونفتح على «عندي حساب»
  const last = lsGet(LS_EMAIL); if (last) $("aEmail").value = last;
  // رجوع لتطبيق تنمويين مصر (مفيد على الآيفون اللي مالوش زرار رجوع)
  const brand = document.querySelector(".hero .brand .bl");
  if (brand){
    const a = document.createElement("a"); a.href = "../index.html"; a.textContent = "→ رجوع لتنمويين مصر";
    a.style.cssText = "display:inline-block;margin-inline-start:10px;font-size:.8rem;font-weight:700;color:inherit;opacity:.85;text-decoration:none;white-space:nowrap";
    a.onclick = ev => { ev.preventDefault(); const st = history.state || {}; if (st.ep) window.tmBackToApp(false); else location.replace("../index.html"); };
    brand.appendChild(a);
  }
})();
bindControls();
$("pStart").value = iso(today0());
Store.onAuth(async u=>{
  me = u; profile = null;
  if (!u){ $("who").hidden = true; setMode(lsGet(LS_EMAIL) ? "in" : "up"); $("authSubmit").disabled = false; show("authView"); return; }
  if (u.email) lsSet(LS_EMAIL, u.email);
  show("loadingView");
  try { profile = await Store.get(u.uid); }
  catch(err){ $("loadingView").textContent = "مقدرناش نحمّل بياناتك. اتأكد من النت واعمل تحديث للصفحة."; return; }
  if (profile) startPlan();
  else {
    if (u.displayName && !$("pNameAr").value) $("pNameAr").value = u.displayName;
    $("whoName").textContent = u.email; $("who").hidden = false;
    show("profileView");
  }
});
