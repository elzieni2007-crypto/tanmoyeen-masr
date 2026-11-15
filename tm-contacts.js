/* ===== خصوصية بيانات التواصل في الأدلة (الاستشاريين، الموردين، المتطوعين، المؤسسات) =====
   المشكلة: الموبايل والإيميل كانوا محفوظين جوه الملف العام، فأي حد يقدر يقراهم من Firestore
   حتى لو صاحبهم اختار يخفيهم.
   الحل:
   - نسخة كاملة من بيانات التواصل بتتحفظ في contacts_priv/{col}/docs/{id}، ومحدش يقراها غير الأدمن وصاحب الملف.
   - الملف العام بيفضل فيه الموبايل/الإيميل بس لو صاحبهم اختار يظهروا (showPhone / showEmail).
   - موبايلات المتطوعين مش بتظهر للعامة خالص (التطبيق أصلا مش بيعرضها).
   - phoneNorm و emailNorm (نسخ للبحث عن التكرار) مابقوش في الملف العام.
   الملف ده بيشتغل لوحده: بيعدّل الكتابة والقراية في Firestore للأربع مجموعات دول بس،
   فباقي كود التطبيق بيشوف نفس البيانات زي الأول (الأدمن وصاحب الملف بيشوفوا الموبايل والإيميل كاملين).
   لازم يتحمّل بعد firebase-firestore-compat.js و firebase-auth-compat.js. */
