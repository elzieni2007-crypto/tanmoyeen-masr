const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {getAuth} = require("firebase-admin/auth");

initializeApp();
const db = getFirestore();

const ONESIGNAL_REST_API_KEY = defineSecret("ONESIGNAL_REST_API_KEY");
const ONESIGNAL_APP_ID = "8dfa5d04-3fc5-448d-b72d-52d2ed5dc5d9";
const PUBLIC_APP_URL =
  "https://elzieni2007-crypto.github.io/tanmoyeen-masr/";

function norm(v) {
  return String(v || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^\u0600-\u06FFa-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function duplicateKey(job) {
  const link = norm(job.link);

  if (link) {
    return "url:" + link;
  }

  return (
    "job:" +
    [
      norm(job.org),
      norm(job.title),
      norm(job.gov),
      norm(job.dl),
    ].join("|")
  );
}

exports.ingestJob = onCall(
  {region: "europe-west1"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "يجب تسجيل الدخول أولا"
      );
    }

    const incoming = request.data && request.data.job;

    if (!incoming || !incoming.title || !incoming.org) {
      throw new HttpsError(
        "invalid-argument",
        "المسمى الوظيفي والجهة مطلوبان"
      );
    }

    const job = {
      title: String(incoming.title).trim(),
      org: String(incoming.org).trim(),
      gov: String(incoming.gov || "").trim(),
      type: String(incoming.type || "دوام كامل").trim(),
      sec: String(incoming.sec || "").trim(),
      sal: String(incoming.sal || "").trim(),
      dl: String(incoming.dl || "").trim(),
      contact: String(incoming.contact || "").trim(),
      desc: String(incoming.desc || "").trim(),
      link: String(incoming.link || "").trim(),
      source: String(
        incoming.source || "استيراد تنمويين مصر"
      ).trim(),

      ownerUid: request.auth.uid,
      submittedBy: request.auth.uid,
      submittedByEmail: request.auth.token.email || "",

      status: "pending",
      importMethod: "firebase_function",

      timestamp: FieldValue.serverTimestamp(),
      importedAt: FieldValue.serverTimestamp(),
    };

    job.duplicateKey = duplicateKey(job);

    const published = await db
      .collection("jobs")
      .where("duplicateKey", "==", job.duplicateKey)
      .limit(1)
      .get();

    if (!published.empty) {
      return {
        duplicate: true,
        duplicateOf: published.docs[0].id,
        collection: "jobs",
      };
    }

    const pending = await db
      .collection("pending_jobs")
      .where("duplicateKey", "==", job.duplicateKey)
      .limit(1)
      .get();

    if (!pending.empty) {
      return {
        duplicate: true,
        duplicateOf: pending.docs[0].id,
        collection: "pending_jobs",
      };
    }

    const ref = await db
      .collection("pending_jobs")
      .add(job);

    return {
      duplicate: false,
      id: ref.id,
      collection: "pending_jobs",
    };
  }
);

async function assertAdmin(request) {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "يجب تسجيل الدخول أولا"
    );
  }

  const email = String(
    request.auth.token.email || ""
  ).toLowerCase();

  if (email !== "elzieni2007@gmail.com") {
    throw new HttpsError(
      "permission-denied",
      "حساب الإدارة فقط يمكنه نشر الوظائف"
    );
  }
}

