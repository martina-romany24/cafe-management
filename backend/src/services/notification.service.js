const prisma = require('../config/prisma');
const { sendToUser, sendToMultipleUsers } = require('./firebase.service');

async function createForUsers(userIds, { type, message, relatedOrderId = null }) {
  if (!userIds || userIds.length === 0) return [];
  
  // Create in-app notifications
  const notifications = await Promise.all(
    userIds.map((userId) =>
      prisma.notification.create({
        data: { userId, type, message, relatedOrderId },
      })
    )
  );

  // Send push notifications
  try {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fcmToken: true }
    });

    const validTokens = users
      .filter(user => user.fcmToken)
      .map(user => user.fcmToken);

    if (validTokens.length > 0) {
      await sendToMultipleUsers(
        validTokens,
        {
          title: getNotificationTitle(type),
          body: message
        },
        {
          type,
          relatedOrderId: relatedOrderId || '',
          timestamp: new Date().toISOString()
        }
      );
    }
  } catch (error) {
    console.error('Error sending push notifications:', error);
    // Don't throw error - push notifications are optional
  }

  return notifications;
}

function getNotificationTitle(type) {
  switch (type) {
    case 'new_order':
      return 'طلب جديد';
    case 'product_updated':
      return 'تحديث المنتجات';
    case 'monthly_report_ready':
      return 'التقرير الشهري جاهز';
    default:
      return 'إشعار جديد';
  }
}

async function listForUser(userId, { unreadOnly = false, limit = 30 } = {}) {
  return prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

async function unreadCount(userId) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

async function markAsRead(id, userId) {
  const notification = await prisma.notification.findUnique({ where: { id } });

  if (!notification || notification.userId !== userId) {
    const err = new Error('Notification not found');
    err.status = 404;
    throw err;
  }

  return prisma.notification.update({ where: { id }, data: { isRead: true } });
}

async function markAllAsRead(userId) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

module.exports = { createForUsers, listForUser, unreadCount, markAsRead, markAllAsRead };