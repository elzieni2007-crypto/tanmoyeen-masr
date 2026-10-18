
/* ===== mode: ساعة / ساعتين ===== */
const HOUR_KEYS = ["a","b","c","d","e"];
function taskList(){ return state.mode === "1h" ? TASKS.filter(t => HOUR_KEYS.includes(t.k)) : TASKS; }
function nT(){ return taskList().length; }
function minT(){ return taskList().reduce((a,t)=>a+t.m,0); }
function goal(){ return state.mode === "1h" ? 4 : 5; }
function totalPct(){ let d = 0; for (let i=1;i<=TOTAL;i++) d += doneCount(i); return d/(TOTAL*nT()); }

/* ===== quiz runner ===== */
function runQuiz(host, qs, onDone, intro){
  host.innerHTML = "";
  let i = 0, score = 0;
  const box = el("div","quiz");
  host.appendChild(box);
  function q(){
    box.innerHTML = "";
    if (i >= qs.length){
      const pct = Math.round(score/qs.length*100);
      box.append(el("div","qres", AR(score) + " من " + AR(qs.length)),
        el("p","qmsg", pct >= 80 ? "ممتاز! مستواك في المحطة دي قوي." : pct >= 50 ? "كويس جدًا. راجع الأسئلة اللي غلطت فيها وهتبقى أحسن." : "ولا يهمك، ده بالظبط سبب إنك بتتعلم. راجع عبارات المحطة وجرّب تاني."));
      onDone(score, qs.length);
      return;
    }
    const Q = qs[i];
    box.append(el("span","qn", "سؤال " + AR(i+1) + " من " + AR(qs.length)));
    const qt = el("p","qq en", Q.q); box.appendChild(qt);
    const opts = el("div","qopts");
    Q.o.forEach((o, oi) => {
      const b = el("button","qo", o); b.type = "button";
      if (/[a-zA-Z]/.test(o) && !/[؀-ۿ]/.test(o)) b.classList.add("en");
      b.addEventListener("click", ()=>{
        if (opts.dataset.done) return; opts.dataset.done = "1";
        const ok = oi === Q.a; if (ok) score++;
        b.classList.add(ok ? "right" : "wrong");
        if (!ok) opts.children[Q.a].classList.add("right");
        const fb = el("p","qfb " + (ok ? "ok" : "no"), (ok ? "صح! " : "مش مشكلة. ") + Q.e);
        const nx = el("button","btn", i === qs.length-1 ? "شوف النتيجة" : "السؤال اللي بعده"); nx.type = "button";
        nx.addEventListener("click", ()=>{ i++; q(); });
        box.append(fb, nx);
      });
      opts.appendChild(b);
    });
    box.appendChild(opts);
  }
  if (intro){
    box.append(el("p","qmsg", intro));
    const st = el("button","btn","ابدأ الاختبار"); st.type = "button"; st.addEventListener("click", q); box.appendChild(st);
  } else q();
}

/* ===== tests card (قبلي / بعدي) ===== */
function renderTestCard(){
  const c = $("testCard"); if (!c) return;
  const ti = todayIndex(); c.innerHTML = "";
  let kind = null;
  if (!state.pre && !state.preSkip && ti <= 7) kind = "pre";
  else if (ti >= 50 && !state.post) kind = "post";
  if (!kind){ c.hidden = true; return; }
  c.hidden = false;
  c.append(el("span","eyebrow", kind === "pre" ? "قبل ما تبدأ" : "قربت تخلص"),
    el("h3", null, kind === "pre" ? "اختبار البداية: ١٠ أسئلة في ٥ دقايق" : "الاختبار النهائي: نفس أسئلة البداية"),
    el("p","muted", kind === "pre" ? "مش امتحان، ده عشان تعرف انت فين دلوقتي، وفي آخر الرحلة تعمل نفس الأسئلة وتشوف اتحسنت قد إيه. أي نتيجة طبيعية." : "اعمله عشان تشوف الفرق من أول يوم، وعشان تستلم شهادتك."));
  const host = el("div"); c.appendChild(host);
  const row = el("div","row");
  const go = el("button","btn","ابدأ"); go.type = "button";
  go.addEventListener("click", ()=>{ row.remove(); runQuiz(host, TEST, (s)=>{ state[kind] = {s, at: Date.now()}; queueSave(); renderCert(); setTimeout(renderTestCard, 4000); }); });
  row.appendChild(go);
  if (kind === "pre"){ const sk = el("button","linkbtn2","بعدين"); sk.type = "button"; sk.addEventListener("click", ()=>{ state.preSkip = true; queueSave(); renderTestCard(); }); row.appendChild(sk); }
  c.appendChild(row);
}

/* ===== badges ===== */
function stationBadge(w){
  const q = (state.quiz||{})[w+1]; let full = 0;
  for (let k=w*7+1;k<=w*7+7;k++) if (doneCount(k) >= goal()) full++;
  return (q && q.s >= 3) || full >= 5;
}

