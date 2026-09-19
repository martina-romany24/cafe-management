const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

/**
 * Initializes Socket.io. Two kinds of clients connect here:
 * 1. Staff members, who authenticate with a JWT issued at login.
 * 2. The admin printer service, which authenticates with a fixed
 *    shared secret (PRINTER_TOKEN) instead of a JWT.
 * Clients are placed into a room scoped to their branch (or "hq" for
 * admins/printer), so branch-specific events never leak across branches.
 */
function initSocket(httpServer) {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175'
  ];
  if (process.env.CLIENT_URL) {
    allowedOrigins.push(process.env.CLIENT_URL);
  }
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Unauthorized'));

      // الاتصال الخاص بخدمة طباعة الأدمن: يستخدم توكن ثابت وليس JWT
      if (process.env.PRINTER_TOKEN && token === process.env.PRINTER_TOKEN) {
        socket.user = { role: 'printer', isPrinterService: true };
        return next();
      }

      // الاتصال العادي لأي موظف: يستخدم JWT حقيقي
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.user.role === 'admin' || socket.user.role === 'printer') {
      socket.join('hq');
    } else if (socket.user.branchId) {
      socket.join(`branch:${socket.user.branchId}`);
    }

    socket.on('register_fcm_token', async ({ fcmToken }) => {
      // خدمة الطابعة لا تحتاج تسجيل FCM token
      if (socket.user.isPrinterService) return;
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