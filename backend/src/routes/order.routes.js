const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const controller = require('../controllers/order.controller');

const router = express.Router();

const orderCreateSchema = z.object({
  branchId: z.string().uuid().optional(), // required only for admin; ignored for branch_manager
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

router.post('/', authenticate, requireRole('admin', 'branch_manager'), validate(orderCreateSchema), controller.create);
router.get('/summary', authenticate, requireRole('admin', 'branch_manager'), controller.branchSummary);
router.get('/top-products', authenticate, requireRole('admin', 'branch_manager'), controller.topProducts);
router.get('/admin-report', authenticate, requireRole('admin'), controller.adminReport);
router.get('/all', authenticate, requireRole('admin'), controller.getAllOrders);

module.exports = router;