exports.approveJob = onCall(
  {region: "europe-west1"},
  async (request) => {
    await assertAdmin(request);

    const pendingId = String(
      request.data?.pendingId || ""
    ).trim();

    if (!pendingId) {
      throw new HttpsError(
        "invalid-argument",
        "pendingId مطلوب"
      );
    }

    const pendingRef = db
      .collection("pending_jobs")
      .doc(pendingId);

    const snap = await pendingRef.get();

    if (!snap.exists) {
      throw new HttpsError(
        "not-found",
        "الإعلان المعلق غير موجود"
      );
    }

    const p = snap.data() || {};

    if (p.status !== "pending") {
      return {
        ok: false,
        status: p.status || "unknown",
      };
    }

    const key = p.duplicateKey || duplicateKey(p);

    const existing = await db
      .collection("jobs")
      .where("duplicateKey", "==", key)
      .limit(1)
      .get();

    if (!existing.empty) {
      await pendingRef.update({
        status: "rejected",
        rejectionReason: "duplicate",
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        ok: false,
        duplicate: true,
      };
    }

    const job = Object.assign({}, p, {
      status: "approved",
      publishedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      approvedBy: request.auth.uid,
      approvedByEmail:
        request.auth.token.email || "",
    });

    delete job.fbId;

    const ref = await db
      .collection("jobs")
      .add(job);

    await pendingRef.update({
      status: "approved",
      publishedJobId: ref.id,
      approvedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      ok: true,
      id: ref.id,
    };
  }
);

// ============ إشعارات OneSignal ============
// السيجمنت الافتراضي في تطبيقات OneSignal الجديدة اسمه "Total Subscriptions"،
// والقديمة "Subscribed Users" — بنجرب الأول وبعدين التاني.
const SEGMENTS = ["Total Subscriptions", "Subscribed Users"];
const PUSH_GAP_MS = 2 * 60 * 1000; // أقل فاصل بين إشعارين فرديين
const pushStateRef = () => db.collection("settings").doc("push_state");

async function sendOneSignal({title, message, url, topic, subscriptionIds, filters}) {
  // تنظيف المفتاح من أي مسافات أو سطر جديد اتلصق معاه
  const key = String(ONESIGNAL_REST_API_KEY.value() || "").trim().replace(/^(Key|Basic)\s+/i, "");
  if (!key) throw new Error("ONESIGNAL_REST_API_KEY is not configured");

  // المفاتيح الجديدة (os_v2_...) بتستخدم "Key"، والقديمة (Legacy REST API Key) بتستخدم "Basic"
  const schemes = /^os_v2_/i.test(key) ? ["Key", "Basic"] : ["Basic", "Key"];
  let lastError = "";
  for (const scheme of schemes) {
    const targets = (subscriptionIds || filters) ? [null] : SEGMENTS;
    for (const segment of targets) {
      const response = await fetch("https://api.onesignal.com/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": scheme + " " + key,
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          target_channel: "push",
          ...(subscriptionIds ? {include_subscription_ids: subscriptionIds} :
            filters ? {filters} : {included_segments: [segment]}),
          headings: {en: title, ar: title},
          contents: {en: message, ar: message},
          // web_url للمتصفح، و data للتطبيق: أغلب أدوات تغليف التطبيقات بتفتح الرابط ده جوه التطبيق
          web_url: url,
          data: {url: url, targetUrl: url},
          android_group: "tanmoyeen",
          web_push_topic: topic || "tanmoyeen-new",
          ttl: 3 * 24 * 60 * 60,
        }),
      });
      const body = await response.text();
      if (response.ok && !/invalid_segments|not found/i.test(body)) {
        console.log("OneSignal ok", scheme, segment, body);
        return body;
      }
      lastError = `OneSignal ${response.status} (${segment}, ${scheme}, key ${key.slice(0, 10)}… len ${key.length}): ${body}`;
      console.warn(lastError);
      if (response.status === 401 || response.status === 403) break; // المفتاح نفسه مرفوض — جرّب الصيغة التانية
    }
  }
  throw new Error(lastError);
}

