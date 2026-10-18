/* لوحة متابعة الأدمن */
const $ = id => document.getElementById(id);
const AR = n => Number(n).toLocaleString("ar-EG");
const pad = n => String(n).padStart(2,"0");
const iso = d => d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const parse = s => { const [y,m,d] = String(s||"").split("-").map(Number); return y ? new Date(y, m-1, d) : null; };
const today0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const DAY = 86400000;
const HOUR_KEYS = ["a","b","c","d","e"];
const tasksOf = p => p.mode === "1h" ? TASKS.filter(t => HOUR_KEYS.includes(t.k)) : TASKS;
const STATUS = {"نشط":"s-ok","متأخر":"s-warn","متوقف":"s-bad","ما بدأش":"s-idle"};
const STATUS_C = {"نشط":"var(--ok)","متأخر":"var(--warn)","متوقف":"var(--bad)","ما بدأش":"var(--idle)"};
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtDate = ms => ms ? new Date(ms).toLocaleDateString("ar-EG",{day:"numeric",month:"short"}) : "—";
function ago(ms){
  if (!ms) return "—";
  const d = Math.floor((today0() - new Date(new Date(ms).setHours(0,0,0,0))) / DAY);
  return d <= 0 ? "النهارده" : d === 1 ? "امبارح" : "من " + AR(d) + " يوم";
}
function waLink(phone){
  let p = String(phone||"").replace(/[^\d+]/g,"");
  if (!p) return "";
  if (p.startsWith("+")) p = p.slice(1); else if (p.startsWith("00")) p = p.slice(2); else if (p.startsWith("0")) p = "2" + p;
  return "https://wa.me/" + p;
}

/* ---------- metrics ---------- */
function metrics(p){
  const start = parse(p.start);
  const raw = start ? Math.round((today0() - start)/DAY) + 1 : 1;
  const cur = Math.min(Math.max(raw, 0), TOTAL);
  const days = p.days || {}, TK = tasksOf(p), G = p.mode === "1h" ? 4 : 5;
  let done = 0, full = 0, doneElapsed = 0;
  const perTask = {}; TASKS.forEach(t => perTask[t.k] = 0);
  for (let i = 1; i <= TOTAL; i++){
    const x = days[i] || {}; const n = TK.filter(t => x[t.k]).length;
    done += n; if (n >= G) full++;
    if (i <= cur){ doneElapsed += n; TASKS.forEach(t => { if (x[t.k]) perTask[t.k]++; }); }
  }
  let streak = 0, i = cur; const cnt = k => TK.filter(t => (days[k]||{})[t.k]).length;
  if (i >= 1 && cnt(i) < G) i--;
  while (i >= 1 && cnt(i) >= G){ streak++; i--; }
  const last = Store.toMs(p.lastActive), reg = Store.toMs(p.createdAt);
  const since = last ? Math.floor((today0() - new Date(new Date(last).setHours(0,0,0,0))) / DAY) : 999;
  const status = done === 0 ? "ما بدأش" : since <= 1 ? "نشط" : since <= 6 ? "متأخر" : "متوقف";
  const pre = p.pre && p.pre.s != null ? p.pre.s : null, post = p.post && p.post.s != null ? p.post.s : null;
  const pctAll = done/(TOTAL*TK.length);
  const certOk = pctAll >= .7 && post != null && post >= 6;
  return {cur, done, pre, post, certOk, nTasks: TK.length, pct: pctAll, pace: cur ? doneElapsed/(cur*TK.length) : 0, full, streak, last, reg, status, perTask, station: Math.max(1, Math.ceil(cur/7))};
}

/* ---------- charts ---------- */
function cols(el, map, n){
  const t = today0(), keys = [];
  for (let k = n-1; k >= 0; k--){ const d = new Date(t); d.setDate(d.getDate()-k); keys.push(iso(d)); }
  const vals = keys.map(k => map[k] || 0), max = Math.max(1, ...vals);
  el.innerHTML = `<div class="cols">${keys.map((k,i)=>`<div class="c${i===n-1?" today":""}" title="${k}: ${vals[i]}">${vals[i]?`<em style="bottom:${vals[i]/max*100}%">${AR(vals[i])}</em>`:""}<i style="height:${vals[i]/max*100}%"></i></div>`).join("")}</div>
  <div class="xl">${keys.map((k,i)=>`<span>${(i%3===0||i===n-1)?AR(+k.slice(8))+"/"+AR(+k.slice(5,7)):""}</span>`).join("")}</div>`;
}
function hbars(el, rows, opt){
  opt = opt || {};
  const max = opt.max || Math.max(1, ...rows.map(r => r[1]));
  el.innerHTML = `<div class="hb">${rows.map(([l,v,c,lab]) => `<div class="r"><span title="${esc(l)}">${esc(l)}</span><span class="t"><i style="width:${v/max*100}%;${c?"background:"+c:""}"></i></span><span class="v">${lab || AR(v)}</span></div>`).join("") || '<span class="muted">لسه مفيش بيانات</span>'}</div>`;
}

