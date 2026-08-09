const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const controller = require('../controllers/branch.controller');

const router = express.Router();

const branchCreateSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
});
const branchUpdateSchema = branchCreateSchema.partial();
const activeSchema = z.object({ isActive: z.boolean() });

router.get('/', authenticate, controller.list);
router.post('/', authenticate, requireRole('admin'), validate(branchCreateSchema), controller.create);
router.put('/:id', authenticate, requireRole('admin'), validate(branchUpdateSchema), controller.update);
router.patch('/:id/active', authenticate, requireRole('admin'), validate(activeSchema), controller.setActive);

module.exports = router;
