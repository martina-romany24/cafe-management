# Firebase Cloud Messaging Setup Guide

This guide will help you set up Firebase Cloud Messaging (FCM) for push notifications in your cafe management system.

## Prerequisites
- A Firebase project (create one at https://console.firebase.google.com/)
- Node.js and npm installed

## Frontend Setup

### 1. Get Firebase Configuration

1. Go to Firebase Console: https://console.firebase.google.com/
2. Create a new project or select existing one
3. Go to Project Settings → General → Your apps
4. Add a Web app
5. Copy the Firebase configuration object

### 2. Update Firebase Config

Replace the placeholder values in `frontend/src/config/firebaseConfig.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Update Service Worker

Replace the same config in `frontend/public/firebase-messaging-sw.js`.

### 4. Get VAPID Key

1. In Firebase Console, go to Project Settings → Cloud Messaging
2. Generate a new Web Push certificate pair
3. Copy the VAPID key
4. Update `frontend/src/hooks/useNotifications.js`:

```javascript
const fcmToken = await getToken(messaging, {
  vapidKey: 'YOUR_VAPID_KEY_HERE'
});
```

## Backend Setup

### 1. Get Service Account Key

1. In Firebase Console, go to Project Settings → Service accounts
2. Click "Generate new private key"
3. Download the JSON file
4. Rename it to `firebase-service-account.json`
5. Place it in the `backend/` directory (same level as package.json)

**Important:** Never commit this file to version control! It's already in `.gitignore`.

### 2. Run Database Migration

Since we added the `fcmToken` field to the User model, you need to update your database:

```bash
cd backend
npx prisma migrate dev --name add_fcm_token
```

### 3. Restart Backend Server

After the migration, restart your backend server to apply the changes.

## Testing Push Notifications

### 1. Test in Browser

1. Start your frontend application
2. Open browser DevTools → Console
3. You should see "Service Worker registered" message
4. When you log in, you'll be prompted to allow notifications
5. Accept the notification permission
6. Check console for "FCM Token:" message

### 2. Test Push Notification

1. Create a new order or trigger any notification event
2. You should receive:
   - In-app toast notification
   - Browser push notification (if tab is in background)
   - System notification (if browser is closed)

## Troubleshooting

### Notifications not showing on device

1. **Check browser permissions**: Make sure notifications are allowed in browser settings
2. **Check service worker**: Open DevTools → Application → Service Workers to verify it's running
3. **Check FCM token**: Look for "FCM Token:" in browser console
4. **Check backend logs**: Look for "FCM token registered" message
5. **Check Firebase Console**: Go to Cloud Messaging to see if messages are being sent

### Service worker not registering

1. Make sure you're serving the app over HTTPS (required for service workers)
2. Check that `firebase-messaging-sw.js` is in the `public/` folder
3. Clear browser cache and try again

### FCM token not being saved

1. Check that the backend is running
2. Check browser console for socket connection errors
3. Verify the database migration was successful

## Production Considerations

1. **HTTPS**: Service workers require HTTPS in production
2. **VAPID Key**: Use the same VAPID key in production as in development
3. **Service Account**: Keep the service account key secure and never expose it in frontend code
4. **Error Handling**: The system gracefully handles push notification failures - in-app notifications will still work

## Additional Resources

- Firebase Cloud Messaging Documentation: https://firebase.google.com/docs/cloud-messaging
- Web Push Notifications: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- Service Worker API: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