/* ---------- render ---------- */
let all = [], view = [];
function render(){
  const list = all.map(p => Object.assign({p}, metrics(p)));
  const n = list.length, t = iso(today0());
  const activeToday = all.filter(p => (p.act||{})[t]).length;
  const wk = new Set(); for (let k = 0; k < 7; k++){ const d = today0(); d.setDate(d.getDate()-k); const s = iso(d); all.forEach(p => { if ((p.act||{})[s]) wk.add(p.id); }); }
  const avgPace = n ? list.reduce((a,x)=>a+x.pace,0)/n : 0;
  const committed = list.filter(x => x.cur >= 3 && x.pace >= .6).length;
  const regToday = list.filter(x => x.reg && iso(new Date(x.reg)) === t).length;
  $("kpis").innerHTML = [
    ["main","المسجلين", AR(n), "+" + AR(regToday) + " النهارده"],
    ["","نشطين النهارده", AR(activeToday), n ? AR(Math.round(activeToday/n*100)) + "٪ من المسجلين" : ""],
    ["","نشطين آخر ٧ أيام", AR(wk.size), n ? AR(Math.round(wk.size/n*100)) + "٪ من المسجلين" : ""],
    ["","متوسط الالتزام", AR(Math.round(avgPace*100)) + "٪", "مهام اتعملت ÷ مهام المفروض تتعمل"],
    ["","ملتزمين", AR(committed), "التزام ٦٠٪ أو أكتر"],
    ["","متوسط التحسن", (()=>{ const both = list.filter(x => x.pre != null && x.post != null); if (!both.length) return "—"; const d = both.reduce((a,x)=>a+(x.post-x.pre),0)/both.length; return (d>=0?"+":"") + AR(d.toFixed(1)); })(), "من ١٠ · " + AR(list.filter(x=>x.certOk).length) + " يستحقوا شهادة"]
  ].map(([c,l,v,s]) => `<div class="kpi ${c}"><span>${l}</span><b>${v}</b><small>${s}</small></div>`).join("");

  const reg = {}, act = {};
  list.forEach(x => { if (x.reg){ const k = iso(new Date(x.reg)); reg[k] = (reg[k]||0)+1; } Object.keys(x.p.act||{}).forEach(k => act[k] = (act[k]||0)+1); });
  cols($("chReg"), reg, 21); cols($("chAct"), act, 21);

  const st = {"نشط":0,"متأخر":0,"متوقف":0,"ما بدأش":0}; list.forEach(x => st[x.status]++);
  $("bStatus").innerHTML = `<div class="stack">${Object.entries(st).map(([k,v]) => v ? `<i style="width:${v/Math.max(n,1)*100}%;background:${STATUS_C[k]}" title="${k}: ${v}"></i>` : "").join("")}</div>
    <div class="legend" style="margin-top:10px">${Object.entries(st).map(([k,v]) => `<span style="--c:${STATUS_C[k]}">${k} ${AR(v)}</span>`).join("")}</div>
    <p class="sub" style="margin:10px 0 0">نشط: آخر نشاط النهارده أو امبارح · متأخر: من ٢ لـ٦ أيام · متوقف: أسبوع أو أكتر</p>`;
  const stn = Array(8).fill(0); list.forEach(x => { if (x.cur >= 1) stn[x.station-1]++; });
  hbars($("bStation"), WEEKS.map((w,i) => ["المحطة " + AR(i+1) + " · " + w.t, stn[i]]));
  const totEl = list.reduce((a,x)=>a+x.cur,0);
  hbars($("bTasks"), TASKS.map(tk => { const v = list.reduce((a,x)=>a+x.perTask[tk.k],0); const r = totEl ? v/totEl : 0; return [tk.t, r*100, null, AR(Math.round(r*100)) + "٪"]; }), {max:100});
  const gov = {}; all.forEach(p => { const g = p.gov || "غير محدد"; gov[g] = (gov[g]||0)+1; });
  hbars($("bGov"), Object.entries(gov).sort((a,b)=>b[1]-a[1]).slice(0,10));
  const lv = {"مبتدئ":0,"متوسط":0,"متقدم":0}; all.forEach(p => { if (p.level in lv) lv[p.level]++; });
  hbars($("bLevel"), Object.entries(lv));
  const rate = []; for (let w = 1; w <= 8; w++){ const rs = all.map(p => (p.ratings||{})[w]).filter(Boolean); if (!rs.length) continue; const avg = rs.reduce((a,r)=>a+((r.f||0)+(r.p||0)+(r.g||0))/3,0)/rs.length; rate.push(["الأسبوع " + AR(w) + " (" + AR(rs.length) + ")", avg, null, AR(avg.toFixed(1))]); }
  hbars($("bRate"), rate, {max:5});
  const qz = []; for (let w = 1; w <= 8; w++){ const rs = all.map(p => (p.quiz||{})[w]).filter(Boolean); if (!rs.length) continue; const avg = rs.reduce((a,r)=>a+(r.s||0),0)/rs.length; qz.push(["المحطة " + AR(w) + " (" + AR(rs.length) + ")", avg, null, AR(avg.toFixed(1))]); }
  hbars($("bQuiz"), qz, {max:5});
  const preL = list.filter(x => x.pre != null), postL = list.filter(x => x.post != null);
  const avgOf = (L, k) => L.length ? L.reduce((a,x)=>a+x[k],0)/L.length : 0;
  hbars($("bTest"), [["اختبار البداية (" + AR(preL.length) + ")", avgOf(preL,"pre"), null, AR(avgOf(preL,"pre").toFixed(1))], ["الاختبار النهائي (" + AR(postL.length) + ")", avgOf(postL,"post"), "var(--done)", AR(avgOf(postL,"post").toFixed(1))]], {max:10});
  hbars($("bMode"), [["ساعتين", all.filter(p => p.mode !== "1h").length], ["ساعة", all.filter(p => p.mode === "1h").length]]);

  renderTable(list);
}

