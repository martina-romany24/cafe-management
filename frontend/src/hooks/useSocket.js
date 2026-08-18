import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { messaging, getToken } from '../config/firebaseConfig';
import { updateMyFcmToken } from '../api/endpoints';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
// From Firebase Console -> Project settings -> Cloud Messaging -> Web Push certificates
const VAPID_KEY = 'BFz2yKU_-jbRJkmg9dZ_ouK6dUl7wlDC08wA1_VfJFRVdZLykMOP0Xun43yYdFdVndmnsBLOUaYG6C94bMWtC68';

/**
 * Requests notification permission and registers this device's FCM token
 * with the backend, so it can receive push notifications even when the tab
 * isn't focused. Silently does nothing if permission is denied or the
 * browser doesn't support it — push is a nice-to-have on top of the in-app
 * toast/bell, not a requirement.
 */
async function registerPushToken() {
  try {
    if (!('Notification' in window)) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted:', permission);
      return;
    }

    const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!fcmToken) {
      console.warn('Could not obtain an FCM token');
      return;
    }

    await updateMyFcmToken(fcmToken);
    console.log('FCM token registered with backend');
  } catch (err) {
    // Never let push-notification setup break the rest of the app.
    console.error('Error registering FCM push token:', err);
  }
}

/**
 * Connects to the backend Socket.io server and invalidates the relevant
 * queries whenever a domain event arrives, so all connected branches/HQ see
 * changes instantly without manual refresh. Also listens for 'notification'
 * events (new sale, product/margin update, monthly report ready) — shows a
 * toast and refreshes the notification bell's data live, and registers this
 * device for push notifications (delivered even when the tab isn't focused).
 */
export function useSocket() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    registerPushToken();

    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
    });

    socket.on('product_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    });

    socket.on('order_created', () => {
      queryClient.invalidateQueries({ queryKey: ['sales-summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin-report'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    });

    socket.on('order_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    });

    socket.on('table_transferred', () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    });

    socket.on('table_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    });

    // New: real-time in-app notifications (new_order / product_updated /
    // monthly_report_ready). Toast now, and refresh the bell's data so the
    // unread badge + dropdown list stay in sync without a manual refresh.
    socket.on('notification', (payload) => {
      toast(payload.message, { icon: '🔔', duration: 5000 });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [token, queryClient]);
}