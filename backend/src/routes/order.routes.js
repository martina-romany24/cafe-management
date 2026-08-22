const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const controller = require('../controllers/order.controller');

const router = express.Router();

const orderCreateSchema = z.object({
  branchId: z.string().optional(), // required only for admin; ignored for branch_manager
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

const tableOrderCreateSchema = z.object({
  // Unused by the controller now (branchId is always derived from the table
  // itself), but the frontend still sends it — accept both undefined AND null
  // (a branchless table's branchId is null) so validation doesn't reject it.
  branchId: z.string().nullish(),
  tableId: z.string().uuid(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

const addItemsSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

// `items`: array of { itemId, quantity } — quantity is how many units of that
// item are being paid for now (can be less than the item's remaining quantity).
const splitBillSchema = z.object({
  items: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

// `items` is OPTIONAL: when provided, only the given quantity of each specified
// order item is moved to the destination table (partial transfer); when omitted,
// the whole order is transferred (legacy behavior).
const transferOrderSchema = z.object({
  fromTableId: z.string().uuid(),
  toTableId: z.string().uuid(),
  items: z
    .array(
      z.object({
        itemId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1)
    .optional(),
});

router.post('/', authenticate, requireRole('admin', 'branch_manager'), validate(orderCreateSchema), controller.create);
router.get('/summary', authenticate, requireRole('admin', 'branch_manager'), controller.branchSummary);
router.get('/top-products', authenticate, requireRole('admin', 'branch_manager'), controller.topProducts);
router.get('/admin-report', authenticate, requireRole('admin'), controller.adminReport);
router.get('/all', authenticate, requireRole('admin'), controller.getAllOrders);

// Table-specific order routes (must come before /:id routes)
router.post('/table-order', authenticate, requireRole('admin', 'branch_manager'), validate(tableOrderCreateSchema), controller.createTableOrder);
router.get('/table/:tableId', authenticate, requireRole('admin', 'branch_manager'), controller.getOrderByTable);
router.post('/:id/items', authenticate, requireRole('admin', 'branch_manager'), validate(addItemsSchema), controller.addItemsToOrder);
router.post('/:id/split-bill', authenticate, requireRole('admin', 'branch_manager'), validate(splitBillSchema), controller.splitBill);
router.post('/:id/transfer', authenticate, requireRole('admin', 'branch_manager'), validate(transferOrderSchema), controller.transferOrder);
router.delete('/:id', authenticate, requireRole('admin'), controller.deleteOrder);

module.exports = router;