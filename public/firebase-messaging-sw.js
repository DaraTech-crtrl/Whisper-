// Firebase Cloud Messaging Service Worker for Whisper
// Handles background push notifications when app is closed or in background

importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

const firebaseConfig = {
  projectId: "whisperanonnymous",
  appId: "1:314527952957:web:fc43830e34f9dd725aba54",
  apiKey: "AIzaSyB-cR-cie_PPzsD3YE3qQRRGJuOwUXhPmw",
  authDomain: "whisperanonnymous.firebaseapp.com",
  firestoreDatabaseId: "(default)",
  storageBucket: "whisperanonnymous.firebasestorage.app",
  messagingSenderId: "314527952957"
};

firebase.initializeApp(firebaseConfig);

let messaging;
try {
  if (firebase.messaging && typeof firebase.messaging.isSupported === 'function') {
    if (firebase.messaging.isSupported()) {
      messaging = firebase.messaging();
    }
  } else if (firebase.messaging) {
    messaging = firebase.messaging();
  }
} catch (err) {
  console.log('[FCM SW] Messaging init warning:', err);
}

if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);
    
    const notificationTitle = payload.notification?.title || payload.data?.title || 'New Whisper Received! 🤫';
    const notificationBody = payload.notification?.body || payload.data?.body || 'Someone just sent you a new anonymous encrypted whisper. Tap to decrypt and read.';
    const clickUrl = payload.data?.url || payload.data?.click_action || '/dashboard';
    
    const notificationOptions = {
      body: notificationBody,
      icon: payload.notification?.icon || payload.data?.icon || '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'whisper-new-msg-' + Date.now(),
      renotify: true,
      requireInteraction: false,
      data: {
        url: clickUrl,
        dateOfArrival: Date.now(),
        mode: payload.data?.mode || 'anonymous'
      },
      actions: [
        {
          action: 'open_inbox',
          title: 'Open Whisper 🚀'
        }
      ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Handle service worker lifecycle and auto-update
self.addEventListener('install', (event) => {
  // Allow new service worker to activate
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data && (event.data.type === 'SKIP_WAITING' || event.data === 'skipWaiting')) {
    self.skipWaiting();
  }
});

// Handle notification click to focus tab or open dashboard
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetPath = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, focus it and navigate to dashboard if needed
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (client.url.includes('/dashboard')) {
            return client.focus();
          } else {
            return client.navigate(targetPath).then((c) => c?.focus());
          }
        }
      }
      // If no tab is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetPath);
      }
    })
  );
});
