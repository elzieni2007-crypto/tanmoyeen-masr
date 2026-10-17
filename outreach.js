// قسم التواصل في لوحة الأدمن: حملات برسائل جاهزة لكل تصنيف (واتساب وإيميل) ومتابعة مين اتبعتله
// بيعتمد على db و firebase و toast و cleanPhone و setAdmTab من index.html
(function(){
  var BASE='https://elzieni2007-crypto.github.io/tanmoyeen-masr/';
  var OPT='\n\nلو مش حابب توصلك رسايل تانية رد بكلمة «لا».';
  var MAILOPT='\n\nلو مش حابب توصلك رسايل تانية من تنمويين مصر رد على الإيميل ده بكلمة «لا».';
  var CAMPAIGNS=[
    {id:'funding',icon:'💰',title:'منصة الفرص والمنح',col:'organizations',who:'المؤسسات',link:BASE+'?form=funding',
     first:{wa:'السلام عليكم {الاسم} 🌱\nمعاك {المرسل} من تنمويين مصر.\n\nبنجهز منصة الفرص والمنح للجمعيات:\n• بتدور كل يوم على فرص التمويل المناسبة لجمعيتكم\n• بتقرا دليل الدعوة وتقترح أفكار للمشروع\n• بتكتب مسودة أولى قوية للمقترح بالعربي والإنجليزي وانتو بتراجعوا وتعدلوا وتعتمدوا\n\nالحجز للمرحلة الأولى محدود لـ100 جمعية بس:\n{الرابط}'+OPT,
       subject:'منصة الفرص والمنح: الحجز لأول 100 جمعية',
       body:'السلام عليكم {الاسم}\n\nمعاك {المرسل} من تنمويين مصر.\n\nبنجهز منصة الفرص والمنح للجمعيات الأهلية، وهي حساب مستقل وآمن لجمعيتكم فيه:\n• فرص تمويل مناسبة لجمعيتكم بتتحدث كل يوم ومعاها مصدر الإعلان ورابط الجهة المانحة\n• قراءة دليل الدعوة وتحديد المطلوب والشروط\n• اقتراح أفكار للمشروع تختاروا منها أو تعدلوها\n• مسودة أولى قوية للمقترح بالعربي والإنجليزي على نموذج المانح، وفريقكم بيراجع ويعدل ويعتمد، فالقرار دايما للجمعية\n• إيميل التقديم ومتابعة كل فرصة لحد النتيجة\n\nالحجز للمرحلة الأولى محدود لـ100 جمعية بس:\n{الرابط}\n\nمع خالص التحية\n{المرسل}\nتنمويين مصر'+MAILOPT},
     reminder:{wa:'السلام عليكم {الاسم}\nفاضل أماكن محدودة في المرحلة الأولى من منصة الفرص والمنح لأول 100 جمعية.\nلو جمعيتكم مهتمة احجزوا مكانكم من هنا:\n{الرابط}\nولو عندكم أي سؤال أنا موجود.'+OPT,
       subject:'تذكير: أماكن محدودة في منصة الفرص والمنح',
       body:'السلام عليكم {الاسم}\n\nحبيت أفكركم إن الحجز في المرحلة الأولى من منصة الفرص والمنح محدود لأول 100 جمعية، والأماكن بتقل.\n\nاحجزوا مكان جمعيتكم من هنا:\n{الرابط}\n\nولو عندكم أي سؤال أنا موجود.\n\n{المرسل}\nتنمويين مصر'+MAILOPT}},
    {id:'athar',icon:'🌿',title:'برنامج أثر',col:'organizations',who:'المؤسسات',link:BASE+'?form=athar',
     first:{wa:'السلام عليكم {الاسم} 🌿\nمعاك {المرسل} من تنمويين مصر.\n\nبرنامج أثر للإدارة المالية للجمعيات الأهلية: حسابات وميزانيات وتقارير بواجهة عربية سهلة ومتوافق مع قانون الجمعيات.\n\nمتاح نسخة تجريبية مجانية لمدة شهر كامل والأماكن محدودة:\n{الرابط}'+OPT,
       subject:'برنامج أثر: جرّبوا الإدارة المالية لجمعيتكم شهر مجانا',
       body:'السلام عليكم {الاسم}\n\nمعاك {المرسل} من تنمويين مصر.\n\nبرنامج أثر هو حل مالي متكامل للجمعيات الأهلية في مصر:\n• إدارة مالية وتقارير وميزانيات\n• متوافق مع قانون الجمعيات ولوائحه\n• آمن وواجهته عربية وسهلة\n\nمتاح لجمعيتكم نسخة تجريبية مجانية لمدة شهر كامل، وبعدها بنتواصل معاكم نقيّم التجربة واحتياجاتكم. الأماكن محدودة:\n{الرابط}\n\nمع خالص التحية\n{المرسل}\nتنمويين مصر'+MAILOPT},
     reminder:{wa:'السلام عليكم {الاسم}\nلسه متاح لجمعيتكم تجربة برنامج أثر للإدارة المالية مجانا لمدة شهر.\nسجلوا من هنا:\n{الرابط}'+OPT,
       subject:'تذكير: تجربة برنامج أثر مجانا لمدة شهر',
       body:'السلام عليكم {الاسم}\n\nلسه متاح لجمعيتكم تجربة برنامج أثر للإدارة المالية مجانا لمدة شهر كامل.\n\nسجلوا من هنا:\n{الرابط}\n\n{المرسل}\nتنمويين مصر'+MAILOPT}},
    {id:'volunteers',icon:'🤝',title:'المتطوعين',col:'volunteers',who:'المتطوعين',link:BASE+'?form=academy',
     first:{wa:'السلام عليكم {الاسم} 🤝\nمعاك {المرسل} من تنمويين مصر.\nشكرا إنك مسجل كمتطوع معانا.\n\nحابين نفكرك إن الجمعيات بتشوف ملفك على التطبيق، فخليه محدث بمجالك ومحافظتك ومواعيدك المتاحة.\nوكمان في تدريبات أكاديمية تنمويين مصر تقدر تطور بيها نفسك في العمل التنموي:\n{الرابط}'+OPT,
       subject:'ملفك كمتطوع على تنمويين مصر وتدريبات الأكاديمية',
       body:'السلام عليكم {الاسم}\n\nمعاك {المرسل} من تنمويين مصر. شكرا إنك مسجل كمتطوع معانا.\n\nالجمعيات بتشوف ملفك على التطبيق وبتتواصل مع المتطوعين اللي مناسبين ليها، فخلي ملفك محدث بمجال تطوعك ومحافظتك ومواعيدك المتاحة.\n\nوكمان في تدريبات أكاديمية تنمويين مصر تقدر تطور بيها مهاراتك في العمل التنموي:\n{الرابط}\n\n{المرسل}\nتنمويين مصر'+MAILOPT},
     reminder:{wa:'السلام عليكم {الاسم}\nفي تدريبات جديدة على أكاديمية تنمويين مصر ممكن تفيدك في التطوع والعمل التنموي:\n{الرابط}'+OPT,
       subject:'تدريبات جديدة على أكاديمية تنمويين مصر',
       body:'السلام عليكم {الاسم}\n\nفي تدريبات جديدة على أكاديمية تنمويين مصر ممكن تفيدك في التطوع والعمل التنموي:\n{الرابط}\n\n{المرسل}\nتنمويين مصر'+MAILOPT}},
    {id:'suppliers',icon:'🏭',title:'الموردين',col:'suppliers',who:'الموردين',link:BASE,
     first:{wa:'السلام عليكم {الاسم} 🏭\nمعاك {المرسل} من تنمويين مصر.\nشكرا لتسجيلكم كمورد معانا.\n\nبننشر على التطبيق مناقصات وطلبات عروض أسعار الجمعيات والمنظمات أول بأول، والجمعيات بتدور على الموردين من الدليل.\nخلوا ملفكم محدث وفعّلوا الإشعارات علشان توصلكم المناقصات الجديدة:\n{الرابط}'+OPT,
       subject:'مناقصات الجمعيات والمنظمات على تنمويين مصر',
       body:'السلام عليكم {الاسم}\n\nمعاك {المرسل} من تنمويين مصر. شكرا لتسجيلكم كمورد معانا.\n\nبننشر على التطبيق مناقصات وطلبات عروض أسعار الجمعيات والمنظمات التنموية أول بأول، والجمعيات بتدور على الموردين من دليل الموردين.\n\nخلوا ملفكم محدث بالنشاط والمحافظات اللي بتغطوها، وفعّلوا الإشعارات علشان توصلكم المناقصات الجديدة:\n{الرابط}\n\n{المرسل}\nتنمويين مصر'+MAILOPT},
     reminder:{wa:'السلام عليكم {الاسم}\nفي مناقصات وطلبات عروض أسعار جديدة على تنمويين مصر ممكن تناسب نشاطكم:\n{الرابط}'+OPT,
       subject:'مناقصات جديدة على تنمويين مصر',
       body:'السلام عليكم {الاسم}\n\nفي مناقصات وطلبات عروض أسعار جديدة على تنمويين مصر ممكن تناسب نشاطكم:\n{الرابط}\n\n{المرسل}\nتنمويين مصر'+MAILOPT}},
    {id:'consultants',icon:'👨‍💼',title:'الاستشاريين',col:'consultants',who:'الاستشاريين',link:BASE+'?form=consult',
     first:{wa:'السلام عليكم {الاسم} 👨‍💼\nمعاك {المرسل} من تنمويين مصر.\nشكرا لتسجيلك كاستشاري معانا.\n\nالجمعيات بتطلب استشارات من خلال التطبيق وبتدور على الاستشاريين حسب التخصص والمحافظة، فخلي ملفك محدث بتخصصك وخبراتك.\nولو حابب تقدم تدريب على أكاديمية تنمويين مصر كلمني.\n{الرابط}'+OPT,
       subject:'ملفك كاستشاري على تنمويين مصر',
       body:'السلام عليكم {الاسم}\n\nمعاك {المرسل} من تنمويين مصر. شكرا لتسجيلك كاستشاري معانا.\n\nالجمعيات بتطلب استشارات من خلال التطبيق وبتدور على الاستشاريين حسب التخصص والمحافظة، فخلي ملفك محدث بتخصصك وسنين خبرتك وأهم شغلك.\n\nولو حابب تقدم تدريب على أكاديمية تنمويين مصر رد على الإيميل ده ونتكلم.\n{الرابط}\n\n{المرسل}\nتنمويين مصر'+MAILOPT},
     reminder:{wa:'السلام عليكم {الاسم}\nفي طلبات استشارات جديدة من الجمعيات على تنمويين مصر. اتأكد إن ملفك محدث علشان يوصلوك:\n{الرابط}'+OPT,
       subject:'طلبات استشارات جديدة من الجمعيات',
       body:'السلام عليكم {الاسم}\n\nفي طلبات استشارات جديدة من الجمعيات على تنمويين مصر. اتأكد إن ملفك محدث علشان يوصلوك:\n{الرابط}\n\n{المرسل}\nتنمويين مصر'+MAILOPT}},
    {id:'jobseekers',icon:'🔍',title:'باحثي فرص العمل',col:'jobseekers',who:'باحثي العمل',link:BASE,
     first:{wa:'السلام عليكم {الاسم} 🔍\nمعاك {المرسل} من تنمويين مصر.\n\nبننشر كل يوم وظائف جديدة في الجمعيات والمنظمات التنموية في كل المحافظات.\nفعّل الإشعارات واختار تخصصك ومحافظتك علشان توصلك الوظايف المناسبة ليك أول بأول:\n{الرابط}'+OPT,
       subject:'وظائف جديدة كل يوم في القطاع التنموي',
       body:'السلام عليكم {الاسم}\n\nمعاك {المرسل} من تنمويين مصر.\n\nبننشر كل يوم وظائف جديدة في الجمعيات والمنظمات التنموية في كل المحافظات، والجهات بتشوف ملفات باحثي العمل على التطبيق.\n\nخلي ملفك محدث، وفعّل الإشعارات واختار تخصصك ومحافظتك علشان توصلك الوظايف المناسبة ليك:\n{الرابط}\n\n{المرسل}\nتنمويين مصر'+MAILOPT},
     reminder:{wa:'السلام عليكم {الاسم}\nفي وظائف جديدة في القطاع التنموي اتنشرت النهارده على تنمويين مصر:\n{الرابط}'+OPT,
       subject:'وظائف جديدة على تنمويين مصر',
       body:'السلام عليكم {الاسم}\n\nفي وظائف جديدة في القطاع التنموي اتنشرت على تنمويين مصر:\n{الرابط}\n\n{المرسل}\nتنمويين مصر'+MAILOPT}}
  ];
  var VAR={first:'الرسالة الأولى',reminder:'تذكير'};
  var S={c:CAMPAIGNS[0],v:'first',rows:[],logs:{},opt:{},tpl:{},q:'',gov:'',st:'all',ch:'all',shown:60,edit:false,loaded:{}};
  var LS='tmo_sender';
  function g(id){return document.getElementById(id)}
  function E(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function sender(){try{return localStorage.getItem(LS)||'مصطفى'}catch(e){return 'مصطفى'}}
  function T(){var o=S.tpl[S.c.id]||{};var d=S.c[S.v];var v=(o[S.v]||{});return{wa:v.wa||d.wa,subject:v.subject||d.subject,body:v.body||d.body,link:o.link||S.c.link}}
  function nameOf(r){return r.name||r.orgName||r.company||r.fullName||''}
  function specOf(r){return r.spec||r.field||r.cat||r.sec||r.type||r.title||''}
  function phoneOf(r){var p=r.phone||r.whatsapp||r.mobile||'';var n=typeof cleanPhone==='function'?cleanPhone(p):String(p).replace(/\D/g,'');return /^201[0125]\d{8}$/.test(n)?n:''}
  function mailOf(r){var m=String(r.email||r.orgEmail||r.contactEmail||'').trim();return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m)?m:''}
  function fill(t,r){var nm=r?nameOf(r):'';return String(t).replace(/\{الاسم\}/g,nm).replace(/\{المحافظة\}/g,r&&r.gov||'').replace(/\{التخصص\}/g,r?specOf(r):'').replace(/\{الرابط\}/g,T().link).replace(/\{المرسل\}/g,sender()).replace(/[ \t]+\n/g,'\n').replace(/ {2,}/g,' ').replace(/عليكم \n/g,'عليكم\n')}
  function key(r){return S.c.id+'__'+S.c.col+'__'+r.id}
  function okey(r){return S.c.col+'__'+r.id}
  function d8(t){return t&&t.toMillis?new Date(t.toMillis()).toLocaleDateString('ar-EG-u-nu-latn',{day:'numeric',month:'numeric'}):''}
  function ts(){return firebase.firestore.FieldValue.serverTimestamp()}
  async function loadAudience(force){var col=S.c.col;
    if(!S.loaded[col]||force){var s=await db.collection(col).get();S.loaded[col]=s.docs.map(function(d){return Object.assign({id:d.id},d.data())})}
    S.rows=S.loaded[col];
    var ls=await db.collection('outreach_log').where('campaign','==',S.c.id).get();S.logs={};ls.docs.forEach(function(d){S.logs[d.id]=d.data()});
    var os=await db.collection('outreach_optout').where('col','==',col).get();S.opt={};os.docs.forEach(function(d){S.opt[d.id]=d.data()});
    try{var t=await db.collection('outreach_templates').doc(S.c.id).get();if(t.exists)S.tpl[S.c.id]=t.data()}catch(e){}}
  function filtered(){var q=S.q.toLowerCase();return S.rows.filter(function(r){var L=S.logs[key(r)]||{},o=S.opt[okey(r)];
    if(q&&[nameOf(r),r.gov,specOf(r),r.phone,r.email].join(' ').toLowerCase().indexOf(q)<0)return false;
    if(S.gov&&r.gov!==S.gov)return false;
    if(S.ch==='wa'&&!phoneOf(r))return false;if(S.ch==='email'&&!mailOf(r))return false;
    if(S.st==='new'&&(L.wa||L.email||o))return false;if(S.st==='sent'&&!(L.wa||L.email))return false;if(S.st==='opt'&&!o)return false;
    if(S.st!=='opt'&&S.st!=='all'&&o)return false;return true})}
  async function mark(r,ch){var k=key(r),up={campaign:S.c.id,col:S.c.col,docId:r.id,name:nameOf(r).slice(0,120)};up[ch]=ts();up[ch+'Variant']=S.v;
    S.logs[k]=Object.assign({},S.logs[k]||{},up);S.logs[k][ch]={toMillis:function(){return Date.now()}};
    try{await db.collection('outreach_log').doc(k).set(up,{merge:true})}catch(e){toast('❌ اتفتحت الرسالة بس معرفناش نسجلها: انشر قواعد Firestore الجديدة')}
    render()}
  window.tmoWa=function(id){var r=S.rows.find(function(x){return x.id===id});if(!r)return;var p=phoneOf(r);if(!p){toast('⚠️ مفيش رقم موبايل صحيح');return}
    window.open('https://wa.me/'+p+'?text='+encodeURIComponent(fill(T().wa,r)),'_blank','noopener');mark(r,'wa')};
  window.tmoMail=function(id){var r=S.rows.find(function(x){return x.id===id});if(!r)return;var m=mailOf(r);if(!m){toast('⚠️ مفيش إيميل صحيح');return}var t=T();
    location.href='mailto:'+encodeURIComponent(m)+'?subject='+encodeURIComponent(fill(t.subject,r))+'&body='+encodeURIComponent(fill(t.body,r));mark(r,'email')};
  window.tmoNext=function(){var r=filtered().find(function(x){var L=S.logs[key(x)]||{};return phoneOf(x)&&!L.wa&&!S.opt[okey(x)]});
    if(!r){toast('✅ خلصت كل اللي ليهم رقم في الفلتر ده');return}tmoWa(r.id)};
  window.tmoOpt=async function(id){var r=S.rows.find(function(x){return x.id===id});if(!r)return;var k=okey(r);
    if(S.opt[k]){if(!confirm('ترجّع '+nameOf(r)+' لقايمة الإرسال؟'))return;delete S.opt[k];try{await db.collection('outreach_optout').doc(k).delete()}catch(e){}}
    else{if(!confirm(nameOf(r)+' مش عايز رسايل تانية؟ هيتشال من كل الحملات بتاعة التصنيف ده'))return;S.opt[k]={col:S.c.col,docId:r.id};try{await db.collection('outreach_optout').doc(k).set({col:S.c.col,docId:r.id,name:nameOf(r).slice(0,120),at:ts()})}catch(e){toast('❌ معرفناش نسجلها')}}
    render()};
  window.tmoUnmark=async function(id,ch){var r=S.rows.find(function(x){return x.id===id});if(!r||!confirm('تلغي علامة «اتبعت» ('+(ch==='wa'?'واتساب':'إيميل')+')؟'))return;var k=key(r);if(S.logs[k])delete S.logs[k][ch];
    var up={};up[ch]=firebase.firestore.FieldValue.delete?firebase.firestore.FieldValue.delete():null;try{await db.collection('outreach_log').doc(k).set(up,{merge:true})}catch(e){}render()};
  function batch(){return filtered().filter(function(r){var L=S.logs[key(r)]||{};return mailOf(r)&&!L.email&&!S.opt[okey(r)]}).slice(0,50)}
  window.tmoBatchOpen=function(){var b=batch();if(!b.length){toast('✅ مفيش إيميلات فاضلة في الفلتر ده');return}var t=T();
    location.href='mailto:?bcc='+b.map(function(r){return encodeURIComponent(mailOf(r))}).join(',')+'&subject='+encodeURIComponent(fill(t.subject,null))+'&body='+encodeURIComponent(fill(t.body,null));
    setTimeout(function(){if(confirm('بعت الدفعة دي ('+b.length+' إيميل)؟ دوس OK علشان تتعلم «اتبعت»'))b.reduce(function(p,r){return p.then(function(){return mark(r,'email')})},Promise.resolve())},1500)};
  window.tmoBatchCopy=function(){var b=batch();if(!b.length){toast('✅ مفيش إيميلات فاضلة في الفلتر ده');return}var s=b.map(mailOf).join(', ');
    var done=function(){toast('✅ اتنسخ '+b.length+' إيميل. حطهم في BCC');if(confirm('تعلّم الـ'+b.length+' دول «اتبعت» بالإيميل؟'))b.reduce(function(p,r){return p.then(function(){return mark(r,'email')})},Promise.resolve())};
    (navigator.clipboard?navigator.clipboard.writeText(s):Promise.reject()).then(done,function(){prompt('انسخ الإيميلات',s);done()})};
  window.tmoCopyText=function(which){var t=T();var s=which==='wa'?fill(t.wa,null):fill(t.subject,null)+'\n\n'+fill(t.body,null);
    (navigator.clipboard?navigator.clipboard.writeText(s):Promise.reject()).then(function(){toast('✅ اتنسخت الرسالة')},function(){prompt('انسخ',s)})};
  window.tmoSaveTpl=async function(){var o=Object.assign({},S.tpl[S.c.id]||{});o[S.v]={wa:g('tmo-wa').value,subject:g('tmo-sub').value,body:g('tmo-body').value};o.link=g('tmo-link').value.trim()||S.c.link;
    try{localStorage.setItem(LS,g('tmo-sender').value.trim()||'مصطفى')}catch(e){}
    S.tpl[S.c.id]=o;try{await db.collection('outreach_templates').doc(S.c.id).set(o);toast('✅ اتحفظت الرسالة')}catch(e){toast('❌ معرفناش نحفظ: انشر قواعد Firestore الجديدة')}render()};
  window.tmoResetTpl=async function(){if(!confirm('ترجّع '+VAR[S.v]+' للنص الأصلي؟'))return;var o=Object.assign({},S.tpl[S.c.id]||{});delete o[S.v];S.tpl[S.c.id]=o;try{await db.collection('outreach_templates').doc(S.c.id).set(o)}catch(e){}render()};
  window.tmoSet=function(k,v){S[k]=v;if(k!=='shown')S.shown=60;render()};
  window.tmoCampaign=async function(id){S.c=CAMPAIGNS.find(function(c){return c.id===id});S.v='first';S.shown=60;S.q='';S.gov='';S.st='all';S.ch='all';S.edit=false;g('tmo-list').innerHTML='<div style="text-align:center;padding:20px;color:#6b7a8d">⏳ جاري التحميل...</div>';
    renderHead();try{await loadAudience()}catch(e){g('tmo-list').innerHTML='<div style="color:#e05050;padding:12px;text-align:center">❌ '+(e.code==='permission-denied'?'انشر قواعد Firestore الجديدة (outreach)':E(e.message||e))+'</div>';return}render()};
  var btn='border:none;border-radius:8px;font-family:Cairo,sans-serif;font-weight:800;cursor:pointer;';
  function renderHead(){var h=g('tmo-head');if(!h)return;
    h.innerHTML='<div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:8px">'+CAMPAIGNS.map(function(c){var on=c.id===S.c.id;
      return '<button onclick="tmoCampaign(\''+c.id+'\')" style="'+btn+'white-space:nowrap;padding:7px 11px;font-size:11.5px;background:'+(on?'#1a3a6e':'#fff')+';color:'+(on?'#fff':'#1a3a6e')+';border:1.5px solid #1a3a6e">'+c.icon+' '+E(c.title)+'</button>'}).join('')+'</div>'}
  function render(){renderHead();var box=g('tmo-body-wrap');if(!box)return;var t=T(),c=S.c;
    var all=S.rows,f=filtered();var n={all:all.length,wa:0,em:0,sw:0,se:0,op:0};
    all.forEach(function(r){var L=S.logs[key(r)]||{};if(phoneOf(r))n.wa++;if(mailOf(r))n.em++;if(L.wa)n.sw++;if(L.email)n.se++;if(S.opt[okey(r)])n.op++});
    var govs={};all.forEach(function(r){if(r.gov)govs[r.gov]=1});
    var sample=f[0]||all[0]||{name:'الاسم'};
    var pill=function(t,c){return '<span style="background:'+c+'1f;color:'+c+';border-radius:20px;padding:3px 9px;font-size:10.5px;font-weight:800;white-space:nowrap">'+t+'</span>'};
    var sel='border:1.5px solid #d6dee8;border-radius:8px;padding:6px;font-family:Cairo,sans-serif;font-size:11.5px;background:#fff';
    var ta='width:100%;box-sizing:border-box;border:1.5px solid #d6dee8;border-radius:10px;padding:8px;font-family:Cairo,sans-serif;font-size:12.5px;line-height:1.7';
    var h='';
    h+='<div style="background:#fff;border-radius:12px;padding:12px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,.06)">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px"><b style="font-size:13px;color:#1a3a6e">'+c.icon+' '+E(c.title)+' · '+E(c.who)+'</b>'+
      '<select onchange="tmoSet(\'v\',this.value)" style="'+sel+'">'+Object.keys(VAR).map(function(k){return '<option value="'+k+'"'+(S.v===k?' selected':'')+'>'+VAR[k]+'</option>'}).join('')+'</select></div>'+
      '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">'+pill('الكل '+n.all,'#1a3a6e')+pill('📱 ليهم رقم '+n.wa,'#00703a')+pill('✉️ ليهم إيميل '+n.em,'#c06010')+pill('✓ واتساب اتبعت '+n.sw,'#0a8f6a')+pill('✓ إيميل اتبعت '+n.se,'#6b4fd8')+pill('🚫 مش عايزين '+n.op,'#e05050')+'</div>'+
      (S.edit?
        '<label style="font-size:11px;font-weight:800;color:#6b7a8d">رسالة الواتساب</label><textarea id="tmo-wa" rows="8" style="'+ta+'">'+E(t.wa)+'</textarea>'+
        '<label style="font-size:11px;font-weight:800;color:#6b7a8d">عنوان الإيميل</label><input id="tmo-sub" style="'+ta+'" value="'+E(t.subject)+'">'+
        '<label style="font-size:11px;font-weight:800;color:#6b7a8d">نص الإيميل</label><textarea id="tmo-body" rows="10" style="'+ta+'">'+E(t.body)+'</textarea>'+
        '<div style="display:flex;gap:6px;margin-top:4px"><div style="flex:2"><label style="font-size:11px;font-weight:800;color:#6b7a8d">الرابط</label><input id="tmo-link" dir="ltr" style="'+ta+'" value="'+E(t.link)+'"></div><div style="flex:1"><label style="font-size:11px;font-weight:800;color:#6b7a8d">اسم المرسل</label><input id="tmo-sender" style="'+ta+'" value="'+E(sender())+'"></div></div>'+
        '<div style="font-size:10.5px;color:#6b7a8d;margin:6px 0">بتتغير لوحدها: {الاسم} {المحافظة} {التخصص} {الرابط} {المرسل}</div>'+
        '<div style="display:flex;gap:6px"><button onclick="tmoSaveTpl()" style="'+btn+'flex:2;padding:8px;background:#1a3a6e;color:#fff;font-size:12px">💾 احفظ الرسالة</button><button onclick="tmoResetTpl()" style="'+btn+'flex:1;padding:8px;background:#f4f6f9;color:#6b7a8d;font-size:11px">↩️ النص الأصلي</button><button onclick="tmoSet(\'edit\',false)" style="'+btn+'flex:1;padding:8px;background:#eaf5fc;color:#1a3a6e;font-size:11px">إغلاق</button></div>'
      :
        '<div style="background:#e7faf3;border-radius:10px;padding:9px 11px;font-size:12px;line-height:1.75;white-space:pre-wrap;max-height:170px;overflow:auto;border:1px solid #c9efdf">'+E(fill(t.wa,sample))+'</div>'+
        '<div style="font-size:10.5px;color:#6b7a8d;margin:4px 0 8px">معاينة على: '+E(nameOf(sample)||'—')+'</div>'+
        '<div style="display:flex;gap:6px;flex-wrap:wrap"><button onclick="tmoSet(\'edit\',true)" style="'+btn+'flex:1;padding:8px;background:#eaf5fc;color:#1a3a6e;font-size:11.5px">✏️ عدّل الرسائل</button><button onclick="tmoCopyText(\'wa\')" style="'+btn+'flex:1;padding:8px;background:#f4f6f9;color:#1a3a6e;font-size:11.5px">📋 انسخ نص الواتساب</button><button onclick="tmoCopyText(\'email\')" style="'+btn+'flex:1;padding:8px;background:#f4f6f9;color:#1a3a6e;font-size:11.5px">📋 انسخ نص الإيميل</button></div>')+
      '</div>';
    h+='<div style="background:#fff;border-radius:12px;padding:10px;margin-bottom:10px;box-shadow:0 2px 8px rgba(0,0,0,.06)">'+
      '<div style="display:flex;gap:6px;margin-bottom:8px"><button onclick="tmoNext()" style="'+btn+'flex:1;padding:10px;background:#25a244;color:#fff;font-size:12.5px">💬 ابعت للي بعده على واتساب</button></div>'+
      '<div style="display:flex;gap:6px"><button onclick="tmoBatchOpen()" style="'+btn+'flex:1;padding:8px;background:#fff3cd;color:#c06010;font-size:11.5px">✉️ افتح إيميل لدفعة 50 (BCC)</button><button onclick="tmoBatchCopy()" style="'+btn+'flex:1;padding:8px;background:#fff3cd;color:#c06010;font-size:11.5px">📋 انسخ إيميلات دفعة 50</button></div>'+
      '<div style="font-size:10.5px;color:#6b7a8d;margin-top:6px">الإيميل الجماعي بيروح من غير اسم في التحية. ابعت رسايل الواتساب واحدة واحدة ومتبعتش لعدد كبير مرة واحدة علشان الرقم ميتحظرش.</div></div>';
    h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"><input value="'+E(S.q)+'" oninput="tmoSet(\'q\',this.value)" placeholder="🔍 بحث" style="'+sel+';flex:2;min-width:120px">'+
      '<select onchange="tmoSet(\'gov\',this.value)" style="'+sel+';flex:1"><option value="">كل المحافظات</option>'+Object.keys(govs).sort().map(function(x){return '<option'+(S.gov===x?' selected':'')+'>'+E(x)+'</option>'}).join('')+'</select>'+
      '<select onchange="tmoSet(\'st\',this.value)" style="'+sel+';flex:1">'+[['all','الكل'],['new','لسه متبعتلهمش'],['sent','اتبعتلهم'],['opt','مش عايزين رسايل']].map(function(x){return '<option value="'+x[0]+'"'+(S.st===x[0]?' selected':'')+'>'+x[1]+'</option>'}).join('')+'</select>'+
      '<select onchange="tmoSet(\'ch\',this.value)" style="'+sel+';flex:1">'+[['all','أي وسيلة'],['wa','ليهم رقم'],['email','ليهم إيميل']].map(function(x){return '<option value="'+x[0]+'"'+(S.ch===x[0]?' selected':'')+'>'+x[1]+'</option>'}).join('')+'</select></div>'+
      '<div style="font-size:11px;color:#6b7a8d;margin-bottom:6px">'+f.length+' في الفلتر ده</div>';
    h+=f.slice(0,S.shown).map(function(r){var L=S.logs[key(r)]||{},o=S.opt[okey(r)],p=phoneOf(r),m=mailOf(r);
      return '<div style="background:#fff;border-radius:12px;padding:10px 12px;margin-bottom:8px;box-shadow:0 2px 8px rgba(0,0,0,.05);border-right:4px solid '+(o?'#e05050':(L.wa||L.email)?'#0a8f6a':'#d6dee8')+(o?';opacity:.6':'')+'">'+
        '<div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:12.5px;color:#1a2a3a">'+E(nameOf(r)||'—')+'</b><span style="font-size:10.5px;color:#6b7a8d;white-space:nowrap">'+E(r.gov||'')+'</span></div>'+
        (specOf(r)?'<div style="font-size:10.5px;color:#6b7a8d">'+E(specOf(r))+'</div>':'')+
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:5px 0;font-size:10.5px">'+(L.wa?'<span onclick="tmoUnmark(\''+r.id+'\',\'wa\')" title="إلغاء العلامة" style="cursor:pointer;background:#e7faf3;color:#0a8f6a;border-radius:6px;padding:1px 7px;font-weight:800">✓ واتساب '+d8(L.wa)+(L.waVariant==='reminder'?' (تذكير)':'')+'</span>':'')+(L.email?'<span onclick="tmoUnmark(\''+r.id+'\',\'email\')" title="إلغاء العلامة" style="cursor:pointer;background:#f1edff;color:#6b4fd8;border-radius:6px;padding:1px 7px;font-weight:800">✓ إيميل '+d8(L.email)+(L.emailVariant==='reminder'?' (تذكير)':'')+'</span>':'')+(o?'<span style="background:#feeaea;color:#e05050;border-radius:6px;padding:1px 7px;font-weight:800">🚫 مش عايز رسايل</span>':'')+'</div>'+
        '<div style="display:flex;gap:6px">'+
          '<button onclick="tmoWa(\''+r.id+'\')" '+(p&&!o?'':'disabled')+' style="'+btn+'flex:1;padding:7px;font-size:11px;background:'+(p&&!o?'#e7faf3':'#f4f6f9')+';color:'+(p&&!o?'#00703a':'#b0bac5')+'">💬 '+(p?'واتساب':'مفيش رقم')+'</button>'+
          '<button onclick="tmoMail(\''+r.id+'\')" '+(m&&!o?'':'disabled')+' style="'+btn+'flex:1;padding:7px;font-size:11px;background:'+(m&&!o?'#fff3cd':'#f4f6f9')+';color:'+(m&&!o?'#c06010':'#b0bac5')+'">✉️ '+(m?'إيميل':'مفيش إيميل')+'</button>'+
          '<button onclick="tmoOpt(\''+r.id+'\')" title="'+(o?'رجّعه للقايمة':'مش عايز رسايل')+'" style="'+btn+'padding:7px 10px;font-size:11px;background:'+(o?'#eaf5fc':'#feeaea')+';color:'+(o?'#1a3a6e':'#e05050')+'">'+(o?'↩️':'🚫')+'</button></div></div>'}).join('');
    if(f.length>S.shown)h+='<button onclick="tmoSet(\'shown\','+(S.shown+60)+')" style="'+btn+'width:100%;padding:10px;background:#eaf5fc;color:#1a3a6e;font-size:12px">اعرض أكتر ('+(f.length-S.shown)+' فاضلين)</button>';
    if(!f.length)h+='<div style="text-align:center;padding:20px;color:#6b7a8d">📭 مفيش حد في الفلتر ده</div>';
    box.innerHTML=h;g('tmo-list').innerHTML=''}
  function mount(){var bar=document.querySelector('.adm-tab[onclick*="\'settings\'"]');var list=g('adm-list');
    if(!bar||!list)return false;if(document.querySelector('.adm-tab[data-tmo]'))return true;
    var t=document.createElement('div');t.className='adm-tab';t.setAttribute('data-tmo','1');t.style.cssText='background:#e7faf3;color:#00703a;border-color:#25a244';t.textContent='📣 التواصل';
    t.onclick=function(){try{setAdmTab(t,'outreach')}catch(e){console.warn(e)}};bar.parentNode.insertBefore(t,bar);
    var box=document.createElement('div');box.id='adm-form-outreach';box.style.cssText='display:none;padding:0 16px 100px';
    box.innerHTML='<div style="font-size:13px;font-weight:800;color:#1a3a6e;margin:12px 0 8px">📣 التواصل والرسائل الجاهزة</div><div id="tmo-head"></div><div id="tmo-body-wrap"></div><div id="tmo-list"></div>';
    list.parentNode.insertBefore(box,list.nextSibling);
    var orig=window.setAdmTab;
    window.setAdmTab=function(el,tab){var b=g('adm-form-outreach');
      if(tab==='outreach'){try{admTab='outreach'}catch(e){}
        document.querySelectorAll('.adm-tab').forEach(function(x){x.classList.remove('on')});el.classList.add('on');
        document.querySelectorAll('[id^="adm-form-"]').forEach(function(x){if(x.id!=='adm-form-outreach')x.style.display='none'});
        ['adm-list','tm-list-export'].forEach(function(id){var x=g(id);if(x)x.style.display='none'});
        b.style.display='block';if(typeof auth==='undefined'||!auth.currentUser){g('tmo-list').innerHTML='<div style="text-align:center;padding:20px;color:#e05050">❌ يجب تسجيل دخول الأدمن أولاً</div>';return}
        tmoCampaign(S.c.id);return}
      if(b)b.style.display='none';return orig.apply(this,arguments)};
    for(var k in orig)window.setAdmTab[k]=orig[k];
    return true}
  var tries=0;var iv=setInterval(function(){if(mount()||++tries>40)clearInterval(iv)},500);
})();
