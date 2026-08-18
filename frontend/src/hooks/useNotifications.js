import { useEffect, useState } from 'react';
import { messaging, getToken, onMessage } from '../config/firebaseConfig';

export function useNotifications() {
  const [token, setToken] = useState(null);
  const [permission, setPermission] = useState('default');
  const [error, setError] = useState(null);

  useEffect(() => {
    requestPermission();
  }, []);

  const requestPermission = async () => {
    try {
      console.log('Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('Permission result:', permission);
      setPermission(permission);
      
      if (permission === 'granted') {
        console.log('Permission granted, getting FCM token...');
        const fcmToken = await getToken(messaging, {
          vapidKey: 'BFz2yKU_-jbRJkmg9dZ_ouK6dUl7wlDC08wA1_VfJFRVdZLykMOP0Xun43yYdFdVndmnsBLOUaYG6C94bMWtC68'
        });
        
        console.log('FCM Token result:', fcmToken);
        if (fcmToken) {
          setToken(fcmToken);
          console.log('FCM Token:', fcmToken);
        } else {
          console.warn('FCM Token is null or empty');
        }
      } else {
        console.warn('Notification permission not granted:', permission);
      }
    } catch (err) {
      setError(err);
      console.error('Error requesting notification permission:', err);
    }
  };

  const onMessageListener = () => {
    return new Promise((resolve) => {
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
    });
  };

  return { token, permission, error, requestPermission, onMessageListener };
}
