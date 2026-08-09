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

    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('product_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    });

    socket.on('order_created', () => {
      queryClient.invalidateQueries({ queryKey: ['sales-summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin-report'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [token, queryClient]);
}
