const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const controller = require('../controllers/product.controller');

const router = express.Router();

const productCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  basePrice: z.number().positive(),
  category: z.string().optional(),
  defaultMargin: z.number().optional(),
  marginType: z.enum(['percentage', 'fixed']).optional(),
});

const productUpdateSchema = productCreateSchema.partial();

const activeSchema = z.object({ isActive: z.boolean() });

const pricingSchema = z.object({
  branchId: z.string().uuid(),
  marginType: z.enum(['percentage', 'fixed']),
  marginValue: z.number(),
});

const previewSchema = z.object({
  basePrice: z.number().positive(),
  marginType: z.enum(['percentage', 'fixed']),
  marginValue: z.number(),
});

// Both roles can list — service layer decides what fields to expose per role.
router.get('/', authenticate, controller.list);

// Everything below is admin-only. Even a manually-crafted request from a
// branch manager token is rejected here by requireRole('admin').
router.post('/', authenticate, requireRole('admin'), validate(productCreateSchema), controller.create);
router.put('/:id', authenticate, requireRole('admin'), validate(productUpdateSchema), controller.update);
router.delete('/:id', authenticate, requireRole('admin'), controller.remove);
router.patch('/:id/active', authenticate, requireRole('admin'), validate(activeSchema), controller.setActive);
router.post('/:id/pricing', authenticate, requireRole('admin'), validate(pricingSchema), controller.upsertPricing);
router.post('/pricing/preview', authenticate, requireRole('admin'), validate(previewSchema), controller.previewPricing);

module.exports = router;