function clip(s, n) {
  s = String(s || "").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// بيعلّم المستند إن الإشعار اتبعت (عشان مايتبعتش مرتين)، وبيطبق الفاصل الزمني.
// يرجّع "send" أو "queued" أو "skip".
async function claimPush(docRef, kind) {
  return db.runTransaction(async (tx) => {
    const [docSnap, stateSnap] = await Promise.all([tx.get(docRef), tx.get(pushStateRef())]);
    if (!docSnap.exists || docSnap.get("pushSentAt") || docSnap.get("pushQueuedAt")) return "skip";
    const st = stateSnap.exists ? stateSnap.data() : {};
    const last = st.lastSentAt && st.lastSentAt.toMillis ? st.lastSentAt.toMillis() : 0;
    const now = Date.now();
    if (now - last < PUSH_GAP_MS) {
      const field = kind === "tender" ? "queuedTenders" : "queuedJobs";
      tx.set(pushStateRef(), {[field]: FieldValue.increment(1)}, {merge: true});
      tx.update(docRef, {pushQueuedAt: FieldValue.serverTimestamp()});
      return "queued";
    }
    tx.set(pushStateRef(), {lastSentAt: FieldValue.serverTimestamp()}, {merge: true});
    tx.update(docRef, {pushSentAt: FieldValue.serverTimestamp()});
    return "send";
  });
}

// ============ الإشعارات المخصصة (المجال + المحافظة) ============
// اللي ماخصصوش (مفيش عندهم تاج prefs) بيوصلهم كل حاجة زي الأول.
// واللي خصصوا، تفضيلاتهم في push_prefs/{subscriptionId} وبيوصلهم اللي يناسبهم بس.
function normAr(s) {
  return String(s || "").toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/\s+/g, " ").trim();
}
function isRemote(place) { return /بعد|اونلاين|online|remote/.test(normAr(place)); }
function placeMatches(place, govs) {
  if (!govs || !govs.length) return true;
  if (!place || isRemote(place)) return true;
  const p = normAr(place);
  return govs.some((g) => p.includes(normAr(g)));
}
// نفس تصنيف الوظائف اللي في التطبيق (8 مجالات)، عشان المجالات القديمة والجديدة تتطابق
const CAT_RULES=[
 ['المالية والمحاسبة والمراجعة',/financ(e|ial)\b|\baccount(ant|ants|ing|s)?\b|audit|budget|treasur|payroll|cashier|\brisk\b|compliance|internal control|مال(ي|ية)|محاسب|مراجع|ميزاني|خزين|رواتب/i],
 ['المشتريات وسلاسل الإمداد واللوجستيات',/procure|supply|logistic|purchas|warehouse|fleet|driver|store ?keeper|سائق|مشتريات|توريد|إمداد|امداد|لوجست|مخاز?ن/i],
 ['الموارد البشرية والشؤون الإدارية',/\bHR\b|human resource|recruit|talent|\badmin\b|administrati(on|ve)|office manager|reception|secretar|موارد بشرية|الموارد البشرية|شؤون إدارية|الشؤون الإدارية|إداري|اداري|سكرتار|توظيف|شؤون العاملين/i],
 ['المتابعة والتقييم والمساءلة والتعلم',/\bM&E\b|\bMEAL\b|\bMEL\b|monitoring|evaluation|accountability|data analy|رصد|تقييم|متابعة|مساءلة|مساءله/i],
 ['المنح والشراكات وتطوير الموارد',/\bgrants?\b|partnership|resource mobili|fundrais|donor relation|business development|proposal writ|منح|شراكات|شراكة|تطوير الموارد|تنمية الموارد|جمع التبرعات|تبرعات|تمويل/i],
 ['الاتصال والإعلام والعلاقات العامة',/communicat|media|public relation|\bPR\b|advocacy|content|marketing|visibility|إعلام|اعلام|اتصال|علاقات عامة|تواصل|محتوى|تسويق|مناصرة/i],
 ['تكنولوجيا المعلومات والتحول الرقمي',/\bIT\b|\bICT\b|information tech|software|developer|digital|database|system admin|data (management|engineer)|تكنولوجيا|برمج|رقمي|نظم معلومات|قواعد بيانات/i],
 ['المشروعات والبرامج',/project|program|coordinator|case ?work|field|مشروع|مشروعات|مشاريع|برنامج|برامج|منسق|ميداني|health|educat|protection|nutrition|livelihood|gender|youth|WASH|shelter|psychosocial|empower|rights|refugee|migra|climate|environment|صح(ة|ي)|تعليم|حماية|تمكين|حقوق|لاجئ|بيئ|زراع|تغذية|إغاثة|نوع اجتماعي|شباب|مجتمع|طفل|المرأة/i]
];
function catOf(t) {
  t = String(t || "");
  if (!t) return "";
  for (const [c, re] of CAT_RULES) if (t === c) return c;
  for (const [c, re] of CAT_RULES) if (re.test(t)) return c;
  return "";
}
function sectorMatches(sec, secs, title) {
  if (!secs || !secs.length) return true;
  const jc = catOf(title) || catOf(sec);
  if (jc) {
    if (secs.some((x) => catOf(x) === jc)) return true;
  }
  if (!sec) return !jc;
  const s = normAr(sec);
  return secs.some((x) => { const n = normAr(x); return s.includes(n) || n.includes(s); });
}
async function matchedSubscriptions(kind, item) {
  const snap = await db.collection("push_prefs").where(kind === "tender" ? "tenders" : "jobs", "==", true).get();
  const ids = [];
  snap.forEach((d) => {
    const p = d.data() || {};
    const place = kind === "tender" ? item.loc : item.gov;
    const okSec = kind === "tender" ? true : sectorMatches(item.sec, p.secs, item.title);
    if (okSec && placeMatches(place, p.govs)) ids.push(p.subId || d.id);
  });
  return [...new Set(ids)];
}
// بيبعت للجمهور العام (اللي ماخصصوش) + اللي تفضيلاتهم مطابقة
async function sendToAudience(payload, matchedIds) {
  let ok = false;
  let lastErr = null;
  try {
    await sendOneSignal(Object.assign({}, payload, {filters: [{field: "tag", key: "prefs", relation: "not_exists"}]}));
    ok = true;
  } catch (e) { lastErr = e; console.warn("general push failed", e.message); }
  for (let i = 0; i < matchedIds.length; i += 2000) {
    try {
      await sendOneSignal(Object.assign({}, payload, {subscriptionIds: matchedIds.slice(i, i + 2000)}));
      ok = true;
    } catch (e) { lastErr = e; console.warn("matched push failed", e.message); }
  }
  if (!ok && lastErr) throw lastErr;
}

