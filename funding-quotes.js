// عروض أسعار منصة الفرص والمنح: إعداد العرض من الحجز، رابط موافقة للجمعية، ومتابعة الرد في لوحة التحكم
// يعتمد على tmq-quote.js وعلى db و FUND_ST و _fundingRows و renderFundingList و loadFundingWaitlist في index.html
(function(){
  var FQ_BASE='https://elzieni2007-crypto.github.io/tanmoyeen-masr/quote.html?k=';
  // ترتيب الحالات: جديد ← تم التواصل ← العرض اتبعت ← وافق على العرض ← حوّل الجدية ← مفعّل
  var ST={pending:FUND_ST.pending,contacted:FUND_ST.contacted,
    quoted:{t:'📄 العرض اتبعت',c:'#6b4fd8'},accepted:{t:'🤝 وافق على العرض',c:'#0a8f6a'},paid:{t:'💰 حوّل الجدية',c:'#b4590a'},
    active:FUND_ST.active,rejected:FUND_ST.rejected};
  Object.keys(FUND_ST).forEach(function(k){delete FUND_ST[k]});Object.keys(ST).forEach(function(k){FUND_ST[k]=ST[k]});
  var RESP={},RCPT={};
  function token(){var a=new Uint8Array(12);crypto.getRandomValues(a);return Array.from(a,function(b){return('0'+b.toString(16)).slice(-2)}).join('')}
  function rowById(id){for(var i=0;i<_fundingRows.length;i++)if(_fundingRows[i].id===id)return _fundingRows[i];return null}
  function addDays(iso,n){var d=new Date((iso||new Date().toISOString().slice(0,10))+'T12:00:00');d.setDate(d.getDate()+(+n||30));return d.toLocaleDateString('ar-EG-u-nu-latn',{day:'numeric',month:'long',year:'numeric'})}
  function publicCopy(r,q){return {bookingId:r.id,no:q.no||'',assoc:q.assoc||r.orgName||'',contact:q.contact||r.contactName||'',
    setup:+q.setup||0,monthly:+q.monthly||0,annualMonths:+q.annualMonths||10,deposit:+q.deposit||0,cap:+q.cap||100,
    validUntil:addDays(q.date,q.valid),bankName:q.bankName||'',bankAcc:q.bankAcc||'',instapay:q.instapay||'',
    senderEmail:q.senderEmail||'',senderPhone:q.senderPhone||'',status:'open',updatedAt:firebase.firestore.FieldValue.serverTimestamp()}}
  async function saveQuote(r,q,tok,sent){
    var up={quote:q,quoteToken:tok,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
    if(sent&&['pending','contacted'].indexOf(r.status||'pending')>-1)up.status='quoted';
    try{await db.collection('quote_public').doc(tok).set(publicCopy(r,q));
      await db.collection('funding_waitlist').doc(r.id).update(up);
      r.quote=q;r.quoteToken=tok;if(up.status)r.status=up.status;renderFundingList()}
    catch(e){console.warn('quote save',e);toast(e&&e.code==='permission-denied'?'❌ انشر قواعد Firestore الجديدة (quote_public)':'❌ '+(e.message||e))}}
  window.openFundingQuote=function(id){var r=rowById(id);if(!r)return;
    if(!window.TMQuote){toast('❌ ملف tmq-quote.js مش متحمّل');return}
    var tok=r.quoteToken||token();
    TMQuote.open({id:r.id,assoc:r.orgName,contact:r.contactName,phone:r.phone,email:r.orgEmail||r.contactEmail,quote:r.quote||null,acceptUrl:FQ_BASE+tok},
      {onSave:function(q){saveQuote(r,q,tok,false)},onSent:function(q){saveQuote(r,q,tok,true)}})};
  window.copyQuoteLink=function(id){var r=rowById(id);if(!r||!r.quoteToken)return;var u=FQ_BASE+r.quoteToken;
    (navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(function(){toast('✅ اتنسخ رابط الموافقة')},function(){prompt('انسخ رابط الموافقة',u)})};
  window.fqCardExtra=function(r){var E=escapeHtml,q=r.quote,x=RESP[r.quoteToken||'-'];var h='';
    if(x){var d=x.at&&x.at.toMillis?new Date(x.at.toMillis()).toLocaleString('ar-EG'):'';
      h+=x.decision==='accepted'
        ?'<div style="background:#e7faf3;border:1.5px solid #0a8f6a;border-radius:10px;padding:8px 10px;margin-bottom:8px;font-size:11.5px"><b style="color:#0a8f6a">🤝 الجمعية وافقت على العرض</b><br>'+E(x.name||'')+(x.title?' · '+E(x.title):'')+(x.phone?' · <span dir="ltr">'+E(x.phone)+'</span>':'')+'<br><span style="color:#6b7a8d">'+E(d)+'</span>'+(x.note?'<br>💬 '+E(x.note):'')+(r.status!=='paid'&&r.status!=='active'?'<br><b style="color:#b4590a">مستني تحويل الجدية: لما توصل غيّر الحالة لـ «💰 حوّل الجدية»</b>':'')+'</div>'
        :'<div style="background:#fff3cd;border-radius:10px;padding:8px 10px;margin-bottom:8px;font-size:11.5px"><b style="color:#c06010">💬 الجمعية عندها استفسار على العرض</b><br>'+E(x.name||'')+(x.phone?' · <span dir="ltr">'+E(x.phone)+'</span>':'')+'<br>'+E(x.note||'')+'<br><span style="color:#6b7a8d">'+E(d)+'</span></div>'}
    else if(q&&q.status==='sent')h+='<div style="background:#f1edff;border-radius:10px;padding:6px 10px;margin-bottom:8px;font-size:11.5px;color:#4b36a8">📄 العرض <span dir="ltr">'+E(q.no||'')+'</span> اتبعت · لسه مفيش رد من الجمعية</div>';
    else if(q)h+='<div style="background:#f4f6f9;border-radius:10px;padding:6px 10px;margin-bottom:8px;font-size:11.5px;color:#6b7a8d">📝 مسودة عرض سعر <span dir="ltr">'+E(q.no||'')+'</span></div>';
    h+='<div style="display:flex;gap:6px;margin-bottom:6px"><button onclick="openFundingQuote(\''+r.id+'\')" style="flex:2;padding:7px;background:#1a3a6e;color:#fff;border:none;border-radius:8px;font-family:Cairo,sans-serif;font-size:11px;font-weight:800;cursor:pointer">📄 '+(q?'افتح عرض السعر':'جهّز عرض سعر')+'</button>'+
      (r.quoteToken?'<button onclick="copyQuoteLink(\''+r.id+'\')" style="flex:1;padding:7px;background:#eaf5fc;color:#1a3a6e;border:none;border-radius:8px;font-family:Cairo,sans-serif;font-size:11px;font-weight:800;cursor:pointer">🔗 رابط الموافقة</button>':'')+'</div>';
    // إيصالات الاستلام
    var rl=(RCPT[r.id]||[]);
    if(rl.length){var paid=rl.filter(function(x){return x.status!=='void'}).reduce(function(s,x){return s+(+x.amount||0)},0);
      h+='<div style="background:#f4f8fb;border-radius:10px;padding:7px 10px;margin-bottom:6px;font-size:11.5px"><b style="color:#0e2a44">🧾 المسدد: '+paid.toLocaleString('en-US')+' ج.م</b>'+
        rl.map(function(x){return '<div style="display:flex;gap:6px;align-items:center;margin-top:4px'+(x.status==='void'?';opacity:.55;text-decoration:line-through':'')+'"><span dir="ltr" style="font-weight:700">'+E(x.no)+'</span><span style="flex:1">'+E((TMReceipt.KINDS[x.kind]||{}).t||'')+' · '+(+x.amount||0).toLocaleString('en-US')+' ج.م'+(x.status==='void'?' · ملغي':'')+'</span><button onclick="openReceipt(\''+r.id+'\',\''+E(x.no)+'\')" style="padding:3px 9px;background:#fff;border:1px solid #d6e4ee;border-radius:7px;font-family:Cairo,sans-serif;font-size:11px;cursor:pointer">فتح</button></div>'}).join('')+'</div>'}
    if(window.TMContract)h+='<button onclick="openContract(\''+r.id+'\')" style="width:100%;padding:7px;margin-bottom:6px;background:'+(r.contract?'#e7faf3;color:#0a8f6a':'#eaf5fc;color:#0e2a44')+';border:none;border-radius:8px;font-family:Cairo,sans-serif;font-size:11px;font-weight:800;cursor:pointer">📝 '+(r.contract?'العقد (محفوظ'+(r.contract.no?' · '+E(r.contract.no):'')+')':'جهّز العقد')+'</button>';
    if(window.TMReceipt)h+='<button onclick="openReceipt(\''+r.id+'\')" style="width:100%;padding:7px;margin-bottom:6px;background:#0e2a44;color:#fff;border:none;border-radius:8px;font-family:Cairo,sans-serif;font-size:11px;font-weight:800;cursor:pointer">🧾 إيصال استلام جديد</button>';
    return h};
  window.openContract=function(id){var r=rowById(id);if(!r)return;if(!window.TMContract){toast('❌ ملف tmc-contract.js مش متحمّل');return}
    TMContract.open(r,{receipts:RCPT[id]||[],onSave:function(){renderFundingList()}})};
  window.openReceipt=function(id,no){var r=rowById(id);if(!r)return;if(!window.TMReceipt){toast('❌ ملف tmr-receipt.js مش متحمّل');return}
    var list=RCPT[id]||[];var ex=no?list.filter(function(x){return x.no===no})[0]:null;
    TMReceipt.open(r,{receipts:list,receipt:ex,onChange:function(rec){var L=RCPT[id]=RCPT[id]||[];var i=L.findIndex(function(x){return x.no===rec.no});
      var c=Object.assign({},rec);if(i>=0)L[i]=c;else L.push(c);renderFundingList()}})};
  // بعد تحميل الحجوزات: هات ردود الجمعيات على العروض وحدّث الحالة تلقائيا لما الجمعية توافق
  var _load=loadFundingWaitlist;
  window.loadFundingWaitlist=loadFundingWaitlist=async function(){await _load();
    try{var rs=await db.collection('receipts').get();RCPT={};rs.docs.forEach(function(d){var x=d.data();(RCPT[x.bookingId]=RCPT[x.bookingId]||[]).push(x)});
      Object.keys(RCPT).forEach(function(k){RCPT[k].sort(function(a,b){return String(a.no).localeCompare(String(b.no))})})}catch(e){console.warn('receipts',e)}
    try{var s=await db.collection('quote_responses').get();RESP={};s.docs.forEach(function(d){RESP[d.id]=d.data()});
      _fundingRows.forEach(function(r){var x=RESP[r.quoteToken||'-'];
        if(x&&x.decision==='accepted'&&['pending','contacted','quoted'].indexOf(r.status||'pending')>-1){r.status='accepted';
          db.collection('funding_waitlist').doc(r.id).update({status:'accepted',acceptedAt:x.at||null,updatedAt:firebase.firestore.FieldValue.serverTimestamp()}).catch(function(){})}});
      renderFundingList()}catch(e){console.warn('quote responses',e)}};
})();
