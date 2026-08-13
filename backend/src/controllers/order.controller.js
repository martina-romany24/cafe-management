const orderService = require('../services/order.service');
const prisma = require('../config/prisma');

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

async function createTableOrder(req, res, next) {
  try {
    // branchId is no longer taken from the request — the service derives it
    // from the table itself (table.branchId), which is the source of truth.
    // This also makes branchless (admin-only) tables work correctly: no
    // branchId needs to be supplied for them.
    const { tableId, items } = req.body;
    const order = await orderService.createTableOrder(req.user.id, tableId, items);
    const room = order.branchId ? `branch:${order.branchId}` : 'hq';
    req.io.to(room).emit('order_created', { orderId: order.id, tableId });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

async function addItemsToOrder(req, res, next) {
  try {
    const { items } = req.body;
    const order = await orderService.addItemsToOrder(req.params.id, items);
    req.io.to(order.branchId ? `branch:${order.branchId}` : 'hq').emit('order_updated', { orderId: order.id });
    res.json(order);
  } catch (err) {
    next(err);
  }
}

async function splitBill(req, res, next) {
  try {
    const { items } = req.body;
    const result = await orderService.splitBill(req.params.id, items);
    // Get order to find branchId
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      select: { branchId: true }
    });
    if (order) {
      req.io.to(order.branchId ? `branch:${order.branchId}` : 'hq').emit('order_updated', { orderId: req.params.id });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function transferOrder(req, res, next) {
  try {
    // `items` (array of { itemId, quantity }) is optional — when present, only
    // those quantities are moved; when absent, the whole order is transferred.
    const { fromTableId, toTableId, items } = req.body;
    const order = await orderService.transferOrder(req.params.id, fromTableId, toTableId, req.user.id, items);
    req.io.to(order.branchId ? `branch:${order.branchId}` : 'hq').emit('table_transferred', { orderId: req.params.id, fromTableId, toTableId, items });
    res.json(order);
  } catch (err) {
    next(err);
  }
}

async function getOrderByTable(req, res, next) {
  try {
    const order = await orderService.getOrderByTable(req.params.tableId);
    res.json(order);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, branchSummary, adminReport, topProducts, getAllOrders, createTableOrder, addItemsToOrder, splitBill, transferOrder, getOrderByTable };