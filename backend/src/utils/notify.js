const notificationService = require('../services/notification.service');

/**
 * Persists a Notification row for each userId, then emits a single
 * 'notification' socket event to `room` so anyone currently connected gets
 * the toast + bell-badge update immediately. Users who are offline at the
 * time simply see it next time they load GET /notifications.
 */
async function notify(io, { userIds, type, message, relatedOrderId = null, room }) {
  const created = await notificationService.createForUsers(userIds, { type, message, relatedOrderId });

  if (io && room) {
    io.to(room).emit('notification', {
      type,
      message,
      relatedOrderId,
      createdAt: new Date().toISOString(),
    });
  }

  return created;
}

module.exports = { notify };