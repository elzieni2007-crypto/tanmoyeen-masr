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
  var S={orgs:[],wait:[],mem:{},q:'',f:'',trial:{}};
  var ROLE={owner:'مدير الحساب',editor:'مُعِد',reviewer:'مراجع'};
  function state(o){var until=toD(o.paidUntil);if(o.status!=='active')return {k:'off',t:'موقوف',c:'#b33a3a',bg:'#fbe6e6'};
    if(!until||until<new Date())return {k:'exp',t:'الاشتراك انتهى',c:'#a86300',bg:'#fdf0d7'};
    var days=Math.ceil((until-new Date())/864e5);return days<=7?{k:'soon',t:'ينتهي خلال '+days+' يوم',c:'#a86300',bg:'#fdf0d7'}:{k:'on',t:'نشط',c:'#0f8a5f',bg:'#e0f4ec'}}
  // ---------- إنشاء الحساب: تطبيق Firebase تاني علشان الأدمن ما يخرجش من حسابه ----------
  function secAuth(){var app=firebase.apps.filter(function(a){return a.name==='tmAcct'})[0]||firebase.initializeApp(firebaseConfig,'tmAcct');var a=app.auth();a.languageCode='ar';if(window.TM_EMU&&!a._tmEmu){a.useEmulator(TM_EMU.auth);a._tmEmu=1}return a}
  function rndPass(){var a=new Uint8Array(24);crypto.getRandomValues(a);return Array.from(a,function(x){return ('0'+x.toString(16)).slice(-2)}).join('')+'Aa1!'}
  // بيعمل الجمعية، وبعدين دالة fpteam بتربط الإيميل كمدير حساب: لو الإيميل عليه حساب على تنمويين مصر (مورد، باحث عن عمل، عضو في جمعية تانية…)
  // بيتربط بنفس الحساب وكلمة المرور، ولو مش عليه حساب بيتعمل حساب جديد ويوصله رابط كلمة المرور.
  var TEAM_URL=(window.TM_EMU&&TM_EMU.team)||'https://us-central1-tanmoyeen-masr26.cloudfunctions.net/fpteam';
  async function team(body){var tok=await auth.currentUser.getIdToken();var r=await fetch(TEAM_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},body:JSON.stringify(body)});
    var j={};try{j=await r.json()}catch(e){}if(!r.ok)throw new Error(j.error||('حصلت مشكلة ('+r.status+')'));return j}
  async function createAccount(d){
    var email=String(d.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('الإيميل مش صحيح');
    if(!d.name)throw new Error('اكتب اسم الجمعية');if(!d.until)throw new Error('حدد تاريخ انتهاء الاشتراك');
    var orgId=db.collection('orgs').doc().id,by=(auth.currentUser&&auth.currentUser.email)||'',now=FV().serverTimestamp(),O=db.collection('orgs').doc(orgId);
    await O.set({name:d.name,email:email,phone:d.phone||'',gov:d.gov||'',regNumber:d.regNumber||'',contactName:d.contactName||'',ownerUid:'',seats:+d.seats||3,
      status:'active',paidUntil:TS(d.until),notes:d.notes||'',waitlistId:d.waitlistId||'',createdAt:now,updatedAt:now,createdBy:by});
    var r;try{r=await team({action:'add',orgId:orgId,email:email,name:d.contactName||'',role:'owner'})}
    catch(e){try{await O.delete()}catch(_){}throw e}
    if(!r.existed){auth.languageCode='ar';await auth.sendPasswordResetEmail(email,{url:PORTAL_URL})}
    if(d.waitlistId){try{await db.collection('funding_waitlist').doc(d.waitlistId).update({status:'active',orgId:orgId,updatedAt:FV().serverTimestamp()})}catch(e){}}
    S.lastExisted=!!r.existed;
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
  var css='.fpa-card{background:#fff;border:1px solid #e2e9f1;border-radius:14px;padding:14px;margin-bottom:10px}.fpa-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}'+
    '.fpa-in{padding:9px 10px;border:1px solid #d9e5e8;border-radius:10px;font:inherit;min-width:0;flex:1}.fpa-b{border:0;border-radius:9px;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer;background:#e6f3fb;color:#0a6fa3}'+
    '.fpa-b.p{background:#1a3a6e;color:#fff}.fpa-b.r{background:#fbe6e6;color:#b33a3a}.fpa-b.g{background:#e0f4ec;color:#0f8a5f}.fpa-pill{border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700}'+
    '.fpa-k{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:8px 0 12px}.fpa-k div{background:#fff;border:1px solid #e2e9f1;border-radius:12px;padding:10px;text-align:center}.fpa-k b{display:block;font-size:20px}.fpa-k small{color:#64758a}'+
    '.fpa-m{font-size:12.5px;color:#64758a}@media(max-width:600px){.fpa-k{grid-template-columns:repeat(2,1fr)}}';
  function head(){var c={on:0,soon:0,exp:0,off:0};S.orgs.forEach(function(o){c[state(o).k]++});
    return '<style>'+css+'</style><div class="fpa-k"><div><b>'+(c.on+c.soon)+'</b><small>نشط</small></div><div><b>'+c.soon+'</b><small>ينتهي خلال أسبوع</small></div><div><b>'+c.exp+'</b><small>اشتراك منتهي</small></div><div><b>'+c.off+'</b><small>موقوف</small></div></div>'+
    hotHTML()+trialCfgHTML()+
    '<div class="fpa-card"><div style="font-weight:800;color:#1a3a6e;margin-bottom:8px">➕ حساب جديد لجمعية</div>'+
    '<div class="fpa-row" style="margin-bottom:8px"><input class="fpa-in" id="fpa-name" placeholder="اسم الجمعية"><input class="fpa-in" id="fpa-email" type="email" dir="ltr" placeholder="إيميل الجمعية (هيوصله رابط كلمة المرور)"></div>'+
    '<div class="fpa-row" style="margin-bottom:8px"><input class="fpa-in" id="fpa-reg" placeholder="رقم الإشهار"><input class="fpa-in" id="fpa-phone" placeholder="الموبايل (اختياري)"><input class="fpa-in" id="fpa-gov" placeholder="المحافظة (اختياري)"><label class="fpa-m" style="display:flex;gap:6px;align-items:center">الاشتراك ساري حتى <input class="fpa-in" id="fpa-until" type="date" value="'+ymd(addMonths(null,12))+'" style="flex:none"></label></div>'+
    '<input type="hidden" id="fpa-wid"><input type="hidden" id="fpa-cn"><div class="fpa-row"><button class="fpa-b p" id="fpa-create">إنشاء الحساب وإرسال رابط كلمة المرور</button><span class="fpa-m" id="fpa-st"></span></div>'+
    '<div class="fpa-m" style="margin-top:6px">الإيميل ده هيبقى «مدير الحساب» للجمعية: هيوصله إيميل يحط منه كلمة المرور بنفسه، ومن لوحته يضيف زمايله (لحد 3 مستخدمين)، وبعدها تدخل من <span dir="ltr">'+esc(PORTAL_URL)+'</span>. انت مش هتعرف كلمة المرور.</div></div>'+
    '<div class="fpa-row" style="margin:10px 0"><input class="fpa-in" id="fpa-q" placeholder="🔍 ابحث في الحجوزات والحسابات: الاسم، الإيميل، الموبايل، رقم العرض" value="'+esc(S.q)+'"><select class="fpa-in" id="fpa-f" style="flex:none"><option value="">الكل</option><option value="on">نشط</option><option value="soon">ينتهي قريب</option><option value="exp">منتهي</option><option value="off">موقوف</option><option value="trial">🧪 تجريبي</option><option value="hot">🔥 عملاء ساخنين</option></select></div>'+
    '<div id="fpa-wait">'+waitHTML()+'</div>'}
  // ---------- الحساب التجريبي ----------
  var waLink=function(p,t){var d=phone(p);return d?'https://wa.me/20'+d+'?text='+encodeURIComponent(t||''):''};
  function hotHTML(){var tr=S.orgs.filter(function(o){return o.plan==='trial'}),hot=tr.filter(function(o){return o.hot}).sort(function(a,b){return (toD(b.hot.last)||0)-(toD(a.hot.last)||0)});
    if(!tr.length)return '';
    var used=tr.filter(function(o){return lastIn(o)}).length;
    return '<div class="fpa-card" style="border-color:#f1d98e;background:#fffdf5"><div style="font-weight:800;color:#6b4a00;margin-bottom:6px">🧪 الحسابات التجريبية: '+tr.length+' · دخلوا المنصة: '+used+' · 🔥 عملاء ساخنين: '+hot.length+'</div>'+
      (hot.length?'<div class="fpa-m" style="margin-bottom:6px">دول جمعيات تجريبية حاولت تكتب مقترح أو تستخدم أداة للمشتركين. كلمهم في نفس اليوم.</div>'+hot.slice(0,15).map(function(o){var h=o.hot||{};
        var t='السلام عليكم، معاك مصطفى من تنمويين مصر. شفت إنكم بتجهزوا مقترح'+(h.opp?' لـ «'+h.opp+'»':'')+' على منصة الفرص. تحبوا نكمل المقترح سوا؟';
        return '<div class="fpa-row" style="border-top:1px dashed #f1d98e;padding-top:6px;margin-top:6px"><div style="flex:1;min-width:180px"><b>'+esc(o.name)+'</b><div class="fpa-m">🔥 '+(h.count||1)+' مرة · آخر مرة '+fmt(toD(h.last))+(h.feature?' · '+esc(FEAT[h.feature]||h.feature):'')+(h.opp?'<br>الفرصة: '+esc(h.opp):'')+'</div></div>'+
          (waLink(o.phone)?'<a class="fpa-b g" style="text-decoration:none" target="_blank" rel="noopener" href="'+waLink(o.phone,t)+'">💬 واتساب</a>':'')+'</div>'}).join(''):'<div class="fpa-m">لسه مفيش عملاء ساخنين.</div>')+
      '<div class="fpa-m" style="margin-top:8px">لما جمعية تجريبية تدفع، دوس «+ شهر» أو «+ سنة» على حسابها وهيتحول لاشتراك عادي بـ 3 مستخدمين.</div></div>'}
  var FEAT={write:'كتابة المقترح','كتابة المقترح':'كتابة المقترح'};
  function trialCfgHTML(){var t=S.trial||{};
    return '<details class="fpa-card" id="fpa-trialcfg"><summary style="font-weight:800;color:#1a3a6e;cursor:pointer">⚙️ إعدادات الحساب التجريبي '+(t.open===false?'(مقفول)':'(مفتوح لحد '+esc(t.until||'2026-11-30')+')')+'</summary>'+
      '<div class="fpa-row" style="margin-top:10px"><label class="fpa-m" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="fpa-topen"'+(t.open===false?'':' checked')+'> التفعيل الذاتي مفتوح</label>'+
      '<label class="fpa-m" style="display:flex;gap:6px;align-items:center">التجربة لحد <input class="fpa-in" type="date" id="fpa-tuntil" value="'+esc(t.until||'2026-11-30')+'" style="flex:none"></label>'+
      '<label class="fpa-m" style="display:flex;gap:6px;align-items:center;flex:1">واتساب المساعدة <input class="fpa-in" id="fpa-twa" dir="ltr" placeholder="201xxxxxxxxx" value="'+esc(t.wa||'')+'"></label>'+
      '</div><div class="fpa-row" style="margin-top:8px"><label class="fpa-m" style="display:flex;gap:6px;align-items:center;flex:1">عرض السعر اللي بيتبعت للحسابات التجريبية <select class="fpa-in" id="fpa-tq"><option value="">آخر عرض اتبعت (تلقائي)</option>'+
        (S.qpub||[]).map(function(x){return '<option value="'+esc(x.tok)+'"'+(t.quoteTpl===x.tok?' selected':'')+'>'+esc(x.no||'')+' · '+esc(x.assoc||'')+' · تأسيس '+(+x.setup||0)+' · شهري '+(+x.monthly||0)+'</option>'}).join('')+'</select></label>'+
      '<button class="fpa-b p" id="fpa-tsave">حفظ</button></div>'+
      '<div class="fpa-m" style="margin-top:6px">صفحة التفعيل: <a dir="ltr" href="'+PORTAL_URL+'trial.html" target="_blank" rel="noopener">'+esc(PORTAL_URL)+'trial.html</a>. الحساب التجريبي بمستخدم واحد وحد تكلفة دولار، والتاريخ ده بيتطبق على الحسابات الجديدة بس. رقم الواتساب بيظهر للجمعيات في صفحة التفعيل وجوه المنصة. لما جمعية تجريبية تدوس «عرض السعر»: لو حجزها عليه عرض بيتفتحلها هو، ولو مفيش بيتعمل عرض جديد برقم TM-FP-سنة-W### بنفس أسعار وبيانات تحويل العرض المختار هنا، وحالة الحجز بتبقى «العرض اتبعت».</div></details>'}
  function bindTrial(){var b=g('fpa-tsave');if(!b)return;b.onclick=async function(){var wa=digits(g('fpa-twa').value);if(wa&&wa.indexOf('20')!==0)wa='20'+wa.replace(/^0/,'');
      var d={open:g('fpa-topen').checked,until:g('fpa-tuntil').value||'2026-11-30',wa:wa,quoteTpl:(g('fpa-tq')||{}).value||'',updatedAt:FV().serverTimestamp()};
      try{await db.collection('fp_meta').doc('trial').set(d,{merge:true});S.trial=d;T('✅ اتحفظت إعدادات التجربة');var x=g('fpa-trialcfg');if(x)x.outerHTML=trialCfgHTML();bindTrial()}catch(e){T('❌ '+e.message)}}}
  function waitHTML(){var ord={paid:0,accepted:1,quoted:2,contacted:3,pending:4};
    var qq=nq(S.q);
    var ready=S.wait.filter(function(w){return !w.orgUid&&!w.orgId&&w.status!=='rejected'&&w.status!=='active'&&(w.contactEmail||w.orgEmail||w.email)
        &&(!qq||qq.split(' ').every(function(t){return nq([w.orgName,w.contactName,w.contactEmail,w.orgEmail,w.email,w.phone,w.regNumber,w.gov,w.quote&&w.quote.no,(w._rc||[]).map(function(r){return r.no}).join(' ')].join(' ')).indexOf(t)>-1}))})
      .sort(function(a,b){return (ord[a.status]??9)-(ord[b.status]??9)});
    if(!ready.length)return qq?'<div class="fpa-m" style="padding:4px 2px 8px">مفيش حجوزات من غير حساب بالبحث ده</div>':'';
    var hot=ready.filter(function(w){return w.status==='accepted'||w.status==='paid'}).length;
    return '<div class="fpa-card"><div style="font-weight:800;color:#1a3a6e;margin-bottom:6px">💰 حجوزات منصة المنح من غير حساب ('+ready.length+')'+(function(){var pd=ready.filter(function(x){return x.status==='paid'}).length,ac=hot-pd;return (pd?' · <span style="color:#0a8f6a">'+pd+' حوّلوا الجدية</span>':'')+(ac?' · <span style="color:#0a8f6a">'+ac+' وافقوا على العرض</span>':'')})()+'</div>'+ready.map(function(w,ix){
      var hotw=w.status==='accepted'||w.status==='paid',em=w.orgEmail||w.contactEmail||w.email||'';
      return '<div class="fpa-row" style="border-top:1px dashed #e2e9f1;padding-top:6px;margin-top:6px'+(hotw?';background:#effaf5;border-radius:10px;padding:8px':'')+'"><div style="flex:1;min-width:180px"><b>'+esc(w.orgName||'')+'</b><div class="fpa-m" dir="ltr" style="text-align:right">'+esc(em)+(w.phone?' · '+esc(w.phone):'')+'</div>'+
        '<div class="fpa-m">'+esc(WST[w.status]||w.status||'')+(w.quote&&w.quote.no?' · عرض '+esc(w.quote.no):'')+(w._rc?' · إيصال '+esc(w._rc[0].no||'')+' · '+Math.round(w._paid).toLocaleString('en-US')+' ج':'')+'</div></div>'+
        '<button class="fpa-b'+(hotw?' p':'')+'" data-fill="'+esc(w.id)+'">جهّز الحساب</button></div>'}).map(function(h,ix){var w=ready[ix],hotw=w.status==='accepted'||w.status==='paid';
        if(qq||hotw)return h;var first=!ready.slice(0,ix).some(function(x){return x.status!=='accepted'&&x.status!=='paid'});
        return (first?'<details style="margin-top:8px"><summary class="fpa-m" style="cursor:pointer;font-weight:700">باقي الحجوزات ('+ready.filter(function(x){return x.status!=='accepted'&&x.status!=='paid'}).length+')</summary>':'')+h+(ix===ready.length-1?'</details>':'')}).join('')+
      '<div class="fpa-m" style="margin-top:6px">«جهّز الحساب» بيملا بيانات الجمعية في فورم الحساب الجديد فوق، وبعد الإنشاء الحجز بيتحول لـ «مفعّل» ويتربط بالحساب.</div></div>'}
  function nq(x){return String(x||'').toLowerCase().replace(/[ً-ْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[٠-٩]/g,function(c){return '٠١٢٣٤٥٦٧٨٩'.indexOf(c)}).replace(/\s+/g,' ').trim()}
  function hay(o){var w=bk(o)||{};return nq([o.name,o.email,o.phone,o.regNumber,o.gov,o.contactName,o.notes,w.orgName,w.contactName,w.contactEmail,w.orgEmail,w.phone,w.quote&&w.quote.no].concat(mems(o).map(function(m){return m.email+' '+(m.name||'')})).join(' '))}
  function listHTML(){var q=nq(S.q);var rows=S.orgs.filter(function(o){return (!q||q.split(' ').every(function(t){return hay(o).indexOf(t)>-1}))&&(!S.f||(S.f==='trial'?o.plan==='trial':S.f==='hot'?!!(o.plan==='trial'&&o.hot):state(o).k===S.f))});
    if(S.f==='hot')rows.sort(function(a,b){return (toD(b.hot&&b.hot.last)||0)-(toD(a.hot&&a.hot.last)||0)});
    if(!rows.length)return '<div class="fpa-m" style="text-align:center;padding:20px">مفيش حسابات'+(q||S.f?' بالفلتر ده':' لسه')+'</div>';
    return rows.map(function(o){var st=state(o),until=toD(o.paidUntil);
      return '<div class="fpa-card" data-org="'+o.id+'"><div class="fpa-row" style="justify-content:space-between"><div><b style="font-size:15px">'+esc(o.name)+'</b> <span class="fpa-pill" style="color:'+st.c+';background:'+st.bg+'">'+st.t+'</span>'+(o.plan==='trial'?' <span class="fpa-pill" style="color:#6b4a00;background:#fff1c7">🧪 تجريبي</span>':'')+(o.plan==='trial'&&o.hot?' <span class="fpa-pill" style="color:#b33a3a;background:#fde8e1">🔥 ساخن</span>':'')+
        '<div class="fpa-m" dir="ltr" style="text-align:right">'+esc(o.email)+(o.phone?' · '+esc(o.phone):'')+'</div></div>'+
        (function(){var w=bk(o);return w?'<div class="fpa-m">🔗 الحجز: '+esc(WST[w.status]||w.status||'')+(w.quote&&w.quote.no?' · عرض '+esc(w.quote.no):'')+(w._rc?' · مدفوع '+Math.round(w._paid).toLocaleString('en-US')+' ج ('+w._rc.length+' إيصال)':'')+'</div>':''})()+'<div class="fpa-m">الاشتراك حتى: <b style="color:#11243a">'+fmt(until)+'</b><br>آخر دخول: '+fmt(lastIn(o))+'<br>'+useTxt(o)+(o.quoteReq?'<br><b style="color:#0a8f6a">📄 طلب عرض السعر '+(o.quoteReq.count||1)+' مرة · آخر مرة '+fmt(toD(o.quoteReq.last))+'</b>':'')+'</div></div>'+
        '<div class="fpa-row" style="margin-top:10px"><button class="fpa-b g" data-ext="1">+ شهر</button><button class="fpa-b g" data-ext="3">+ 3 شهور</button><button class="fpa-b g" data-ext="12">+ سنة</button>'+
        '<input class="fpa-in" type="date" data-date value="'+ymd(until)+'" style="flex:none"><button class="fpa-b" data-set>فعّل حتى التاريخ</button>'+
        (o.status==='active'?'<button class="fpa-b r" data-off>⏸ إيقاف الحساب</button>':'<button class="fpa-b g" data-on>▶ تشغيل الحساب</button>')+
        '<button class="fpa-b" data-reset>🔑 إرسال رابط كلمة المرور</button><button class="fpa-b" data-rlink>📋 انسخ رابط كلمة المرور</button>'+
        '<a class="fpa-b" style="text-decoration:none;background:#f3e8ff;color:#7c3aed" target="_blank" rel="noopener" href="'+PORTAL_URL+'app.html?org='+encodeURIComponent(o.id)+'">🛠 دعم فني: افتح حسابهم</a></div>'+
        teamHTML(o)+
        '<div class="fpa-row" style="margin-top:8px"><input class="fpa-in" data-notes placeholder="ملاحظات الأدمن (رقم الإيصال، طريقة الدفع…)" value="'+esc(o.notes||'')+'"></div></div>'}).join('')}
  function mems(o){return S.mem[o.id]||[]}
  function bk(o){return (S.wait||[]).find(function(w){return (o.waitlistId&&w.id===o.waitlistId)||w.orgId===o.id})}
  var WST={pending:'⏳ جديد',contacted:'📞 تم التواصل',quoted:'📄 العرض اتبعت',accepted:'🤝 وافق على العرض',paid:'💰 حوّل الجدية',active:'✅ مفعّل',rejected:'❌ مستبعد'};
  // استهلاك الذكاء الاصطناعي للجمعية الشهر ده (fp_usage بتكتبه دالة fpai)
  function useTxt(o){var u=(S.use||{})[o.id];if(!u)return 'الذكاء الاصطناعي الشهر ده: 0 طلب';var k=function(n){return n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?Math.round(n/1e3)+'K':String(n||0)};var f=(u.by&&u.by.full&&u.by.full.calls)||0,usd=+u.usd||0;
    // كل قسم في المقترح بيتكتب في طلب لوحده، فعدد الطلبات مش عدد المقترحات
    return 'الذكاء الاصطناعي الشهر ده: <b style="color:#11243a">'+(u.calls||0)+'</b> طلب'+(f?' (منهم '+f+' كتابة أقسام مقترح)':'')+(usd?' · تكلفة تقريبية <b style="color:#11243a">$'+usd.toFixed(2)+'</b>':'')+' · '+k(u.inTok)+' داخل / '+k(u.outTok)+' خارج'}
  function lastIn(o){var t=0;mems(o).forEach(function(m){var d=toD(m.lastLogin);if(d&&d>t)t=d});return t||null}
  // رابط تعيين كلمة المرور: بيتنسخ علشان يتبعت على واتساب لو الإيميل ما وصلش. الرابط بيشتغل مرة واحدة ولمدة ساعة تقريبا
  async function copyReset(email,ph,name,btn){if(!email){T('❌ مفيش إيميل للحساب');return}var t0=btn.textContent;btn.disabled=true;btn.textContent='⏳ …';
    try{var r=await team({action:'resetlink',email:email});
      var msg='السلام عليكم، ده رابط تحديد كلمة المرور لحساب '+(name||'جمعيتكم')+' على منصة فرص التمويل (الإيميل: '+email+'):\n'+r.link+'\n\nالرابط بيشتغل مرة واحدة ولمدة ساعة. بعد ما تحطوا كلمة المرور ادخلوا من هنا:\n'+PORTAL_URL;
      var ok=false;try{await navigator.clipboard.writeText(msg);ok=true}catch(e){}
      if(!ok)window.prompt('انسخ الرسالة:',msg);
      T(ok?'📋 اتنسخت الرسالة والرابط، ابعتها للجمعية':'انسخ الرسالة من المربع');
      var w=waLink(ph,msg);if(w&&confirm('اتنسخت الرسالة. تفتح واتساب الجمعية وتبعتها على طول؟'))window.open(w,'_blank')}
    catch(e){T('❌ '+e.message)}finally{btn.disabled=false;btn.textContent=t0}}
  function teamHTML(o){var ms=mems(o).slice().sort(function(a,b){return (a.role==='owner'?0:1)-(b.role==='owner'?0:1)}),act=ms.filter(function(m){return m.status==='active'}).length;
    return '<details style="margin-top:8px"><summary class="fpa-m" style="cursor:pointer">👥 فريق الجمعية: '+act+' من '+(o.seats||3)+' مستخدمين</summary>'+
      ms.map(function(m){return '<div class="fpa-row" style="padding:5px 0;border-top:1px dashed #e2e9f1"><span style="flex:1;min-width:160px"><b>'+esc(m.name||'—')+'</b> · '+ROLE[m.role]+(m.status!=='active'?' · <span style="color:#b33a3a">موقوف</span>':'')+
        '<br><span class="fpa-m" dir="ltr">'+esc(m.email)+'</span></span><span class="fpa-m">آخر دخول: '+fmt(toD(m.lastLogin))+'</span><button class="fpa-b" data-mreset="'+esc(m.email)+'">🔑 ابعت رابط كلمة المرور</button><button class="fpa-b" data-mlink="'+esc(m.email)+'">📋 انسخ الرابط</button></div>'}).join('')+
      '<div class="fpa-row" style="padding-top:6px"><label class="fpa-m">الحد الأقصى للمستخدمين <input class="fpa-in" type="number" min="1" max="20" data-seats value="'+(o.seats||3)+'" style="width:70px;flex:none"></label></div></details>'}
  function render(){var h=g('fpa-head'),l=g('fpa-list');if(!h||!l)return;h.innerHTML=head();l.innerHTML=listHTML();var f=g('fpa-f');if(f)f.value=S.f;bind()}
  function renderList(){var w=g('fpa-wait');if(w){w.innerHTML=waitHTML();bindFill()}var l=g('fpa-list');if(l){l.innerHTML=listHTML();bindList()}}
  // كل الطلبات بتتبعت مع بعض بدل ما تستنى واحدة ورا التانية
  async function load(){var l=g('fpa-list');if(l)l.innerHTML='<div class="fpa-m" style="text-align:center;padding:20px">⏳ جاري التحميل…</div>';
    var mon=new Date().toISOString().slice(0,7);
    var pOrgs=db.collection('orgs').get(),pMem=db.collectionGroup('members').get().catch(function(e){console.warn('members',e);return null}),
      pWait=db.collection('funding_waitlist').get().catch(function(){return null}),pUse=db.collection('fp_usage').where('month','==',mon).get().catch(function(){return null});
    Promise.all([db.collection('fp_meta').doc('trial').get(),db.collection('quote_public').get().catch(function(){return null})]).then(function(r){S.trial=(r[0].exists&&r[0].data())||{};
      S.qpub=r[1]?r[1].docs.map(function(d){var x=d.data();x.tok=d.id;return x}).filter(function(x){return x.status==='open'&&x.source!=='trial'&&+x.monthly>0}).sort(function(a,b){return (toD(b.updatedAt)||0)-(toD(a.updatedAt)||0)}):[];
      var b=g('fpa-trialcfg');if(b)b.outerHTML=trialCfgHTML();bindTrial()}).catch(function(){});
    try{var s=await pOrgs;S.orgs=s.docs.map(function(d){var x=d.data();x.id=d.id;return x}).sort(function(a,b){return (toD(b.createdAt)||0)-(toD(a.createdAt)||0)})}
    catch(e){if(l)l.innerHTML='<div style="color:#b33a3a;padding:12px;text-align:center">❌ '+(e.code==='permission-denied'?'محتاج تنشر قواعد Firestore الجديدة (orgs)':esc(e.message))+'</div>';return}
    var r=await Promise.all([pMem,pWait,pUse]);
    S.mem={};if(r[0])r[0].docs.forEach(function(d){var x=d.data();x.uid=d.id;var oid=d.ref.parent.parent.id;(S.mem[oid]=S.mem[oid]||[]).push(x)});
    S.wait=r[1]?r[1].docs.map(function(d){var x=d.data();x.id=d.id;return x}):[];
    try{var qr=await db.collection('quote_responses').get();var RESP={};qr.docs.forEach(function(d){RESP[d.id]=d.data()});
      S.wait.forEach(function(w){var tok=w.quoteToken||(w.quote&&w.quote.token);var x=tok&&RESP[tok];if(x&&x.decision==='accepted'&&['pending','contacted','quoted'].indexOf(w.status||'pending')>-1)w.status='accepted'})}catch(e){}
    // أي حجز عليه إيصال صالح (عربون أو إعداد أو اشتراك) يبقى «حوّل الجدية» حتى لو حالته في الحجوزات لسه متحدثتش
    try{var rq=await db.collection('receipts').get();var RC={};rq.docs.forEach(function(d){var x=d.data();if(x.status==='void'||!x.bookingId)return;(RC[x.bookingId]=RC[x.bookingId]||[]).push(x)});
      S.wait.forEach(function(w){var L=RC[w.id];if(!L)return;w._rc=L.sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''))});w._paid=L.reduce(function(a,x){return a+(+x.amount||0)},0);
        if(['pending','contacted','quoted','accepted'].indexOf(w.status||'pending')>-1)w.status='paid'})}catch(e){console.warn('receipts',e)}
    S.use={};if(r[2])r[2].docs.forEach(function(d){var x=d.data();S.use[x.orgId]=x});
    render()}
  async function upd(id,data,msg){data.updatedAt=FV().serverTimestamp();try{await db.collection('orgs').doc(id).update(data);var o=S.orgs.find(function(x){return x.id===id});
      if(o){Object.keys(data).forEach(function(k){if(k!=='updatedAt')o[k]=data[k]})}T(msg);render()}catch(e){T('❌ '+(e.code==='permission-denied'?'مش مسموح: اتأكد إنك داخل بحساب الأدمن':e.message))}}
  function bind(){
    var c=g('fpa-create');if(c)c.onclick=async function(){var st=g('fpa-st');
      var dup=findDup({name:g('fpa-name').value,regNumber:g('fpa-reg').value,phone:g('fpa-phone').value});
      if(dup.length&&!confirm('⚠️ ممكن الجمعية دي عندها حساب بالفعل:\n\n'+dup.map(function(x){return '• '+x.o.name+' ('+x.o.email+') — نفس '+x.why.join(' و ')}).join('\n')+
        '\n\nكل جمعية المفروض يبقى ليها حساب واحد. لو عايزة تغير الإيميل، تغيره من لوحتها.\n\nتكمل وتعمل حساب جديد برضه؟'))return;c.disabled=true;st.textContent='⏳ جاري الإنشاء…';
      try{var u=g('fpa-until').value;await createAccount({name:g('fpa-name').value.trim(),email:g('fpa-email').value,phone:g('fpa-phone').value.trim(),gov:g('fpa-gov').value.trim(),regNumber:g('fpa-reg').value.trim(),contactName:g('fpa-cn').value.trim(),
          until:u?new Date(u+'T23:59:00'):null,waitlistId:g('fpa-wid').value});
        T(S.lastExisted?'✅ اتعمل حساب الجمعية. الإيميل ده عليه حساب على تنمويين مصر بالفعل، فهيدخلوا المنصة بنفس كلمة المرور بتاعته':'✅ اتعمل الحساب واتبعت للجمعية إيميل تحط منه كلمة المرور');['fpa-name','fpa-email','fpa-reg','fpa-phone','fpa-gov','fpa-wid','fpa-cn'].forEach(function(k){g(k).value=''});c.disabled=false;g('fpa-st').textContent='';await load()}
      catch(e){st.textContent='❌ '+e.message;c.disabled=false}};
    bindFill();bindTrial();
    var q=g('fpa-q');if(q)q.oninput=function(){S.q=q.value;var a=g('adm-search');if(a)a.value=q.value;renderList()};
    // خانة البحث اللي فوق خالص في لوحة الأدمن بتبحث هنا كمان لما تبويب حسابات المنصة مفتوح
    var top=g('adm-search');if(top&&!top._fpa){top._fpa=1;top.addEventListener('input',function(){var b=g('adm-form-fpaccounts');if(!b||b.style.display==='none')return;S.q=top.value;var m=g('fpa-q');if(m)m.value=top.value;renderList()})}var f=g('fpa-f');if(f)f.onchange=function(){S.f=f.value;renderList()};
    bindList()}
  function bindFill(){document.querySelectorAll('[data-fill]').forEach(function(b){b.onclick=function(){var w=S.wait.find(function(x){return x.id===b.dataset.fill});if(!w)return;
      g('fpa-name').value=w.orgName||'';g('fpa-email').value=w.contactEmail||w.email||'';g('fpa-phone').value=w.phone||'';g('fpa-gov').value=w.gov||'';g('fpa-reg').value=w.regNumber||'';g('fpa-cn').value=w.contactName||'';g('fpa-wid').value=w.id;g('fpa-name').scrollIntoView({behavior:'smooth',block:'center'})}});}
  function bindList(){document.querySelectorAll('#fpa-list [data-org]').forEach(function(card){var id=card.dataset.org;var o=S.orgs.find(function(x){return x.id===id});if(!o)return;
    card.querySelectorAll('[data-ext]').forEach(function(b){b.onclick=function(){var d=addMonths(toD(o.paidUntil),+b.dataset.ext),x={paidUntil:TS(d),status:'active'};if(o.plan==='trial'){if(!confirm('تحويل «'+o.name+'» من حساب تجريبي لاشتراك مدفوع لحد '+fmt(d)+'؟'))return;x.plan='paid';x.seats=Math.max(3,+o.seats||0)}upd(id,x,o.plan==='trial'?'✅ اتحول لاشتراك لحد '+fmt(d):'✅ اتمد الاشتراك حتى '+fmt(d))}});
    var s=card.querySelector('[data-set]');if(s)s.onclick=function(){var v=card.querySelector('[data-date]').value;if(!v){T('اختار التاريخ');return}var d=new Date(v+'T23:59:00'),x={paidUntil:TS(d),status:'active'};if(o.plan==='trial'&&confirm('تحوّل «'+o.name+'» لاشتراك مدفوع؟\n\nOK = اشتراك مدفوع بـ 3 مستخدمين\nCancel = يفضل تجريبي ويتمد بس')){x.plan='paid';x.seats=Math.max(3,+o.seats||0)}upd(id,x,'✅ الحساب شغال حتى '+fmt(d))};
    var off=card.querySelector('[data-off]');if(off)off.onclick=function(){if(confirm('إيقاف حساب '+o.name+'؟ الجمعية مش هتقدر تستخدم المنصة لحد ما تشغله تاني.'))upd(id,{status:'suspended'},'⏸ اتوقف الحساب')};
    var on=card.querySelector('[data-on]');if(on)on.onclick=function(){var until=toD(o.paidUntil);if(!until||until<new Date()){T('الاشتراك منتهي: مد الاشتراك أو حدد تاريخ جديد');return}upd(id,{status:'active'},'▶ اتشغل الحساب')};
    var r=card.querySelector('[data-reset]');if(r)r.onclick=async function(){try{auth.languageCode='ar';await auth.sendPasswordResetEmail(o.email,{url:PORTAL_URL});T('📧 اتبعت رابط كلمة المرور لـ '+o.email)}catch(e){T('❌ '+e.message)}};
    var rl=card.querySelector('[data-rlink]');if(rl)rl.onclick=function(){copyReset(o.email,o.phone,o.name,rl)};
    card.querySelectorAll('[data-mlink]').forEach(function(b){b.onclick=function(){copyReset(b.dataset.mlink,o.phone,o.name,b)}});
    card.querySelectorAll('[data-mreset]').forEach(function(b){b.onclick=async function(){try{auth.languageCode='ar';await auth.sendPasswordResetEmail(b.dataset.mreset,{url:PORTAL_URL});T('📧 اتبعت رابط كلمة المرور لـ '+b.dataset.mreset)}catch(e){T('❌ '+e.message)}}});
    var se=card.querySelector('[data-seats]');if(se)se.onchange=function(){var v=Math.max(1,Math.min(20,+se.value||3));upd(id,{seats:v},'✅ الحد الأقصى بقى '+v+' مستخدمين')};
    var n=card.querySelector('[data-notes]');if(n)n.onchange=function(){upd(id,{notes:n.value.trim()},'اتحفظت الملاحظة')}})}
  // ---------- ربط التبويب في لوحة الأدمن (نفس طريقة تبويب التواصل) ----------
  function mount(){var bar=document.querySelector('.adm-tab[onclick*="\'settings\'"]');var list=g('adm-list');
    if(!bar||!list)return false;if(document.querySelector('.adm-tab[data-tma]'))return true;
    var t=document.createElement('div');t.className='adm-tab';t.setAttribute('data-tma','1');t.style.cssText='background:#eef3ff;color:#1a3a6e;border-color:#1a3a6e';t.textContent='🔑 حسابات المنصة';
    t.onclick=function(){try{setAdmTab(t,'fpaccounts')}catch(e){console.warn(e)}};bar.parentNode.insertBefore(t,bar);
    var box=document.createElement('div');box.id='adm-form-fpaccounts';box.style.cssText='display:none;padding:0 16px 100px';
    box.innerHTML='<div style="font-size:13px;font-weight:800;color:#1a3a6e;margin:12px 0 8px">🔑 حسابات الجمعيات على منصة الفرص</div><div id="fpa-head"></div><div id="fpa-list"></div>';
    list.parentNode.insertBefore(box,list.nextSibling);
    var orig=window.setAdmTab;
    window.setAdmTab=function(el,tab){var b=g('adm-form-fpaccounts');
      if(tab==='fpaccounts'){try{admTab='fpaccounts'}catch(e){}
        document.querySelectorAll('.adm-tab').forEach(function(x){x.classList.remove('on')});el.classList.add('on');
        document.querySelectorAll('[id^="adm-form-"]').forEach(function(x){if(x.id!=='adm-form-fpaccounts')x.style.display='none'});
        ['adm-list','tm-list-export'].forEach(function(id){var x=g(id);if(x)x.style.display='none'});
        b.style.display='block';if(typeof auth==='undefined'||!auth.currentUser){g('fpa-list').innerHTML='<div style="text-align:center;padding:20px;color:#e05050">❌ يجب تسجيل دخول الأدمن أولاً</div>';return}
        var tq=g('adm-search');S.q=tq?tq.value:'';load();return}
      if(b)b.style.display='none';return orig.apply(this,arguments)};
    for(var k in orig)window.setAdmTab[k]=orig[k];
    return true}
  var tries=0;var iv=setInterval(function(){if(mount()||++tries>40)clearInterval(iv)},500);
  window.tmaCreateAccount=createAccount;
})();
