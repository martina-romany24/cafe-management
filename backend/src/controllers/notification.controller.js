const notificationService = require('../services/notification.service');

async function list(req, res, next) {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    const notifications = await notificationService.listForUser(req.user.id, { unreadOnly });
    res.json(notifications);
  } catch (err) {
    next(err);
  }
}

async function unreadCount(req, res, next) {
  try {
    const count = await notificationService.unreadCount(req.user.id);
    res.json({ count });
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const notification = await notificationService.markAsRead(req.params.id, req.user.id);
    res.json(notification);
  } catch (err) {
    next(err);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, unreadCount, markAsRead, markAllAsRead };