(function(){
  if(window.__tmContacts) return; window.__tmContacts=1;
  var COLS={consultants:1,suppliers:1,volunteers:1,organizations:1};
  var KEYS=['phone','email','phoneNorm','emailNorm'];
  var ADMIN='elzieni2007@gmail.com';
  var FS=firebase.firestore;
  var DS=FS.DocumentSnapshot.prototype, QDS=FS.QueryDocumentSnapshot&&FS.QueryDocumentSnapshot.prototype;
  var DR=FS.DocumentReference.prototype, CR=FS.CollectionReference.prototype, QP=FS.Query.prototype;
  var raw={ data:DS.data, get:DS.get, qdata:QDS&&QDS.data, qget:QDS&&QDS.get,
    set:DR.set, update:DR.update, del:DR.delete, dget:DR.get, add:CR.add, qryGet:QP.get };
  var MAP={};           // 'col/id' -> {phone,email,phoneNorm,emailNorm}
  var readyRes, readyDone=false, ready=new Promise(function(r){ readyRes=r; });
  function finish(){ readyDone=true; readyRes(); }
  var wasAdmin=false;

  function dirOf(ref){ try{ return ref&&ref.parent&&!ref.parent.parent&&COLS[ref.parent.id]?ref.parent.id:''; }catch(e){ return ''; } }
  function privRef(col,id){ return firebase.firestore().collection('contacts_priv').doc(col).collection('docs').doc(id); }
  function isDel(v){ try{ return v instanceof FS.FieldValue&&v.isEqual(FS.FieldValue.delete()); }catch(e){ return false; } }
  function isFV(v){ return v instanceof FS.FieldValue; }
  function nP(v){ try{ return window.tmRegNorm?window.tmRegNorm.phone(v):''; }catch(e){ return ''; } }
  function nE(v){ try{ return window.tmRegNorm?window.tmRegNorm.email(v):String(v||'').trim().toLowerCase(); }catch(e){ return ''; } }
  function pick(o){ var r={}; KEYS.forEach(function(k){ if(o&&o[k]!=null&&o[k]!==''&&!isFV(o[k])) r[k]=o[k]; }); return r; }

  /* ---------- القراية: الأدمن وصاحب الملف بياخدوا بيانات التواصل كاملة ---------- */
  function inject(snap,v){
    if(!v||typeof v!=='object') return v;
    var col=dirOf(snap.ref); if(!col) return v;
    var p=MAP[col+'/'+snap.id]; if(!p) return v;
    KEYS.forEach(function(k){ if(p[k]&&(v[k]==null||v[k]==='')) v[k]=p[k]; });
    return v;
  }
  function patchSnap(P,d,g){
    if(!P) return;
    P.data=function(){ var v=d.apply(this,arguments); return inject(this,v); };
    P.get=function(f){
      var v=g.apply(this,arguments);
      if((v==null||v==='')&&typeof f==='string'&&KEYS.indexOf(f)>-1){ var col=dirOf(this.ref), p=col&&MAP[col+'/'+this.id]; if(p&&p[f]) return p[f]; }
      return v;
    };
  }
  patchSnap(DS,raw.data,raw.get);
  if(QDS&&QDS!==DS) patchSnap(QDS,raw.qdata,raw.qget);
  // أي قراية بتستنى لحد ما بيانات التواصل الخاصة تتحمّل (لو المستخدم أدمن أو صاحب ملف)، بحد أقصى 6 ثواني
  function waitReady(){ return Promise.race([ready,new Promise(function(r){ setTimeout(r,6000); })]); }
  QP.get=function(){ var self=this, a=arguments; return raw.qryGet.apply(self,a).then(function(s){ return waitReady().then(function(){ return s; }); }); };
  DR.get=function(){ var self=this, a=arguments; return raw.dget.apply(self,a).then(function(s){ return dirOf(self)?waitReady().then(function(){ return s; }):s; }); };

  /* ---------- الكتابة: بيانات التواصل بتروح للنسخة الخاصة، والعام ياخد اللي صاحبه سامح بيه بس ---------- */
  async function current(ref,col){
    var pub={}, pr={};
    try{ var s=await raw.dget.call(ref); if(s.exists) pub=raw.data.call(s)||{}; }catch(e){}
    try{ var q=await raw.dget.call(privRef(col,ref.id)); if(q.exists) pr=raw.data.call(q)||{}; }catch(e){}
    return {pub:pub, priv:Object.assign({},pick(pub),pr)};
  }
  // بيرجع {pub: التعديل على الملف العام, priv: النسخة الخاصة الكاملة}
  function split(col,payload,cur,fresh){
    var pub=Object.assign({},payload), priv=Object.assign({},fresh?{}:cur.priv);
    KEYS.forEach(function(k){
      if(!(k in payload)) return;
      var v=payload[k]; delete pub[k];
      if(isDel(v)||v==null||v==='') delete priv[k]; else if(!isFV(v)) priv[k]=typeof v==='string'?v.trim():v;
    });
    if('phone' in payload){ var p=nP(priv.phone); if(p) priv.phoneNorm=p; else delete priv.phoneNorm; }
    if('email' in payload){ var e=nE(priv.email); if(e) priv.emailNorm=e; else delete priv.emailNorm; }
    var base=fresh?{}:cur.pub;
    var showP=('showPhone' in payload)?payload.showPhone:base.showPhone;
    var showE=('showEmail' in payload)?payload.showEmail:base.showEmail;
    var DEL=FS.FieldValue.delete();
    var okP=col!=='volunteers'&&showP!==false&&priv.phone, okE=showE!==false&&priv.email;
    if(okP) pub.phone=priv.phone; else if(!fresh&&'phone' in base) pub.phone=DEL;
    if(okE) pub.email=priv.email; else if(!fresh&&'email' in base) pub.email=DEL;
    if(!fresh){ if('phoneNorm' in base) pub.phoneNorm=DEL; if('emailNorm' in base) pub.emailNorm=DEL; }
    return {pub:pub, priv:priv};
  }
  function touches(o){ return o&&typeof o==='object'&&(KEYS.some(function(k){ return k in o; })||'showPhone' in o||'showEmail' in o); }
  function cleanUndef(o){ Object.keys(o).forEach(function(k){ if(o[k]===undefined) delete o[k]; }); return o; }
  function privDoc(priv){ var d={}; KEYS.forEach(function(k){ if(priv[k]) d[k]=String(priv[k]).slice(0,200); }); d.at=FS.FieldValue.serverTimestamp(); return d; }
  async function savePriv(col,id,priv){
    var r=privRef(col,id);
    if(priv.phone||priv.email) await raw.set.call(r,privDoc(priv));
    else { try{ await raw.del.call(r); }catch(e){} }
    MAP[col+'/'+id]=pick(priv);
  }

  CR.add=function(data){
    var col=COLS[this.id]&&!this.parent?this.id:'';
    if(!col||!touches(data)) return raw.add.apply(this,arguments);
    var ref=this.doc(), sp=split(col,data,null,true);
    return raw.set.call(ref,cleanUndef(sp.pub)).then(function(){ return savePriv(col,ref.id,sp.priv); }).then(function(){ return ref; });
  };
  DR.set=function(data,opt){
    var col=dirOf(this), ref=this;
    if(!col||!touches(data)) return raw.set.apply(this,arguments);
    var merge=opt&&(opt.merge||opt.mergeFields);
    return current(ref,col).then(function(cur){
      var sp=split(col,data,cur,!merge);
      if(!merge){ return raw.set.call(ref,cleanUndef(sp.pub)).then(function(){ return savePriv(col,ref.id,sp.priv); }); }
      return savePriv(col,ref.id,sp.priv).then(function(){ return raw.set.call(ref,sp.pub,opt); });
    });
  };
  DR.update=function(data){
    var col=dirOf(this), ref=this;
    if(!col||typeof data!=='object'||!touches(data)) return raw.update.apply(this,arguments);
    return current(ref,col).then(function(cur){
      var sp=split(col,data,cur,false);
      // الخاص الأول (صاحب الملف محتاج الملف العام موجود عشان القواعد تسمحله)
      return savePriv(col,ref.id,sp.priv).then(function(){ return Object.keys(sp.pub).length?raw.update.call(ref,sp.pub):null; });
    });
  };
  DR.delete=function(){
    var col=dirOf(this), ref=this;
    if(!col) return raw.del.apply(this,arguments);
    var key=col+'/'+ref.id, pr=privRef(col,ref.id), backup=null;
    // نمسح النسخة الخاصة الأول (بعد مسح الملف العام صاحبه مش هيبقى له صلاحية عليها)
    return raw.dget.call(pr).then(function(s){ backup=s.exists?raw.data.call(s):null; return backup?raw.del.call(pr):null; }).catch(function(){})
      .then(function(){ return raw.del.call(ref); })
      .then(function(){ delete MAP[key]; }, function(err){
        if(backup) return raw.set.call(pr,backup).catch(function(){}).then(function(){ throw err; });
        throw err;
      });
  };

  /* ---------- تحميل بيانات التواصل الخاصة حسب المستخدم ---------- */
  async function loadAdmin(dbx){
    for(var col in COLS){
      try{ var s=await raw.qryGet.call(dbx.collection('contacts_priv').doc(col).collection('docs'));
        s.docs.forEach(function(d){ MAP[col+'/'+d.id]=pick(raw.qdata.call(d)); }); }catch(e){ console.warn('contacts load',col,e&&e.code); }
    }
  }
  async function loadOwner(dbx,uid){
    for(var col in COLS){
      try{ var s=await raw.qryGet.call(dbx.collection(col).where('ownerUid','==',uid));
        for(var i=0;i<s.docs.length;i++){ var id=s.docs[i].id;
          try{ var p=await raw.dget.call(privRef(col,id)); if(p.exists) MAP[col+'/'+id]=pick(raw.data.call(p)); }catch(e){} } }catch(e){}
    }
  }
  // نقل البيانات القديمة: أول ما الأدمن يدخل، أي موبايل/إيميل مخفي لسه في ملف عام بيتنقل للنسخة الخاصة
  async function migrate(dbx){
    var moved=0, DEL=FS.FieldValue.delete();
    for(var col in COLS){
      var s; try{ s=await raw.qryGet.call(dbx.collection(col)); }catch(e){ continue; }
      var ops=[];
      s.docs.forEach(function(d){
        var x=raw.qdata.call(d)||{}, key=col+'/'+d.id, have=MAP[key]||{};
        var full=Object.assign({},pick(x),have);
        if(full.phone&&!full.phoneNorm){ var p=nP(full.phone); if(p) full.phoneNorm=p; }
        if(full.email&&!full.emailNorm){ var e=nE(full.email); if(e) full.emailNorm=e; }
        var upd={};
        if(x.phone&&(col==='volunteers'||x.showPhone===false)) upd.phone=DEL;
        if(x.email&&x.showEmail===false) upd.email=DEL;
        if('phoneNorm' in x) upd.phoneNorm=DEL;
        if('emailNorm' in x) upd.emailNorm=DEL;
        var needPriv=(full.phone||full.email)&&KEYS.some(function(k){ return (full[k]||'')!==(have[k]||''); });
        if(!needPriv&&!Object.keys(upd).length) return;
        ops.push({ref:d.ref, key:key, full:full, upd:upd, needPriv:needPriv, col:col});
      });
      for(var i=0;i<ops.length;i+=200){
        var b=dbx.batch();
        ops.slice(i,i+200).forEach(function(o){
          if(o.needPriv) b.set(privRef(o.col,o.ref.id),privDoc(o.full));
          if(Object.keys(o.upd).length) b.update(o.ref,o.upd);
        });
        try{ await b.commit(); ops.slice(i,i+200).forEach(function(o){ MAP[o.key]=pick(o.full); if(Object.keys(o.upd).length) moved++; }); }
        catch(e){ console.warn('contacts migrate',col,e&&e.code); if(e&&e.code==='permission-denied') return -1; }
      }
    }
    return moved;
  }

  function onUser(u){
    MAP={};
    // لو كان فيه قراية مستنية من قبل كده بتفضل مستنية لحد ما بيانات المستخدم الجديد تتحمّل
    if(readyDone){ readyDone=false; ready=new Promise(function(r){ readyRes=r; }); }
    var dbx=firebase.firestore();
    var email=String(u&&u.email||'').toLowerCase();
    var job;
    if(u&&email===ADMIN){ wasAdmin=true; job=loadAdmin(dbx); }
    else{
      if(wasAdmin){ wasAdmin=false; try{ ['cache_cons','cache_sups','cache_vols','cache_orgs'].forEach(function(k){ localStorage.removeItem(k); }); }catch(e){} }
      job=u?loadOwner(dbx,u.uid):Promise.resolve();
    }
    job.catch(function(){}).then(function(){
      finish();
      if(u&&email===ADMIN){
        // نحدّث القوايم عشان الأدمن يشوف الأرقام المخفية، وبعدين ننقل أي بيانات قديمة لسه مكشوفة
        try{ if(typeof window.loadFromFirebase==='function') window.loadFromFirebase(); }catch(e){}
        migrate(dbx).then(function(n){
          if(n>0) console.log('🔒 اتنقلت بيانات تواصل '+n+' ملف للنسخة الخاصة');
          if(n<0&&typeof window.toast==='function') window.toast('⚠️ انشر قواعد Firestore الجديدة (contacts_priv) عشان تتقفل بيانات التواصل');
        });
      }
    });
  }
  function hook(){
    if(!firebase.apps||!firebase.apps.length||typeof firebase.auth!=='function') return setTimeout(hook,150);
    firebase.auth().onAuthStateChanged(onUser);
  }
  hook();
  window.tmContactsReady=function(){ return waitReady(); };
})();
