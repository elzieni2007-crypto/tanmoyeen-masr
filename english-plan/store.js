/* طبقة البيانات: Firebase الحقيقي، أو وضع تجريبي على المتصفح لو الإعدادات لسه فاضية */
(function(){
  const cfg = window.FIREBASE_CONFIG || {};
  const DEMO = !cfg.apiKey || /PASTE/.test(cfg.apiKey);
  const admins = (window.ADMIN_EMAILS || []).map(e => String(e).toLowerCase().trim());
  const toMs = v => v == null ? null : (typeof v === "number" ? v : (v.toMillis ? v.toMillis() : (v.seconds ? v.seconds * 1000 : null)));

  // جوه تطبيق الموبايل (Median) تسجيل الدخول بـGoogle مش بيشتغل، لأن Google بتمنعه جوه الـWebView
  const IN_APP = !!(window.median || window.gonative || /median|gonative/i.test(navigator.userAgent || ""));
  const inAppErr = () => Promise.reject({code:"tm/google-in-app"});

  if (!DEMO){
    // لو التطبيق عامل initializeApp قبل كده، بنستخدم نفس الـapp
    if (!firebase.apps.length) firebase.initializeApp(cfg);
    const auth = firebase.auth(), fs = firebase.firestore();
    // نخلي الدخول محفوظ على الجهاز لحد ما الشخص يدوس «خروج»
    try { auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{}); } catch(e){}
    // لينك تغيير كلمة السر يرجّع الشخص للخطة بعد ما يغيّرها
    const backUrl = () => location.href.split("#")[0].split("?")[0];
    const col = fs.collection(window.PLAN_COLLECTION || "englishPlan");
    const ts = () => firebase.firestore.FieldValue.serverTimestamp();
    const wrap = u => u ? {uid:u.uid, email:u.email || "", verified:!!u.emailVerified, displayName:u.displayName || ""} : null;
    window.Store = {
      demo:false, inApp:IN_APP, toMs,
      onAuth: cb => auth.onAuthStateChanged(u => cb(wrap(u))),
      signUp: (e,p) => auth.createUserWithEmailAndPassword(e,p),
      signIn: (e,p) => auth.signInWithEmailAndPassword(e,p),
      google: () => IN_APP ? inAppErr() : auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()),
      reset: e => auth.sendPasswordResetEmail(e, {url: backUrl()}).catch(err => (err && /continue|domain|url/i.test(err.code || "")) ? auth.sendPasswordResetEmail(e) : Promise.reject(err)),
      sendVerify: () => auth.currentUser.sendEmailVerification(),
      refresh: async () => { await auth.currentUser.reload(); await auth.currentUser.getIdToken(true); return wrap(auth.currentUser); },
      signOut: () => auth.signOut(),
      get: async uid => { const s = await col.doc(uid).get(); return s.exists ? s.data() : null; },
      create: (uid, data) => col.doc(uid).set(Object.assign({}, data, {createdAt: ts(), lastActive: ts()})),
      save: (uid, data) => col.doc(uid).set(Object.assign({}, data, {lastActive: ts()}), {merge:true}),
      watchAll: (cb, err) => col.onSnapshot(s => cb(s.docs.map(d => Object.assign({id:d.id}, d.data()))), err),
      remove: uid => col.doc(uid).delete(),
      isAdmin: u => !!u && u.verified && admins.includes((u.email || "").toLowerCase())
    };
    return;
  }

  /* ---------- وضع تجريبي ---------- */
  const K = "tm-eng-demo-v2";
  const load = () => { try { return JSON.parse(localStorage.getItem(K)) || {cur:null, docs:{}}; } catch(e){ return {cur:null, docs:{}}; } };
  let mem = load();
  const put = () => { try { localStorage.setItem(K, JSON.stringify(mem)); } catch(e){} };
  const authL = [], allL = [];
  const me = () => mem.cur ? {uid:mem.cur.uid, email:mem.cur.email, verified:true, displayName:""} : null;
  const fireAuth = () => authL.forEach(f => f(me()));
  const fireAll = () => allL.forEach(f => f(Object.entries(mem.docs).map(([id,d]) => Object.assign({id}, d))));
  const uidOf = e => "u_" + e.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 30);
  const login = e => { mem.cur = {uid: uidOf(e), email: e}; put(); setTimeout(fireAuth, 0); return Promise.resolve(); };
  const merge = (a, b) => { const o = Object.assign({}, a); for (const k in b){ o[k] = (b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a && typeof a[k] === "object") ? merge(a[k], b[k]) : b[k]; } return o; };

  function seed(){
    if (Object.values(mem.docs).some(d => d.demoSeed)) return;
    const names = [["أحمد سمير","Ahmed"],["منى عبد الله","Mona"],["كريم فؤاد","Karim"],["سارة حسن","Sara"],["محمد عادل","Mohamed"],["نورهان علي","Nourhan"],["يوسف إبراهيم","Youssef"],["دينا مصطفى","Dina"],["عمر خالد","Omar"],["هبة سعيد","Heba"],["مروان طارق","Marwan"],["آية محمود","Aya"],["إسلام جمال","Eslam"],["ريم شريف","Reem"],["خالد ناصر","Khaled"],["سلمى وليد","Salma"],["حسام رأفت","Hossam"],["ياسمين أشرف","Yasmine"],["بسمة عصام","Basma"],["مصطفى رمضان","Mostafa"],["نادين هشام","Nadine"],["طارق السيد","Tarek"]];
    const govs = ["القاهرة","الجيزة","الإسكندرية","أسيوط","سوهاج","المنيا","قنا","الأقصر","الشرقية","الدقهلية","بني سويف","أسوان"];
    const orgs = ["جمعية تنمية المجتمع","منظمة دولية","مؤسسة أهلية","جمعية رعاية الأسرة","شبكة جمعيات الصعيد","مبادرة شبابية"];
    const jobs = ["منسق مشروع","مسؤول متابعة وتقييم","محاسب منح","مدير برامج","ميسّر مجتمعي","مسؤول شراكات"];
    const lv = ["مبتدئ","متوسط","متقدم"];
    const keys = ["a","f","b","c","g","d","h","e"];
    const now = new Date(); now.setHours(0,0,0,0);
    let r = 7; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    names.forEach((n, i) => {
      const ago = i < 3 ? 52 + i : Math.floor(rnd() * 26) + 1, start = new Date(now); start.setDate(start.getDate() - ago + 1);
      const adh = [0.92,0.8,0.65,0.45,0.25,0][i % 6];
      const days = {}, act = {}; let last = start.getTime();
      const stopAfter = adh < .3 ? Math.floor(rnd() * 6) + 2 : 99;
      for (let d = 1; d <= ago && d <= 56; d++){
        if (d > stopAfter || rnd() > adh + .1) continue;
        const day = {}; keys.forEach(k => { if (rnd() < adh + .08) day[k] = true; });
        if (Object.keys(day).length){
          if (rnd() < .3) day.m = ["قلت I am agree ← الصح: I agree","قلت informations ← الصح: information","قلت discuss about ← الصح: discuss"][Math.floor(rnd()*3)];
          days[d] = day;
          const dt = new Date(start); dt.setDate(dt.getDate() + d - 1);
          act[dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0")] = true;
          last = dt.getTime() + 20 * 3600000 * rnd();
        }
      }
      const ratings = {}; for (let w = 1; w <= Math.ceil(ago/7) - 1; w++) if (rnd() < adh) ratings[w] = {f:2+Math.floor(rnd()*3), p:2+Math.floor(rnd()*3), g:2+Math.floor(rnd()*3)};
      const quiz = {}; for (let w = 1; w <= Math.floor(ago/7); w++) if (rnd() < adh + .1) quiz[w] = {s: 2 + Math.floor(rnd()*4), at: Date.now()};
      const pre = rnd() < .85 ? {s: 2 + Math.floor(rnd()*5), at: start.getTime()} : null;
      const post = ago >= 50 && pre ? {s: Math.min(10, pre.s + 1 + Math.floor(rnd()*4)), at: Date.now()} : null;
      mem.docs["demo_" + i] = {demoSeed:true, mode: i % 3 === 0 ? "1h" : "2h", quiz, pre, post, nameAr:n[0], nameEn:n[1], email:n[1].toLowerCase()+i+"@example.com", phone:"0100000"+String(1000+i), gov:govs[i % govs.length], org:orgs[i % orgs.length], job:jobs[i % jobs.length], level:lv[i % 3],
        start: start.getFullYear()+"-"+String(start.getMonth()+1).padStart(2,"0")+"-"+String(start.getDate()).padStart(2,"0"),
        createdAt: start.getTime() + 9 * 3600000, lastActive: Math.min(last, Date.now()), days, ratings, act};
    });
    put();
  }

  window.Store = {
    demo:true, inApp:IN_APP, toMs,
    onAuth: cb => { authL.push(cb); setTimeout(() => cb(me()), 0); },
    signUp: (e) => login(e), signIn: (e) => login(e), google: () => login("demo.user@gmail.com"),
    reset: () => Promise.resolve(), sendVerify: () => Promise.resolve(), refresh: () => Promise.resolve(me()),
    signOut: () => { mem.cur = null; put(); setTimeout(fireAuth, 0); return Promise.resolve(); },
    get: async uid => mem.docs[uid] ? JSON.parse(JSON.stringify(mem.docs[uid])) : null,
    create: async (uid, data) => { mem.docs[uid] = Object.assign({}, data, {createdAt: Date.now(), lastActive: Date.now()}); put(); fireAll(); },
    save: async (uid, data) => { mem.docs[uid] = merge(mem.docs[uid] || {}, Object.assign({}, data, {lastActive: Date.now()})); put(); fireAll(); },
    watchAll: (cb) => { seed(); allL.push(cb); setTimeout(fireAll, 0); return () => {}; },
    remove: async uid => { delete mem.docs[uid]; put(); fireAll(); },
    isAdmin: u => !!u
  };
})();
