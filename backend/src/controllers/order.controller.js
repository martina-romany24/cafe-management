const orderService = require('../services/order.service');

async function create(req, res, next) {
  try {
    // branch managers can only create orders for their own branch — branchId
    // is taken from the authenticated user's token, never from the request body.
    const branchId = req.user.role === 'admin' ? req.body.branchId : req.user.branchId;
    const order = await orderService.createOrder(branchId, req.user.id, req.body.items);
    req.io.to(`branch:${branchId}`).emit('order_created', { orderId: order.id });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

async function branchSummary(req, res, next) {
  try {
    const branchId = req.user.role === 'admin' ? req.query.branchId : req.user.branchId;
    if (!branchId) return res.status(400).json({ message: 'branchId is required' });

    const { from, to } = req.query;
    const summary = await orderService.branchSalesSummary(branchId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

async function adminReport(req, res, next) {
  try {
    const { branchId, from, to } = req.query;
    const report = await orderService.adminSalesReport({
      branchId: branchId || undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    res.json(report);
  } catch (err) {
    next(err);
  }
}

async function topProducts(req, res, next) {
  try {
    const branchId = req.user.role === 'admin' ? req.query.branchId : req.user.branchId;
    const { from, to, limit } = req.query;
    const products = await orderService.topProducts(branchId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
}

async function getAllOrders(req, res, next) {
  try {
    const { branchId, from, to } = req.query;
    const orders = await orderService.getAllOrders({
      branchId: branchId || undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, branchSummary, adminReport, topProducts, getAllOrders };
