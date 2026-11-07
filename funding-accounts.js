// ===== حسابات الجمعيات على منصة الفرص (لوحة الأدمن) =====
// بيعتمد على db و auth و firebase و firebaseConfig و toast و setAdmTab من index.html
// - الأدمن بينشئ حساب الجمعية بإيميلها (من غير ما يعرف كلمة المرور)، والجمعية بيوصلها إيميل تحط منه كلمة المرور بنفسها.
// - الأدمن بيحدد تاريخ انتهاء الاشتراك، ويوقف الحساب أو يشغله في أي وقت.
// - الجمعية كيان واحد (orgs/{orgId}) وتحتها فريق (members): مدير الحساب بيضيف زمايله من لوحته.
// - قواعد Firestore بتمنع الجمعية من بياناتها جوه المنصة لو الحساب موقوف أو الاشتراك انتهى.
(function(){
  var PORTAL_URL='https://elzieni2007-crypto.github.io/tanmoyeen-platform/';
  var g=function(id){return document.getElementById(id)};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  var T=function(m){try{toast(m)}catch(e){alert(m)}};
  var FV=function(){return firebase.firestore.FieldValue};
  var TS=function(d){return firebase.firestore.Timestamp.fromDate(d)};
  var toD=function(t){return t&&t.toDate?t.toDate():(t?new Date(t):null)};
  var fmt=function(d){return d?d.toLocaleDateString('ar-EG-u-nu-latn',{year:'numeric',month:'short',day:'numeric'}):'—'};
  var ymd=function(d){return d?new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10):''};
  var addMonths=function(base,n){var d=new Date(Math.max(Date.now(),base?base.getTime():0));d.setMonth(d.getMonth()+n);d.setHours(23,59,0,0);return d};
  var S={orgs:[],wait:[],mem:{},q:'',f:''};
  var ROLE={owner:'مدير الحساب',editor:'مُعِد',reviewer:'مراجع'};
  function state(o){var until=toD(o.paidUntil);if(o.status!=='active')return {k:'off',t:'موقوف',c:'#b33a3a',bg:'#fbe6e6'};
    if(!until||until<new Date())return {k:'exp',t:'الاشتراك انتهى',c:'#a86300',bg:'#fdf0d7'};
    var days=Math.ceil((until-new Date())/864e5);return days<=7?{k:'soon',t:'ينتهي خلال '+days+' يوم',c:'#a86300',bg:'#fdf0d7'}:{k:'on',t:'نشط',c:'#0f8a5f',bg:'#e0f4ec'}}
  // ---------- إنشاء الحساب: تطبيق Firebase تاني علشان الأدمن ما يخرجش من حسابه ----------
  function secAuth(){var app=firebase.apps.filter(function(a){return a.name==='tmAcct'})[0]||firebase.initializeApp(firebaseConfig,'tmAcct');var a=app.auth();a.languageCode='ar';if(window.TM_EMU&&!a._tmEmu){a.useEmulator(TM_EMU.auth);a._tmEmu=1}return a}
  function rndPass(){var a=new Uint8Array(24);crypto.getRandomValues(a);return Array.from(a,function(x){return ('0'+x.toString(16)).slice(-2)}).join('')+'Aa1!'}
  async function createAccount(d){
    var email=String(d.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('الإيميل مش صحيح');
    if(!d.name)throw new Error('اكتب اسم الجمعية');if(!d.until)throw new Error('حدد تاريخ انتهاء الاشتراك');
    var sa=secAuth(),uid,orgId=db.collection('orgs').doc().id,by=(auth.currentUser&&auth.currentUser.email)||'';
    try{var cred=await sa.createUserWithEmailAndPassword(email,rndPass());uid=cred.user.uid}
    catch(e){if(e.code==='auth/email-already-in-use')throw new Error('الإيميل ده عليه حساب بالفعل. لو هو حساب جمعية موجود، دوّر عليه في القائمة');
      if(e.code==='auth/operation-not-allowed')throw new Error('فعّل تسجيل الدخول بالإيميل وكلمة المرور من Firebase Console ← Authentication');throw e}
    try{
      var b=db.batch(),now=FV().serverTimestamp(),O=db.collection('orgs').doc(orgId);
      b.set(O,{name:d.name,email:email,phone:d.phone||'',gov:d.gov||'',regNumber:d.regNumber||'',contactName:d.contactName||'',ownerUid:uid,seats:+d.seats||3,
        status:'active',paidUntil:TS(d.until),notes:d.notes||'',waitlistId:d.waitlistId||'',createdAt:now,updatedAt:now,createdBy:by});
      b.set(O.collection('members').doc(uid),{email:email,name:d.contactName||'',role:'owner',status:'active',addedAt:now,addedBy:by});
      b.set(db.collection('users').doc(uid),{orgId:orgId,addedAt:now,addedBy:by});
      await b.commit();
      await sa.sendPasswordResetEmail(email,{url:PORTAL_URL});
    }finally{try{await sa.signOut()}catch(e){}}
    if(d.waitlistId){try{await db.collection('funding_waitlist').doc(d.waitlistId).update({status:'active',orgId:orgId,updatedAt:FV().serverTimestamp()})}catch(e){}}
    return orgId}
  // ---------- منع تكرار الجمعية: نفس رقم الإشهار أو الاسم أو الموبايل ----------
  var normName=function(x){return String(x||'').replace(/[ً-ْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').toLowerCase()
    .split(/[^؀-ۿa-z0-9]+/).filter(function(w){return w&&['جمعيه','الجمعيه','مؤسسه','المؤسسه','ال'].indexOf(w)<0}).join('')};
  var digits=function(x){return String(x||'').replace(/[٠-٩]/g,function(c){return '٠١٢٣٤٥٦٧٨٩'.indexOf(c)}).replace(/\D/g,'')};
  var phone=function(x){var d=digits(x);return d.length>=10?d.slice(-10):''};
  function findDup(d){var n=normName(d.name),r=digits(d.regNumber),p=phone(d.phone),out=[];
    S.orgs.forEach(function(o){var why=[];if(r&&digits(o.regNumber)===r)why.push('رقم الإشهار');if(n&&n.length>2&&normName(o.name)===n)why.push('الاسم');if(p&&phone(o.phone)===p)why.push('الموبايل');
      if(why.length)out.push({o:o,why:why})});return out}
  window.tmaFindDup=findDup;
  // ---------- UI ----------
  var css='.tma-card{background:#fff;border:1px solid #e2e9f1;border-radius:14px;padding:14px;margin-bottom:10px}.tma-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}'+
    '.tma-in{padding:9px 10px;border:1px solid #d9e5e8;border-radius:10px;font:inherit;min-width:0;flex:1}.tma-b{border:0;border-radius:9px;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer;background:#e6f3fb;color:#0a6fa3}'+
    '.tma-b.p{background:#1a3a6e;color:#fff}.tma-b.r{background:#fbe6e6;color:#b33a3a}.tma-b.g{background:#e0f4ec;color:#0f8a5f}.tma-pill{border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700}'+
    '.tma-k{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:8px 0 12px}.tma-k div{background:#fff;border:1px solid #e2e9f1;border-radius:12px;padding:10px;text-align:center}.tma-k b{display:block;font-size:20px}.tma-k small{color:#64758a}'+
    '.tma-m{font-size:12.5px;color:#64758a}@media(max-width:600px){.tma-k{grid-template-columns:repeat(2,1fr)}}';
  function head(){var c={on:0,soon:0,exp:0,off:0};S.orgs.forEach(function(o){c[state(o).k]++});
    return '<style>'+css+'</style><div class="tma-k"><div><b>'+(c.on+c.soon)+'</b><small>نشط</small></div><div><b>'+c.soon+'</b><small>ينتهي خلال أسبوع</small></div><div><b>'+c.exp+'</b><small>اشتراك منتهي</small></div><div><b>'+c.off+'</b><small>موقوف</small></div></div>'+
    '<div class="tma-card"><div style="font-weight:800;color:#1a3a6e;margin-bottom:8px">➕ حساب جديد لجمعية</div>'+
    '<div class="tma-row" style="margin-bottom:8px"><input class="tma-in" id="tma-name" placeholder="اسم الجمعية"><input class="tma-in" id="tma-email" type="email" dir="ltr" placeholder="إيميل الجمعية (هيوصله رابط كلمة المرور)"></div>'+
    '<div class="tma-row" style="margin-bottom:8px"><input class="tma-in" id="tma-reg" placeholder="رقم الإشهار"><input class="tma-in" id="tma-phone" placeholder="الموبايل (اختياري)"><input class="tma-in" id="tma-gov" placeholder="المحافظة (اختياري)"><label class="tma-m" style="display:flex;gap:6px;align-items:center">الاشتراك ساري حتى <input class="tma-in" id="tma-until" type="date" value="'+ymd(addMonths(null,12))+'" style="flex:none"></label></div>'+
    '<input type="hidden" id="tma-wid"><input type="hidden" id="tma-cn"><div class="tma-row"><button class="tma-b p" id="tma-create">إنشاء الحساب وإرسال رابط كلمة المرور</button><span class="tma-m" id="tma-st"></span></div>'+
    '<div class="tma-m" style="margin-top:6px">الإيميل ده هيبقى «مدير الحساب» للجمعية: هيوصله إيميل يحط منه كلمة المرور بنفسه، ومن لوحته يضيف زمايله (لحد 3 مستخدمين)، وبعدها تدخل من <span dir="ltr">'+esc(PORTAL_URL)+'</span>. انت مش هتعرف كلمة المرور.</div></div>'+
    waitHTML()+
    '<div class="tma-row" style="margin:10px 0"><input class="tma-in" id="tma-q" placeholder="ابحث باسم الجمعية أو الإيميل" value="'+esc(S.q)+'"><select class="tma-in" id="tma-f" style="flex:none"><option value="">الكل</option><option value="on">نشط</option><option value="soon">ينتهي قريب</option><option value="exp">منتهي</option><option value="off">موقوف</option></select></div>'}
  function waitHTML(){var ready=S.wait.filter(function(w){return !w.orgUid&&!w.orgId&&['paid','accepted','active','quoted','contacted'].indexOf(w.status)>-1&&(w.contactEmail||w.email)});
    if(!ready.length)return '';
    return '<div class="tma-card"><div style="font-weight:800;color:#1a3a6e;margin-bottom:6px">💰 حجوزات منصة المنح من غير حساب ('+ready.length+')</div>'+ready.map(function(w){
      return '<div class="tma-row" style="border-top:1px dashed #e2e9f1;padding-top:6px;margin-top:6px"><div style="flex:1;min-width:180px"><b>'+esc(w.orgName||'')+'</b><div class="tma-m" dir="ltr" style="text-align:right">'+esc(w.contactEmail||w.email||'')+'</div></div><span class="tma-m">'+esc(w.status||'')+'</span><button class="tma-b" data-fill="'+esc(w.id)+'">جهّز حساب</button></div>'}).join('')+'</div>'}
  function listHTML(){var q=S.q.trim().toLowerCase();var rows=S.orgs.filter(function(o){return (!q||(o.name+' '+o.email+' '+mems(o).map(function(m){return m.email}).join(' ')).toLowerCase().indexOf(q)>-1)&&(!S.f||state(o).k===S.f)});
    if(!rows.length)return '<div class="tma-m" style="text-align:center;padding:20px">مفيش حسابات'+(q||S.f?' بالفلتر ده':' لسه')+'</div>';
    return rows.map(function(o){var st=state(o),until=toD(o.paidUntil);
      return '<div class="tma-card" data-org="'+o.id+'"><div class="tma-row" style="justify-content:space-between"><div><b style="font-size:15px">'+esc(o.name)+'</b> <span class="tma-pill" style="color:'+st.c+';background:'+st.bg+'">'+st.t+'</span>'+
        '<div class="tma-m" dir="ltr" style="text-align:right">'+esc(o.email)+(o.phone?' · '+esc(o.phone):'')+'</div></div>'+
        '<div class="tma-m">الاشتراك حتى: <b style="color:#11243a">'+fmt(until)+'</b><br>آخر دخول: '+fmt(lastIn(o))+'</div></div>'+
        '<div class="tma-row" style="margin-top:10px"><button class="tma-b g" data-ext="1">+ شهر</button><button class="tma-b g" data-ext="3">+ 3 شهور</button><button class="tma-b g" data-ext="12">+ سنة</button>'+
        '<input class="tma-in" type="date" data-date value="'+ymd(until)+'" style="flex:none"><button class="tma-b" data-set>فعّل حتى التاريخ</button>'+
        (o.status==='active'?'<button class="tma-b r" data-off>⏸ إيقاف الحساب</button>':'<button class="tma-b g" data-on>▶ تشغيل الحساب</button>')+
        '<button class="tma-b" data-reset>🔑 إرسال رابط كلمة المرور</button></div>'+
        teamHTML(o)+
        '<div class="tma-row" style="margin-top:8px"><input class="tma-in" data-notes placeholder="ملاحظات الأدمن (رقم الإيصال، طريقة الدفع…)" value="'+esc(o.notes||'')+'"></div></div>'}).join('')}
  function mems(o){return S.mem[o.id]||[]}
  function lastIn(o){var t=0;mems(o).forEach(function(m){var d=toD(m.lastLogin);if(d&&d>t)t=d});return t||null}
  function teamHTML(o){var ms=mems(o).slice().sort(function(a,b){return (a.role==='owner'?0:1)-(b.role==='owner'?0:1)}),act=ms.filter(function(m){return m.status==='active'}).length;
    return '<details style="margin-top:8px"><summary class="tma-m" style="cursor:pointer">👥 فريق الجمعية: '+act+' من '+(o.seats||3)+' مستخدمين</summary>'+
      ms.map(function(m){return '<div class="tma-row" style="padding:5px 0;border-top:1px dashed #e2e9f1"><span style="flex:1;min-width:160px"><b>'+esc(m.name||'—')+'</b> · '+ROLE[m.role]+(m.status!=='active'?' · <span style="color:#b33a3a">موقوف</span>':'')+
        '<br><span class="tma-m" dir="ltr">'+esc(m.email)+'</span></span><span class="tma-m">آخر دخول: '+fmt(toD(m.lastLogin))+'</span><button class="tma-b" data-mreset="'+esc(m.email)+'">🔑 رابط كلمة المرور</button></div>'}).join('')+
      '<div class="tma-row" style="padding-top:6px"><label class="tma-m">الحد الأقصى للمستخدمين <input class="tma-in" type="number" min="1" max="20" data-seats value="'+(o.seats||3)+'" style="width:70px;flex:none"></label></div></details>'}
  function render(){var h=g('tma-head'),l=g('tma-list');if(!h||!l)return;h.innerHTML=head();l.innerHTML=listHTML();var f=g('tma-f');if(f)f.value=S.f;bind()}
  function renderList(){var l=g('tma-list');if(l){l.innerHTML=listHTML();bindList()}}
  async function load(){var l=g('tma-list');if(l)l.innerHTML='<div class="tma-m" style="text-align:center;padding:20px">⏳ جاري التحميل…</div>';
    try{var s=await db.collection('orgs').get();S.orgs=s.docs.map(function(d){var x=d.data();x.id=d.id;return x}).sort(function(a,b){return (toD(b.createdAt)||0)-(toD(a.createdAt)||0)})}
    catch(e){if(l)l.innerHTML='<div style="color:#b33a3a;padding:12px;text-align:center">❌ '+(e.code==='permission-denied'?'محتاج تنشر قواعد Firestore الجديدة (orgs)':esc(e.message))+'</div>';return}
    S.mem={};try{var ms=await db.collectionGroup('members').get();ms.docs.forEach(function(d){var x=d.data();x.uid=d.id;var oid=d.ref.parent.parent.id;(S.mem[oid]=S.mem[oid]||[]).push(x)})}catch(e){console.warn('members',e)}
    try{var w=await db.collection('funding_waitlist').get();S.wait=w.docs.map(function(d){var x=d.data();x.id=d.id;return x})}catch(e){S.wait=[]}
    render()}
  async function upd(id,data,msg){data.updatedAt=FV().serverTimestamp();try{await db.collection('orgs').doc(id).update(data);var o=S.orgs.find(function(x){return x.id===id});
      if(o){Object.keys(data).forEach(function(k){if(k!=='updatedAt')o[k]=data[k]})}T(msg);render()}catch(e){T('❌ '+(e.code==='permission-denied'?'مش مسموح: اتأكد إنك داخل بحساب الأدمن':e.message))}}
  function bind(){
    var c=g('tma-create');if(c)c.onclick=async function(){var st=g('tma-st');
      var dup=findDup({name:g('tma-name').value,regNumber:g('tma-reg').value,phone:g('tma-phone').value});
      if(dup.length&&!confirm('⚠️ ممكن الجمعية دي عندها حساب بالفعل:\n\n'+dup.map(function(x){return '• '+x.o.name+' ('+x.o.email+') — نفس '+x.why.join(' و ')}).join('\n')+
        '\n\nكل جمعية المفروض يبقى ليها حساب واحد. لو عايزة تغير الإيميل، تغيره من لوحتها.\n\nتكمل وتعمل حساب جديد برضه؟'))return;c.disabled=true;st.textContent='⏳ جاري الإنشاء…';
      try{var u=g('tma-until').value;await createAccount({name:g('tma-name').value.trim(),email:g('tma-email').value,phone:g('tma-phone').value.trim(),gov:g('tma-gov').value.trim(),regNumber:g('tma-reg').value.trim(),contactName:g('tma-cn').value.trim(),
          until:u?new Date(u+'T23:59:00'):null,waitlistId:g('tma-wid').value});
        T('✅ اتعمل الحساب واتبعت للجمعية إيميل تحط منه كلمة المرور');['tma-name','tma-email','tma-reg','tma-phone','tma-gov','tma-wid','tma-cn'].forEach(function(k){g(k).value=''});c.disabled=false;g('tma-st').textContent='';await load()}
      catch(e){st.textContent='❌ '+e.message;c.disabled=false}};
    document.querySelectorAll('[data-fill]').forEach(function(b){b.onclick=function(){var w=S.wait.find(function(x){return x.id===b.dataset.fill});if(!w)return;
      g('tma-name').value=w.orgName||'';g('tma-email').value=w.contactEmail||w.email||'';g('tma-phone').value=w.phone||'';g('tma-gov').value=w.gov||'';g('tma-reg').value=w.regNumber||'';g('tma-cn').value=w.contactName||'';g('tma-wid').value=w.id;g('tma-name').scrollIntoView({behavior:'smooth',block:'center'})}});
    var q=g('tma-q');if(q)q.oninput=function(){S.q=q.value;renderList()};var f=g('tma-f');if(f)f.onchange=function(){S.f=f.value;renderList()};
    bindList()}
  function bindList(){document.querySelectorAll('#tma-list [data-org]').forEach(function(card){var id=card.dataset.org;var o=S.orgs.find(function(x){return x.id===id});if(!o)return;
    card.querySelectorAll('[data-ext]').forEach(function(b){b.onclick=function(){var d=addMonths(toD(o.paidUntil),+b.dataset.ext);upd(id,{paidUntil:TS(d),status:'active'},'✅ اتمد الاشتراك حتى '+fmt(d))}});
    var s=card.querySelector('[data-set]');if(s)s.onclick=function(){var v=card.querySelector('[data-date]').value;if(!v){T('اختار التاريخ');return}var d=new Date(v+'T23:59:00');upd(id,{paidUntil:TS(d),status:'active'},'✅ الحساب شغال حتى '+fmt(d))};
    var off=card.querySelector('[data-off]');if(off)off.onclick=function(){if(confirm('إيقاف حساب '+o.name+'؟ الجمعية مش هتقدر تستخدم المنصة لحد ما تشغله تاني.'))upd(id,{status:'suspended'},'⏸ اتوقف الحساب')};
    var on=card.querySelector('[data-on]');if(on)on.onclick=function(){var until=toD(o.paidUntil);if(!until||until<new Date()){T('الاشتراك منتهي: مد الاشتراك أو حدد تاريخ جديد');return}upd(id,{status:'active'},'▶ اتشغل الحساب')};
    var r=card.querySelector('[data-reset]');if(r)r.onclick=async function(){try{auth.languageCode='ar';await auth.sendPasswordResetEmail(o.email,{url:PORTAL_URL});T('📧 اتبعت رابط كلمة المرور لـ '+o.email)}catch(e){T('❌ '+e.message)}};
    card.querySelectorAll('[data-mreset]').forEach(function(b){b.onclick=async function(){try{auth.languageCode='ar';await auth.sendPasswordResetEmail(b.dataset.mreset,{url:PORTAL_URL});T('📧 اتبعت رابط كلمة المرور لـ '+b.dataset.mreset)}catch(e){T('❌ '+e.message)}}});
    var se=card.querySelector('[data-seats]');if(se)se.onchange=function(){var v=Math.max(1,Math.min(20,+se.value||3));upd(id,{seats:v},'✅ الحد الأقصى بقى '+v+' مستخدمين')};
    var n=card.querySelector('[data-notes]');if(n)n.onchange=function(){upd(id,{notes:n.value.trim()},'اتحفظت الملاحظة')}})}
  // ---------- ربط التبويب في لوحة الأدمن (نفس طريقة تبويب التواصل) ----------
  function mount(){var bar=document.querySelector('.adm-tab[onclick*="\'settings\'"]');var list=g('adm-list');
    if(!bar||!list)return false;if(document.querySelector('.adm-tab[data-tma]'))return true;
    var t=document.createElement('div');t.className='adm-tab';t.setAttribute('data-tma','1');t.style.cssText='background:#eef3ff;color:#1a3a6e;border-color:#1a3a6e';t.textContent='🔑 حسابات المنصة';
    t.onclick=function(){try{setAdmTab(t,'accounts')}catch(e){console.warn(e)}};bar.parentNode.insertBefore(t,bar);
    var box=document.createElement('div');box.id='adm-form-accounts';box.style.cssText='display:none;padding:0 16px 100px';
    box.innerHTML='<div style="font-size:13px;font-weight:800;color:#1a3a6e;margin:12px 0 8px">🔑 حسابات الجمعيات على منصة الفرص</div><div id="tma-head"></div><div id="tma-list"></div>';
    list.parentNode.insertBefore(box,list.nextSibling);
    var orig=window.setAdmTab;
    window.setAdmTab=function(el,tab){var b=g('adm-form-accounts');
      if(tab==='accounts'){try{admTab='accounts'}catch(e){}
        document.querySelectorAll('.adm-tab').forEach(function(x){x.classList.remove('on')});el.classList.add('on');
        document.querySelectorAll('[id^="adm-form-"]').forEach(function(x){if(x.id!=='adm-form-accounts')x.style.display='none'});
        ['adm-list','tm-list-export'].forEach(function(id){var x=g(id);if(x)x.style.display='none'});
        b.style.display='block';if(typeof auth==='undefined'||!auth.currentUser){g('tma-list').innerHTML='<div style="text-align:center;padding:20px;color:#e05050">❌ يجب تسجيل دخول الأدمن أولاً</div>';return}
        load();return}
      if(b)b.style.display='none';return orig.apply(this,arguments)};
    for(var k in orig)window.setAdmTab[k]=orig[k];
    return true}
  var tries=0;var iv=setInterval(function(){if(mount()||++tries>40)clearInterval(iv)},500);
  window.tmaCreateAccount=createAccount;
})();