exports.onNewJob = onDocumentCreated(
  {document: "jobs/{jobId}", region: "europe-west1", secrets: [ONESIGNAL_REST_API_KEY]},
  async (event) => {
    const job = event.data && event.data.data();
    if (!job || !["approved", "active"].includes(job.status)) return;
    const decision = await claimPush(event.data.ref, "job");
    if (decision !== "send") return;
    const matchedJ = await matchedSubscriptions("job", job);
    await sendToAudience({
      title: "💼 وظيفة جديدة: " + clip(job.title || "وظيفة جديدة", 60),
      message: clip((job.org || "تنمويين مصر") + (job.gov ? " — " + job.gov : "") +
        (job.dl ? " | آخر موعد " + job.dl : ""), 120),
      url: PUBLIC_APP_URL + "?job=" + encodeURIComponent(event.params.jobId),
      topic: "tanmoyeen-job",
    }, matchedJ);
  }
);

exports.onNewTender = onDocumentCreated(
  {document: "tenders/{tenderId}", region: "europe-west1", secrets: [ONESIGNAL_REST_API_KEY]},
  async (event) => {
    const tender = event.data && event.data.data();
    if (!tender || !["approved", "active"].includes(tender.status)) return;
    const decision = await claimPush(event.data.ref, "tender");
    if (decision !== "send") return;
    const matchedT = await matchedSubscriptions("tender", tender);
    await sendToAudience({
      title: "📋 فرصة جديدة: " + clip(tender.title || "فرصة جديدة", 60),
      message: clip((tender.org || "تنمويين مصر") + (tender.loc ? " — " + tender.loc : "") +
        (tender.dl ? " | آخر موعد " + tender.dl : ""), 120),
      url: PUBLIC_APP_URL + "?tender=" + encodeURIComponent(event.params.tenderId),
      topic: "tanmoyeen-tender",
    }, matchedT);
  }
);

// لو اتنشر كذا إعلان ورا بعض، بدل ما نبعت إشعار لكل واحد،
// بنبعت إشعار مجمّع واحد كل 10 دقايق بالباقي.
exports.flushPushDigest = onSchedule(
  {schedule: "every 10 minutes", timeZone: "Africa/Cairo", region: "europe-west1",
    secrets: [ONESIGNAL_REST_API_KEY]},
  async () => {
    const counts = await db.runTransaction(async (tx) => {
      const snap = await tx.get(pushStateRef());
      const st = snap.exists ? snap.data() : {};
      const jobs = st.queuedJobs || 0, tenders = st.queuedTenders || 0;
      const last = st.lastSentAt && st.lastSentAt.toMillis ? st.lastSentAt.toMillis() : 0;
      if (!(jobs + tenders) || Date.now() - last < PUSH_GAP_MS) return null;
      tx.set(pushStateRef(), {queuedJobs: 0, queuedTenders: 0,
        lastSentAt: FieldValue.serverTimestamp()}, {merge: true});
      return {jobs, tenders};
    });
    if (!counts) return;
    const parts = [];
    if (counts.jobs) parts.push(counts.jobs + (counts.jobs === 1 ? " وظيفة جديدة" : " وظائف جديدة"));
    if (counts.tenders) parts.push(counts.tenders + (counts.tenders === 1 ? " فرصة/مناقصة جديدة" : " فرص ومناقصات جديدة"));
    const prefSnap = await db.collection("push_prefs").get();
    const digestIds = [];
    prefSnap.forEach((d) => {
      const p = d.data() || {};
      if ((counts.jobs && p.jobs !== false) || (counts.tenders && p.tenders !== false)) digestIds.push(p.subId || d.id);
    });
    await sendToAudience({
      title: "📢 إعلانات جديدة على تنمويين مصر",
      message: parts.join(" و ") + " — ادخل شوفها قبل ما المواعيد تخلص",
      url: PUBLIC_APP_URL + (counts.jobs ? "?form=jobs" : "?form=tenders"),
      topic: "tanmoyeen-digest",
    }, [...new Set(digestIds)]);
  }
);

