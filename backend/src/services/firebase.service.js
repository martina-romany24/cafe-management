console.log('=== firebase.service.js LOADED ===');
let messaging = null;
let firebaseEnabled = false;

try {
  const admin = require('firebase-admin');
  const { getMessaging } = require('firebase-admin/messaging');
  const fs = require('fs');
  const path = require('path');

  console.log('Firebase admin loaded');
  console.log('getMessaging available:', typeof getMessaging);

  // Initialize Firebase Admin with your service account key
  const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');

  if (fs.existsSync(serviceAccountPath)) {
    console.log('Service account file found');
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    console.log('Service account loaded');
    console.log('Trying to initialize app with credential.cert...');

    if (!admin.apps || admin.apps.length === 0) {
      // Use the correct method for Firebase Admin v14
      const credential = admin.cert(serviceAccount);

      admin.initializeApp({
        credential: credential,
      });
    }

    // Get messaging using getMessaging function
    messaging = getMessaging();
    firebaseEnabled = true;
    console.log('Firebase Admin initialized successfully');
  } else {
    console.warn('Firebase service account file not found. Push notifications will be disabled.');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message);
  console.error('Full error:', error);
  console.warn('Push notifications will be disabled.');
  firebaseEnabled = false;
}

/**
 * Send push notification to a specific user
 * @param {string} fcmToken - The FCM token of the user
 * @param {object} notification - The notification payload
 * @param {object} data - Additional data to send
 */
async function sendToUser(fcmToken, notification, data = {}) {
  if (!messaging) {
    console.log('Firebase messaging not initialized, skipping push notification');
    return;
  }

  if (!fcmToken) {
    console.log('No FCM token provided, skipping push notification');
    return;
  }

  const message = {
    token: fcmToken,
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: data,
    android: {
      notification: {
        sound: 'default',
        icon: 'ic_notification',
        color: '#4CAF50',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  try {
    const response = await messaging.send(message);
    console.log('Successfully sent message:', response);
    return response;
  } catch (error) {
    if (error.code === 'messaging/registration-token-not-registered') {
      console.log('FCM token is no longer valid, it should be removed from database');
      // You might want to remove the invalid token from your database
    } else {
      console.error('Error sending message:', error);
    }
    throw error;
  }
}

/**
 * Send push notification to multiple users.
 *
 * NOTE: This used to call messaging.sendMulticast(), which was removed from
 * newer firebase-admin versions (replaced by sendEachForMulticast). Rather
 * than depend on which version is installed, this sends each token
 * individually via the same messaging.send() used by sendToUser — a bit more
 * verbose, but guaranteed to work across all firebase-admin versions and
 * makes per-token failures easy to see individually.
 *
 * @param {Array<string>} fcmTokens - Array of FCM tokens
 * @param {object} notification - The notification payload
 * @param {object} data - Additional data to send
 */
async function sendToMultipleUsers(fcmTokens, notification, data = {}) {
  if (!messaging) {
    console.log('Firebase messaging not initialized, skipping push notifications');
    return;
  }

  if (!fcmTokens || fcmTokens.length === 0) {
    console.log('No FCM tokens provided, skipping push notifications');
    return;
  }

  const results = await Promise.allSettled(
    fcmTokens.map((token) => sendToUser(token, notification, data))
  );

  const successCount = results.filter((r) => r.status === 'fulfilled').length;
  const failedTokens = fcmTokens.filter((_, i) => results[i].status === 'rejected');

  console.log(`Push notifications: ${successCount}/${fcmTokens.length} sent successfully`);
  if (failedTokens.length > 0) {
    console.log('Failed tokens:', failedTokens);
    // You might want to remove invalid tokens from your database
  }

  return { successCount, failureCount: failedTokens.length, failedTokens };
}

module.exports = { sendToUser, sendToMultipleUsers };