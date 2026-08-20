importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDtSxtYv3fmnYamPG-UJFnUjjBzZZ1bm1g",
  authDomain: "cafe-management-250fa.firebaseapp.com",
  projectId: "cafe-management-250fa",
  storageBucket: "cafe-management-250fa.appspot.com",
  messagingSenderId: "1004958043689",
  appId: "1:809261255574:web:d9268852757280b58dabb7"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