function renderTable(list){
  list = list || all.map(p => Object.assign({p}, metrics(p)));
  const q = $("q").value.trim().toLowerCase(), fs = $("fStatus").value, so = $("fSort").value;
  view = list.filter(x => (!fs || x.status === fs) && (!q || [x.p.nameAr,x.p.nameEn,x.p.email,x.p.phone,x.p.org,x.p.job,x.p.gov].join(" ").toLowerCase().includes(q)));
  const by = {reg:(a,b)=>(b.reg||0)-(a.reg||0), pct:(a,b)=>b.pct-a.pct, low:(a,b)=>a.pace-b.pace, last:(a,b)=>(b.last||0)-(a.last||0)}[so];
  view.sort(by);
  $("count").textContent = AR(view.length) + " من " + AR(list.length) + " مشارك";
  $("rows").innerHTML = view.map((x,i) => `<tr data-i="${i}">
    <td><b>${esc(x.p.nameAr || x.p.email)}</b></td><td>${esc(x.p.org||"—")}</td><td>${esc(x.p.gov||"—")}</td><td>${esc(x.p.level||"—")}</td><td>${x.p.mode === "1h" ? "ساعة" : "ساعتين"}</td>
    <td class="num">${fmtDate(x.reg)}</td><td class="num">${x.cur ? AR(x.cur) : "لسه"}</td>
    <td class="num">${AR(Math.round(x.pct*100))}٪<span class="mini"><i style="width:${x.pct*100}%"></i></span></td>
    <td class="num">${AR(Math.round(x.pace*100))}٪</td><td class="num">${AR(x.full)}</td><td class="num">${AR(x.streak)}</td>
    <td>${ago(x.last)}</td><td class="num">${x.pre != null ? AR(x.pre) : "—"} ← ${x.post != null ? AR(x.post) : "—"}${x.certOk ? ' <span class="pill s-ok">شهادة</span>' : ""}</td><td><span class="pill ${STATUS[x.status]}">${x.status}</span></td>
    <td>${waLink(x.p.phone) ? `<a class="wa" href="${waLink(x.p.phone)}" target="_blank" rel="noopener" data-stop="1">مراسلة</a>` : "—"}</td></tr>`).join("")
    || `<tr><td colspan="15" class="muted" style="text-align:center;padding:30px">${all.length ? "مفيش نتايج للبحث ده" : "لسه محدش سجّل. شارك لينك الخطة في الجروب."}</td></tr>`;
}

$("rows").addEventListener("click", e => {
  if (e.target.closest("[data-stop]")) return;
  const tr = e.target.closest("tr[data-i]"); if (tr) openDetail(view[+tr.dataset.i]);
});
["q","fStatus","fSort"].forEach(id => $(id).addEventListener("input", () => renderTable()));

