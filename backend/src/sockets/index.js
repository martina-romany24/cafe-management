const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

/**
 * Initializes Socket.io. Clients authenticate with their JWT on connection
 * and are placed into a room scoped to their branch (or "hq" for admins),
 * so branch-specific events never leak across branches.
 */
function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || '*', credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.user.role === 'admin') {
      socket.join('hq');
    } else if (socket.user.branchId) {
      socket.join(`branch:${socket.user.branchId}`);
    }

    socket.on('register_fcm_token', async ({ fcmToken }) => {
      try {
        const prisma = require('../config/prisma');
        await prisma.user.update({
          where: { id: socket.user.id },
          data: { fcmToken }
        });
        console.log(`FCM token registered for user ${socket.user.id}`);
      } catch (err) {
        console.error('Error registering FCM token:', err);
      }
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

module.exports = { initSocket };
