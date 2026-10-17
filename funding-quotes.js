// عروض أسعار منصة الفرص والمنح: إعداد العرض من الحجز، رابط موافقة للجمعية، ومتابعة الرد في لوحة التحكم
// يعتمد على tmq-quote.js وعلى db و FUND_ST و _fundingRows و renderFundingList و loadFundingWaitlist في index.html
(function(){
  var FQ_BASE='https://elzieni2007-crypto.github.io/tanmoyeen-masr/quote.html?k=';
  // ترتيب الحالات: جديد ← تم التواصل ← العرض اتبعت ← وافق على العرض ← حوّل الجدية ← مفعّل
  var ST={pending:FUND_ST.pending,contacted:FUND_ST.contacted,
    quoted:{t:'📄 العرض اتبعت',c:'#6b4fd8'},accepted:{t:'🤝 وافق على العرض',c:'#0a8f6a'},paid:{t:'💰 حوّل الجدية',c:'#b4590a'},
    active:FUND_ST.active,rejected:FUND_ST.rejected};
  Object.keys(FUND_ST).forEach(function(k){delete FUND_ST[k]});Object.keys(ST).forEach(function(k){FUND_ST[k]=ST[k]});
  var RESP={};
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
    return h};
  // بعد تحميل الحجوزات: هات ردود الجمعيات على العروض وحدّث الحالة تلقائيا لما الجمعية توافق
  var _load=loadFundingWaitlist;
  window.loadFundingWaitlist=loadFundingWaitlist=async function(){await _load();
    try{var s=await db.collection('quote_responses').get();RESP={};s.docs.forEach(function(d){RESP[d.id]=d.data()});
      _fundingRows.forEach(function(r){var x=RESP[r.quoteToken||'-'];
        if(x&&x.decision==='accepted'&&['pending','contacted','quoted'].indexOf(r.status||'pending')>-1){r.status='accepted';
          db.collection('funding_waitlist').doc(r.id).update({status:'accepted',acceptedAt:x.at||null,updatedAt:firebase.firestore.FieldValue.serverTimestamp()}).catch(function(){})}});
      renderFundingList()}catch(e){console.warn('quote responses',e)}};
})();
