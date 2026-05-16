// Firebase Messaging Service Worker - تنمويين مصر
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCk98_i0ozMuQumsO4PUDpXGRga5aWI4C8",
  authDomain: "tanmoyeen-masr26.firebaseapp.com",
  projectId: "tanmoyeen-masr26",
  storageBucket: "tanmoyeen-masr26.firebasestorage.app",
  messagingSenderId: "335780209700",
  appId: "1:335780209700:web:c2839bb31364b5b18664b1",
  measurementId: "G-WV6C05WHS1"
});

const messaging = firebase.messaging();

// الإشعارات في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log('إشعار في الخلفية:', payload);
  const { title, body, icon } = payload.notification;
  self.registration.showNotification(title || 'تنمويين مصر', {
    body: body || 'لديك إشعار جديد',
    icon: icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    data: payload.data
  });
});
