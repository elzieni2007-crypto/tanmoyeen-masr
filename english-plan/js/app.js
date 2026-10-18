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
const ERR = {
  "auth/email-already-in-use":"الإيميل ده متسجل قبل كده. اختار «عندي حساب» وادخل بيه.",
  "auth/invalid-email":"الإيميل مكتوب غلط، راجعه.",
  "auth/weak-password":"كلمة السر لازم تكون ٦ حروف على الأقل.",
  "auth/wrong-password":"الإيميل أو كلمة السر مش صح.",
  "auth/user-not-found":"الإيميل أو كلمة السر مش صح.",
  "auth/invalid-credential":"الإيميل أو كلمة السر مش صح.",
  "auth/invalid-login-credentials":"الإيميل أو كلمة السر مش صح.",
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
function authFail(e){ $("authErr").textContent = errText(e); $("authErr").hidden = false; $("authSubmit").disabled = false; }
$("authForm").addEventListener("submit", async ev=>{
  ev.preventDefault();
  const e = $("aEmail").value.trim(), p = $("aPass").value;
  $("authErr").hidden = true; $("authOk").hidden = true;
  if (!/^\S+@\S+\.\S+$/.test(e)) return authFail({code:"auth/invalid-email"});
  if (p.length < 6) return authFail({code:"auth/weak-password"});
  $("authSubmit").disabled = true;
  try { await (mode === "up" ? Store.signUp(e,p) : Store.signIn(e,p)); } catch(err){ authFail(err); }
});
$("googleBtn").addEventListener("click", async ()=>{ $("authErr").hidden = true; try { await Store.google(); } catch(err){ authFail(err); } });
$("forgot").addEventListener("click", async ()=>{
  const e = $("aEmail").value.trim();
  if (!/^\S+@\S+\.\S+$/.test(e)){ $("authErr").textContent = "اكتب إيميلك الأول، وبعدين دوس «نسيت كلمة السر»."; $("authErr").hidden = false; return; }
  try { await Store.reset(e); $("authOk").textContent = "بعتنالك لينك تغيير كلمة السر على " + e + ". بص في الـSpam لو مش لاقيه."; $("authOk").hidden = false; } catch(err){ authFail(err); }
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

/* ---------- boot ---------- */
bindControls();
$("pStart").value = iso(today0());
Store.onAuth(async u=>{
  me = u; profile = null;
  if (!u){ $("who").hidden = true; setMode("up"); $("authSubmit").disabled = false; show("authView"); return; }
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
