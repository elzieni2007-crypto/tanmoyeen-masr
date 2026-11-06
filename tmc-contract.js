// عقد اشتراك منصة الفرص والمنح: بيتملي من الحجز وعرض السعر والإيصالات، وبيانات الطرف الأول بتتحفظ مرة واحدة
// يعتمد على tmq-quote.js (اللوجو) و tmr-receipt.js (المبلغ بالحروف) و firebase و db في index.html
(function(){
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>(+n||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const iso=dt=>{const z=new Date(dt.getTime()-dt.getTimezoneOffset()*60000);return z.toISOString().slice(0,10)};
  const dateAr=s=>{if(!s)return '..../..../........';const d=new Date(s+'T12:00:00');return isNaN(d)?s:d.toLocaleDateString('ar-EG-u-nu-latn',{day:'numeric',month:'long',year:'numeric'})};
  const dayAr=s=>{if(!s)return '............';const d=new Date(s+'T12:00:00');return isNaN(d)?'':d.toLocaleDateString('ar-EG',{weekday:'long'})};
  const dots=w=>`<span class="tmc-dots" style="min-width:${w||140}px"></span>`;
  const v=(x,w)=>x&&String(x).trim()?`<b>${esc(x)}</b>`:dots(w);
  const words=n=>window.TMReceipt&&TMReceipt.amountWords?TMReceipt.amountWords(n):'';
  const SIGNER='Mostafa El Zieny';
  const P_DEF={name:'مصطفى الزيني',title:'مؤسس ومدير منصة تنمويين مصر',address:'',email:'',phone:'',nid:''};

  const loadJs=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)});
  let _libs=null;
  const loadLibs=()=>_libs||(_libs=Promise.all([
    window.html2canvas?1:loadJs('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
    window.jspdf?1:loadJs('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')]).catch(e=>{_libs=null;throw e}));
  const loadStorage=()=>window.firebase&&firebase.storage?Promise.resolve():loadJs('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js');
  const inApp=()=>!!(window.median||window.gonative)||/median|gonative/i.test(navigator.userAgent||'');

  // ===== بيانات الطرف الأول: بتتحفظ في Firestore (للأدمن بس) + نسخة على الجهاز =====
  const P_KEY='tmc_party1';
  async function loadParty(){let p=null;try{p=JSON.parse(localStorage.getItem(P_KEY)||'null')}catch(e){}
    try{const s=await db.collection('admin_settings').doc('party1').get();if(s.exists)p=s.data()}catch(e){console.warn('party1',e)}
    return Object.assign({},P_DEF,p||{})}
  async function saveParty(p){try{localStorage.setItem(P_KEY,JSON.stringify(p))}catch(e){}
    await db.collection('admin_settings').doc('party1').set(Object.assign({},p,{updatedAt:firebase.firestore.FieldValue.serverTimestamp()}),{merge:true})}

  // ===== البنود =====
  function blocks(c,p){
    const setup=+c.setup||0,dep=+c.deposit||0,rest=Math.max(0,setup-dep),mon=+c.monthly||0,am=+c.annualMonths||12,re=+c.reactivation||0;
    const depR=c.depositReceipt?` <span class="tmc-paid">✓ مسدد بإيصال <span dir="ltr" style="white-space:nowrap">${esc(c.depositReceipt)}</span></span>`:'';
    const B=[];const cl=(n,t,body)=>B.push(`<div class="tmc-cl"><h3><span>البند ${n}</span>${t}</h3>${body}</div>`);
    B.push(`<div class="tmc-intro">إنه في يوم <b>${esc(dayAr(c.date))}</b> الموافق <b>${esc(dateAr(c.date))}</b> تحرر هذا العقد بين كل من:</div>`);
    B.push(`<div class="tmc-parties">
<div class="tmc-pt"><div class="tmc-pt-h">الطرف الأول</div>
<div><span>الاسم</span>${v(p.name)}</div><div><span>الصفة</span>${v(p.title)}</div>${p.nid?`<div><span>الرقم القومي</span><b dir="ltr">${esc(p.nid)}</b></div>`:''}
<div><span>العنوان</span>${v(p.address)}</div><div><span>البريد الإلكتروني</span>${p.email?`<b dir="ltr">${esc(p.email)}</b>`:dots()}</div><div><span>الموبايل / واتساب</span>${p.phone?`<b dir="ltr">${esc(p.phone)}</b>`:dots()}</div>
<div class="tmc-pt-f">ويُشار إليه فيما بعد بـ«الطرف الأول» أو «المنصة»</div></div>
<div class="tmc-pt"><div class="tmc-pt-h">الطرف الثاني</div>
<div><span>الجمعية / المؤسسة</span>${v(c.assoc)}</div><div><span>رقم القيد</span>${v(c.regNumber)}${c.regGov?` <span class="tmc-sm">مديرية التضامن الاجتماعي بـ${esc(c.regGov)}</span>`:''}</div>
<div><span>المقر</span>${v(c.address)}</div><div><span>يمثلها</span>${v(c.rep)}${c.repTitle?` <span class="tmc-sm">بصفته ${esc(c.repTitle)}</span>`:''}</div>
<div><span>البريد الإلكتروني</span>${c.email?`<b dir="ltr">${esc(c.email)}</b>`:dots()}</div><div><span>الموبايل / واتساب</span>${c.phone?`<b dir="ltr">${esc(c.phone)}</b>`:dots()}</div>
<div class="tmc-pt-f">ويُشار إليها فيما بعد بـ«الطرف الثاني» أو «الجمعية»</div></div></div>`);
    B.push(`<div class="tmc-cl"><h3>تمهيد</h3><p>يُدير الطرف الأول «منصة الفرص والمنح» ضمن منصة تنمويين مصر، وهي أداة رقمية تساعد الجمعيات الأهلية على البحث عن فرص التمويل وقياس ملاءمتها وإعداد مسودات المقترحات ورسائل التقديم. وقد اطلع الطرف الثاني على عرض السعر رقم <b dir="ltr" style="white-space:nowrap">${esc(c.quoteNo||'—')}</b> ووافق عليه، ورغب في الاشتراك في المنصة. وبعد أن أقر الطرفان بأهليتهما للتعاقد، اتفقا على ما يلي:</p></div>`);
    cl('الأول','حجية التمهيد',`<p>يُعتبر التمهيد السابق وعرض السعر المشار إليه جزءا لا يتجزأ من هذا العقد، وفي حالة التعارض بينهما تُطبق أحكام هذا العقد.</p>`);
    cl('الثاني','موضوع العقد',`<p>يلتزم الطرف الأول بتشغيل حساب خاص ومستقل للجمعية على منصة الفرص والمنح، يشمل:</p><div class="tmc-ol"><div class="li"><span>1.</span><div>تجهيز بيانات الجمعية وملفها التعريفي على المنصة، وتدريب فريق الجمعية على استخدامها في بداية التشغيل.</div></div><div class="li"><span>2.</span><div>البحث الآلي اليومي عن فرص التمويل بالعربية والإنجليزية، وقياس ملاءمتها لإمكانيات الجمعية.</div></div><div class="li"><span>3.</span><div>إعداد مسودات المقترحات ورسائل التقديم بالعربية والإنجليزية، بحد أقصى ${esc(c.cap||100)} مقترح في السنة للاستخدام المعتاد للجمعية.</div></div><div class="li"><span>4.</span><div>استضافة بيانات الجمعية وملفاتها وحفظها طوال مدة الاشتراك.</div></div></div>`);
    cl('الثالث','طبيعة المبالغ المحصلة',`<div class="tmc-key">يقر الطرفان بأن كل المبالغ التي يسددها الطرف الثاني بموجب هذا العقد تمثل <b>رسوم الاشتراك والاستضافة الخاصة بالجمعية، لزوم تشغيل المنصة لها بحساب خاص ومستقل</b>. وتغطي هذه المبالغ الاستضافة وحفظ البيانات واشتراكات برامج الذكاء الاصطناعي المستخدمة في البحث والتحليل والكتابة والترجمة، ولا تُعد أتعابا استشارية أو مقابلا لكتابة مقترحات بعينها.</div>`);
    cl('الرابع','عدم ضمان التمويل',`<p>المنصة أداة مساعدة، والقرار في التقديم على أي فرصة للجمعية وحدها. ولا يضمن الطرف الأول حصول الجمعية على أي تمويل، لأن قرار المنح للجهة المانحة وحدها.</p>`);
    cl('الخامس','الرسوم وطريقة السداد',`<p>يلتزم الطرف الثاني بسداد الرسوم التالية وفق عرض السعر المتفق عليه:</p>
<table class="tmc-fee"><thead><tr><th>البند</th><th>القيمة (ج.م)</th><th>موعد السداد</th></tr></thead><tbody>
<tr class="main"><td><b>رسوم الإعداد والتأسيس</b> <span class="tmc-sm">(إجمالي يُدفع مرة واحدة)</span></td><td class="n"><b>${money(setup)}</b></td><td>مرة واحدة، على دفعتين:</td></tr>
${dep?`<tr class="sub"><td>↳ الدفعة الأولى: عربون جدية التعاقد${depR}</td><td class="n">${money(dep)}</td><td>عند الموافقة على عرض السعر</td></tr>
<tr class="sub"><td>↳ الدفعة الثانية: باقي رسوم الإعداد</td><td class="n">${money(rest)}</td><td>بعد تسليم الحساب للجمعية</td></tr>
<tr class="note"><td colspan="3">العربون وباقي رسوم الإعداد هما تقسيم لمبلغ الـ ${money(setup)} جنيه نفسه، وليسا مبلغا إضافيا عليه.</td></tr>`:''}
<tr class="main"><td><b>الاشتراك الشهري</b></td><td class="n"><b>${money(mon)}</b> <span class="tmc-sm">شهريا</span></td><td>يُسدد ربع سنوي مقدما (${money(mon*3)} كل 3 شهور) من تاريخ التسليم</td></tr>
<tr class="main"><td><b>الاشتراك السنوي المقدم</b> <span class="tmc-sm">(اختياري بدل الربع سنوي)</span></td><td class="n"><b>${money(mon*am)}</b></td><td>مقدما عن 12 شهر بدل ${money(mon*12)}${am<12?`، بخصم ما يعادل ${12-am===2?'شهرين':(12-am)+' شهور'}`:''}</td></tr>
${re?`<tr class="main alt"><td><b>رسوم إعادة تفعيل الحساب</b></td><td class="n"><b>${money(re)}</b></td><td>فقط عند طلب إعادة التشغيل بعد الإلغاء (البند الثالث عشر)</td></tr>`:''}
</tbody></table>`);
    cl('السادس','وسائل السداد والإيصالات',`<p>يتم السداد بالتحويل البنكي أو إنستاباي أو نقدا${c.bank?`، على: <b>${esc(c.bank)}</b>`:'، على البيانات الواردة في عرض السعر'}. ويُصدر الطرف الأول إيصال استلام مرقما وموقعا إلكترونيا عن كل مبلغ يستلمه، يمكن التحقق منه من الرابط أو رمز QR المطبوع عليه.</p>`);
    cl('السابع','ثبات الأسعار',`<p>تظل الأسعار الواردة في هذا العقد ثابتة طوال فترة الاشتراك المسددة. وللطرف الأول تعديل سعر الاشتراك عند التجديد بشرط إخطار الطرف الثاني كتابيا قبل نهاية الفترة المسددة بـ 30 يوما على الأقل، ويحق للجمعية في هذه الحالة عدم التجديد.</p>`);
    cl('الثامن','مدة العقد',`<p>يبدأ الاشتراك من تاريخ تسليم الحساب للجمعية في <b>${esc(dateAr(c.start))}</b>، ويتجدد تلقائيا لفترات مماثلة لفترة السداد المختارة (ربع سنوية أو سنوية) بمجرد سداد اشتراك الفترة التالية، ما لم تلغِ الجمعية الاشتراك وفق البند الثاني عشر.</p>`);
    cl('التاسع','التزامات الطرف الأول',`<div class="tmc-ol"><div class="li"><span>1.</span><div>تشغيل حساب الجمعية وإتاحته طوال فترة الاشتراك المسددة.</div></div><div class="li"><span>2.</span><div>الحفاظ على سرية بيانات الجمعية وملفاتها، وعدم استخدامها إلا في تشغيل الخدمة والدعم الفني.</div></div><div class="li"><span>3.</span><div>تقديم الدعم الفني عبر البريد الإلكتروني أو واتساب.</div></div><div class="li"><span>4.</span><div>إخطار الجمعية مسبقا بأي توقف مخطط للمنصة.</div></div></div>`);
    cl('العاشر','التزامات الطرف الثاني',`<div class="tmc-ol"><div class="li"><span>1.</span><div>سداد الرسوم في مواعيدها. وفي حالة التأخر أكثر من ${esc(c.graceDays||15)} يوما من تاريخ الاستحقاق، يحق للطرف الأول إيقاف الحساب مؤقتا بعد إخطار الجمعية، ويعود التشغيل فور السداد.</div></div><div class="li"><span>2.</span><div>تقديم بيانات صحيحة عن الجمعية، لأن دقة النتائج مرتبطة بدقة هذه البيانات.</div></div><div class="li"><span>3.</span><div>مراجعة المسودات واعتمادها قبل التقديم، والجمعية وحدها مسؤولة عن محتوى ما تقدمه للجهات المانحة.</div></div><div class="li"><span>4.</span><div>الحصول على الموافقات اللازمة لأي تمويل أجنبي وفق القانون 149 لسنة 2019 ولائحته التنفيذية.</div></div><div class="li"><span>5.</span><div>عدم مشاركة الحساب مع جهات أخرى غير الجمعية.</div></div></div>`);
    cl('الحادي عشر','الملكية والسرية',`<p>بيانات الجمعية وملفاتها والمقترحات والرسائل التي تُعد لها على المنصة ملك للجمعية، ويحق لها الحصول على نسخة منها في أي وقت، بما في ذلك عند إلغاء الاشتراك.</p>`);
    cl('الثاني عشر','الإلغاء',`<p>يحق للطرف الثاني إلغاء الاشتراك في أي وقت، بإخطار مكتوب يرسله ممثله بالبريد الإلكتروني أو واتساب من بيانات التواصل الواردة في هذا العقد، ويسري الإلغاء من تاريخ استلام الإخطار، مع مراعاة ما يلي:</p><div class="tmc-ol"><div class="li"><span>1.</span><div>لا تُرد رسوم الإعداد والتأسيس (${money(setup)} جنيه بما فيها عربون جدية التعاقد)، لأنها مقابل أعمال تمت فعلا عند تجهيز الحساب وتشغيله.</div></div><div class="li"><span>2.</span><div>لا تُرد قيمة الشهر الذي وقع فيه الإلغاء، ولا أي مبالغ مدفوعة عن جزء من شهر.</div></div><div class="li"><span>3.</span><div>تُرد للجمعية قيمة الشهور الكاملة المسددة مقدما والتي تبدأ بعد شهر الإلغاء، خلال 30 يوما من تاريخ الإخطار. وفي حالة الاشتراك السنوي المقدم، تُحسب الشهور المستخدمة بسعر الاشتراك الشهري العادي (${money(mon)} جنيه للشهر)، ويُرد الباقي من المبلغ المسدد.</div></div><div class="li"><span>4.</span><div>يحتفظ الطرف الأول بحساب الجمعية وبياناتها مدة ${esc(c.retentionMonths||6)} شهور من تاريخ الإلغاء لتسهيل إعادة التفعيل، ثم يحذفها. ويلتزم بحذفها فورا إذا طلبت الجمعية ذلك كتابيا، بعد تسليمها نسخة من ملفاتها إذا طلبتها.</div></div></div>`);
    cl('الثالث عشر','إعادة تفعيل الحساب',`<p>إذا طلبت الجمعية إعادة تشغيل المنصة بعد الإلغاء، <b>تُعفى من رسوم الإعداد والتأسيس</b>، وتسدد:</p><div class="tmc-ol"><div class="li"><span>1.</span><div>رسوم إعادة تفعيل الحساب وقدرها <b>${money(re)} جنيه</b> (${esc(words(re))})، تُدفع مرة واحدة عند كل إعادة تفعيل.</div></div><div class="li"><span>2.</span><div>الاشتراك الشهري عن الفترة المطلوبة، بالسعر الساري وقت إعادة التفعيل وبنفس نظام السداد الوارد في البند الخامس.</div></div></div><p>وتسري أحكام هذا العقد على فترة الاشتراك بعد إعادة التفعيل.</p>`);
    cl('الرابع عشر','الإخطارات',`<p>تُعتبر المراسلات على البريد الإلكتروني أو أرقام واتساب الواردة في هذا العقد إخطارا صحيحا منتجا لآثاره، وعلى كل طرف إخطار الآخر بأي تغيير في بيانات تواصله.</p>`);
    cl('الخامس عشر','تعديل العقد',`<p>لا يُعتد بأي تعديل على هذا العقد إلا إذا كان مكتوبا وموافقا عليه من الطرفين.</p>`);
    cl('السادس عشر','النزاعات',`<p>يسعى الطرفان إلى حل أي خلاف ينشأ عن هذا العقد وديا، وإذا تعذر ذلك خلال 30 يوما يختص بنظره محاكم القاهرة وفق أحكام القانون المصري.</p>`);
    cl('السابع عشر','نسخ العقد',`<p>حُرر هذا العقد من نسختين، بيد كل طرف نسخة للعمل بموجبها. وتُعتبر النسخة الموقعة والمُرسلة إلكترونيا (PDF) بين الطرفين نسخة معتدا بها.</p>`);
    B.push(`<div class="tmc-sign"><div class="tmc-sb"><div class="tmc-sb-h">الطرف الأول</div><div>${esc(p.name)}</div>
<div class="tmc-esig"><div class="nm">${SIGNER}</div><div class="mt">Digitally signed · ${esc(c.signedAt||'')}<br>Contract ${esc(c.no||'')}</div></div></div>
<div class="tmc-sb"><div class="tmc-sb-h">الطرف الثاني</div><div>${c.rep?esc(c.rep):dots()}</div>
<div class="tmc-line">التوقيع</div><div class="tmc-line">ختم الجمعية</div><div class="tmc-line">التاريخ</div></div></div>`);
    return B}

  const CSS=`
.tmc-pg{width:794px;height:1123px;background:#fff;box-sizing:border-box;padding:0;position:relative;font-family:Cairo,sans-serif;color:#13283f;direction:rtl;overflow:hidden}
.tmc-pg::before{content:"";position:absolute;inset:0 0 auto 0;height:10px;background:linear-gradient(90deg,#0e2a44,#1b6fa8)}
.tmc-in{position:absolute;top:34px;bottom:58px;left:48px;right:48px}
.tmc-ft{position:absolute;bottom:20px;left:48px;right:48px;display:flex;justify-content:space-between;font-size:10.5px;color:#7a8a9a;border-top:1px solid #e1e9f1;padding-top:7px}
.tmc-hd{display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:2px solid #0e2a44;margin-bottom:14px}
.tmc-hd img{height:58px}.tmc-hd h1{margin:0;font-size:25px;font-weight:900;line-height:1.35;text-align:left}.tmc-hd h1 small{display:block;font-size:12px;color:#5e7282;font-weight:600}
.tmc-mini{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#5e7282;border-bottom:1px solid #e1e9f1;padding-bottom:6px;margin-bottom:10px}.tmc-mini img{height:26px}
.tmc-meta{display:flex;gap:8px;margin-bottom:12px}.tmc-meta div{flex:1;background:#f4f8fb;border-radius:9px;padding:6px 11px;font-size:11px;color:#5e7282}.tmc-meta b{display:block;font-size:13.5px;color:#13283f}
.tmc-intro{font-size:14px;margin:4px 0 10px}
.tmc-parties{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
.tmc-pt{border:1.5px solid #d6e4ee;border-radius:12px;padding:10px 13px;font-size:12.5px;line-height:1.85}
.tmc-pt>div{display:flex;gap:6px}.tmc-pt>div>span:first-child{color:#5e7282;min-width:98px;flex-shrink:0}
.tmc-pt-h{display:block!important;background:#0e2a44;color:#fff;border-radius:7px;padding:2px 10px;font-weight:800;margin-bottom:5px;width:max-content}
.tmc-pt-f{display:block!important;color:#5e7282;font-size:11px;border-top:1px dashed #d6e4ee;margin-top:4px;padding-top:3px}
.tmc-cl{margin:0 0 11px;font-size:13.2px;line-height:1.95}
.tmc-cl h3{margin:0 0 3px;font-size:14px;font-weight:900;color:#0e2a44;display:flex;align-items:center;gap:8px}
.tmc-cl h3 span{background:#eaf5fc;color:#1b6fa8;border-radius:6px;padding:0 9px;font-size:12px;font-weight:800}
.tmc-cl p{margin:0}.tmc-ol{margin:2px 0 0}.tmc-ol .li{display:flex;gap:7px;margin-bottom:2px}.tmc-ol .li>span{color:#1b6fa8;font-weight:800;min-width:16px}
.tmc-key{background:#fdf6e4;border-right:4px solid #f2b33d;border-radius:8px;padding:8px 12px}
.tmc-fee{width:100%;border-collapse:collapse;margin-top:6px;font-size:12.5px}
.tmc-fee th{background:#0e2a44;color:#fff;font-weight:800;padding:7px 10px;text-align:right}.tmc-fee th:nth-child(2){text-align:center}
.tmc-fee td{padding:7px 10px;border-bottom:1px solid #e1e9f1;vertical-align:top}.tmc-fee td.n{text-align:center;white-space:nowrap}
.tmc-fee tr.main td{background:#f7fafc}.tmc-fee tr.alt td{background:#fff8ec}
.tmc-fee tr.sub td{background:#fff;color:#3d5266;font-size:12px;padding-top:5px;padding-bottom:5px}.tmc-fee tr.sub td:first-child{padding-right:30px}
.tmc-fee tr.note td{background:#eaf5fc;color:#0e2a44;font-size:11.5px;font-weight:700;padding:5px 30px 5px 10px}
.tmc-paid{color:#0a8f6a;font-weight:800;font-size:11px}
.tmc-sm{color:#5e7282;font-size:11px;font-weight:600}
.tmc-dots{display:inline-block;border-bottom:1px dotted #8aa0b5;height:1em;vertical-align:bottom}
.tmc-sign{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:14px}
.tmc-sb{border:1.5px solid #d6e4ee;border-radius:12px;padding:10px 14px;font-size:13px;min-height:180px}
.tmc-sb-h{font-weight:900;color:#0e2a44;margin-bottom:4px}
.tmc-line{border-bottom:1px solid #8aa0b5;padding-top:22px;color:#5e7282;font-size:11.5px}
.tmc-esig{margin-top:8px;border:1.5px solid #1b6fa8;border-radius:10px;padding:6px 10px;direction:ltr;text-align:left;background:linear-gradient(135deg,#f4f8fb,#fff)}
.tmc-esig .nm{font-family:'Great Vibes',cursive;font-size:32px;line-height:1.15}.tmc-esig .mt{font-size:10px;color:#5e7282;border-top:1px solid #d6e4ee;margin-top:3px;padding-top:3px}
.tmc-ov{position:fixed;inset:0;z-index:100000;background:rgba(9,22,45,.55);display:flex;align-items:flex-end;justify-content:center;font-family:Cairo,sans-serif}
.tmc-sh{background:#fff;width:100%;max-width:900px;max-height:96vh;border-radius:20px 20px 0 0;display:flex;flex-direction:column;overflow:hidden}
.tmc-top{background:#0e2a44;color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}.tmc-top h2{flex:1;margin:0;font-size:17px}
.tmc-top button{width:42px;height:42px;border:0;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font-size:20px}
.tmc-body{overflow:auto;padding:12px 14px}
.tmc-sec{border:1.5px solid #e3eaf3;border-radius:12px;margin-bottom:10px}.tmc-sec>summary{padding:10px 12px;font-weight:800;color:#0e2a44;cursor:pointer;font-size:14px}
.tmc-f{display:grid;grid-template-columns:1fr 1fr;gap:8px 10px;padding:0 12px 12px}.tmc-f label{font-size:12px;font-weight:700;color:#1a3a6e;display:block}
.tmc-f input{width:100%;box-sizing:border-box;min-height:42px;margin-top:3px;border:1.5px solid #d6e4ee;border-radius:10px;padding:6px 10px;font:inherit;font-size:14px;background:#f8fafc}
.tmc-f .w{grid-column:1/-1}.tmc-saveP{grid-column:1/-1;min-height:40px;border:1.5px solid #1b6fa8;background:#fff;color:#1b6fa8;border-radius:10px;font-family:Cairo,sans-serif;font-weight:800}
.tmc-pv{background:#e9eef3;border-radius:12px;padding:10px;overflow:hidden}.tmc-pv-in{transform-origin:top right}.tmc-pv-in .tmc-pg{margin-bottom:14px;box-shadow:0 4px 16px rgba(0,0,0,.08)}
.tmc-act{display:flex;flex-wrap:wrap;gap:8px;padding:10px 14px;border-top:1px solid #e3eaf3}
.tmc-act button{flex:1;min-width:120px;min-height:46px;border:0;border-radius:12px;font-family:Cairo,sans-serif;font-size:14px;font-weight:800;cursor:pointer}
.tmc-msg{padding:0 14px 12px;font-size:12.5px;color:#5e7282;min-height:18px}
@media(max-width:560px){.tmc-f{grid-template-columns:1fr}}`;
  const FONT_LINK='https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Great+Vibes&display=swap';
  function ensureCss(){if(!document.getElementById('tmc-css')){const s=document.createElement('style');s.id='tmc-css';s.textContent=CSS;document.head.appendChild(s)}
    if(!document.getElementById('tmc-font')){const l=document.createElement('link');l.id='tmc-font';l.rel='stylesheet';l.href=FONT_LINK;document.head.appendChild(l)}}

  // بيوزع البنود على صفحات A4 حسب أطوالها الفعلية
  function paginate(doc,host,c,p){
    const logo=window.__TMQ_logo||'';const B=blocks(c,p);
    const head1=`<div class="tmc-hd"><img src="data:image/png;base64,${logo}" alt=""><h1>عقد اشتراك في منصة الفرص والمنح<small>تنمويين مصر · Subscription Agreement</small></h1></div>
<div class="tmc-meta"><div>رقم العقد<b dir="ltr">${esc(c.no||'—')}</b></div><div>تاريخ العقد<b>${esc(dateAr(c.date))}</b></div><div>عرض السعر<b dir="ltr">${esc(c.quoteNo||'—')}</b></div></div>`;
    const headN=`<div class="tmc-mini"><span>عقد اشتراك في منصة الفرص والمنح · <span dir="ltr">${esc(c.no||'')}</span></span><img src="data:image/png;base64,${logo}" alt=""></div>`;
    const mk=(n)=>{const pg=doc.createElement('div');pg.className='tmc-pg';pg.innerHTML=`<div class="tmc-in">${n===1?head1:headN}<div class="tmc-flow"></div></div><div class="tmc-ft"><span>${esc(c.assoc||'')}</span><span class="pn"></span></div>`;host.appendChild(pg);return pg};
    let n=1,pg=mk(1);
    for(const h of B){const flow=pg.querySelector('.tmc-flow'),inn=pg.querySelector('.tmc-in');const wrap=doc.createElement('div');wrap.innerHTML=h;const el=wrap.firstElementChild;flow.appendChild(el);
      if(inn.scrollHeight>inn.clientHeight+1&&flow.children.length>1){flow.removeChild(el);n++;pg=mk(n);pg.querySelector('.tmc-flow').appendChild(el)}}
    const pages=[...host.querySelectorAll('.tmc-pg')];pages.forEach((x,i)=>x.querySelector('.pn').textContent=`صفحة ${i+1} من ${pages.length} · الأحرف الأولى: ........ / ........`);
    return pages}

  async function buildPdf(c,p){
    await loadLibs();
    const f=document.createElement('iframe');f.setAttribute('aria-hidden','true');f.style.cssText='position:fixed;left:-30000px;top:0;width:794px;height:1123px;border:0;visibility:hidden';document.body.appendChild(f);
    try{const doc=f.contentDocument;doc.open();doc.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><link rel="stylesheet" href="${FONT_LINK}"><style>body{margin:0;background:#fff}${CSS}</style></head><body><div id="h"></div></body></html>`);doc.close();
      await new Promise(res=>{if(doc.readyState==='complete')res();else f.onload=()=>res();setTimeout(res,3000)});
      try{if(doc.fonts&&doc.fonts.ready)await Promise.race([doc.fonts.ready,new Promise(res=>setTimeout(res,3000))])}catch(e){}
      const pages=paginate(doc,doc.getElementById('h'),c,p);
      const pdf=new window.jspdf.jsPDF({orientation:'portrait',unit:'pt',format:'a4',compress:true});const W=pdf.internal.pageSize.getWidth(),H=pdf.internal.pageSize.getHeight();
      for(let i=0;i<pages.length;i++){const cv=await window.html2canvas(pages[i],{scale:1.4,backgroundColor:'#ffffff',useCORS:true,logging:false,windowWidth:794});
        if(i)pdf.addPage();pdf.addImage(cv.toDataURL('image/jpeg',0.82),'JPEG',0,0,W,H,undefined,'FAST')}
      pdf.setProperties({title:'عقد اشتراك '+(c.no||'')+' - '+(c.assoc||''),author:SIGNER,creator:'تنمويين مصر'});
      return pdf.output('blob')}finally{f.remove()}}
  const fileName=c=>('عقد اشتراك '+(c.no||'')+' - '+(c.assoc||'')).replace(/[\\/:*?"<>|]+/g,' ').trim()+'.pdf';
  async function deliver(c,b){
    if(inApp()){try{await loadStorage();const ref=firebase.storage().ref('quotes/'+String(c.no||'contract').replace(/[^\w.-]/g,'_')+'/'+fileName(c));
      await ref.put(b,{contentType:'application/pdf',contentDisposition:"attachment; filename*=UTF-8''"+encodeURIComponent(fileName(c))});const url=await ref.getDownloadURL();
      const m=window.median||window.gonative;if(m&&m.share&&m.share.downloadFile)m.share.downloadFile({url,open:true});else location.href=url;return}catch(e){console.warn('contract upload',e)}}
    const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=fileName(c);document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000)}
  function cairoNow(){try{return new Date().toLocaleString('en-GB',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).replace(',','')}catch(e){return ''}}

  // ===== الشاشة =====
  async function open(b,opts){
    opts=opts||{};ensureCss();loadLibs().catch(()=>{});
    const q=b.quote||{};const rl=(opts.receipts||[]).filter(x=>x.status!=='void');const depRc=rl.find(x=>x.kind==='deposit');
    const today=iso(new Date());const saved=b.contract||{};
    const c=Object.assign({no:(q.no?String(q.no).replace('-FP-','-CT-'):''),quoteNo:q.no||'',date:today,start:'',assoc:b.orgName||q.assoc||'',regNumber:b.regNumber||'',regGov:b.gov||'',address:'',
      rep:b.contactName||q.contact||'',repTitle:'',email:b.orgEmail||b.contactEmail||'',phone:b.phone||'',setup:+q.setup||5000,deposit:+q.deposit||3000,monthly:+q.monthly||750,
      annualMonths:+q.annualMonths||10,cap:+q.cap||100,reactivation:2000,graceDays:15,retentionMonths:6,bank:[q.bankName,q.bankAcc,q.instapay?'InstaPay: '+q.instapay:''].filter(Boolean).join(' · ')},saved);
    c.depositReceipt=depRc?depRc.no:(saved.depositReceipt||'');
    const p=await loadParty();
    const ov=document.createElement('div');ov.className='tmc-ov';
    const F=(k,l,t,x)=>`<label class="${x||''}">${l}<input data-k="${k}" ${t||''}></label>`;
    const FP=(k,l,t,x)=>`<label class="${x||''}">${l}<input data-p="${k}" ${t||''}></label>`;
    ov.innerHTML=`<div class="tmc-sh" role="dialog" aria-label="عقد اشتراك"><div class="tmc-top"><h2>عقد اشتراك</h2><button type="button" data-x aria-label="إغلاق">×</button></div>
<div class="tmc-body">
<details class="tmc-sec"${p.address&&p.email&&p.phone?'':' open'}><summary>👤 بيانات الطرف الأول (بياناتك: بتتحفظ مرة واحدة)</summary><div class="tmc-f">
${FP('name','الاسم')}${FP('title','الصفة')}${FP('address','العنوان','','w')}${FP('email','البريد الإلكتروني','dir="ltr" type="email"')}${FP('phone','الموبايل / واتساب','dir="ltr"')}${FP('nid','الرقم القومي (اختياري)','dir="ltr" inputmode="numeric"','w')}
<button type="button" class="tmc-saveP" data-a="saveP">💾 احفظ بياناتي</button></div></details>
<details class="tmc-sec" open><summary>🏢 بيانات الجمعية</summary><div class="tmc-f">
${F('assoc','اسم الجمعية','','w')}${F('regNumber','رقم القيد')}${F('regGov','مديرية التضامن بـ')}${F('address','مقر الجمعية','','w')}${F('rep','الممثل القانوني')}${F('repTitle','صفته','placeholder="مثلًا: رئيس مجلس الإدارة"')}${F('email','البريد الإلكتروني','dir="ltr"')}${F('phone','الموبايل / واتساب','dir="ltr"')}${F('start','تاريخ تسليم الحساب (بداية الاشتراك)','type="date"','w')}
</div></details>
<details class="tmc-sec"><summary>📅 التواريخ والأسعار (من عرض السعر)</summary><div class="tmc-f">
${F('no','رقم العقد','dir="ltr"')}${F('date','تاريخ العقد','type="date"')}
${F('setup','رسوم الإعداد (إجمالي)','type="number"')}${F('deposit','منها: العربون','type="number"')}${F('monthly','الاشتراك الشهري','type="number"')}${F('annualMonths','السنوي = كام شهر','type="number"')}
${F('reactivation','رسوم إعادة التفعيل','type="number"')}${F('graceDays','مهلة التأخر (يوم)','type="number"')}${F('retentionMonths','حفظ البيانات بعد الإلغاء (شهور)','type="number"')}${F('cap','حد المقترحات في السنة','type="number"')}
${F('bank','بيانات التحويل','','w')}
</div></details>
<div class="tmc-pv"><div class="tmc-pv-in" id="tmcPv"></div></div></div>
<div class="tmc-act"><button type="button" data-a="save" style="background:#eaf5fc;color:#0e2a44">حفظ العقد</button><button type="button" data-a="pdf" style="background:#1b6fa8;color:#fff">تحميل PDF</button><button type="button" data-a="wa" style="background:#178a5c;color:#fff">إرسال واتساب</button><button type="button" data-a="mail" style="background:#178a5c;color:#fff">إرسال بالإيميل</button></div>
<div class="tmc-msg" id="tmcMsg" role="status"></div></div>`;
    document.body.appendChild(ov);document.body.style.overflow='hidden';
    const $=s=>ov.querySelector(s),msg=t=>{$('#tmcMsg').textContent=t};
    const close=()=>{ov.remove();document.body.style.overflow=''};
    $('[data-x]').onclick=close;ov.addEventListener('click',e=>{if(e.target===ov)close()});
    ov.querySelectorAll('[data-k]').forEach(el=>{el.value=c[el.dataset.k]??'';el.addEventListener('input',()=>{const k=el.dataset.k;c[k]=el.type==='number'?(+el.value||0):el.value;schedule()})});
    ov.querySelectorAll('[data-p]').forEach(el=>{el.value=p[el.dataset.p]??'';el.addEventListener('input',()=>{p[el.dataset.p]=el.value;schedule()})});
    let t=null;const schedule=()=>{clearTimeout(t);t=setTimeout(render,250)};
    function render(){const host=$('#tmcPv');host.innerHTML='';const pages=paginate(document,host,c,p);
      const w=$('.tmc-pv').clientWidth-20,s=Math.min(1,w/794);host.style.transform=`scale(${s})`;host.style.height=(pages.length*(1123+14)*s)+'px'}
    render();if(document.fonts&&document.fonts.ready)document.fonts.ready.then(render);
    const saveContract=async()=>{const data=Object.assign({},c,{savedAt:firebase.firestore.FieldValue.serverTimestamp()});
      await db.collection('funding_waitlist').doc(b.id).update({contract:data});b.contract=Object.assign({},c);try{opts.onSave&&opts.onSave(b.contract)}catch(e){}};
    const shareText=()=>`السلام عليكم ${c.rep||''}،\nمرفق عقد اشتراك ${c.assoc||'الجمعية'} في منصة الفرص والمنح من تنمويين مصر (رقم ${c.no}).\nبرجاء مراجعته، وتوقيعه وختمه، وإرسال نسخة PDF موقعة على الإيميل أو واتساب.\n\nشكرًا لكم،\n${p.name}\nتنمويين مصر`;
    ov.addEventListener('click',async e=>{const btn=e.target.closest('[data-a]');if(!btn)return;const a=btn.dataset.a;
      if(a==='saveP'){if(!p.address||!p.email||!p.phone)msg('⚠️ لسه فيه بيانات ناقصة، بس هتتحفظ زي ما هي');
        try{await saveParty(p);msg('✅ اتحفظت بياناتك، وهتتملى لوحدها في كل عقد');btn.closest('details').open=false}catch(err){msg(err&&err.code==='permission-denied'?'❌ انشر قواعد Firestore الجديدة (admin_settings)':'❌ '+(err.message||err))}return}
      if(a==='save'){try{await saveContract();msg('✅ اتحفظ العقد مع حجز الجمعية')}catch(err){msg('❌ '+((err&&err.message)||err))}return}
      if(a==='pdf'){btn.disabled=true;try{c.signedAt=cairoNow();msg('بيجهّز ملف PDF…');saveContract().catch(()=>{});const bl=await buildPdf(c,p);await deliver(c,bl);msg('اتحمّل: '+fileName(c))}catch(err){console.warn(err);msg('❌ معرفناش نجهز الملف: '+((err&&err.message)||err))}finally{btn.disabled=false}return}
      if(a==='wa'){const ph=String(c.phone||'').replace(/\D/g,'').replace(/^0/,'20');if(!ph)return msg('⚠️ مفيش رقم موبايل للجمعية');window.open(`https://wa.me/${ph}?text=${encodeURIComponent(shareText())}`,'_blank','noopener');msg('اتفتح واتساب ✅ ابعت ملف PDF في نفس المحادثة.');return}
      if(a==='mail'){location.href=`mailto:${encodeURIComponent(c.email||'')}?subject=${encodeURIComponent('عقد اشتراك منصة الفرص والمنح - '+(c.assoc||''))}&body=${encodeURIComponent(shareText())}`;msg('اتفتح الإيميل ✅ ارفق ملف PDF اللي حمّلته.');return}});
  }
  window.TMContract={open,_buildPdf:buildPdf,_blocks:blocks};
})();
