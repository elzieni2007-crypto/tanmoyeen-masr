// ===== مالية منصة الفرص (لوحة الأدمن): الإيرادات من الإيصالات الفعلية + المصروفات المسجلة بالمصري =====
// بيعتمد على db و auth و firebase و toast و setAdmTab من index.html
// - الإيرادات: من collection «receipts» (الإيصالات الصالحة بس، والملغاة مش بتتحسب). المبالغ بالجنيه.
// - المصروفات: collection «fp_finance» (الأدمن بس يقرا ويكتب). كل مصروف بتاريخه وعملته وسعر الصرف وما يعادله بالجنيه.
// - تكلفة الذكاء الاصطناعي التقديرية من «fp_usage» للمقارنة بالمدفوع فعلًا لـ Anthropic.
(function(){
  var g=function(id){return document.getElementById(id)};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  var T=function(m){try{toast(m)}catch(e){alert(m)}};
  var FV=function(){return firebase.firestore.FieldValue};
  var EGP=function(n){return Math.round(+n||0).toLocaleString('en-US')+' ج'};
  var iso=function(d){var x=new Date(d.getTime()-d.getTimezoneOffset()*6e4);return x.toISOString().slice(0,10)};
  var CATS={api:'🤖 Claude API (الذكاء الاصطناعي)',claude:'💬 اشتراك Claude',firebase:'🔥 Firebase / Google Cloud',domain:'🌐 دومين واستضافة',ads:'📣 إعلانات وتسويق',tools:'🧰 أدوات وبرامج',bank:'🏦 عمولات بنكية وتحويل',other:'📦 أخرى'};
  var KINDS={deposit:'عربون جدية',setup:'رسوم الإعداد',monthly:'اشتراك شهري',quarterly:'اشتراك ربع سنوي',annual:'اشتراك سنوي'};
  var CURS={USD:'دولار',EGP:'جنيه',EUR:'يورو'};
  // أسعار Claude API التقديرية لكل مليون توكن (دولار) — للمقارنة بس، والمدفوع الحقيقي هو اللي بتسجله
  var RATES={full:[4,20],std:[2,10],quick:[0.1,0.5]};
  var S={rc:[],ex:[],use:[],per:'month',from:'',to:'',edit:null,loaded:false,lastRate:+(localStorage.getItem('fpf_rate')||0)||50};

  function range(){var n=new Date(),y=n.getFullYear(),m=n.getMonth();
    if(S.per==='month')return [iso(new Date(y,m,1)),iso(new Date(y,m+1,0))];
    if(S.per==='prev')return [iso(new Date(y,m-1,1)),iso(new Date(y,m,0))];
    if(S.per==='year')return [y+'-01-01',y+'-12-31'];
    if(S.per==='custom')return [S.from||'0000-01-01',S.to||'9999-12-31'];return ['0000-01-01','9999-12-31']}
  var inR=function(d,r){return d&&d>=r[0]&&d<=r[1]};
  function css(){if(g('fpf-css'))return;var st=document.createElement('style');st.id='fpf-css';st.textContent=
   '.fpf-card{background:#fff;border:1px solid #e2e9f1;border-radius:14px;padding:14px;margin-bottom:12px}'+
   '.fpf-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:12px}'+
   '.fpf-k{background:#fff;border:1px solid #e2e9f1;border-radius:14px;padding:12px;text-align:center}.fpf-k b{display:block;font-size:20px;color:#11243a}.fpf-k span{font-size:12px;color:#6b7c93}'+
   '.fpf-in{width:100%;box-sizing:border-box;padding:9px 10px;border:1.5px solid #dde6f0;border-radius:10px;font:inherit;font-size:13px;background:#fff}'+
   '.fpf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px}.fpf-grid label{font-size:12px;color:#4a5b70;font-weight:700;display:block;margin-bottom:3px}'+
   '.fpf-b{border:none;border-radius:10px;padding:9px 14px;font:inherit;font-size:13px;font-weight:800;cursor:pointer;background:#eaf5fc;color:#1a3a6e}.fpf-b.p{background:#1a3a6e;color:#fff}.fpf-b.d{background:#fde8e8;color:#b33a3a}'+
   '.fpf-t{width:100%;border-collapse:collapse;font-size:12.5px}.fpf-t th,.fpf-t td{padding:7px 6px;border-bottom:1px solid #eef2f7;text-align:right;vertical-align:top}.fpf-t th{color:#6b7c93;font-weight:700;background:#f7f9fc}'+
   '.fpf-tw{overflow-x:auto}.fpf-m{font-size:12px;color:#6b7c93}.fpf-pos{color:#0a8f6a}.fpf-neg{color:#b33a3a}'+
   '.fpf-bar{height:8px;border-radius:6px;background:#eef2f7;overflow:hidden}.fpf-bar i{display:block;height:100%;background:#1a3a6e}'+
   '.fpf-chips{display:flex;gap:6px;flex-wrap:wrap}.fpf-chips button{border:1.5px solid #dde6f0;background:#fff;border-radius:20px;padding:6px 12px;font:inherit;font-size:12.5px;cursor:pointer}.fpf-chips button.on{background:#1a3a6e;color:#fff;border-color:#1a3a6e}';
   document.head.appendChild(st)}

  async function load(){var h=g('fpf-body');if(h)h.innerHTML='<div class="fpf-m" style="text-align:center;padding:20px">⏳ جاري التحميل…</div>';
    var r=await Promise.all([db.collection('receipts').get().catch(function(e){return {err:e}}),db.collection('fp_finance').get().catch(function(e){return {err:e}}),db.collection('fp_usage').get().catch(function(){return null}),db.collection('orgs').get().catch(function(){return null}),db.collection('fp_meta').doc('ai').get().catch(function(){return null})]);
    if(r[1].err&&r[1].err.code==='permission-denied'){h.innerHTML='<div class="fpf-card" style="color:#b33a3a">❌ لازم تضيف قاعدة <b>fp_finance</b> في قواعد Firestore الأول (ابعتها لـ Claude لو مش متأكد).</div>';return}
    S.rc=r[0].err?[]:r[0].docs.map(function(d){var x=d.data();x.id=d.id;return x});
    S.ex=r[1].err?[]:r[1].docs.map(function(d){var x=d.data();x.id=d.id;return x});
    S.use=r[2]?r[2].docs.map(function(d){return d.data()}):[];
    S.orgs=r[3]?r[3].docs.map(function(d){var x=d.data();x.id=d.id;return x}):[];S.ai=Object.assign({enabled:true,orgMonthUsd:0,orgDayUsd:0,totalMonthUsd:0},(r[4]&&r[4].exists&&r[4].data())||{});S.rcErr=r[0].err?r[0].err.message:'';S.loaded=true;render()}

  function sums(rg){var rc=S.rc.filter(function(x){return x.status!=='void'&&inR(x.date,rg)}),ex=S.ex.filter(function(x){return inR(x.date,rg)});
    var rev=rc.reduce(function(a,x){return a+(+x.amount||0)},0),exp=ex.reduce(function(a,x){return a+(+x.egp||0)},0);
    var byK={};rc.forEach(function(x){byK[x.kind]=(byK[x.kind]||0)+(+x.amount||0)});var byC={};ex.forEach(function(x){byC[x.cat]=(byC[x.cat]||0)+(+x.egp||0)});
    var assoc={};rc.forEach(function(x){if(x.assoc)assoc[x.assoc]=1});return {rc:rc,ex:ex,rev:rev,exp:exp,net:rev-exp,byK:byK,byC:byC,n:Object.keys(assoc).length}}
  function apiEst(rg){var m0=rg[0].slice(0,7),m1=rg[1].slice(0,7),usd=0,calls=0;
    S.use.forEach(function(u){if(!u.month||u.month<m0||u.month>m1||u.orgId==='_total')return;calls+=+u.calls||0;var by=u.by||{};
      Object.keys(by).forEach(function(t){if(by[t].usd!=null){usd+=+by[t].usd;return}var R=RATES[t]||RATES.full;usd+=((+by[t].in||0)*R[0]+(+by[t].out||0)*R[1])/1e6})});return {usd:usd,calls:calls}}
  function bars(obj,labels){var tot=Object.keys(obj).reduce(function(a,k){return a+obj[k]},0)||1;
    return Object.keys(obj).sort(function(a,b){return obj[b]-obj[a]}).map(function(k){return '<div style="margin:6px 0"><div style="display:flex;justify-content:space-between;font-size:12.5px"><span>'+esc(labels[k]||k)+'</span><b>'+EGP(obj[k])+'</b></div><div class="fpf-bar"><i style="width:'+Math.round(obj[k]/tot*100)+'%"></i></div></div>'}).join('')||'<div class="fpf-m">مفيش</div>'}
  function monthly(){var M={};S.rc.forEach(function(x){if(x.status==='void'||!x.date)return;var k=x.date.slice(0,7);M[k]=M[k]||{r:0,e:0};M[k].r+=+x.amount||0});
    S.ex.forEach(function(x){if(!x.date)return;var k=x.date.slice(0,7);M[k]=M[k]||{r:0,e:0};M[k].e+=+x.egp||0});
    var ks=Object.keys(M).sort().reverse().slice(0,12);if(!ks.length)return '';var cum=0;
    return '<div class="fpf-card"><b style="color:#1a3a6e">📅 شهر بشهر</b><div class="fpf-tw"><table class="fpf-t" style="margin-top:8px"><thead><tr><th>الشهر</th><th>الإيرادات</th><th>المصروفات</th><th>الصافي</th></tr></thead><tbody>'+
      ks.map(function(k){var v=M[k],n=v.r-v.e;return '<tr><td>'+k+'</td><td>'+EGP(v.r)+'</td><td>'+EGP(v.e)+'</td><td class="'+(n>=0?'fpf-pos':'fpf-neg')+'"><b>'+EGP(n)+'</b></td></tr>'}).join('')+'</tbody></table></div></div>'}

  function aiHTML(){var a=S.ai||{},mon=iso(new Date()).slice(0,7),day=new Date(Date.now()+2*3600e3).toISOString().slice(0,10);
    var U={};S.use.forEach(function(u){if(u.month===mon)U[u.orgId]=u});var tot=U._total||{};
    var rows=S.orgs.map(function(o){var u=U[o.id]||{},m=+u.usd||0,d=+((u.days||{})[day]||{}).usd||0,cm=+o.aiMonthUsd>0?+o.aiMonthUsd:+a.orgMonthUsd,cd=+o.aiDayUsd>0?+o.aiDayUsd:+a.orgDayUsd;return {o:o,m:m,d:d,cm:cm,cd:cd,calls:+u.calls||0}}).sort(function(x,y){return y.m-x.m});
    var pc=function(v,c){return c>0?Math.round(v/c*100):-1},col=function(p){return p<0?'#11243a':p>=100?'#b33a3a':p>=80?'#c27803':'#0a8f6a'},pt=function(p){return p<0?'':'<div class="fpf-m">'+p+'%</div>'},lim=function(v){return +v>0?'$'+(+v):'من غير حد'};
    return '<div class="fpf-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><b style="color:#1a3a6e">🤖 مراقبة تكلفة الذكاء الاصطناعي (الشهر ده)</b>'+
      '<label style="display:flex;gap:6px;align-items:center;font-size:13px;font-weight:700"><input type="checkbox" id="fpf-ai-on"'+(a.enabled!==false?' checked':'')+'> الكتابة شغالة لكل الجمعيات</label></div>'+
      '<div class="fpf-m" style="margin:6px 0">الإجمالي الشهر ده: <b>$'+(+tot.usd||0).toFixed(2)+'</b> (≈ '+EGP((+tot.usd||0)*S.lastRate)+') · الحد الكلي: '+lim(a.totalMonthUsd)+' · النهارده: <b>$'+(+((tot.days||{})[day]||{}).usd||0).toFixed(2)+'</b></div>'+
      '<div class="fpf-grid"><div><label>حد الشهر لكل جمعية ($، 0 = من غير حد)</label><input class="fpf-in" id="fpf-ai-m" inputmode="decimal" value="'+esc(a.orgMonthUsd)+'"></div><div><label>حد اليوم لكل جمعية ($، 0 = من غير حد)</label><input class="fpf-in" id="fpf-ai-d" inputmode="decimal" value="'+esc(a.orgDayUsd)+'"></div><div><label>حد كلي للمنصة في الشهر ($، 0 = من غير حد)</label><input class="fpf-in" id="fpf-ai-t" inputmode="decimal" value="'+esc(a.totalMonthUsd)+'"></div></div>'+
      '<div style="margin-top:8px"><button class="fpf-b p" id="fpf-ai-save">احفظ الحدود</button></div>'+
      '<div class="fpf-m" style="margin-top:6px">دلوقتي مراقبة بس: الحدود صفر يعني من غير حد. لو حطيت حد ووصلت له جمعية، الكتابة بالذكاء الاصطناعي بتقف عندها لحد اليوم اللي بعده أو الشهر اللي بعده، والتعديل بالإيد بيفضل شغال. حد اليوم بيمنع إن جمعية تخلص حد الشهر كله في يوم تجارب.</div>'+
      '<div class="fpf-tw"><table class="fpf-t" style="margin-top:10px"><thead><tr><th>الجمعية</th><th>النهارده</th><th>الشهر</th><th>طلبات</th><th>حد خاص (يوم/شهر $)</th></tr></thead><tbody>'+
      rows.map(function(x){var pd=pc(x.d,x.cd),pm=pc(x.m,x.cm);return '<tr><td>'+esc(x.o.name||x.o.id)+(x.o.aiUnlimited?' <span class="fpf-m">(من غير حد)</span>':'')+'</td><td style="color:'+col(pd)+'">$'+x.d.toFixed(2)+pt(pd)+'</td><td style="color:'+col(pm)+'"><b>$'+x.m.toFixed(2)+'</b><div class="fpf-m">'+(pm<0?'':pm+'% · ')+'≈ '+EGP(x.m*S.lastRate)+'</div></td><td>'+x.calls+'</td>'+
        '<td style="white-space:nowrap"><input class="fpf-in" style="width:56px;display:inline-block;padding:5px" data-cd="'+esc(x.o.id)+'" placeholder="'+(+a.orgDayUsd>0?esc(a.orgDayUsd):'—')+'" value="'+esc(x.o.aiDayUsd||'')+'"> / <input class="fpf-in" style="width:56px;display:inline-block;padding:5px" data-cm="'+esc(x.o.id)+'" placeholder="'+(+a.orgMonthUsd>0?esc(a.orgMonthUsd):'—')+'" value="'+esc(x.o.aiMonthUsd||'')+'"> <button class="fpf-b" data-cap="'+esc(x.o.id)+'">حفظ</button></td></tr>'}).join('')+
      '</tbody></table></div><div class="fpf-m">الحد الخاص الفاضي معناه إن الجمعية ماشية على الحد العام. التكلفة تقديرية بأسعار Claude الرسمية، والمدفوع الحقيقي في console.anthropic.com.</div></div>'}
  function formHTML(){var e=S.edit||{};var today=iso(new Date());
    return '<div class="fpf-card" id="fpf-form"><b style="color:#1a3a6e">'+(e.id?'✏️ تعديل مصروف':'➕ تسجيل مصروف')+'</b><div class="fpf-grid" style="margin-top:8px">'+
      '<div><label>التاريخ</label><input class="fpf-in" type="date" id="fpf-date" value="'+esc(e.date||today)+'"></div>'+
      '<div><label>البند</label><select class="fpf-in" id="fpf-cat">'+Object.keys(CATS).map(function(k){return '<option value="'+k+'"'+(e.cat===k?' selected':'')+'>'+CATS[k]+'</option>'}).join('')+'</select></div>'+
      '<div style="grid-column:1/-1"><label>الوصف</label><input class="fpf-in" id="fpf-desc" placeholder="مثلًا: شحن رصيد API، اشتراك Claude شهر نوفمبر" value="'+esc(e.desc||'')+'"></div>'+
      '<div><label>المبلغ</label><input class="fpf-in" id="fpf-amt" inputmode="decimal" value="'+esc(e.amt||'')+'"></div>'+
      '<div><label>العملة</label><select class="fpf-in" id="fpf-cur">'+Object.keys(CURS).map(function(k){return '<option value="'+k+'"'+((e.cur||'USD')===k?' selected':'')+'>'+CURS[k]+'</option>'}).join('')+'</select></div>'+
      '<div><label>سعر الصرف (جنيه للوحدة)</label><input class="fpf-in" id="fpf-rate" inputmode="decimal" value="'+esc(e.rate||(e.cur==='EGP'?1:S.lastRate))+'"></div>'+
      '<div><label>المعادل بالجنيه</label><input class="fpf-in" id="fpf-egp" inputmode="decimal" value="'+esc(e.egp||'')+'"><div class="fpf-m">بيتحسب لوحده، وتقدر تكتب المخصوم فعلًا من البنك</div></div>'+
      '<div><label>طريقة الدفع</label><input class="fpf-in" id="fpf-pay" placeholder="فيزا، إنستاباي…" value="'+esc(e.pay||'')+'"></div>'+
      '<div><label>رقم الفاتورة / المرجع</label><input class="fpf-in" id="fpf-ref" value="'+esc(e.ref||'')+'"></div>'+
      '</div><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="fpf-b p" id="fpf-save">'+(e.id?'حفظ التعديل':'سجّل المصروف')+'</button>'+(e.id?'<button class="fpf-b" id="fpf-cancel">إلغاء</button>':'')+'</div></div>'}

  function render(){var h=g('fpf-body');if(!h)return;if(!S.loaded){load();return}
    var rg=range(),s=sums(rg),api=apiEst(rg),paidApi=s.ex.filter(function(x){return x.cat==='api'}).reduce(function(a,x){return a+(+x.egp||0)},0);
    var P=[['month','الشهر ده'],['prev','الشهر اللي فات'],['year','السنة دي'],['all','من البداية'],['custom','فترة محددة']];
    h.innerHTML=
     '<div class="fpf-chips" style="margin-bottom:10px">'+P.map(function(p){return '<button data-per="'+p[0]+'" class="'+(S.per===p[0]?'on':'')+'">'+p[1]+'</button>'}).join('')+'</div>'+
     (S.per==='custom'?'<div class="fpf-grid" style="margin-bottom:10px"><div><label>من</label><input class="fpf-in" type="date" id="fpf-from" value="'+esc(S.from)+'"></div><div><label>إلى</label><input class="fpf-in" type="date" id="fpf-to" value="'+esc(S.to)+'"></div></div>':'')+
     (S.rcErr?'<div class="fpf-card" style="color:#b33a3a">❌ تعذر قراءة الإيصالات: '+esc(S.rcErr)+'</div>':'')+
     '<div class="fpf-kpis"><div class="fpf-k"><b class="fpf-pos">'+EGP(s.rev)+'</b><span>الإيرادات ('+s.rc.length+' إيصال)</span></div>'+
     '<div class="fpf-k"><b class="fpf-neg">'+EGP(s.exp)+'</b><span>المصروفات ('+s.ex.length+')</span></div>'+
     '<div class="fpf-k"><b class="'+(s.net>=0?'fpf-pos':'fpf-neg')+'">'+EGP(s.net)+'</b><span>الصافي'+(s.rev?' · هامش '+Math.round(s.net/s.rev*100)+'%':'')+'</span></div>'+
     '<div class="fpf-k"><b>'+s.n+'</b><span>جمعيات دفعت'+(s.n?' · متوسط '+EGP(s.rev/s.n):'')+'</span></div></div>'+
     '<div class="fpf-card"><b style="color:#1a3a6e">🤖 الذكاء الاصطناعي في الفترة دي</b><div class="fpf-m" style="margin-top:6px">'+api.calls+' طلب من الجمعيات · تكلفة تقديرية حسب الاستهلاك <b>$'+api.usd.toFixed(2)+'</b> (≈ '+EGP(api.usd*S.lastRate)+' بسعر '+S.lastRate+') · المدفوع فعلًا لـ API ومسجل هنا: <b>'+EGP(paidApi)+'</b></div><div class="fpf-m" style="margin-top:4px">التقدير للمقارنة بس. الرقم الحقيقي في console.anthropic.com ← Cost، والمدفوع هو اللي بيتحسب في الصافي.</div></div>'+
     aiHTML()+
     formHTML()+
     '<div class="fpf-grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px"><div class="fpf-card"><b style="color:#1a3a6e">💰 الإيرادات حسب النوع</b>'+bars(s.byK,KINDS)+'</div><div class="fpf-card"><b style="color:#1a3a6e">💸 المصروفات حسب البند</b>'+bars(s.byC,CATS)+'</div></div>'+
     monthly()+
     '<div class="fpf-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><b style="color:#1a3a6e">💸 المصروفات</b><button class="fpf-b" id="fpf-csv">⬇️ تنزيل الفترة Excel (CSV)</button></div><div class="fpf-tw"><table class="fpf-t" style="margin-top:8px"><thead><tr><th>التاريخ</th><th>البند</th><th>الوصف</th><th>المبلغ</th><th>بالجنيه</th><th></th></tr></thead><tbody>'+
       (s.ex.sort(function(a,b){return (b.date||'').localeCompare(a.date||'')}).map(function(x){return '<tr><td>'+esc(x.date)+'</td><td>'+esc(CATS[x.cat]||x.cat)+'</td><td>'+esc(x.desc||'')+(x.ref?'<div class="fpf-m">'+esc(x.ref)+'</div>':'')+'</td><td>'+esc((+x.amt||0).toLocaleString('en-US'))+' '+esc(CURS[x.cur]||x.cur)+(x.cur!=='EGP'?'<div class="fpf-m">× '+esc(x.rate)+'</div>':'')+'</td><td><b>'+EGP(x.egp)+'</b></td><td style="white-space:nowrap"><button class="fpf-b" data-ed="'+esc(x.id)+'">✏️</button> <button class="fpf-b d" data-del="'+esc(x.id)+'">🗑</button></td></tr>'}).join('')||'<tr><td colspan="6" class="fpf-m">مفيش مصروفات مسجلة في الفترة دي</td></tr>')+'</tbody></table></div></div>'+
     '<div class="fpf-card"><b style="color:#1a3a6e">💰 الإيرادات (من الإيصالات)</b><div class="fpf-tw"><table class="fpf-t" style="margin-top:8px"><thead><tr><th>التاريخ</th><th>الإيصال</th><th>الجمعية</th><th>النوع</th><th>المبلغ</th></tr></thead><tbody>'+
       (s.rc.sort(function(a,b){return (b.date||'').localeCompare(a.date||'')}).map(function(x){return '<tr><td>'+esc(x.date)+'</td><td>'+esc(x.no||x.id)+'</td><td>'+esc(x.assoc||'')+'</td><td>'+esc(KINDS[x.kind]||x.kind||'')+'</td><td><b>'+EGP(x.amount)+'</b></td></tr>'}).join('')||'<tr><td colspan="5" class="fpf-m">مفيش إيصالات في الفترة دي</td></tr>')+'</tbody></table></div><div class="fpf-m" style="margin-top:6px">الإيصالات الملغاة مش بتتحسب. الإيرادات محسوبة بتاريخ الإيصال (لما الفلوس دخلت فعلًا).</div></div>';
    bind()}

  function calc(){var a=+String(g('fpf-amt').value).replace(/[^\d.]/g,'')||0,r=g('fpf-cur').value==='EGP'?1:(+String(g('fpf-rate').value).replace(/[^\d.]/g,'')||0);if(g('fpf-cur').value==='EGP')g('fpf-rate').value=1;g('fpf-egp').value=a&&r?Math.round(a*r*100)/100:''}
  function bind(){document.querySelectorAll('#fpf-body [data-per]').forEach(function(b){b.onclick=function(){S.per=b.dataset.per;render()}});
    ['fpf-from','fpf-to'].forEach(function(id){var x=g(id);if(x)x.onchange=function(){S[id==='fpf-from'?'from':'to']=x.value;render()}});
    ['fpf-amt','fpf-rate','fpf-cur'].forEach(function(id){var x=g(id);if(x)x.oninput=x.onchange=function(){if(id==='fpf-cur'&&x.value!=='EGP'&&+g('fpf-rate').value===1)g('fpf-rate').value=S.lastRate;calc()}});
    var sv=g('fpf-save');if(sv)sv.onclick=save;var cn=g('fpf-cancel');if(cn)cn.onclick=function(){S.edit=null;render()};
    document.querySelectorAll('#fpf-body [data-ed]').forEach(function(b){b.onclick=function(){S.edit=S.ex.find(function(x){return x.id===b.dataset.ed})||null;render();g('fpf-form').scrollIntoView({behavior:'smooth',block:'center'})}});
    document.querySelectorAll('#fpf-body [data-del]').forEach(function(b){b.onclick=async function(){if(!confirm('تمسح المصروف ده؟'))return;try{await db.collection('fp_finance').doc(b.dataset.del).delete();S.ex=S.ex.filter(function(x){return x.id!==b.dataset.del});T('اتمسح');render()}catch(e){T('❌ '+e.message)}}});
    var cv=g('fpf-csv');if(cv)cv.onclick=csv;
    var as=g('fpf-ai-save');if(as)as.onclick=async function(){var n=function(id){return +String(g(id).value).replace(/[^\d.]/g,'')||0};var d={enabled:g('fpf-ai-on').checked,orgMonthUsd:n('fpf-ai-m'),orgDayUsd:n('fpf-ai-d'),totalMonthUsd:n('fpf-ai-t'),updatedAt:FV().serverTimestamp()};
      try{await db.collection('fp_meta').doc('ai').set(d,{merge:true});Object.assign(S.ai,d);T('✅ اتحفظت الحدود، وبتسري خلال دقيقة');render()}catch(e){T('❌ '+e.message)}};
    var on=g('fpf-ai-on');if(on)on.onchange=async function(){try{await db.collection('fp_meta').doc('ai').set({enabled:on.checked,updatedAt:FV().serverTimestamp()},{merge:true});S.ai.enabled=on.checked;T(on.checked?'✅ الكتابة بالذكاء الاصطناعي شغالة':'⏸ الكتابة بالذكاء الاصطناعي اتوقفت لكل الجمعيات')}catch(e){T('❌ '+e.message)}};
    document.querySelectorAll('#fpf-body [data-cap]').forEach(function(b){b.onclick=async function(){var id=b.dataset.cap,v=function(sel){var x=document.querySelector(sel+'="'+id+'"]');return +String(x.value).replace(/[^\d.]/g,'')||0};
      var d={aiDayUsd:v('[data-cd'),aiMonthUsd:v('[data-cm')};try{await db.collection('orgs').doc(id).update({aiDayUsd:d.aiDayUsd||firebase.firestore.FieldValue.delete(),aiMonthUsd:d.aiMonthUsd||firebase.firestore.FieldValue.delete()});var o=S.orgs.find(function(x){return x.id===id});if(o){o.aiDayUsd=d.aiDayUsd;o.aiMonthUsd=d.aiMonthUsd}T('✅ اتحفظ حد الجمعية')}catch(e){T('❌ '+e.message)}}})}
  async function save(){var num=function(id){return +String(g(id).value).replace(/[^\d.]/g,'')||0};
    var d={date:g('fpf-date').value,cat:g('fpf-cat').value,desc:g('fpf-desc').value.trim(),amt:num('fpf-amt'),cur:g('fpf-cur').value,rate:g('fpf-cur').value==='EGP'?1:num('fpf-rate'),egp:num('fpf-egp'),pay:g('fpf-pay').value.trim(),ref:g('fpf-ref').value.trim()};
    if(!d.date||!d.amt){T('اكتب التاريخ والمبلغ');return}if(!d.egp){if(!d.rate){T('اكتب سعر الصرف أو المعادل بالجنيه');return}d.egp=Math.round(d.amt*d.rate*100)/100}
    try{if(S.edit&&S.edit.id){d.updatedAt=FV().serverTimestamp();await db.collection('fp_finance').doc(S.edit.id).update(d);Object.assign(S.edit,d)}
      else{d.createdAt=FV().serverTimestamp();d.by=(auth.currentUser&&auth.currentUser.email)||'';var ref=await db.collection('fp_finance').add(d);d.id=ref.id;S.ex.push(d)}
      if(d.cur!=='EGP'&&d.rate){S.lastRate=d.rate;try{localStorage.setItem('fpf_rate',String(d.rate))}catch(e){}}
      S.edit=null;T('✅ اتسجل');render()}catch(e){T('❌ '+(e.code==='permission-denied'?'محتاج قاعدة fp_finance في Firestore':e.message))}}
  function csv(){var rg=range(),s=sums(rg),q=function(v){return '"'+String(v==null?'':v).replace(/"/g,'""')+'"'};
    var L=[['النوع','التاريخ','البند/الجمعية','الوصف/الإيصال','المبلغ','العملة','سعر الصرف','بالجنيه'].map(q).join(',')];
    s.rc.forEach(function(x){L.push(['إيراد',x.date,x.assoc,(x.no||'')+' '+(KINDS[x.kind]||''),x.amount,'EGP',1,x.amount].map(q).join(','))});
    s.ex.forEach(function(x){L.push(['مصروف',x.date,CATS[x.cat]||x.cat,x.desc,x.amt,x.cur,x.rate,-(+x.egp||0)].map(q).join(','))});
    L.push(['الصافي','','','','','','',s.net].map(q).join(','));
    var b=new Blob(['﻿'+L.join('\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='مالية-منصة-الفرص-'+rg[0]+'-'+rg[1]+'.csv';document.body.appendChild(a);a.click();a.remove()}

  function mount(){var bar=document.querySelector('.adm-tab[onclick*="\'settings\'"]');var list=g('adm-list');
    if(!bar||!list)return false;if(document.querySelector('.adm-tab[data-fpf]'))return true;css();
    var t=document.createElement('div');t.className='adm-tab';t.setAttribute('data-fpf','1');t.style.cssText='background:#ecfdf5;color:#0a6b50;border-color:#0a6b50';t.textContent='💵 مالية المنصة';
    t.onclick=function(){try{setAdmTab(t,'fpfinance')}catch(e){console.warn(e)}};bar.parentNode.insertBefore(t,bar);
    var box=document.createElement('div');box.id='adm-form-fpfinance';box.style.cssText='display:none;padding:0 16px 100px';
    box.innerHTML='<div style="font-size:13px;font-weight:800;color:#0a6b50;margin:12px 0 8px">💵 إيرادات ومصروفات منصة الفرص (بالجنيه)</div><div id="fpf-body"></div>';
    list.parentNode.insertBefore(box,list.nextSibling);
    var orig=window.setAdmTab;
    window.setAdmTab=function(el,tab){var b=g('adm-form-fpfinance');
      if(tab==='fpfinance'){try{admTab='fpfinance'}catch(e){}
        document.querySelectorAll('.adm-tab').forEach(function(x){x.classList.remove('on')});el.classList.add('on');
        document.querySelectorAll('[id^="adm-form-"]').forEach(function(x){if(x.id!=='adm-form-fpfinance')x.style.display='none'});
        ['adm-list','tm-list-export'].forEach(function(id){var x=g(id);if(x)x.style.display='none'});
        b.style.display='block';if(typeof auth==='undefined'||!auth.currentUser){g('fpf-body').innerHTML='<div style="text-align:center;padding:20px;color:#e05050">❌ يجب تسجيل دخول الأدمن أولاً</div>';return}
        S.loaded=false;load();return}
      if(b)b.style.display='none';return orig.apply(this,arguments)};
    for(var k in orig)window.setAdmTab[k]=orig[k];
    return true}
  var tries=0;var iv=setInterval(function(){if(mount()||++tries>40)clearInterval(iv)},500);
})();