// زرار اختبار من لوحة الأدمن: بيبعت إشعار تجريبي لكل المشتركين
exports.sendTestPush = onCall(
  {region: "europe-west1", secrets: [ONESIGNAL_REST_API_KEY]},
  async (request) => {
    await assertAdmin(request);
    let res;
    try {
      res = await sendOneSignal({
        title: "🔔 تجربة إشعارات تنمويين مصر",
        message: "لو الرسالة دي وصلتك، الإشعارات شغالة ✅",
        url: PUBLIC_APP_URL,
        topic: "tanmoyeen-test",
      });
    } catch (e) {
      // نرجّع سبب الخطأ الحقيقي للوحة الأدمن بدل "INTERNAL"
      throw new HttpsError("failed-precondition", String(e.message || e).slice(0, 400));
    }
    let parsed = {};
    try { parsed = JSON.parse(res); } catch (e) { /* ignore */ }
    return {
      ok: true,
      id: parsed.id || "",
      recipients: parsed.recipients,
      errors: parsed.errors || null,
    };
  }
);

// ============ أكاديمية تنمويين مصر ============
const COURSE_STATUSES = ["new", "confirmed", "waitlist", "cancelled", "attended"];

function certLink(id) { return PUBLIC_APP_URL + "certificate.html?id=" + encodeURIComponent(id); }

function fillCourseText(text, course, name, certId) {
  const vals = {
    "الاسم": name || "", "الكورس": course.title || "", "التدريب": course.title || "", "المدرب": course.trainer || "",
    "الموعد": [course.startDate, course.timeText].filter(Boolean).join(" — "), "الرابط": course.link || "",
    "الجروب": course.waGroup || "", "الشهادة": certId ? certLink(certId) : "", "الشهادات": PUBLIC_APP_URL + "certificate.html",
  };
  return String(text || "").split("\n")
    .filter((line) => {
      const m = line.match(/\{(الرابط|الجروب|الشهادة)\}/g);
      return !m || m.every((t) => vals[t.slice(1, -1)]);
    })
    .join("\n")
    .replace(/\{(الاسم|الكورس|التدريب|المدرب|الموعد|الرابط|الجروب|الشهادة|الشهادات)\}/g, (_, k) => vals[k])
    .replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").replace(/[ \t]+([،,.!؟])/g, "$1").trim();
}

// تأكيد التسجيل: بيحدد مؤكد أو قائمة انتظار حسب عدد المقاعد، ويحدّث عدّاد التدريب
exports.onCourseRegistration = onDocumentCreated(
  {document: "course_registrations/{regId}", region: "europe-west1", secrets: [ONESIGNAL_REST_API_KEY]},
  async (event) => {
    const reg = event.data && event.data.data();
    if (!reg || !reg.courseId) return;
    const courseRef = db.collection("courses").doc(reg.courseId);
    const result = await db.runTransaction(async (tx) => {
      const c = await tx.get(courseRef);
      if (!c.exists) return null;
      const course = c.data();
      const count = (course.registeredCount || 0) + 1;
      const seats = Number(course.seats || 0);
      const status = seats && count > seats ? "waitlist" : "confirmed";
      tx.update(courseRef, {registeredCount: count, updatedAt: FieldValue.serverTimestamp()});
      tx.update(event.data.ref, {status, confirmedAt: FieldValue.serverTimestamp()});
      return {course, status};
    });
    if (!result || !reg.pushId) return;
    try {
      await sendOneSignal({
        title: result.status === "waitlist" ? "🕒 إنت في قائمة الانتظار" : "✅ تم تسجيلك في التدريب",
        message: clip(result.course.title, 90) + (result.status === "waitlist" ?
          " — المقاعد اكتملت، وهنبلغك لو اتفتح مكان" : " — هيوصلك لينك الحضور قبل الموعد"),
        url: PUBLIC_APP_URL + "?form=academy",
        topic: "academy-" + reg.courseId,
        subscriptionIds: [reg.pushId],
      });
    } catch (e) { console.warn("confirmation push failed", e.message); }
  }
);