/* ===== recorder (يشتغل لو المتصفح بيسمح بالمايك) ===== */
const REC_OK = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder && window.indexedDB);
function recDB(){ return new Promise((res,rej)=>{ try { const r = indexedDB.open("tm-rec",1); r.onupgradeneeded = ()=>r.result.createObjectStore("r"); r.onsuccess = ()=>res(r.result); r.onerror = ()=>rej(r.error); } catch(e){ rej(e); } }); }
async function recPut(k, blob){ const db = await recDB(); return new Promise((res,rej)=>{ const tx = db.transaction("r","readwrite"); tx.objectStore("r").put(blob, k); tx.oncomplete = res; tx.onerror = ()=>rej(tx.error); }); }
async function recGet(k){ try { const db = await recDB(); return await new Promise(res=>{ const q = db.transaction("r").objectStore("r").get(k); q.onsuccess = ()=>res(q.result || null); q.onerror = ()=>res(null); }); } catch(e){ return null; } }
function recorderUI(v){
  const box = el("div","rec");
  if (!REC_OK){ box.appendChild(el("p","muted","سجّل بتطبيق تسجيل الصوت في موبايلك.")); return box; }
  const btn = el("button","recbtn","● سجّل صوتك"); btn.type = "button";
  const mine = el("div","recp"), ref = el("div","recp");
  box.append(btn, mine, ref);
  const show = (host, label, blob) => { host.innerHTML = ""; if (!blob) return; host.append(el("span","lbl", label)); const a = el("audio"); a.controls = true; a.src = URL.createObjectURL(blob); host.appendChild(a); };
  recGet("d"+v).then(b => show(mine, "تسجيل النهارده", b));
  const first = v > 1 ? 1 : null;
  if (first) recGet("d1").then(b => show(ref, "تسجيل أول يوم (قارن واسمع الفرق)", b));
  let mr = null, chunks = [];
  btn.addEventListener("click", async ()=>{
    if (mr && mr.state === "recording"){ mr.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      mr = new MediaRecorder(stream); chunks = [];
      mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      mr.onstop = async ()=>{ stream.getTracks().forEach(t=>t.stop()); const blob = new Blob(chunks, {type: mr.mimeType || "audio/webm"}); btn.textContent = "● سجّل تاني"; btn.classList.remove("on"); show(mine, "تسجيل النهارده", blob); try { await recPut("d"+v, blob); } catch(e){} };
      mr.start(); btn.textContent = "■ وقّف التسجيل"; btn.classList.add("on");
    } catch(e){
      box.innerHTML = ""; box.appendChild(el("p","muted","التسجيل جوه الصفحة مش متاح على الجهاز ده. سجّل بتطبيق تسجيل الصوت في موبايلك."));
    }
  });
  return box;
}

/* ===== certificate ===== */
function certReady(){
  const pct = totalPct(), post = state.post;
  return {pct, okPct: pct >= .7, okPost: !!post && post.s >= 6, okName: !!(state.nameAr||"").trim(), post};
}
function renderCert(){
  const s = $("certBody"); if (!s) return;
  const r = certReady(); s.innerHTML = "";
  const list = el("ul","req");
  [[r.okPct, "تخلّص ٧٠٪ من مهام رحلتك (دلوقتي " + AR(Math.round(r.pct*100)) + "٪)"],
   [r.okPost, r.post ? "الاختبار النهائي: " + AR(r.post.s) + " من ١٠ (المطلوب ٦)" : "تعمل الاختبار النهائي وتجيب ٦ من ١٠ أو أكتر (بيفتح من اليوم ٥٠)"],
   [r.okName, "تكتب اسمك بالعربي فوق (هيتكتب في الشهادة)"]].forEach(([ok, t]) => { const li = el("li", ok ? "ok" : "", t); list.appendChild(li); });
  s.appendChild(list);
  if (state.pre) s.appendChild(el("p","muted","نتيجة اختبار البداية: " + AR(state.pre.s) + " من ١٠" + (state.post ? " · النهائي: " + AR(state.post.s) + " من ١٠ · " + (state.post.s - state.pre.s >= 0 ? "اتحسنت +" + AR(state.post.s - state.pre.s) : "") : "")));
  if (r.okPct && r.okPost && r.okName){
    const b = el("button","btn","اعرض شهادتي"); b.type = "button";
    b.addEventListener("click", async ()=>{ b.disabled = true; const url = await drawCert(); b.remove(); const img = el("img","certimg"); img.src = url; img.alt = "شهادة إتمام"; s.appendChild(img); s.appendChild(el("p","muted","دوس على الصورة دوسة طويلة واحفظها، أو استخدم زرار التحميل.")); const d = el("button","btn","تحميل الشهادة"); d.type = "button"; d.addEventListener("click", ()=>saveCert(url)); s.appendChild(d); });
    s.appendChild(b);
  }
}
async function drawCert(){
  try { await document.fonts.ready; } catch(e){}
  const W = 1600, H = 1130, c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#ffffff"; x.fillRect(0,0,W,H);
  x.fillStyle = "#1a3a6b"; x.fillRect(0,0,W,26); x.fillRect(0,H-26,W,26);
  x.strokeStyle = "#00aeef"; x.lineWidth = 4; x.strokeRect(50,60,W-100,H-120);
  const logo = document.querySelector(".brand .logo img");
  if (logo && logo.complete){ const lw = 300, lh = lw * logo.naturalHeight / logo.naturalWidth; x.drawImage(logo, (W-lw)/2, 95, lw, lh); }
  x.textAlign = "center"; x.direction = "rtl";
  x.fillStyle = "#1a3a6b"; x.font = "800 74px Alexandria, 'IBM Plex Sans Arabic', sans-serif"; x.fillText("شهادة إتمام", W/2, 330);
  x.fillStyle = "#55677f"; x.font = "500 32px 'IBM Plex Sans Arabic', sans-serif"; x.fillText("أكاديمية تنمويين مصر للتعلم عن بعد تشهد بأن", W/2, 405);
  x.fillStyle = "#0f2340"; x.font = "800 78px Alexandria, 'IBM Plex Sans Arabic', sans-serif"; x.fillText(state.nameAr.trim(), W/2, 515);
  if ((state.name||"").trim()){ x.fillStyle = "#007bb0"; x.font = "italic 500 40px 'Source Serif 4', Georgia, serif"; x.direction = "ltr"; x.fillText(state.name.trim(), W/2, 575); x.direction = "rtl"; }
  x.fillStyle = "#0f2340"; x.font = "500 36px 'IBM Plex Sans Arabic', sans-serif";
  x.fillText("أتم بنجاح خطة تنمويين مصر لتحسين وتطوير اللغة الإنجليزية", W/2, 665);
  x.fillStyle = "#55677f"; x.font = "500 30px 'IBM Plex Sans Arabic', sans-serif";
  const imp = state.pre ? " · التحسن من اختبار البداية: +" + AR(Math.max(0, state.post.s - state.pre.s)) : "";
  x.fillText("٥٦ يوم · ٨ محطات · نسبة الإنجاز " + AR(Math.round(totalPct()*100)) + "٪ · الاختبار النهائي " + AR(state.post.s) + " من ١٠" + imp, W/2, 725);
  x.fillText("بتاريخ " + new Date().toLocaleDateString("ar-EG",{day:"numeric",month:"long",year:"numeric"}), W/2, 780);
  x.strokeStyle = "#d6e1ee"; x.lineWidth = 2; x.beginPath(); x.moveTo(W/2-220, 905); x.lineTo(W/2+220, 905); x.stroke();
  x.fillStyle = "#1a3a6b"; x.font = "700 32px Alexandria, 'IBM Plex Sans Arabic', sans-serif"; x.fillText("مصطفى الزيني", W/2, 955);
  x.fillStyle = "#55677f"; x.font = "500 26px 'IBM Plex Sans Arabic', sans-serif"; x.fillText("مؤسس تنمويين مصر", W/2, 995);
  window._certCanvas = c;
  return c.toDataURL("image/png");
}
async function saveCert(url){
  const blob = await new Promise(r => window._certCanvas.toBlob(r, "image/png"));
  try { const dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null;
    if (dl){ await dl.save({filename:"شهادة-تنمويين-مصر-الإنجليزي.png", data: blob}); return; } } catch(e){ if (e && e.code === "declined") return; }
  const a = document.createElement("a"); a.href = url; a.download = "tanmaweyeen-english-certificate.png"; document.body.appendChild(a); a.click(); a.remove();
}

