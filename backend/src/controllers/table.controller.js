const tableService = require('../services/table.service');

async function list(req, res, next) {
  try {
    const branchId = req.user.role === 'admin' ? req.query.branchId : req.user.branchId;
    // Admin can view all tables if no branchId is provided
    if (!branchId && req.user.role !== 'admin') {
      return res.status(400).json({ message: 'branchId is required' });
    }

    const tables = await tableService.list(branchId);
    res.json(tables);
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const table = await tableService.get(req.params.id);
    if (!table) return res.status(404).json({ message: 'Table not found' });
    res.json(table);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const table = await tableService.create(req.body);
    req.io.emit('table_updated', { type: 'created', tableId: table.id });
    res.status(201).json(table);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const table = await tableService.update(req.params.id, req.body);
    req.io.emit('table_updated', { type: 'updated', tableId: table.id });
    res.json(table);
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status } = req.body;
    const table = await tableService.updateStatus(req.params.id, status);
    req.io.emit('table_updated', { type: 'status_changed', tableId: table.id, status });
    res.json(table);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const table = await tableService.remove(req.params.id);
    req.io.emit('table_updated', { type: 'deleted', tableId: table.id });
    res.json({ message: 'Table deleted', table });
  } catch (err) {
    next(err);
  }
}

async function getAvailable(req, res, next) {
  try {
    const branchId = req.user.role === 'admin' ? req.query.branchId : req.user.branchId;
    if (!branchId) return res.status(400).json({ message: 'branchId is required' });

    const tables = await tableService.getAvailableTables(branchId);
    res.json(tables);
  } catch (err) {
    next(err);
  }
}

module.exports = { 
  list, 
  get, 
  create, 
  update, 
  updateStatus, 
  remove, 
  getAvailable 
};