// رسالة جماعية لكل المسجلين في تدريب (إشعار على التطبيق)
exports.sendCourseMessage = onCall(
  {region: "europe-west1", secrets: [ONESIGNAL_REST_API_KEY]},
  async (request) => {
    await assertAdmin(request);
    const {courseId, title, message} = request.data || {};
    const statuses = (request.data && request.data.statuses || ["new", "confirmed", "waitlist", "attended"])
      .filter((s) => COURSE_STATUSES.includes(s));
    if (!courseId || !message) throw new HttpsError("invalid-argument", "courseId and message are required");
    const cSnap = await db.collection("courses").doc(courseId).get();
    if (!cSnap.exists) throw new HttpsError("not-found", "course not found");
    const course = cSnap.data();
    const regs = await db.collection("course_registrations").where("courseId", "==", courseId).get();
    const only = Array.isArray(request.data && request.data.regIds) ? new Set(request.data.regIds) : null;
    const targets = regs.docs.map((d) => Object.assign({id: d.id}, d.data()))
      .filter((r) => statuses.includes(r.status || "new") && (!only || only.has(r.id)));
    const sentRegIds = [];
    const ids = [...new Set(targets.map((r) => r.pushId).filter(Boolean))];
    const personal = /\{الاسم\}|\{الشهادة\}/.test(String(message) + String(title || ""));
    const text = fillCourseText(message, course, "");
    const head = fillCourseText(title || ("🎓 " + course.title), course, "");
    let sent = 0;
    try {
      if (personal) {
        // رسالة مخصصة لكل شخص (اسمه ولينك شهادته)
        const seen = new Set();
        for (const r of targets) {
          if (!r.pushId || seen.has(r.pushId)) continue;
          seen.add(r.pushId);
          const first = String(r.name || "").split(/\s+/)[0];
          await sendOneSignal({
            title: clip(fillCourseText(title || ("🎓 " + course.title), course, first, r.certId), 80),
            message: clip(fillCourseText(message, course, first, r.certId), 220),
            url: r.certId && /\{الشهادة\}/.test(message) ? certLink(r.certId) : (course.link || (PUBLIC_APP_URL + "?form=academy")),
            topic: "academy-" + courseId, subscriptionIds: [r.pushId],
          });
          sent++;
          sentRegIds.push(r.id);
        }
      } else {
        for (let i = 0; i < ids.length; i += 2000) {
          const chunk = ids.slice(i, i + 2000);
          await sendOneSignal({title: clip(head, 80), message: clip(text, 220),
            url: course.link || (PUBLIC_APP_URL + "?form=academy"), topic: "academy-" + courseId, subscriptionIds: chunk});
          sent += chunk.length;
        }
        targets.filter((r) => r.pushId).forEach((r) => sentRegIds.push(r.id));
      }
    } catch (e) {
      throw new HttpsError("failed-precondition", String(e.message || e).slice(0, 400));
    }
    await db.collection("courses").doc(courseId).collection("messages").add({
      channel: "push", title: head, text, statuses, recipients: targets.length, withPush: ids.length, sent,
      at: FieldValue.serverTimestamp(), by: request.auth.token.email || "",
    });
    return {total: targets.length, withPush: ids.length, sent, sentRegIds};
  }
);

exports.expireJobs = onSchedule(
  {
    schedule: "every day 00:15",
    timeZone: "Africa/Cairo",
    region: "europe-west1",
  },

  async () => {
    const snap = await db
      .collection("jobs")
      .where("status", "in", [
        "approved",
        "active",
      ])
      .get();

    const now = new Date();
    const batch = db.batch();

    let changed = 0;

    for (const doc of snap.docs) {
      const x = doc.data() || {};
      const raw = String(x.dl || "").trim();

      let d = null;

      const m = raw.match(
        /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
      );

      if (m) {
        d = new Date(
          Number(m[3]),
          Number(m[2]) - 1,
          Number(m[1]),
          23,
          59,
          59
        );
      } else if (
        /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ) {
        d = new Date(
          raw + "T23:59:59"
        );
      }

      if (
        d &&
        !isNaN(d.getTime()) &&
        d < now
      ) {
        batch.update(doc.ref, {
          status: "expired",
          expiredAt:
            FieldValue.serverTimestamp(),
          updatedAt:
            FieldValue.serverTimestamp(),
        });

        changed++;
      }
    }

    if (changed) {
      await batch.commit();
    }

    return {
      changed,
    };
  }
);