/* ===== glossary ===== */
function renderGloss(){
  const host = $("glossList"); if (!host) return;
  const q = ($("glossQ").value || "").trim().toLowerCase();
  const items = GLOSS.filter(([en, ar]) => !q || en.toLowerCase().includes(q) || ar.includes(q));
  host.innerHTML = "";
  $("glossCount").textContent = AR(items.length) + " مصطلح";
  items.forEach(([en, ar]) => { const r = el("div","gl"); r.append(el("span","en", en), el("span","ar", ar), sayBtn(en, true)); host.appendChild(r); });
}


/* ===== core: helpers, speech, rendering (shared by artifact + Firebase app) ===== */
/* شاشة الخطة: العرض والتفاعل (مفيهاش أي كود Firebase) */
const SPEAK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const CHEV = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const AR = n => Number(n).toLocaleString("ar-EG");
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2,"0");
const iso = d => d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parse = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const TR = t => "https://translate.google.com/?sl=en&tl=ar&op=translate&text=" + encodeURIComponent(t);
const YG = w => "https://youglish.com/pronounce/" + encodeURIComponent(w) + "/english";
const LEVEL_EN = {"مبتدئ":"beginner (A2)","متوسط":"intermediate (B1)","متقدم":"upper-intermediate (B2)"};
const TOPIC_EN = ["introducing myself and my organisation","explaining a development project","meetings and partner coordination","monitoring, evaluation and results","presenting at events","writing proposals and talking with donors","job interviews and leadership","development issues in Egypt"];

let state = {start:"", name:"", nameAr:"", level:"", mode:"2h", days:{}, ratings:{}, quiz:{}};
let viewDay = 1, viewWeek = 1, openKey = null;

function startDate(){ return state.start ? parse(state.start) : today0(); }
function todayIndex(){ const d = Math.round((today0() - startDate())/86400000) + 1; return Math.min(Math.max(d,1),TOTAL); }
function dateOf(i){ const d = new Date(startDate()); d.setDate(d.getDate()+i-1); return d; }
function dayData(i){ return state.days[i] || {}; }
function doneCount(i){ const x = dayData(i); return taskList().filter(t=>x[t.k]).length; }
function doneMin(i){ const x = dayData(i); return taskList().reduce((a,t)=>a+(x[t.k]?t.m:0),0); }
function nameOr(){ return (state.name||"").trim() || "[your name]"; }
function setDay(i, patch){ state.days[i] = Object.assign({}, state.days[i], patch); }

