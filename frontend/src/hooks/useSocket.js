import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/**
 * Connects to the backend Socket.io server and invalidates the products query
 * whenever a "product_updated" event arrives, so all connected branches/HQ
 * see product/price/margin changes instantly without manual refresh.
 */
export function useSocket() {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    console.log('Connecting to Socket.io at:', SOCKET_URL);
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.io connected successfully');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
    });

    socket.on('disconnect', () => {
      console.log('Socket.io disconnected');
    });

    socket.on('product_updated', () => {
      console.log('Received product_updated event');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    });

    socket.on('order_created', () => {
      console.log('Received order_created event');
      queryClient.invalidateQueries({ queryKey: ['sales-summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin-report'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    });

    socket.on('order_updated', () => {
      console.log('Received order_updated event');
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    });

    socket.on('table_transferred', () => {
      console.log('Received table_transferred event');
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    });

    socket.on('table_updated', () => {
      console.log('Received table_updated event');
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    });

    return () => {
      console.log('Disconnecting Socket.io');
      socket.disconnect();
    };
  }, [token, queryClient]);
}
