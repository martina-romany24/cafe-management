const branchService = require('../services/branch.service');

async function list(req, res, next) {
  try {
    // branch_manager only sees their own branch entry
    if (req.user.role === 'branch_manager') {
      const branch = await branchService.get(req.user.branchId);
      return res.json(branch ? [branch] : []);
    }
    const branches = await branchService.list();
    res.json(branches);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const branch = await branchService.create(req.body);
    res.status(201).json(branch);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const branch = await branchService.update(req.params.id, req.body);
    res.json(branch);
  } catch (err) {
    next(err);
  }
}

async function setActive(req, res, next) {
  try {
    const branch = await branchService.setActive(req.params.id, req.body.isActive);
    res.json(branch);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, setActive };