/* ---------- speech with Google Translate fallback ---------- */
let tts = ("speechSynthesis" in window && "SpeechSynthesisUtterance" in window) ? "unknown" : "broken";
let voice = null;
function pickVoice(){ try { const vs = speechSynthesis.getVoices(); voice = vs.find(v=>/en[-_]US/i.test(v.lang) && /Google|Samantha|Jenny|Aria/i.test(v.name)) || vs.find(v=>/^en[-_](US|GB)/i.test(v.lang)) || vs.find(v=>/^en/i.test(v.lang)) || null; } catch(e){} }
if (tts !== "broken"){ pickVoice(); try { speechSynthesis.onvoiceschanged = pickVoice; } catch(e){} }
let toastT;
function toast(msg){ let t = $("toast"); if (!t){ t = el("div","toast"); t.id = "toast"; t.setAttribute("role","status"); document.body.appendChild(t); } t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(()=>t.classList.remove("on"), 5200); }
let speakingBtn = null;
function speak(text, btn){
  try {
    speechSynthesis.cancel();
    if (speakingBtn){ speakingBtn.classList.remove("on"); if (speakingBtn === btn){ speakingBtn = null; return; } }
    const u = new SpeechSynthesisUtterance(text.replace(/…/g,"..."));
    u.lang = "en-US"; u.rate = .85; if (voice) u.voice = voice;
    let started = false;
    u.onstart = ()=>{ started = true; tts = "ok"; };
    u.onend = u.onerror = ()=>{ btn.classList.remove("on"); if (speakingBtn === btn) speakingBtn = null; };
    btn.classList.add("on"); speakingBtn = btn;
    speechSynthesis.speak(u);
    setTimeout(()=>{ if (!started && tts !== "ok"){ tts = "broken"; btn.classList.remove("on"); speakingBtn = null; try{ speechSynthesis.cancel(); }catch(e){} toast("الصوت مش شغال على الجهاز ده. دوس على زرار «اسمع» تاني وهيفتحلك النطق في Google Translate."); } }, 1800);
  } catch(e){ tts = "broken"; btn.classList.remove("on"); toast("دوس على زرار «اسمع» تاني وهيفتحلك النطق في Google Translate."); }
}
function sayBtn(text, small){
  const a = el("a", "say" + (small ? " sm" : ""));
  a.href = TR(text); a.target = "_blank"; a.rel = "noopener";
  a.innerHTML = SPEAK + (small ? "" : "<span>اسمع</span>");
  a.setAttribute("aria-label", "اسمع النطق: " + text);
  a.addEventListener("click", e => { if (tts === "broken") return; e.preventDefault(); speak(text, a); });
  return a;
}
function enLine(text, cls){
  const box = el("div", "enl " + (cls||""));
  const p = el("p", "en", text);
  box.append(p, sayBtn(text));
  return box;
}
function linkBtn(href, label, sub){
  const a = el("a", "lk"); a.href = href; a.target = "_blank"; a.rel = "noopener";
  a.innerHTML = '<i class="pl"></i><span><b></b><small></small></span>';
  a.querySelector("b").textContent = label; a.querySelector("small").textContent = sub || "";
  return a;
}
function copyBox(text, label, noGo){
  const box = el("div","copyb");
  const pre = el("pre", null, text);
  const row = el("div","row");
  const b = el("button","btn", label || "نسخ الطلب"); b.type = "button";
  b.addEventListener("click", ()=>{
    const fb = ()=>{ try{ const s = getSelection(), rg = document.createRange(); rg.selectNodeContents(pre); s.removeAllRanges(); s.addRange(rg); }catch(e){} b.textContent = "النص متحدد، انسخه"; };
    try { navigator.clipboard.writeText(text).then(()=>{ b.textContent = "اتنسخ ✓"; setTimeout(()=>b.textContent = label || "نسخ الطلب", 2000); }, fb); } catch(e){ fb(); }
  });
  const go = el("a","golink","افتح Claude ←"); go.href = "https://claude.ai/new"; go.target = "_blank"; go.rel = "noopener";
  row.append(b); if (!noGo) row.append(go); box.append(pre, row); return box;
}
function steps(list){ const ol = el("ol","steps"); list.forEach(s => ol.appendChild(el("li", null, s))); return ol; }
function tip(t){ return el("p","tip", t); }
function note(day, field, label, ph){
  const id = "n-" + field;
  const w = el("label","field2"); w.htmlFor = id;
  w.append(el("span", null, label));
  const ta = el("textarea"); ta.id = id; ta.rows = 2; ta.placeholder = ph || ""; ta.value = dayData(day)[field] || "";
  let t; ta.addEventListener("input", ()=>{ clearTimeout(t); t = setTimeout(()=>{ setDay(day, {[field]: ta.value.slice(0,500)}); queueSave(); }, 600); });
  w.appendChild(ta); return w;
}

