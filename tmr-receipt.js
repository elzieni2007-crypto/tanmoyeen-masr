// إيصالات استلام منصة الفرص والمنح (عربون / إعداد / اشتراك)
// ترقيم مسلسل من Firestore، رابط تحقق عام + QR، توقيع إلكتروني، وإلغاء من غير مسح
// يعتمد على tmq-quote.js (اللوجو) وعلى firebase و db في index.html
(function(){
  const VERIFY='https://elzieni2007-crypto.github.io/tanmoyeen-masr/receipt.html?k=';
  const SIGNER='Mostafa El Zieny';
  const ISSUER='تنمويين مصر';
  const NOTE='المبالغ المستلمة بموجب هذا الإيصال تمثل رسوم الاشتراك والاستضافة الخاصة بالجمعية، لزوم تشغيل منصة الفرص والمنح لها بحساب خاص ومستقل.';
  const KINDS={
    deposit:{t:'عربون جدية',st:'عربون جدية للاشتراك في منصة الفرص والمنح، يُخصم من رسوم الإعداد'},
    setup:{t:'رسوم الإعداد',st:'رسوم إعداد وتفعيل الاشتراك في منصة الفرص والمنح'},
    monthly:{t:'اشتراك شهري',st:'اشتراك شهري في منصة الفرص والمنح',m:1},
    quarterly:{t:'اشتراك ربع سنوي',st:'اشتراك ربع سنوي (3 شهور) في منصة الفرص والمنح',m:3},
    annual:{t:'اشتراك سنوي',st:'اشتراك سنوي (12 شهر) في منصة الفرص والمنح',m:12}};
  const METHODS={cash:'نقدي',bank:'تحويل بنكي',instapay:'إنستاباي',wallet:'محفظة إلكترونية'};
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>(+n||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const iso=dt=>{const z=new Date(dt.getTime()-dt.getTimezoneOffset()*60000);return z.toISOString().slice(0,10)};
  const dateAr=s=>{if(!s)return '';const d=new Date(s+'T12:00:00');return isNaN(d)?s:d.toLocaleDateString('ar-EG-u-nu-latn',{day:'numeric',month:'long',year:'numeric'})};
  const addMonths=(s,m)=>{const d=new Date(s+'T12:00:00');d.setMonth(d.getMonth()+m);d.setDate(d.getDate()-1);return iso(d)};

  // ===== المبلغ بالحروف =====
  const U=['','واحد','اثنان','ثلاثة','أربعة','خمسة','ستة','سبعة','ثمانية','تسعة','عشرة','أحد عشر','اثنا عشر','ثلاثة عشر','أربعة عشر','خمسة عشر','ستة عشر','سبعة عشر','ثمانية عشر','تسعة عشر'];
  const T=['','','عشرون','ثلاثون','أربعون','خمسون','ستون','سبعون','ثمانون','تسعون'];
  const H=['','مائة','مائتان','ثلاثمائة','أربعمائة','خمسمائة','ستمائة','سبعمائة','ثمانمائة','تسعمائة'];
  function below1000(n){const h=Math.floor(n/100),r=n%100,p=[];if(h)p.push(H[h]);
    if(r){if(r<20)p.push(U[r]);else{const u=r%10,t=Math.floor(r/10);p.push(u?U[u]+' و'+T[t]:T[t])}}return p.join(' و')}
  function scale(n,one,two,few,many){if(!n)return '';if(n===1)return one;if(n===2)return two;if(n<=10)return below1000(n)+' '+few;return below1000(n)+' '+many}
  function words(n){n=Math.floor(Math.abs(+n||0));if(!n)return 'صفر';const p=[];
    const mil=Math.floor(n/1e6)%1000,th=Math.floor(n/1000)%1000,rest=n%1000;
    if(mil)p.push(scale(mil,'مليون','مليونان','ملايين','مليون'));
    if(th)p.push(scale(th,'ألف','ألفان','آلاف','ألف'));
    if(rest)p.push(below1000(rest));return p.join(' و')}
  function amountWords(a){a=+a||0;const eg=Math.floor(a),pt=Math.round((a-eg)*100);
    return 'فقط '+words(eg)+' جنيه مصري'+(pt?' و'+words(pt)+' قرش':'')+' لا غير'}

  // ===== مكتبات =====
  const loadJs=src=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)});
  let _libs=null;
  const loadLibs=()=>_libs||(_libs=Promise.all([
    window.html2canvas?1:loadJs('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
    window.jspdf?1:loadJs('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'),
    window.QRCode?1:loadJs('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js')]).catch(e=>{_libs=null;throw e}));
  const loadStorage=()=>window.firebase&&firebase.storage?Promise.resolve():loadJs('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage-compat.js');
  const inApp=()=>!!(window.median||window.gonative)||/median|gonative/i.test(navigator.userAgent||'');
  async function qrData(text){await loadLibs();const box=document.createElement('div');box.style.cssText='position:fixed;left:-9999px;top:0';document.body.appendChild(box);
    try{new window.QRCode(box,{text,width:220,height:220,colorDark:'#0e2a44',colorLight:'#ffffff',correctLevel:window.QRCode.CorrectLevel.M});
      const c=box.querySelector('canvas');return c?c.toDataURL('image/png'):(box.querySelector('img')||{}).src||''}finally{box.remove()}}

  // ===== شكل الإيصال =====
  const CSS=`
.tmr-pg{width:794px;min-height:1123px;background:#fff;padding:40px 44px 30px;box-sizing:border-box;position:relative;border-top:9px solid #0e2a44;font-family:Cairo,sans-serif;color:#0e2a44;direction:rtl;display:flex;flex-direction:column}
.tmr-hd{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #d6e4ee;padding-bottom:16px}
.tmr-hd img{height:66px}.tmr-tt{text-align:left}.tmr-tt h1{margin:0;font-size:30px;font-weight:900;line-height:1.3}.tmr-tt div{font-size:12.5px;color:#5e7282;letter-spacing:.5px}
.tmr-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0 10px}
.tmr-box{background:#f4f8fb;border-radius:10px;padding:9px 13px}.tmr-box small{display:block;color:#5e7282;font-size:11.5px}.tmr-box b{font-size:15px}
.tmr-row{display:flex;gap:10px;margin:11px 0;font-size:15px;align-items:baseline}.tmr-row span{color:#5e7282;min-width:160px}.tmr-row b{flex:1;border-bottom:1px dotted #9fb3c8;padding-bottom:3px;font-weight:700}
.tmr-amt{display:flex;gap:14px;align-items:stretch;margin:18px 0}
.tmr-num{background:#0e2a44;color:#fff;border-radius:12px;padding:12px 22px;font-size:28px;font-weight:900;white-space:nowrap;direction:rtl}.tmr-num small{display:block;font-size:11.5px;font-weight:600;color:#a9c4e6}
.tmr-words{flex:1;background:#fdf3dc;border-radius:12px;padding:11px 15px;font-size:15px}.tmr-words small{display:block;color:#8a6a1e;font-size:11.5px}
.tmr-rem{background:#eaf5fc;border-radius:10px;padding:9px 13px;font-size:14px;margin-top:6px}
.tmr-note{border-right:4px solid #1b6fa8;background:#f4f8fb;border-radius:8px;padding:9px 13px;font-size:13.5px;line-height:1.8;margin-top:10px;color:#0e2a44}
.tmr-foot{margin-top:auto}
.tmr-sig{display:flex;justify-content:space-between;align-items:flex-end;margin-top:26px;gap:16px}
.tmr-sg{border:1.5px solid #1b6fa8;border-radius:12px;padding:10px 14px;min-width:300px;direction:ltr;text-align:left;background:linear-gradient(135deg,#f4f8fb,#fff)}
.tmr-sg .nm{font-family:'Great Vibes',cursive;font-size:38px;color:#0e2a44;line-height:1.1}
.tmr-sg .mt{font-family:Cairo,sans-serif;font-size:10.5px;color:#5e7282;line-height:1.6;border-top:1px solid #d6e4ee;margin-top:4px;padding-top:4px}
.tmr-sg .mt b{color:#1b6fa8}
.tmr-qr{text-align:center;font-size:11px;color:#5e7282;width:150px}.tmr-qr img{width:120px;height:120px;display:block;margin:0 auto 4px}
.tmr-ft{margin-top:16px;font-size:11px;color:#5e7282;border-top:1px solid #d6e4ee;padding-top:9px;line-height:1.8}
.tmr-void{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) rotate(-20deg);font-size:120px;font-weight:900;color:rgba(224,80,80,.22);border:10px solid rgba(224,80,80,.22);border-radius:20px;padding:0 40px;pointer-events:none}
.tmr-draft{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%) rotate(-20deg);font-size:110px;font-weight:900;color:rgba(14,42,68,.06);pointer-events:none;white-space:nowrap}
.tmr-ov{position:fixed;inset:0;z-index:100000;background:rgba(9,22,45,.55);display:flex;align-items:flex-end;justify-content:center;font-family:Cairo,sans-serif}
.tmr-sh{background:#fff;width:100%;max-width:880px;max-height:96vh;border-radius:20px 20px 0 0;display:flex;flex-direction:column;overflow:hidden}
.tmr-top{background:#0e2a44;color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}.tmr-top h2{flex:1;margin:0;font-size:17px}
.tmr-top button{width:42px;height:42px;border:0;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;font-size:20px}
.tmr-body{overflow:auto;padding:12px 14px}
.tmr-f{display:grid;grid-template-columns:1fr 1fr;gap:8px 10px}.tmr-f label{font-size:12px;font-weight:700;color:#1a3a6e;display:block}
.tmr-f input,.tmr-f select,.tmr-f textarea{width:100%;box-sizing:border-box;min-height:42px;margin-top:3px;border:1.5px solid #d6e4ee;border-radius:10px;padding:6px 10px;font:inherit;font-size:14px;background:#f8fafc}
.tmr-f .w{grid-column:1/-1}
.tmr-pv{margin-top:12px;background:#e9eef3;border-radius:12px;padding:10px;overflow:hidden}
.tmr-pv-in{transform-origin:top right}
.tmr-act{display:flex;flex-wrap:wrap;gap:8px;padding:10px 14px;border-top:1px solid #e3eaf3}
.tmr-act button{flex:1;min-width:120px;min-height:46px;border:0;border-radius:12px;font-family:Cairo,sans-serif;font-size:14px;font-weight:800;cursor:pointer}
.tmr-msg{padding:0 14px 12px;font-size:12.5px;color:#5e7282;min-height:18px}
@media(max-width:560px){.tmr-f{grid-template-columns:1fr}}`;
  function ensureCss(){if(document.getElementById('tmr-css'))return;const s=document.createElement('style');s.id='tmr-css';s.textContent=CSS;document.head.appendChild(s);
    if(!document.getElementById('tmr-font')){const l=document.createElement('link');l.id='tmr-font';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap';document.head.appendChild(l)}}

  function html(r,qr){
    const k=KINDS[r.kind]||KINDS.deposit;const sub=!!k.m;
    const code=String(r.token||'').slice(0,8).toUpperCase().replace(/(.{4})(.{4})/,'$1-$2')||'—';
    const signedAt=r.issuedAtTxt||'';
    return `<div class="tmr-pg">${r.status==='void'?'<div class="tmr-void">ملغي</div>':(!r.no?'<div class="tmr-draft">مسودة</div>':'')}
<div class="tmr-hd"><img src="data:image/png;base64,${window.__TMQ_logo||''}" alt=""><div class="tmr-tt"><h1>إيصال استلام</h1><div>PAYMENT RECEIPT</div></div></div>
<div class="tmr-meta"><div class="tmr-box"><small>رقم الإيصال</small><b dir="ltr">${esc(r.no||'— (بعد الإصدار)')}</b></div><div class="tmr-box"><small>التاريخ</small><b>${esc(dateAr(r.date))}</b></div><div class="tmr-box"><small>مرتبط بعرض السعر</small><b dir="ltr">${esc(r.quoteNo||'—')}</b></div></div>
<div class="tmr-row"><span>استلمنا من</span><b>${esc(r.assoc)}</b></div>
${r.regNumber?`<div class="tmr-row"><span>المقيدة برقم</span><b>${esc(r.regNumber)}</b></div>`:''}
<div class="tmr-row"><span>بواسطة</span><b>${esc(r.payer||'')}${r.payerTitle?' · '+esc(r.payerTitle):''}</b></div>
<div class="tmr-amt"><div class="tmr-num"><small>المبلغ</small>${money(r.amount)} ج.م</div><div class="tmr-words"><small>المبلغ بالحروف</small><b>${esc(amountWords(r.amount))}</b></div></div>
<div class="tmr-row"><span>وذلك قيمة</span><b>${esc(k.t)}</b></div>
${sub&&r.from?`<div class="tmr-row"><span>عن الفترة</span><b>من ${esc(dateAr(r.from))} إلى ${esc(dateAr(r.to))}</b></div>`:''}
<div class="tmr-row"><span>البيان</span><b>${esc(r.statement||k.st)}</b></div>
<div class="tmr-row"><span>طريقة السداد</span><b>${esc(METHODS[r.method]||r.method)}${r.method!=='cash'&&r.ref?' · <span dir="ltr">'+esc(r.ref)+'</span>':''}</b></div>
${r.remainingTxt?`<div class="tmr-rem">${esc(r.remainingTxt)}</div>`:''}
${r.note==null||String(r.note).trim()?`<div class="tmr-note">${esc(r.note==null?NOTE:r.note)}</div>`:''}
<div class="tmr-foot">
<div class="tmr-sig"><div class="tmr-sg"><div class="nm">${SIGNER}</div><div class="mt">${r.no?`Digitally signed by <b>${SIGNER}</b><br>Date: ${esc(signedAt)} (Cairo)<br>Verification code: <b>${esc(code)}</b>`:'Signature will be added on issue'}</div></div>
<div class="tmr-qr">${qr?`<img src="${qr}" alt="">امسح للتحقق من صحة الإيصال`:'<div style="width:120px;height:120px;border:2px dashed #d6e4ee;border-radius:8px;margin:0 auto 4px"></div>QR التحقق بعد الإصدار'}</div></div>
<div class="tmr-ft">إيصال استلام صادر من ${ISSUER} (منصة الفرص والمنح)، وليس فاتورة ضريبية. أي كشط أو تعديل يلغي الإيصال.${r.token?`<br>للتحقق من الإيصال: <span dir="ltr">${VERIFY+esc(r.token)}</span>`:''}</div>
</div></div>`}

  // ===== PDF =====
  async function buildPdf(r){
    await loadLibs();const qr=r.token?await qrData(VERIFY+r.token):'';
    const f=document.createElement('iframe');f.setAttribute('aria-hidden','true');f.style.cssText='position:fixed;left:-30000px;top:0;width:794px;height:1123px;border:0;visibility:hidden';document.body.appendChild(f);
    try{const doc=f.contentDocument;doc.open();
      doc.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Great+Vibes&display=swap"><style>body{margin:0;background:#fff}'+CSS+'</style></head><body>'+html(r,qr)+'</body></html>');doc.close();
      await new Promise(res=>{if(doc.readyState==='complete')res();else f.onload=()=>res();setTimeout(res,3000)});
      try{if(doc.fonts&&doc.fonts.ready)await Promise.race([doc.fonts.ready,new Promise(res=>setTimeout(res,3000))])}catch(e){}
      const pg=doc.querySelector('.tmr-pg');const cv=await window.html2canvas(pg,{scale:1.5,backgroundColor:'#ffffff',useCORS:true,logging:false,windowWidth:794});
      const pdf=new window.jspdf.jsPDF({orientation:'portrait',unit:'pt',format:'a4',compress:true});const W=pdf.internal.pageSize.getWidth(),Hh=pdf.internal.pageSize.getHeight();
      let w=W,h=cv.height*W/cv.width;if(h>Hh){h=Hh;w=cv.width*Hh/cv.height}
      pdf.addImage(cv.toDataURL('image/jpeg',0.85),'JPEG',(W-w)/2,0,w,h,undefined,'FAST');
      pdf.setProperties({title:'إيصال استلام '+(r.no||'')+' - '+(r.assoc||''),author:SIGNER,subject:'Payment receipt',creator:ISSUER});
      return pdf.output('blob')}finally{f.remove()}}
  const fileName=r=>('إيصال '+(r.no||'مسودة')+' - '+(r.assoc||'')).replace(/[\\/:*?"<>|]+/g,' ').trim()+'.pdf';
  async function deliver(r,b){
    if(inApp()){try{await loadStorage();const ref=firebase.storage().ref('quotes/'+String(r.no||'receipt').replace(/[^\w.-]/g,'_')+'/'+fileName(r));
      await ref.put(b,{contentType:'application/pdf',contentDisposition:"attachment; filename*=UTF-8''"+encodeURIComponent(fileName(r))});const url=await ref.getDownloadURL();
      const m=window.median||window.gonative;if(m&&m.share&&m.share.downloadFile)m.share.downloadFile({url,open:true});else location.href=url;return}catch(e){console.warn('receipt upload',e)}}
    const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=fileName(r);document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000)}

  // ===== الإصدار والإلغاء =====
  function token(){const a=new Uint8Array(12);crypto.getRandomValues(a);return Array.from(a,b=>('0'+b.toString(16)).slice(-2)).join('')}
  function publicCopy(r){return {no:r.no,date:r.date,assoc:r.assoc,regNumber:r.regNumber||'',amount:+r.amount,amountWords:amountWords(r.amount),kind:r.kind,kindLabel:(KINDS[r.kind]||{}).t||'',
    from:(KINDS[r.kind]||{}).m?(r.from||''):'',to:(KINDS[r.kind]||{}).m?(r.to||''):'',method:r.method,methodLabel:METHODS[r.method]||'',quoteNo:r.quoteNo||'',signer:SIGNER,issuer:ISSUER,code:String(r.token).slice(0,8).toUpperCase(),
    issuedAtTxt:r.issuedAtTxt,note:String(r.note==null?NOTE:r.note).slice(0,600),status:r.status||'valid'}}
  function cairoNow(){try{return new Date().toLocaleString('en-GB',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).replace(',','')}catch(e){return new Date().toISOString().slice(0,16).replace('T',' ')}}
  async function issue(r){
    if(!(KINDS[r.kind]||{}).m){r.from='';r.to=''}
    const y=(r.date||iso(new Date())).slice(0,4);const cRef=db.collection('receipt_counters').doc(y);const tok=token();
    const no=await db.runTransaction(async tx=>{const s=await tx.get(cRef);const n=(s.exists?(+s.data().n||0):0)+1;
      const no='TM-RC-'+y+'-'+String(n).padStart(3,'0');
      const rec=Object.assign({},r,{no,token:tok,status:'valid',issuedAtTxt:cairoNow(),issuedAt:firebase.firestore.FieldValue.serverTimestamp(),issuedBy:String((firebase.auth().currentUser||{}).email||'')});
      tx.set(cRef,{n},{merge:true});tx.set(db.collection('receipts').doc(no),rec);tx.set(db.collection('receipt_public').doc(tok),publicCopy(rec));
      Object.assign(r,rec);return no});
    return no}
  async function voidReceipt(r,reason){
    const up={status:'void',voidReason:String(reason||'').slice(0,200),voidAt:firebase.firestore.FieldValue.serverTimestamp()};
    const b=db.batch();b.update(db.collection('receipts').doc(r.no),up);b.update(db.collection('receipt_public').doc(r.token),{status:'void',voidReason:up.voidReason});await b.commit();
    Object.assign(r,up)}

  // ===== الحسابات من عرض السعر =====
  function paidOf(list,kinds){return (list||[]).filter(x=>x.status!=='void'&&kinds.indexOf(x.kind)>=0).reduce((s,x)=>s+(+x.amount||0),0)}
  function suggest(kind,q,list){q=q||{};const setup=+q.setup||0,monthly=+q.monthly||0,dep=+q.deposit||0;
    if(kind==='deposit')return dep;
    if(kind==='setup')return Math.max(0,setup-paidOf(list,['deposit','setup']));
    if(kind==='monthly')return monthly;
    if(kind==='quarterly')return monthly*3;
    if(kind==='annual')return monthly*(+q.annualMonths||12);return 0}
  function remainingTxt(r,q,list){q=q||{};const setup=+q.setup||0;if(!setup||['deposit','setup'].indexOf(r.kind)<0)return '';
    const before=paidOf((list||[]).filter(x=>x.no!==r.no),['deposit','setup']);const paid=before+(+r.amount||0);const rem=Math.max(0,setup-paid);
    return rem>0?`المتبقي من رسوم الإعداد: ${money(rem)} ج.م (الإجمالي ${money(setup)} ج.م، المسدد ${money(paid)} ج.م)`:`تم سداد رسوم الإعداد بالكامل (${money(setup)} ج.م)`}

  // ===== الشاشة =====
  function open(b,opts){
    opts=opts||{};ensureCss();loadLibs().catch(()=>{});
    const list=opts.receipts||[];const q=b.quote||{};const existing=opts.receipt||null;
    const today=iso(new Date());
    const r=existing?Object.assign({},existing):{bookingId:b.id,assoc:b.orgName||q.assoc||'',regNumber:b.regNumber||'',payer:b.contactName||q.contact||'',payerTitle:'',
      quoteNo:q.no||'',note:NOTE,date:today,kind:list.some(x=>x.kind==='deposit'&&x.status!=='void')?'setup':'deposit',method:'bank',ref:'',from:today,to:'',statement:''};
    if(!existing){r.amount=suggest(r.kind,q,list);r.to=addMonths(r.from,1)}
    const issued=()=>!!r.no;
    const ov=document.createElement('div');ov.className='tmr-ov';
    ov.innerHTML=`<div class="tmr-sh" role="dialog" aria-label="إيصال استلام"><div class="tmr-top"><h2></h2><button type="button" data-x aria-label="إغلاق">×</button></div>
<div class="tmr-body"><div class="tmr-f" id="tmrF">
<label class="w">اسم الجمعية<input data-k="assoc"></label>
<label>رقم القيد (اختياري)<input data-k="regNumber"></label>
<label>تاريخ الإيصال<input type="date" data-k="date"></label>
<label>اسم المسدِّد<input data-k="payer"></label>
<label>صفته (اختياري)<input data-k="payerTitle" placeholder="مثلًا: أمين الصندوق"></label>
<label>وذلك قيمة<select data-k="kind">${Object.keys(KINDS).map(k=>`<option value="${k}">${KINDS[k].t}</option>`).join('')}</select></label>
<label>المبلغ (ج.م)<input type="number" inputmode="decimal" min="1" step="0.01" data-k="amount"></label>
<label data-sub>من<input type="date" data-k="from"></label>
<label data-sub>إلى<input type="date" data-k="to"></label>
<label>طريقة السداد<select data-k="method">${Object.keys(METHODS).map(k=>`<option value="${k}">${METHODS[k]}</option>`).join('')}</select></label>
<label data-ref>مرجع التحويل<input data-k="ref" dir="ltr" placeholder="رقم العملية"></label>
<label class="w">البيان<input data-k="statement"></label>
<label class="w">الجملة التوضيحية (تقدر تعدّلها أو تمسحها)<textarea data-k="note" rows="3" style="min-height:70px"></textarea></label>
</div><div class="tmr-pv"><div class="tmr-pv-in" id="tmrPv"></div></div></div>
<div class="tmr-act" id="tmrAct"></div><div class="tmr-msg" id="tmrMsg" role="status"></div></div>`;
    document.body.appendChild(ov);document.body.style.overflow='hidden';
    const $=s=>ov.querySelector(s),msg=t=>{$('#tmrMsg').textContent=t};
    const close=()=>{ov.remove();document.body.style.overflow=''};
    $('[data-x]').onclick=close;ov.addEventListener('click',e=>{if(e.target===ov)close()});
    let qr='';
    const render=()=>{const k=KINDS[r.kind]||KINDS.deposit;if(!r.statement||Object.values(KINDS).some(x=>x.st===r.statement))r.statement=k.st;
      r.remainingTxt=remainingTxt(r,q,list);
      ov.querySelectorAll('[data-sub]').forEach(x=>x.style.display=k.m?'':'none');ov.querySelector('[data-ref]').style.display=r.method==='cash'?'none':'';
      ov.querySelectorAll('[data-k]').forEach(el=>{if(document.activeElement!==el)el.value=r[el.dataset.k]??'';el.disabled=issued()});
      $('#tmrF').style.display=issued()?'none':'';
      $('.tmr-top h2').textContent=issued()?('إيصال '+r.no+(r.status==='void'?' · ملغي':'')):'إيصال استلام جديد';
      $('#tmrPv').innerHTML=html(r,qr);const w=$('.tmr-pv').clientWidth-20;const s=Math.min(1,w/794);$('#tmrPv').style.transform=`scale(${s})`;$('#tmrPv').style.height=(1123*s)+'px';
      const A=$('#tmrAct');
      A.innerHTML=!issued()?`<button type="button" data-a="issue" style="background:#0e2a44;color:#fff">🧾 إصدار الإيصال</button>`
        :`<button type="button" data-a="pdf" style="background:#1b6fa8;color:#fff">تحميل PDF</button><button type="button" data-a="wa" style="background:#178a5c;color:#fff">إرسال واتساب</button><button type="button" data-a="mail" style="background:#178a5c;color:#fff">إرسال بالإيميل</button><button type="button" data-a="link" style="background:#eaf5fc;color:#0e2a44">نسخ رابط التحقق</button>`+(r.status!=='void'?`<button type="button" data-a="void" style="background:#fdecec;color:#b42318;flex:0 0 auto;min-width:90px">إلغاء</button>`:'')};
    ov.querySelectorAll('[data-k]').forEach(el=>el.addEventListener('input',()=>{const k=el.dataset.k;let v=el.value;if(k==='amount')v=+v||0;
      const prevKind=r.kind;r[k]=v;
      if(k==='kind'&&v!==prevKind){r.amount=suggest(v,q,list);r.statement='';if(KINDS[v].m)r.to=addMonths(r.from||today,KINDS[v].m)}
      if(k==='from'&&KINDS[r.kind].m)r.to=addMonths(v,KINDS[r.kind].m);
      render()}));
    window.addEventListener('resize',render,{once:true});
    const waText=()=>`السلام عليكم،\nمرفق إيصال استلام رقم ${r.no} بمبلغ ${money(r.amount)} ج.م (${(KINDS[r.kind]||{}).t}) من ${r.assoc}.\nتقدروا تتأكدوا من صحة الإيصال من الرابط ده:\n${VERIFY+r.token}\n\nشكرًا لكم،\n${ISSUER}`;
    ov.addEventListener('click',async e=>{const btn=e.target.closest('[data-a]');if(!btn)return;const a=btn.dataset.a;
      if(a==='issue'){
        if(!r.assoc||String(r.assoc).trim().length<3)return msg('⚠️ اكتب اسم الجمعية');
        if(!(+r.amount>0))return msg('⚠️ اكتب المبلغ');
        if(!r.payer)return msg('⚠️ اكتب اسم المسدِّد');
        if(r.method!=='cash'&&!r.ref&&!confirm('مفيش مرجع تحويل. تكمل من غيره؟'))return;
        if(!confirm(`هيتصدر إيصال بمبلغ ${money(r.amount)} ج.م (${KINDS[r.kind].t}) لـ ${r.assoc}.\nبعد الإصدار مش هينفع يتعدل، ولو فيه غلط بيتلغي ويتعمل غيره.\nتكمل؟`))return;
        btn.disabled=true;msg('بيصدر الإيصال…');
        try{await issue(r);qr=await qrData(VERIFY+r.token).catch(()=>'');render();msg('✅ اتصدر الإيصال '+r.no);try{opts.onChange&&opts.onChange(r)}catch(e){}}
        catch(err){console.warn(err);btn.disabled=false;msg(err&&err.code==='permission-denied'?'❌ انشر قواعد Firestore الجديدة (receipts)':'❌ '+((err&&err.message)||err))}
        return}
      if(a==='pdf'){btn.disabled=true;try{msg('بيجهّز ملف PDF…');const bl=await buildPdf(r);await deliver(r,bl);msg('اتحمّل: '+fileName(r))}catch(err){console.warn(err);msg('❌ معرفناش نجهز الملف: '+((err&&err.message)||err))}finally{btn.disabled=false}return}
      if(a==='wa'){const p=String(b.phone||'').replace(/\D/g,'').replace(/^0/,'20');if(!p)return msg('⚠️ مفيش رقم موبايل للجمعية');window.open(`https://wa.me/${p}?text=${encodeURIComponent(waText())}`,'_blank','noopener');msg('اتفتح واتساب ✅ ابعت ملف PDF في نفس المحادثة.');return}
      if(a==='mail'){const em=b.orgEmail||b.contactEmail||'';location.href=`mailto:${encodeURIComponent(em)}?subject=${encodeURIComponent('إيصال استلام '+r.no+' - '+ISSUER)}&body=${encodeURIComponent(waText())}`;msg('اتفتح الإيميل ✅ ارفق ملف PDF اللي حمّلته.');return}
      if(a==='link'){const u=VERIFY+r.token;(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>msg('✅ اتنسخ رابط التحقق'),()=>prompt('رابط التحقق',u));return}
      if(a==='void'){const why=prompt('سبب إلغاء الإيصال '+r.no+' (هيفضل في السجل برقمه ومكتوب عليه ملغي):');if(why===null)return;
        try{await voidReceipt(r,why);render();msg('اتلغى الإيصال '+r.no);try{opts.onChange&&opts.onChange(r)}catch(e){}}catch(err){msg('❌ '+((err&&err.message)||err))}}});
    render();
    if(issued())qrData(VERIFY+r.token).then(x=>{qr=x;render()}).catch(()=>{});
  }
  window.TMReceipt={NOTE,open,amountWords,KINDS,METHODS,_html:html,_buildPdf:buildPdf};
})();
