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
    const branchId = req.user.role === 'admin' ? req.body.branchId : req.user.branchId;
    const { tableId, items } = req.body;
    const order = await orderService.createTableOrder(branchId, req.user.id, tableId, items);
    req.io.to(`branch:${branchId}`).emit('order_created', { orderId: order.id, tableId });
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

async function addItemsToOrder(req, res, next) {
  try {
    const { items } = req.body;
    console.log('addItemsToOrder - orderId:', req.params.id, 'items:', items);
    console.log('Request body:', req.body);
    console.log('Request params:', req.params);
    const order = await orderService.addItemsToOrder(req.params.id, items);
    console.log('Emitting order_updated event for order:', order.id);
    req.io.to(`branch:${order.branchId}`).emit('order_updated', { orderId: order.id });
    res.json(order);
  } catch (err) {
    console.error('addItemsToOrder error:', err);
    console.error('Error message:', err.message);
    console.error('Error status:', err.status);
    next(err);
  }
}

async function splitBill(req, res, next) {
  try {
    const { itemIds } = req.body;
    const result = await orderService.splitBill(req.params.id, itemIds);
    // Get order to find branchId
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      select: { branchId: true }
    });
    if (order) {
      req.io.to(`branch:${order.branchId}`).emit('order_updated', { orderId: req.params.id });
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function transferOrder(req, res, next) {
  try {
    const { fromTableId, toTableId } = req.body;
    const order = await orderService.transferOrder(req.params.id, fromTableId, toTableId, req.user.id);
    req.io.to(`branch:${order.branchId}`).emit('table_transferred', { orderId: req.params.id, fromTableId, toTableId });
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