function openDetail(x){
  const p = x.p, days = p.days || {};
  let grid = "";
  for (let w = 0; w < 8; w++){
    grid += `<span>المحطة ${AR(w+1)}</span>`;
    for (let k = 1; k <= 7; k++){
      const d = w*7+k, n = tasksOf(p).filter(t => (days[d]||{})[t.k]).length;
      const bg = n === 0 ? "" : `background:color-mix(in srgb, var(--done) ${30 + n/8*70}%, var(--surface-2))`;
      grid += `<i class="${d > x.cur ? "fut" : ""}" style="${bg}" title="اليوم ${d}: ${n} من ${tasksOf(p).length}">${n ? AR(n) : ""}</i>`;
    }
  }
  const mist = Object.entries(days).filter(([,v]) => v && v.m).sort((a,b)=>b[0]-a[0]).map(([d,v]) => `<li><small>اليوم ${AR(d)}</small>${esc(v.m)}</li>`).join("");
  const rates = Object.entries(p.ratings||{}).map(([w,r]) => `<div><small>الأسبوع ${AR(w)}</small>طلاقة ${AR(r.f||0)} · نطق ${AR(r.p||0)} · قواعد ${AR(r.g||0)}</div>`).join("");
  const wa = waLink(p.phone);
  $("dlBody").innerHTML = `
    <div class="dl-h"><div><span class="pill ${STATUS[x.status]}">${x.status}</span><h2>${esc(p.nameAr||"")} <span class="en muted" style="font-size:.9rem">${esc(p.nameEn||"")}</span></h2><span class="muted" style="font-size:.85rem">${esc(p.job||"")}${p.job&&p.org?" · ":""}${esc(p.org||"")}</span></div><button class="x" type="button" id="dlClose" aria-label="قفل">×</button></div>
    <div class="facts">
      <div><small>الإيميل</small><span dir="ltr">${esc(p.email||"—")}</span></div>
      <div><small>الموبايل</small><span dir="ltr">${esc(p.phone||"—")}</span>${wa?` · <a class="wa" href="${wa}" target="_blank" rel="noopener">واتساب</a>`:""}</div>
      <div><small>المحافظة · المستوى</small>${esc(p.gov||"—")} · ${esc(p.level||"—")}</div>
      <div><small>سجّل · بدأ</small>${fmtDate(x.reg)} · ${esc(p.start||"—")}</div>
      <div><small>اليوم الحالي</small>${x.cur ? AR(x.cur) + " من ٥٦" : "لسه ما بدأش"}</div>
      <div><small>الإنجاز · الالتزام</small>${AR(Math.round(x.pct*100))}٪ · ${AR(Math.round(x.pace*100))}٪</div>
      <div><small>أيام مكتملة · السلسلة</small>${AR(x.full)} · ${AR(x.streak)}</div>
      <div><small>آخر نشاط</small>${ago(x.last)}</div>
      <div><small>الوقت اليومي</small>${p.mode === "1h" ? "ساعة (٥ مهام)" : "ساعتين (٨ مهام)"}</div>
      <div><small>اختبار البداية ← النهائي</small>${x.pre != null ? AR(x.pre) : "—"} ← ${x.post != null ? AR(x.post) : "—"} من ١٠${x.certOk ? " · يستحق شهادة" : ""}</div>
      <div><small>اختبارات المحطات</small>${Object.entries(p.quiz||{}).map(([w,q]) => "م" + AR(w) + ": " + AR(q.s)).join(" · ") || "—"}</div>
    </div>
    <div><h3 style="font-size:1rem;margin-bottom:8px">المهام يوم بيوم (الرقم = مهام اتعملت من ${AR(tasksOf(p).length)})</h3><div class="dgrid">${grid}</div></div>
    <div><h3 style="font-size:1rem;margin-bottom:8px">كل مهمة اتعملت كام مرة</h3><div id="dlTasks"></div></div>
    ${rates?`<div><h3 style="font-size:1rem;margin-bottom:8px">تقييمه لنفسه</h3><div class="facts">${rates}</div></div>`:""}
    <div><h3 style="font-size:1rem;margin-bottom:8px">سجل الغلطات</h3>${mist?`<ul class="mist">${mist}</ul>`:'<span class="muted" style="font-size:.88rem">لسه ما كتبش غلطات.</span>'}</div>`;
  hbars($("dlTasks"), TASKS.map(t => [t.t, x.perTask[t.k]]), {max: Math.max(1, x.cur)});
  $("dlClose").addEventListener("click", () => $("dlg").close());
  $("dlg").showModal();
}
$("dlg").addEventListener("click", e => { if (e.target === $("dlg")) $("dlg").close(); });

