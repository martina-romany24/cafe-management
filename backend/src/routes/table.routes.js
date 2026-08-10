const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const controller = require('../controllers/table.controller');

const router = express.Router();

const tableCreateSchema = z.object({
  branchId: z.string().uuid(),
  number: z.number().int().positive(),
  capacity: z.number().int().positive(),
});

const tableUpdateSchema = z.object({
  number: z.number().int().positive().optional(),
  capacity: z.number().int().positive().optional(),
});

const statusSchema = z.object({
  status: z.enum(['available', 'occupied', 'reserved']),
});

// Both roles can list tables for their branch
router.get('/', authenticate, controller.list);

// Get available tables for transfer
router.get('/available', authenticate, controller.getAvailable);

// Get single table
router.get('/:id', authenticate, controller.get);

// Admin only: create, update, delete tables
router.post('/', authenticate, requireRole('admin'), validate(tableCreateSchema), controller.create);
router.put('/:id', authenticate, requireRole('admin'), validate(tableUpdateSchema), controller.update);
router.delete('/:id', authenticate, requireRole('admin'), controller.remove);

// Both roles can update table status (for table management)
router.patch('/:id/status', authenticate, validate(statusSchema), controller.updateStatus);

module.exports = router;
