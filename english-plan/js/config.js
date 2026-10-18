/* =========================================================
   إعدادات خطة تنمويين مصر لتحسين وتطوير اللغة الإنجليزية
   ========================================================= */

/* ١) إعدادات Firebase: نفس إعدادات مشروع تطبيق تنمويين مصر.
      طول ما apiKey فيها كلمة PASTE، الصفحة بتشتغل في "وضع تجريبي" ببيانات على المتصفح بس. */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyCk98_i0ozMuQumsO4PUDpXGRga5aWI4C8",
  authDomain: "tanmoyeen-masr26.firebaseapp.com",
  projectId: "tanmoyeen-masr26",
  storageBucket: "tanmoyeen-masr26.firebasestorage.app",
  messagingSenderId: "335780209700",
  appId: "1:335780209700:web:c2839bb31364b5b18664b1"
};

/* ٢) اسم الـcollection اللي بتتحفظ فيها بيانات المشاركين (منفصلة عن باقي بيانات التطبيق) */
window.PLAN_COLLECTION = "englishPlan";

/* ٣) إيميلات الأدمن (لازم تكون نفس اللي في قواعد Firestore، بحروف صغيرة) */
window.ADMIN_EMAILS = [
  "elzieni2007@gmail.com"
];

/* ٤) مجتمع الواتساب ونادي المحادثة */
window.COMMUNITY = {
  whatsapp: "https://chat.whatsapp.com/JfQsPFpTH66F587WHPkcXh",
  club: ""        // مثال: "نادي المحادثة: كل خميس ٨ مساءً على Google Meet، نص ساعة مع متطوع"
};
