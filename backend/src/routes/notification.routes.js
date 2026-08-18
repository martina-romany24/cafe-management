const express = require('express');
const { authenticate } = require('../middleware/auth');
const controller = require('../controllers/notification.controller');

const router = express.Router();

router.get('/', authenticate, controller.list);
router.get('/unread-count', authenticate, controller.unreadCount);
router.patch('/:id/read', authenticate, controller.markAsRead);
router.patch('/read-all', authenticate, controller.markAllAsRead);

module.exports = router;