/* ---------- day content ---------- */
function ctx(v){
  const w = Math.ceil(v/7)-1, d = ((v-1)%7)+1;
  const W = WEEKS[w], X = EXTRA[w], D = DAILY[w];
  const ex = X.ex.replace(/\{name\}/g, nameOr());
  const S = ex.split(/(?<=[.!?])\s+/).filter(s => s.length > 3);
  return {w, d, W, X, D, ex, S};
}
function dayPhrases(c){ const all = c.W.ph.concat(c.D.ph2); return c.d === 7 ? all : all.slice((c.d-1)*2, (c.d-1)*2+2); }
function reviewPhrases(v){
  const out = [], seen = new Set();
  [[1,"من امبارح"],[3,"من ٣ أيام"],[7,"من أسبوع"],[14,"من أسبوعين"]].forEach(([back, lab]) => {
    const dv = v - back; if (dv < 1 || out.length >= 3) return;
    const p = dayPhrases(ctx(dv))[0]; if (p && !seen.has(p[0])){ seen.add(p[0]); out.push([p[0], p[1], lab]); }
  });
  return out;
}
function chatPrompt(c){
  const lv = LEVEL_EN[state.level] || "intermediate (B1)";
  if (c.d === 7) return c.W.ses + (state.level ? " My level is " + lv + ", so keep your English simple." : "");
  const topic = c.d === 1 ? TOPIC_EN[c.w] : c.D.sq[c.d-2];
  return "Let's have a 15-minute English conversation. Topic: \"" + topic + "\". My level is " + lv + ", so please use simple English. Ask me one question at a time. At the end, correct my mistakes and give me 3 useful phrases.";
}

function taskBody(k, v){
  const c = ctx(v), b = el("div","tb");
  if (k === "a"){
    const s = c.d === 7 ? c.ex : c.S[(c.d-1) % c.S.length];
    b.append(steps(["اسمع الجملة بزرار «اسمع».","كررها وراه بنفس السرعة والنغمة ٥ مرات.","قولها من غير ما تبص على الشاشة."]),
      el("span","lbl", c.d === 7 ? "يوم المراجعة: الفقرة كاملة" : "جملة النهارده"), enLine(s, "big"));
    const lw = el("div","lks");
    lw.append(linkBtn(c.X.v[0] ? YT(c.X.v[0][1]) : YT("pronunciation"), "فيديو صوت الأسبوع", c.W.snd), linkBtn(YG(c.D.kw), "اسمع كلمة «" + c.D.kw + "» من ناس حقيقيين", "YouGlish · مقاطع حقيقية من يوتيوب"));
    b.append(lw, tip("أول مرة هتحس إن الجملة سريعة، وده طبيعي جدًا. عيدها مرة واتنين وتلاتة، ولو طويلة قسّمها لجزئين."));
  }
  if (k === "f"){
    const L = LISTEN[c.d-1];
    b.append(steps(["اسمع مرة من غير ترجمة، حتى لو فهمت نص الكلام بس.","اسمع تاني بالترجمة الإنجليزية (CC).","اكتب ٣ كلمات أو عبارات جديدة تحت."]),
      linkBtn(L.u(c.w), L.t, L.lv), tip(L.tip + " ولو مش فاهم كتير، ده طبيعي في الأول. اسمع تاني وتالت، وكل مرة هتمسك كلمات أكتر."), note(v, "ln", "العبارات الجديدة اللي سمعتها", "مثال: track record = سجل نجاح"));
  }
  if (k === "b"){
    const ps = dayPhrases(c), box = el("div","phr");
    ps.forEach(([en, ar]) => { const cd = el("div","pc"); cd.append(el("span","en", en), sayBtn(en, true), el("span","ar", ar)); box.appendChild(cd); });
    b.append(steps(c.d === 7 ? ["يوم مراجعة: اسمع كل عبارات الأسبوع.","كرر كل عبارة مرتين.","اختار ٣ عبارات واكتب بيهم جمل عن شغلك."] : ["اسمع كل عبارة وكررها ٣ مرات.","اقرا معناها بالعربي.","اكتب جملة عن شغلك بكل عبارة."]),
      el("span","lbl", c.d === 7 ? "كل عبارات المحطة" : "عبارات النهارده"), box);
    const rv = reviewPhrases(v);
    if (rv.length){ const rb = el("div","phr"); rv.forEach(([en, ar, lab]) => { const cd = el("div","pc rv"); cd.append(el("span","en", en), sayBtn(en, true), el("span","ar", ar + " · " + lab)); rb.appendChild(cd); }); b.append(el("span","lbl","مراجعة سريعة: عبارات من أيام فاتت"), rb); }
    b.appendChild(note(v, "pw", "جملك", "I'm in charge of the training programme."));
  }
  if (k === "c"){
    b.append(el("span","lbl", "قاعدة المحطة: " + c.W.gr));
    const ar = el("details","arx"); if (c.d <= 2 || state.level === "مبتدئ") ar.open = true;
    ar.append(el("summary", null, "الشرح بالعربي"), el("p", null, GRAM_AR[c.w])); b.append(ar, el("p","task-do", "تمرين النهارده: " + GRAM[c.d-1]));
    c.D.gx.forEach(g => b.appendChild(enLine(g)));
    if (c.d === 1) b.appendChild(linkBtn(YT(c.X.v[2] ? c.X.v[2][1] : c.W.gr), "فيديو شرح القاعدة", c.W.gr));
    if (c.d === 5) b.appendChild(copyBox("Please correct my sentences. Explain each mistake simply in English and Arabic:\n1. \n2. \n3. \n4. "));
    if (c.d === 7) b.appendChild(copyBox("Give me an easy 5-question quiz on \"" + c.W.gr + "\". Ask one question at a time, wait for my answer, and explain my mistakes simply."));
    if (c.d === 2 || c.d === 4 || c.d === 5) b.appendChild(note(v, "gw", "اكتب جملك هنا"));
  }
  if (k === "g"){
    const t = c.D.rd[c.d-1];
    b.append(steps(["اسمع النص بزرار «اسمع».","اقراه بصوت عالي مرتين.","قفّل الشاشة ولخّصه بصوتك في جملتين."]), enLine(t, "read"));
    const tr = el("a","golink","مش فاهم كلمة؟ افتح الترجمة ←"); tr.href = TR(t); tr.target = "_blank"; tr.rel = "noopener";
    b.append(tr, tip("مش فاهم كل الكلمات؟ مش مشكلة. افهم الفكرة العامة الأول، واقرا تاني، وبعدين شوف الكلمات الصعبة."));
  }
  if (k === "d"){
    b.append(steps(["فكّر ٣٠ ثانية في اللي هتقوله.","سجّل صوتك دقيقة أو اتنين بالزرار تحت، أو بتطبيق التسجيل في موبايلك.","اسمع تسجيلك في المراجعة."]), recorderUI(v));
    if (c.d === 1){ b.append(el("span","lbl","اقرا المثال ده، وبعدين قوله بكلامك عن شغلك انت"), enLine(c.ex, "read")); }
    else if (c.d === 7){ b.append(el("span","lbl","يوم المراجعة: قول المثال الجاهز بكلامك، وقارنه بتسجيل أول يوم في المحطة"), enLine(c.ex, "read")); }
    else { b.append(el("span","lbl","سؤال النهارده"), enLine(c.D.sq[c.d-2], "big")); }
    b.appendChild(tip("هتقف وتدوّر على كلمات، وده طبيعي. مش لازم جملك تبقى كاملة، المهم تكمّل كلام. استعين بعبارات النهارده."));
  }
  if (k === "h"){
    b.append(steps(c.d === 7 ? ["النهارده جلسة المحطة: محادثة أطول على موضوع الأسبوع.","انسخ الطلب وافتح Claude والصقه.","يفضّل تستخدم الكلام بالصوت (voice mode)."] : ["انسخ الطلب ده.","افتح Claude والصقه في شات جديد.","جاوب على الأسئلة، ويفضّل بالصوت (voice mode)."]),
      copyBox(chatPrompt(c)));
  }
  if (k === "e"){
    b.append(steps(["اسمع تسجيل النهارده.","اكتب غلطة واحدة وتصحيحها.","اقرا غلطات الأيام اللي فاتت بصوت عالي بالشكل الصح."]),
      note(v, "m", "غلطة النهارده وتصحيحها", "مثال: قلت I am agree ← الصح: I agree"));
    const prev = []; for (let i = v-1; i >= 1 && prev.length < 4; i--) if (dayData(i).m) prev.push([i, dayData(i).m]);
    if (c.d === 7){
      const qh = el("div","qwrap"); const prevQ = (state.quiz||{})[c.w+1];
      b.append(el("span","lbl","اختبار المحطة: ٥ أسئلة"), qh);
      runQuiz(qh, QUIZ[c.w], (s)=>{ state.quiz = Object.assign({}, state.quiz, {[c.w+1]: {s, at: Date.now()}}); queueSave(); renderJourney(); renderWeek(); }, prevQ ? "نتيجتك قبل كده: " + AR(prevQ.s) + " من ٥. تقدر تعيده." : "اختبار قصير على عبارات وقاعدة المحطة. لو جبت ٣ أو أكتر بتاخد شارة المحطة.");
    }
    if (prev.length){ const ul = el("ul","mist"); prev.forEach(([i,m]) => { const li = el("li"); li.append(el("small", null, "اليوم " + AR(i)), document.createTextNode(m)); ul.appendChild(li); }); b.append(el("span","lbl","غلطات الأيام اللي فاتت"), ul); }
  }
  return b;
}