/* ===== قراءة صفحة إعلان من السيرفر (للأدمن بس) =====
   المتصفح مايقدرش يقرا صفحات المواقع التانية مباشرة (CORS)،
   فالسيرفر بيجيب الـ HTML ويرجعه للوحة الأدمن عشان تحلله. */
exports.fetchJobPage = onCall(
  {region: "europe-west1", timeoutSeconds: 30, memory: "256MiB"},
  async (request) => {
    await assertAdmin(request);
    const raw = String((request.data && request.data.url) || "").trim();
    let u;
    try {
      u = new URL(raw);
    } catch (e) {
      throw new HttpsError("invalid-argument", "رابط غير صحيح");
    }
    if (!/^https?:$/.test(u.protocol)) {
      throw new HttpsError("invalid-argument", "لازم الرابط يبدأ بـ http أو https");
    }
    // منع الوصول لعناوين داخلية
    const h = u.hostname.toLowerCase();
    if (h === "localhost" || h.endsWith(".internal") || h.endsWith(".local") ||
        /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(h) ||
        h.includes(":") || h === "metadata.google.internal") {
      throw new HttpsError("invalid-argument", "الرابط ده مش مسموح");
    }
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    try {
      const res = await fetch(u.toString(), {
        redirect: "follow",
        signal: ctl.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
        },
      });
      const type = res.headers.get("content-type") || "";
      if (!res.ok) {
        throw new HttpsError("unavailable", "الموقع رجّع HTTP " + res.status);
      }
      if (!/html|xml|text/i.test(type)) {
        throw new HttpsError("failed-precondition", "الرابط مش صفحة ويب (" + type + ")");
      }
      const html = (await res.text()).slice(0, 800000);
      return {html, finalUrl: res.url, status: res.status};
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      throw new HttpsError("unavailable", "تعذر فتح الصفحة: " + (e.name === "AbortError" ? "انتهت المهلة" : (e.message || e)));
    } finally {
      clearTimeout(timer);
    }
  }
);


// ============================================================
// حسابات المستخدمين: ربط التسجيلات القديمة + أدوات الأدمن
// ============================================================
const ADMIN_EMAIL = "elzieni2007@gmail.com";
const PROFILE_COLS = ["jobseekers", "consultants", "suppliers", "volunteers", "organizations", "registration_requests"];

function assertAdmin(request) {
  const email = String((request.auth && request.auth.token.email) || "").toLowerCase();
  if (!request.auth || email !== ADMIN_EMAIL) {
    throw new HttpsError("permission-denied", "الأدمن بس");
  }
}
function normEmail(v) {
  const s = String(v || "").trim().toLowerCase().replace(/\s+/g, "");
  return /^[^@]+@[^@]+\.[^@]+$/.test(s) ? s : "";
}

// المستخدم بيربط تسجيلاته القديمة اللي بنفس إيميله (لازم الإيميل يكون متأكد منه)
exports.claimMyProfiles = onCall({region: "europe-west1"}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "سجّل دخول الأول");
  const tok = request.auth.token || {};
  const uid = request.auth.uid;
  const email = normEmail(tok.email);
  const viaGoogle = tok.firebase && tok.firebase.sign_in_provider === "google.com";
  if (!email) throw new HttpsError("failed-precondition", "no-email");
  if (tok.email_verified !== true && !viaGoogle) throw new HttpsError("failed-precondition", "not-verified");

  const linked = [];
  let taken = 0;
  for (const col of PROFILE_COLS) {
    const found = new Map();
    for (const field of ["emailNorm", "email"]) {
      try {
        const snap = await db.collection(col).where(field, "==", email).get();
        snap.forEach((d) => found.set(d.id, d));
      } catch (e) { /* ignore */ }
    }
    if (!found.size) {
      // إيميلات قديمة مكتوبة بحروف كبيرة أو مسافات
      const snap = await db.collection(col).select("email", "ownerUid", "status", "name").limit(5000).get();
      snap.forEach((d) => { if (normEmail(d.get("email")) === email) found.set(d.id, d); });
    }
    for (const d of found.values()) {
      const x = d.data() || {};
      if (col === "registration_requests" && x.status !== "pending") continue;
      if (x.ownerUid && x.ownerUid !== uid) { taken++; continue; }
      if (!x.ownerUid) {
        await d.ref.update({ownerUid: uid, claimedAt: FieldValue.serverTimestamp(), emailNorm: email});
      }
      linked.push({col, id: d.id, name: x.name || ""});
    }
  }
  await db.collection("users").doc(uid).set({email, lastActive: FieldValue.serverTimestamp()}, {merge: true});
  return {linked, taken};
});

