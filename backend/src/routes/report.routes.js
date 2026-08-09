const express = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const controller = require('../controllers/report.controller');

const router = express.Router();

const recalcSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  branchId: z.string().uuid().optional(),
});

// Monthly reports (with full profit/HQ breakdown) are admin-only.
router.use(authenticate, requireRole('admin'));

router.get('/', controller.list);
router.post('/recalculate', validate(recalcSchema), controller.recalculate);
router.get('/export/excel', controller.exportExcel);
router.get('/export/pdf', controller.exportPdf);

module.exports = router;
