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

module.exports = { createOrder, branchSalesSummary, adminSalesReport, topProducts, getAllOrders };