// الأدمن: قايمة الحسابات
exports.adminListUsers = onCall({region: "europe-west1"}, async (request) => {
  assertAdmin(request);
  const pageToken = (request.data && request.data.pageToken) || undefined;
  const res = await getAuth().listUsers(1000, pageToken);
  return {
    users: res.users.map((u) => ({
      uid: u.uid,
      email: u.email || "",
      name: u.displayName || "",
      verified: !!u.emailVerified,
      providers: (u.providerData || []).map((p) => p.providerId),
      created: u.metadata.creationTime || "",
      lastSignIn: u.metadata.lastSignInTime || "",
      lastRefresh: u.metadata.lastRefreshTime || "",
      disabled: !!u.disabled,
    })),
    next: res.pageToken || null,
  };
});

// الأدمن: لينك تغيير كلمة السر / كلمة سر مؤقتة / تأكيد الإيميل يدويًا
exports.adminResetPassword = onCall({region: "europe-west1"}, async (request) => {
  assertAdmin(request);
  const uid = String((request.data && request.data.uid) || "");
  const mode = String((request.data && request.data.mode) || "link");
  if (!uid) throw new HttpsError("invalid-argument", "uid");
  const u = await getAuth().getUser(uid);
  if (String(u.email || "").toLowerCase() === ADMIN_EMAIL) {
    throw new HttpsError("permission-denied", "مش مسموح على حساب الأدمن من هنا");
  }
  if (mode === "link") {
    if (!u.email) throw new HttpsError("failed-precondition", "الحساب ده مالوش إيميل");
    let link;
    try {
      link = await getAuth().generatePasswordResetLink(u.email, {url: PUBLIC_APP_URL});
    } catch (e) {
      link = await getAuth().generatePasswordResetLink(u.email);
    }
    return {link, email: u.email};
  }
  if (mode === "temp") {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const bytes = require("crypto").randomBytes(10);
    let pw = "";
    for (let i = 0; i < 10; i++) pw += chars[bytes[i] % chars.length];
    await getAuth().updateUser(uid, {password: pw});
    return {password: pw, email: u.email || ""};
  }
  if (mode === "verify") {
    await getAuth().updateUser(uid, {emailVerified: true});
    return {ok: true, email: u.email || ""};
  }
  throw new HttpsError("invalid-argument", "mode");
});

// الأدمن: إشعار مخصص لكل المشتركين (عنوان + رسالة + صفحة يفتح عليها)
exports.sendCustomPush = onCall({region: "europe-west1", secrets: [ONESIGNAL_REST_API_KEY]}, async (request) => {
  assertAdmin(request);
  const d = request.data || {};
  const title = String(d.title || "").trim();
  const message = String(d.message || "").trim();
  let url = String(d.url || "").trim() || PUBLIC_APP_URL;
  if (!title || title.length > 80) throw new HttpsError("invalid-argument", "العنوان لازم يكون من 1 لـ 80 حرف");
  if (!message || message.length > 300) throw new HttpsError("invalid-argument", "الرسالة لازم تكون من 1 لـ 300 حرف");
  if (!/^https:\/\//i.test(url)) throw new HttpsError("invalid-argument", "الرابط لازم يبدأ بـ https://");
  let res;
  try {
    res = await sendOneSignal({title, message, url, topic: "tanmoyeen-custom-" + Date.now()});
  } catch (e) {
    throw new HttpsError("failed-precondition", String(e.message || e).slice(0, 400));
  }
  let parsed = {};
  try { parsed = JSON.parse(res); } catch (e) { /* ignore */ }
  try {
    await db.collection("push_log").add({title, message, url, kind: "custom",
      recipients: parsed.recipients == null ? null : parsed.recipients, onesignalId: parsed.id || "",
      by: String(request.auth.token.email || ""), at: FieldValue.serverTimestamp()});
  } catch (e) { console.warn("push_log", e.message); }
  return {ok: true, id: parsed.id || "", recipients: parsed.recipients, errors: parsed.errors || null};
});
