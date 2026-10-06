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

async function sendOneSignal({title, message, url, topic}) {
  const key = ONESIGNAL_REST_API_KEY.value();
  if (!key) throw new Error("ONESIGNAL_REST_API_KEY is not configured");

  let lastError = "";
  for (const segment of SEGMENTS) {
    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Key " + key,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        target_channel: "push",
        included_segments: [segment],
        headings: {en: title, ar: title},
        contents: {en: message, ar: message},
        url,
        web_push_topic: topic || "tanmoyeen-new",
        ttl: 3 * 24 * 60 * 60,
      }),
    });
    const body = await response.text();
    if (response.ok && !/invalid_segments|not found/i.test(body)) {
      console.log("OneSignal ok", segment, body);
      return body;
    }
    lastError = `OneSignal ${response.status} (${segment}): ${body}`;
    console.warn(lastError);
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
    const res = await sendOneSignal({
      title: "🔔 تجربة إشعارات تنمويين مصر",
      message: "لو الرسالة دي وصلتك، الإشعارات شغالة ✅",
      url: PUBLIC_APP_URL,
      topic: "tanmoyeen-test",
    });
    let parsed = {};
    try { parsed = JSON.parse(res); } catch (e) { /* ignore */ }
    return {ok: true, id: parsed.id || "", recipients: parsed.recipients};
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