/* ---------- export / copy ---------- */
$("csv").addEventListener("click", () => {
  const head = ["الاسم","الاسم بالإنجليزي","الإيميل","الموبايل","المحافظة","جهة العمل","الوظيفة","المستوى","الوقت اليومي","تاريخ التسجيل","يوم البداية","اليوم الحالي","المهام المنجزة","نسبة الإنجاز","نسبة الالتزام","أيام مكتملة","السلسلة","اختبار البداية","الاختبار النهائي","يستحق شهادة","آخر نشاط","الحالة"];
  const q = v => '"' + String(v == null ? "" : v).replace(/"/g,'""') + '"';
  const lines = [head.map(q).join(",")].concat(view.map(x => [x.p.nameAr,x.p.nameEn,x.p.email,x.p.phone,x.p.gov,x.p.org,x.p.job,x.p.level, x.p.mode === "1h" ? "ساعة" : "ساعتين", x.reg?iso(new Date(x.reg)):"", x.p.start, x.cur, x.done, Math.round(x.pct*100)+"%", Math.round(x.pace*100)+"%", x.full, x.streak, x.pre ?? "", x.post ?? "", x.certOk ? "نعم" : "لا", x.last?new Date(x.last).toLocaleString("en-GB"):"", x.status].map(q).join(",")));
  const blob = new Blob(["﻿" + lines.join("\r\n")], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "tanmaweyeen-english-plan-" + iso(today0()) + ".csv";
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
});
$("copyPhones").addEventListener("click", async () => {
  const txt = view.map(x => x.p.phone).filter(Boolean).join("\n"), b = $("copyPhones");
  try { await navigator.clipboard.writeText(txt); b.textContent = "اتنسخ " + AR(view.filter(x=>x.p.phone).length) + " رقم"; }
  catch(e){ b.textContent = "النسخ مش متاح"; }
  setTimeout(() => b.textContent = "نسخ أرقام القائمة", 2500);
});

/* ---------- auth & boot ---------- */
function show(v){ ["loadingView","loginView","denyView","dashView"].forEach(id => $(id).hidden = id !== v); }
if (Store.demo) $("demoBar").hidden = false;
const errText = e => ({"auth/invalid-credential":"الإيميل أو كلمة السر مش صح.","auth/wrong-password":"الإيميل أو كلمة السر مش صح.","auth/user-not-found":"الإيميل أو كلمة السر مش صح.","auth/too-many-requests":"محاولات كتير. استنى شوية."}[e && e.code] || ("حصلت مشكلة: " + ((e && e.message) || "")));
$("loginForm").addEventListener("submit", async ev => { ev.preventDefault(); $("loginErr").hidden = true; try { await Store.signIn($("lEmail").value.trim(), $("lPass").value); } catch(e){ $("loginErr").textContent = errText(e); $("loginErr").hidden = false; } });
$("googleBtn").addEventListener("click", async () => { try { await Store.google(); } catch(e){ $("loginErr").textContent = errText(e); $("loginErr").hidden = false; } });
$("logout").addEventListener("click", () => Store.signOut());
$("sendVerify").addEventListener("click", async () => { try { await Store.sendVerify(); $("verifyOk").textContent = "بعتنا لينك التأكيد على إيميلك."; $("verifyOk").hidden = false; } catch(e){} });
$("recheck").addEventListener("click", async () => { const u = await Store.refresh(); gate(u); });

let unsub = null;
function gate(u){
  if (unsub){ try { unsub(); } catch(e){} unsub = null; }
  if (!u){ $("who").hidden = true; show("loginView"); return; }
  $("whoName").textContent = u.email; $("who").hidden = false;
  if (!Store.isAdmin(u)){
    const listed = (window.ADMIN_EMAILS||[]).map(e=>e.toLowerCase()).includes((u.email||"").toLowerCase());
    $("denyText").textContent = listed && !u.verified ? "الإيميل ده أدمن بس لسه متأكدش. أكّد الإيميل الأول." : "الإيميل " + u.email + " مش في قايمة الأدمن (ADMIN_EMAILS في js/config.js وقواعد Firestore).";
    $("sendVerify").hidden = $("recheck").hidden = !(listed && !u.verified);
    show("denyView"); return;
  }
  show("loadingView");
  unsub = Store.watchAll(list => { all = list; show("dashView"); render(); }, err => { $("loadingView").hidden = false; $("loadingView").textContent = "مقدرناش نقرا البيانات: " + (err && err.message) + ". راجع firestore.rules وإيميل الأدمن."; show("loadingView"); });
}
Store.onAuth(gate);
