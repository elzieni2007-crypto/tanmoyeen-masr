const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");

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

async function sendOneSignal({title, message, url, topic, subscriptionIds}) {
  // تنظيف المفتاح من أي مسافات أو سطر جديد اتلصق معاه
  const key = String(ONESIGNAL_REST_API_KEY.value() || "").trim().replace(/^(Key|Basic)\s+/i, "");
  if (!key) throw new Error("ONESIGNAL_REST_API_KEY is not configured");

  // المفاتيح الجديدة (os_v2_...) بتستخدم "Key"، والقديمة (Legacy REST API Key) بتستخدم "Basic"
  const schemes = /^os_v2_/i.test(key) ? ["Key", "Basic"] : ["Basic", "Key"];
  let lastError = "";
  for (const scheme of schemes) {
    const targets = subscriptionIds ? [null] : SEGMENTS;
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
          ...(subscriptionIds ? {include_subscription_ids: subscriptionIds} : {included_segments: [segment]}),
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

exports.onNewJob = onDocumentCreated(
  {document: "jobs/{jobId}", region: "europe-west1", secrets: [ONESIGNAL_REST_API_KEY]},
  async (event) => {
    const job = event.data && event.data.data();
    if (!job || !["approved", "active"].includes(job.status)) return;
    const decision = await claimPush(event.data.ref, "job");
    if (decision !== "send") return;
    await sendOneSignal({
      title: "💼 وظيفة جديدة: " + clip(job.title || "وظيفة جديدة", 60),
      message: clip((job.org || "تنمويين مصر") + (job.gov ? " — " + job.gov : "") +
        (job.dl ? " | آخر موعد " + job.dl : ""), 120),
      url: PUBLIC_APP_URL + "?job=" + encodeURIComponent(event.params.jobId),
      topic: "tanmoyeen-job",
    });
  }
);

exports.onNewTender = onDocumentCreated(
  {document: "tenders/{tenderId}", region: "europe-west1", secrets: [ONESIGNAL_REST_API_KEY]},
  async (event) => {
    const tender = event.data && event.data.data();
    if (!tender || !["approved", "active"].includes(tender.status)) return;
    const decision = await claimPush(event.data.ref, "tender");
    if (decision !== "send") return;
    await sendOneSignal({
      title: "📋 فرصة جديدة: " + clip(tender.title || "فرصة جديدة", 60),
      message: clip((tender.org || "تنمويين مصر") + (tender.loc ? " — " + tender.loc : "") +
        (tender.dl ? " | آخر موعد " + tender.dl : ""), 120),
      url: PUBLIC_APP_URL + "?tender=" + encodeURIComponent(event.params.tenderId),
      topic: "tanmoyeen-tender",
    });
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
    await sendOneSignal({
      title: "📢 إعلانات جديدة على تنمويين مصر",
      message: parts.join(" و ") + " — ادخل شوفها قبل ما المواعيد تخلص",
      url: PUBLIC_APP_URL + (counts.jobs ? "?form=jobs" : "?form=tenders"),
      topic: "tanmoyeen-digest",
    });
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
    "الجروب": course.waGroup || "", "الشهادة": certId ? certLink(certId) : "",
  };
  return String(text || "").split("\n")
    .filter((line) => {
      const m = line.match(/\{(الرابط|الجروب|الشهادة)\}/g);
      return !m || m.every((t) => vals[t.slice(1, -1)]);
    })
    .join("\n")
    .replace(/\{(الاسم|الكورس|التدريب|المدرب|الموعد|الرابط|الجروب|الشهادة)\}/g, (_, k) => vals[k])
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