/* ---------- ticker ---------- */
(function(){ const t = $("ticker"); if (!t) return; WEEKS.forEach(w=>w.ph.slice(0,3).forEach(p=>t.appendChild(el("span", null, p[0])))); })();

function renderHero(){
  const ti = todayIndex();
  const pct = Math.round(totalPct()*100);
  $("sPct").textContent = AR(pct) + "٪";
  $("ringBar").style.strokeDashoffset = String(326.7 * (1 - pct/100));
  $("sDay").textContent = AR(ti) + " / " + AR(TOTAL);
  let streak = 0, i = ti; if (doneCount(i) < goal()) i--;
  while (i>=1 && doneCount(i) >= goal()){ streak++; i--; }
  $("sStreak").textContent = AR(streak);
  $("sMin").textContent = AR(doneMin(ti)) + " / " + AR(minT());
  const h = $("heroTitle"), nm = (state.name||"").trim();
  h.textContent = (nm ? "يلا يا " + nm + "، " : "") + "اتكلم إنجليزي في شغل التنمية ";
  h.append(el("em", null, "بثقة"), "، في ٥٦ يوم");
}

function renderToday(){
  const ti = todayIndex(), d = dateOf(viewDay), x = dayData(viewDay), c = ctx(viewDay);
  $("todayDate").textContent = "اليوم " + AR(viewDay) + " · " + d.toLocaleDateString("ar-EG",{weekday:"long",day:"numeric",month:"long"}) + " · المحطة " + AR(c.w+1) + ": " + c.W.t;
  $("todayTitle").textContent = viewDay===ti ? "مهام النهارده" : (viewDay<ti ? "مهام يوم فات" : "مهام يوم جاي");
  $("prevDay").disabled = viewDay<=1; $("nextDay").disabled = viewDay>=TOTAL;
  $("timeFill").style.width = (doneMin(viewDay)/minT()*100) + "%";
  $("motive").textContent = motiveFor(viewDay);
  renderTestCard();
  $("dayHint").textContent = (state.mode === "1h" ? "وضع الساعة: ٥ مهام أساسية. " : "") + (c.d === 7 ? "النهارده يوم مراجعة المحطة، وفيه اختبار المحطة وجلسة المحادثة الأسبوعية." : "دوس على أي مهمة تفتحلك خطواتها والمحتوى بتاعها. لما تخلّصها علّم على الدايرة.");
  if (openKey === null || (openKey && !taskList().some(t => t.k === openKey))){ const nx = taskList().find(t => !x[t.k]); openKey = nx ? nx.k : ""; }
  const box = $("tasks"); box.innerHTML = "";
  taskList().forEach((t, idx) => {
    const row = el("div", "task" + (x[t.k] ? " done" : "") + (openKey === t.k ? " open" : ""));
    const head = el("div","th");
    const cb = el("input"); cb.type = "checkbox"; cb.id = "t-" + t.k; cb.checked = !!x[t.k]; cb.setAttribute("aria-label", "خلصت: " + t.t);
    const tg = el("button","tg"); tg.type = "button"; tg.setAttribute("aria-expanded", String(openKey === t.k));
    tg.innerHTML = '<span class="tn"></span><span class="tt"><b></b><small></small></span><span class="chip"></span><span class="cv"></span>';
    tg.querySelector(".tn").textContent = AR(idx+1);
    tg.querySelector("b").textContent = t.t;
    tg.querySelector("small").textContent = t.d;
    tg.querySelector(".chip").textContent = AR(t.m) + " د";
    tg.querySelector(".cv").innerHTML = CHEV;
    tg.addEventListener("click", ()=>{ openKey = openKey === t.k ? "" : t.k; renderToday(); const r = $("tasks").querySelector(".task.open"); if (r) r.scrollIntoView({behavior:"smooth", block:"nearest"}); });
    cb.addEventListener("change", e=>{
      setDay(viewDay, {[t.k]: e.target.checked}); queueSave();
      if (e.target.checked){ const nx = taskList().find(z => !dayData(viewDay)[z.k]); openKey = nx ? nx.k : ""; if (!nx) toast("برافو! خلّصت كل مهام النهارده 👏"); }
      renderHero(); renderToday(); renderJourney(); renderCert();
      const r = $("tasks").querySelector(".task.open"); if (r && e.target.checked) r.scrollIntoView({behavior:"smooth", block:"start"});
    });
    head.append(cb, tg); row.appendChild(head);
    if (openKey === t.k){
      const body = taskBody(t.k, viewDay);
      const done = el("button","donebtn", x[t.k] ? "✓ خلصت المهمة دي" : "خلصت المهمة دي ←"); done.type = "button";
      done.addEventListener("click", ()=>{ cb.checked = !x[t.k]; cb.dispatchEvent(new Event("change")); });
      body.appendChild(done); row.appendChild(body);
    }
    box.appendChild(row);
  });
}

