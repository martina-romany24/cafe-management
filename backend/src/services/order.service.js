const prisma = require('../config/prisma');
const { calculatePricing } = require('../utils/pricing');

/**
 * Creates an order for a branch. Recomputes prices server-side from the
 * CURRENT product basePrice + branch margin (never trusts client-sent prices),
 * then snapshots priceAtSale/basePriceAtSale onto each OrderItem so historical
 * orders remain accurate even if prices change later.
 */
async function createOrder(branchId, userId, items) {
  // items: [{ productId, quantity }]
  return prisma.$transaction(async (tx) => {
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const pricing = await tx.branchProductPricing.findUnique({
        where: { branchId_productId: { branchId, productId: item.productId } },
        include: { product: true },
      });

      if (!pricing || !pricing.product.isActive) {
        const err = new Error(`Product not available for this branch: ${item.productId}`);
        err.status = 400;
        throw err;
      }

      const calc = calculatePricing(pricing.product.basePrice, pricing.marginType, pricing.marginValue, item.quantity);
      totalAmount += calc.totalSale;

      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        priceAtSale: calc.finalPrice,
        basePriceAtSale: pricing.product.basePrice,
      });
    }

    const order = await tx.order.create({
      data: {
        branchId,
        userId,
        totalAmount,
        items: { create: orderItemsData },
      },
      include: { items: { include: { product: true } } },
    });

    return order;
  });
}

/**
 * Branch manager report: totals + order count only, no profit breakdown.
 */
async function branchSalesSummary(branchId, { from, to } = {}) {
  const where = { branchId, ...(from || to ? { createdAt: { gte: from, lte: to } } : {}) };
  const orders = await prisma.order.findMany({ where });

  const totalSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  return {
    totalSales: Math.round(totalSales * 100) / 100,
    ordersCount: orders.length,
  };
}

/**
 * Admin report: full breakdown per branch including profit split, with optional
 * date range and branch filter.
 */
async function adminSalesReport({ branchId, from, to } = {}) {
  const where = {
    ...(branchId ? { branchId } : {}),
    ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    include: { items: true, branch: { select: { id: true, name: true } } },
  });

  const byBranch = {};
  for (const order of orders) {
    const key = order.branchId;
    if (!byBranch[key]) {
      byBranch[key] = {
        branchId: key,
        branchName: order.branch.name,
        totalSales: 0,
        branchProfit: 0,
        hqRevenue: 0,
        ordersCount: 0,
      };
    }
    byBranch[key].ordersCount += 1;
    for (const item of order.items) {
      const finalPrice = Number(item.priceAtSale);
      const basePrice = Number(item.basePriceAtSale);
      const lineTotal = finalPrice * item.quantity;
      const lineHq = basePrice * item.quantity;
      const lineProfit = lineTotal - lineHq;

      byBranch[key].totalSales += lineTotal;
      byBranch[key].hqRevenue += lineHq;
      byBranch[key].branchProfit += lineProfit;
    }
  }

  return Object.values(byBranch).map((b) => ({
    ...b,
    totalSales: Math.round(b.totalSales * 100) / 100,
    branchProfit: Math.round(b.branchProfit * 100) / 100,
    hqRevenue: Math.round(b.hqRevenue * 100) / 100,
  }));
}

async function topProducts(branchId, { from, to, limit = 5 } = {}) {
  const where = {
    order: {
      branchId,
      ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
    },
  };
  const items = await prisma.orderItem.findMany({ where, include: { product: true } });

  const tally = {};
  for (const it of items) {
    const key = it.productId;
    if (!tally[key]) tally[key] = { productId: key, name: it.product.name, quantity: 0 };
    tally[key].quantity += it.quantity;
  }

  return Object.values(tally).sort((a, b) => b.quantity - a.quantity).slice(0, limit);
}

async function getAllOrders({ branchId, from, to } = {}) {
  const where = {
    ...(branchId ? { branchId } : {}),
    ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: {
        include: {
          product: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return orders.map(order => ({
    ...order,
    totalAmount: Number(order.totalAmount),
    createdAt: order.createdAt,
    items: order.items.map(item => ({
      ...item,
      priceAtSale: Number(item.priceAtSale),
      basePriceAtSale: Number(item.basePriceAtSale),
    })),
  }));
}

/**
 * Creates an order linked to a specific table. Used when a customer sits at a table.
 */
async function createTableOrder(branchId, userId, tableId, items) {
  return prisma.$transaction(async (tx) => {
    // Check if table exists and is available
    const table = await tx.table.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      const err = new Error('Table not found');
      err.status = 404;
      throw err;
    }

    if (table.status !== 'available') {
      const err = new Error('Table is not available');
      err.status = 400;
      throw err;
    }

    // Check if there's already an active order on this table (enforced by unique constraint)
    const existingOrder = await tx.order.findFirst({
      where: {
        tableId,
        status: 'open',
      },
    });

    if (existingOrder) {
      const err = new Error('Table already has an active order');
      err.status = 400;
      throw err;
    }

    // Create order with items
    let totalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const pricing = await tx.branchProductPricing.findUnique({
        where: { branchId_productId: { branchId, productId: item.productId } },
        include: { product: true },
      });

      if (!pricing || !pricing.product.isActive) {
        const err = new Error(`Product not available for this branch: ${item.productId}`);
        err.status = 400;
        throw err;
      }

      const calc = calculatePricing(pricing.product.basePrice, pricing.marginType, pricing.marginValue, item.quantity);
      totalAmount += calc.totalSale;

      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        priceAtSale: calc.finalPrice,
        basePriceAtSale: pricing.product.basePrice,
      });
    }

    const order = await tx.order.create({
      data: {
        branchId,
        userId,
        tableId,
        totalAmount,
        status: 'open',
        items: { create: orderItemsData },
      },
      include: { items: { include: { product: true } } },
    });

    // Update table status to occupied
    await tx.table.update({
      where: { id: tableId },
      data: { status: 'occupied' },
    });

    return order;
  });
}

