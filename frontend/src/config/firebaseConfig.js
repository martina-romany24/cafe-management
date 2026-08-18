import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDtSxtYv3fmnYamPG-UJFnUjjBzZZ1bm1g",
  authDomain: "cafe-management-250fa.firebaseapp.com",
  projectId: "cafe-management-250fa",
  storageBucket: "cafe-management-250fa.appspot.com",
  messagingSenderId: "1004958043689",
  appId: "1:809261255574:web:d9268852757280b58dabb7"
};

const firebaseApp = initializeApp(firebaseConfig);
const messaging = getMessaging(firebaseApp);

export { firebaseApp, messaging, getToken, onMessage };