function renderJourney(){
  const ti = todayIndex(), j = $("journey"); j.innerHTML = "";
  WEEKS.forEach((w, wi)=>{
    const card = el("div", "stn" + (viewWeek===wi+1 ? " sel" : ""));
    const first = wi*7+1, last = wi*7+7;
    const badge = stationBadge(wi);
    const b = el("button","stn-btn"); b.type = "button";
    b.innerHTML = `<span class="stn-n"><span></span></span><span class="stn-t"></span>`;
    b.querySelector(".stn-n span").textContent = "المحطة " + AR(wi+1);
    if (ti>=first && ti<=last) b.querySelector(".stn-n").appendChild(el("span","tag now","انت هنا"));
    if (badge) b.querySelector(".stn-n").appendChild(el("span","tag ok","★ الشارة"));
    b.querySelector(".stn-t").textContent = w.t;
    b.setAttribute("aria-pressed", String(viewWeek===wi+1));
    b.addEventListener("click", ()=>{ viewWeek = wi+1; renderJourney(); renderWeek(); });
    const dots = el("div","dots");
    for (let k=first;k<=last;k++){
      const n = doneCount(k), dt = el("button");
      dt.type = "button";
      dt.className = "dot" + (n===nT()?" full":"") + (k===ti?" cur":"") + (k===viewDay?" sel":"") + (k>ti?" future":"");
      dt.setAttribute("aria-label", "اليوم " + k + ": " + n + " من " + nT() + " مهام");
      dt.innerHTML = `<i style="height:${n/nT()*100}%"></i>`;
      dt.addEventListener("click", ()=>{ viewDay = k; viewWeek = wi+1; openKey = null; renderToday(); renderJourney(); renderWeek(); $("today").scrollIntoView({behavior:"smooth", block:"start"}); });
      dots.appendChild(dt);
    }
    card.append(b, dots); j.appendChild(card);
  });
}