/**
 * Adds items to an existing table order.
 */
async function addItemsToOrder(orderId, items) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      const err = new Error('Order not found');
      err.status = 404;
      throw err;
    }

    if (order.status !== 'open') {
      const err = new Error('Order is not open');
      err.status = 400;
      throw err;
    }

    let additionalAmount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const pricing = await tx.branchProductPricing.findUnique({
        where: { branchId_productId: { branchId: order.branchId, productId: item.productId } },
        include: { product: true },
      });

      if (!pricing || !pricing.product.isActive) {
        const err = new Error(`Product not available for this branch: ${item.productId}`);
        err.status = 400;
        throw err;
      }

      const calc = calculatePricing(pricing.product.basePrice, pricing.marginType, pricing.marginValue, item.quantity);
      additionalAmount += calc.totalSale;

      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        priceAtSale: calc.finalPrice,
        basePriceAtSale: pricing.product.basePrice,
      });
    }

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        totalAmount: { increment: additionalAmount },
        items: { create: orderItemsData },
      },
      include: { items: { include: { product: true } } },
    });

    return updatedOrder;
  });
}

/**
 * Process split bill: mark specific items as paid and calculate partial total.
 */
async function splitBill(orderId, itemIds) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      const err = new Error('Order not found');
      err.status = 404;
      throw err;
    }

    let splitTotal = 0;

    for (const itemId of itemIds) {
      const item = await tx.orderItem.findUnique({
        where: { id: itemId },
      });

      if (!item || item.orderId !== orderId) {
        const err = new Error(`Invalid item: ${itemId}`);
        err.status = 400;
        throw err;
      }

      const remainingQuantity = item.quantity - item.paidQuantity;
      if (remainingQuantity <= 0) {
        continue; // Already fully paid
      }

      const itemTotal = Number(item.priceAtSale) * remainingQuantity;
      splitTotal += itemTotal;

      // Mark as fully paid
      await tx.orderItem.update({
        where: { id: itemId },
        data: {
          paidQuantity: item.quantity,
          splitAmount: { increment: itemTotal },
        },
      });
    }

    // Check if all items are paid
    const allItems = await tx.orderItem.findMany({
      where: { orderId },
    });

    const allPaid = allItems.every(item => item.paidQuantity >= item.quantity);

    if (allPaid) {
      // Close the order and free the table
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'closed' },
      });

      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: 'available' },
        });
      }
    }

    return {
      splitTotal: Math.round(splitTotal * 100) / 100,
      allPaid,
    };
  });
}

/**
 * Transfer order from one table to another.
 */
async function transferOrder(orderId, fromTableId, toTableId, userId) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      const err = new Error('Order not found');
      err.status = 404;
      throw err;
    }

    if (order.tableId !== fromTableId) {
      const err = new Error('Order is not linked to the source table');
      err.status = 400;
      throw err;
    }

    const toTable = await tx.table.findUnique({
      where: { id: toTableId },
    });

    if (!toTable) {
      const err = new Error('Destination table not found');
      err.status = 404;
      throw err;
    }

    if (toTable.status !== 'available') {
      const err = new Error('Destination table is not available');
      err.status = 400;
      throw err;
    }

    // Transfer the order
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { tableId: toTableId },
    });

    // Update table statuses
    await tx.table.update({
      where: { id: fromTableId },
      data: { status: 'available' },
    });

    await tx.table.update({
      where: { id: toTableId },
      data: { status: 'occupied' },
    });

    // Log the transfer
    await tx.tableTransferLog.create({
      data: {
        fromTableId,
        toTableId,
        orderId,
        transferredBy: userId,
      },
    });

    return updatedOrder;
  });
}

/**
 * Get order by table ID (for table management UI).
 */
async function getOrderByTable(tableId) {
  return prisma.order.findFirst({
    where: {
      tableId,
      status: 'open',
    },
    include: {
      items: {
        include: { product: true },
      },
      user: {
        select: { id: true, name: true },
      },
    },
  });
}

module.exports = { 
  createOrder, 
  branchSalesSummary, 
  adminSalesReport, 
  topProducts, 
  getAllOrders,
  createTableOrder,
  addItemsToOrder,
  splitBill,
  transferOrder,
  getOrderByTable,
};
