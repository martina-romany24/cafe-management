const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const controller = require('../controllers/user.controller');

const router = express.Router();

const userCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['admin', 'branch_manager']),
  branchId: z.string().uuid().optional().nullable(),
});

const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  branchId: z.string().uuid().optional().nullable(),
});

const activeSchema = z.object({ isActive: z.boolean() });

const fcmTokenSchema = z.object({
  fcmToken: z.string().min(1),
});

// Self-service — must come BEFORE the admin-only blanket restriction below,
// since a branch_manager needs to register their own device's push token too.
router.patch('/me/fcm-token', authenticate, validate(fcmTokenSchema), controller.setMyFcmToken);

// Everything below is admin-only, enforced server-side regardless of frontend.
router.use(authenticate, requireRole('admin'));

router.get('/', controller.list);
router.post('/', validate(userCreateSchema), controller.create);
router.put('/:id', validate(userUpdateSchema), controller.update);
router.patch('/:id/active', validate(activeSchema), controller.setActive);

module.exports = router;