function renderWeek(){
  const w = WEEKS[viewWeek-1], X = EXTRA[viewWeek-1], D = DAILY[viewWeek-1], r = state.ratings[viewWeek] || {};
  const box = $("week"); box.innerHTML = "";
  const h = el("div","week-h"); h.append(el("span","eyebrow","ملخص المحطة " + AR(viewWeek) + " · الأيام " + AR((viewWeek-1)*7+1) + "–" + AR(viewWeek*7)), el("h2", null, w.t)); h.querySelector("h2").id = "weekTitle";
  const f = el("div","focus");
  [["صوت المحطة", w.snd], ["قاعدة المحطة", w.gr], ["الموضوع", w.sp]].forEach(([a,b2]) => { const dv = el("div"); dv.append(el("small", null, a), el("span", null, b2)); f.appendChild(dv); });
  const pb = el("div","blk"); pb.appendChild(el("h3", null, "كل عبارات المحطة (" + AR(12) + ")"));
  const ph = el("div","phr"); w.ph.concat(D.ph2).forEach(([en, ar]) => { const cd = el("div","pc"); cd.append(el("span","en", en), sayBtn(en, true), el("span","ar", ar)); ph.appendChild(cd); }); pb.appendChild(ph);
  const vb = el("div","blk"); vb.appendChild(el("h3", null, "فيديوهات المحطة")); const vl = el("div","lks");
  X.v.forEach(([lab, q]) => vl.appendChild(linkBtn(YT(q), lab, q))); vb.appendChild(vl);
  const rb = el("div","blk rates"); rb.appendChild(el("h3", null, "قيّم نفسك آخر المحطة"));
  [["f","الطلاقة"],["p","النطق"],["g","القواعد والمفردات"]].forEach(([k, lab])=>{
    const row = el("div","rate"); const st = el("div","stars");
    for (let v=1; v<=5; v++){
      const b = el("button", null, AR(v)); b.type = "button";
      b.setAttribute("aria-pressed", String(r[k]===v)); b.setAttribute("aria-label", lab + ": " + v + " من 5");
      b.addEventListener("click", ()=>{ state.ratings[viewWeek] = Object.assign({}, state.ratings[viewWeek], {[k]: v}); queueSave(); renderWeek(); });
      st.appendChild(b);
    }
    row.append(el("span", null, lab), st); rb.appendChild(row);
  });
  const qz = (state.quiz||{})[viewWeek];
  if (stationBadge(viewWeek-1)){
    const bd = el("div","badge"); bd.append(el("span","bdg","★"), el("div", null));
    bd.lastChild.append(el("b", null, "حصلت على شارة المحطة " + AR(viewWeek)), el("span","muted", qz ? "نتيجة اختبار المحطة: " + AR(qz.s) + " من ٥" : "خلصت أيام المحطة"));
    box.append(h, bd);
    bd.appendChild(copyBox("خلصت المحطة " + AR(viewWeek) + " «" + w.t + "» في خطة تنمويين مصر لتحسين وتطوير اللغة الإنجليزية 💪\nلو عايز تحسّن إنجليزي شغلك في التنمية، انضم لينا في تنمويين مصر.\n#تنمويين_مصر", "انسخ بوست الإنجاز", true));
    box.append(f, pb, vb, rb);
  } else box.append(h, f, pb, vb, rb);
}

function renderAll(){
  const nm = $("nm"), sd = $("sd"), lv = $("lv");
  if (document.activeElement !== nm) nm.value = state.name || "";
  if (document.activeElement !== sd) sd.value = state.start || iso(today0());
  if (lv && document.activeElement !== lv) lv.value = state.level || "";
  const md = $("md"), na = $("nmAr");
  if (md) md.value = state.mode || "2h";
  if (na && document.activeElement !== na) na.value = state.nameAr || "";
  renderHero(); renderToday(); renderJourney(); renderWeek(); renderCert(); renderGloss();
}

function bindControls(){
  $("prevDay").addEventListener("click", ()=>{ viewDay--; viewWeek = Math.ceil(viewDay/7); openKey = null; renderToday(); renderJourney(); renderWeek(); });
  $("nextDay").addEventListener("click", ()=>{ viewDay++; viewWeek = Math.ceil(viewDay/7); openKey = null; renderToday(); renderJourney(); renderWeek(); });
  let naming;
  $("nm").addEventListener("input", e=>{ clearTimeout(naming); naming = setTimeout(()=>{ state.name = e.target.value.trim().slice(0,40); queueSave(); renderHero(); renderToday(); }, 500); });
  $("sd").addEventListener("change", e=>{ if (!/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) return; state.start = e.target.value; queueSave(); viewDay = todayIndex(); viewWeek = Math.ceil(viewDay/7); openKey = null; renderAll(); });
  if ($("lv")) $("lv").addEventListener("change", e=>{ state.level = e.target.value; queueSave(); renderToday(); });
  if ($("md")) $("md").addEventListener("change", e=>{ state.mode = e.target.value; queueSave(); openKey = null; renderAll(); });
  let naAr; if ($("nmAr")) $("nmAr").addEventListener("input", e=>{ clearTimeout(naAr); naAr = setTimeout(()=>{ state.nameAr = e.target.value.trim().slice(0,60); queueSave(); renderCert(); }, 500); });
  if ($("glossQ")) $("glossQ").addEventListener("input", renderGloss);
  setTimeout(()=>{ try { if (tts === "unknown" && speechSynthesis.getVoices().length === 0 && /Android/i.test(navigator.userAgent)) tts = "broken"; } catch(e){} }, 2000);
}
