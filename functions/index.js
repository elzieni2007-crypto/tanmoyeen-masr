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

async function sendOneSignal(title, message, url) {
  const key = ONESIGNAL_REST_API_KEY.value();

  if (!key) {
    throw new Error(
      "ONESIGNAL_REST_API_KEY is not configured"
    );
  }

  const response = await fetch(
    "https://api.onesignal.com/notifications",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: "Key " + key,
      },

      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,

        included_segments: [
          "Subscribed Users",
        ],

        headings: {
          en: title,
          ar: title,
        },

        contents: {
          en: message,
          ar: message,
        },

        url,
      }),
    }
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `OneSignal ${response.status}: ${body}`
    );
  }

  return body;
}

exports.onNewJob = onDocumentCreated(
  {
    document: "jobs/{jobId}",
    region: "europe-west1",
    secrets: [ONESIGNAL_REST_API_KEY],
  },

  async (event) => {
    const job = event.data?.data();

    if (!job || job.status !== "approved") {
      return;
    }

    await sendOneSignal(
      `💼 وظيفة جديدة - ${
        job.org || "تنمويين مصر"
      }`,

      `${job.title || "وظيفة جديدة"} | ${
        job.gov || "مصر"
      }`,

      `${PUBLIC_APP_URL}?form=job`
    );
  }
);

exports.onNewTender = onDocumentCreated(
  {
    document: "tenders/{tenderId}",
    region: "europe-west1",
    secrets: [ONESIGNAL_REST_API_KEY],
  },

  async (event) => {
    const tender = event.data?.data();

    if (
      !tender ||
      tender.status !== "approved"
    ) {
      return;
    }

    await sendOneSignal(
      `📋 فرصة جديدة - ${
        tender.org || "تنمويين مصر"
      }`,

      `${tender.title || "فرصة جديدة"} | ${
        tender.loc || "مصر"
      }`,

      `${PUBLIC_APP_URL}?form=tender`
    );
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
