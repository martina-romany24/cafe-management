const prisma = require('../config/prisma');
const { calculatePricing } = require('../utils/pricing');

/**
 * Creates an order for a branch. Recomputes prices server-side from the
 * CURRENT product basePrice + branch margin (never trusts client-sent prices),
 * then snapshots priceAtSale/basePriceAtSale onto each OrderItem so historical
 * orders remain accurate even if prices change later.
 * If duplicate products are in the items array, they are merged into a single item with combined quantity.
 */
async function createOrder(branchId, userId, items) {
  // items: [{ productId, quantity }]
  return prisma.$transaction(async (tx) => {
    let totalAmount = 0;
    const mergedItems = {};

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

      // Merge items with same productId and price
      const key = `${item.productId}_${Number(calc.finalPrice)}`;
      if (mergedItems[key]) {
        mergedItems[key].quantity += item.quantity;
      } else {
        mergedItems[key] = {
          productId: item.productId,
          quantity: item.quantity,
          priceAtSale: calc.finalPrice,
          basePriceAtSale: pricing.product.basePrice,
        };
      }
    }

    const orderItemsData = Object.values(mergedItems);
    totalAmount = orderItemsData.reduce((sum, item) => sum + Number(item.priceAtSale) * item.quantity, 0);

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
    branchId: branchId ? branchId : { not: null }, // exclude branchless (admin-only table) orders entirely
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
 * If duplicate products are in the items array, they are merged into a single item with combined quantity.
 * branchId is no longer accepted as a parameter — it's always derived from the
 * table itself (table.branchId), since the table is the source of truth for
 * which branch (if any) an order belongs to. A branchless table (table.branchId
 * === null) always uses the product's basePrice directly, with no branch lookup.
 */
async function createTableOrder(userId, tableId, items) {
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

    const branchId = table.branchId; // null for admin-only tables

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

    // Create order with items - merge duplicates
    let totalAmount = 0;
    const mergedItems = {};

    for (const item of items) {
      const pricing = branchId
        ? await tx.branchProductPricing.findUnique({
            where: { branchId_productId: { branchId, productId: item.productId } },
            include: { product: true },
          })
        : null;

      let finalPrice;
      let basePrice;

      if (!pricing) {
        // No branch (or no branch-specific pricing): get product directly and use basePrice
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || !product.isActive) {
          const err = new Error(`Product not available: ${item.productId}`);
          err.status = 400;
          throw err;
        }

        // For admin, use basePrice directly without margin calculation
        finalPrice = product.basePrice;
        basePrice = product.basePrice;
      } else {
        if (!pricing.product.isActive) {
          const err = new Error(`Product not available for this branch: ${item.productId}`);
          err.status = 400;
          throw err;
        }

        // For admin, use basePrice directly without margin calculation
        finalPrice = pricing.product.basePrice;
        basePrice = pricing.product.basePrice;
      }

      // Merge items with same productId and price
      const key = `${item.productId}_${Number(finalPrice)}`;
      if (mergedItems[key]) {
        mergedItems[key].quantity += item.quantity;
      } else {
        mergedItems[key] = {
          productId: item.productId,
          quantity: item.quantity,
          priceAtSale: finalPrice,
          basePriceAtSale: basePrice,
        };
      }
    }

    const orderItemsData = Object.values(mergedItems);
    totalAmount = orderItemsData.reduce((sum, item) => sum + Number(item.priceAtSale) * item.quantity, 0);

    const order = await tx.order.create({
      data: {
        branchId,
        userId,
        tableId,
        totalAmount,
        status: 'open',
        items: { create: orderItemsData },
      },
      include: { items: { include: { product: true } }, branch: { select: { id: true, name: true } } },
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
 * If a product already exists in the order, increases the quantity instead of creating a new item.
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

    for (const item of items) {
      const pricing = order.branchId
        ? await tx.branchProductPricing.findUnique({
            where: { branchId_productId: { branchId: order.branchId, productId: item.productId } },
            include: { product: true },
          })
        : null;

      let finalPrice;
      let basePrice;

      if (!pricing) {
        // If no branch-specific pricing, get product directly and use basePrice
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          const err = new Error(`Product not found: ${item.productId}`);
          err.status = 400;
          throw err;
        }

        if (!product.isActive) {
          const err = new Error(`Product not available: ${item.productId}`);
          err.status = 400;
          throw err;
        }

        // For admin, use basePrice directly without margin calculation
        finalPrice = product.basePrice;
        basePrice = product.basePrice;
      } else {
        if (!pricing.product.isActive) {
          const err = new Error(`Product not available for this branch: ${item.productId}`);
          err.status = 400;
          throw err;
        }

        // For admin, use basePrice directly without margin calculation
        finalPrice = pricing.product.basePrice;
        basePrice = pricing.product.basePrice;
      }

      // Check if product already exists in the order
      const existingItem = order.items.find(
        i => i.productId === item.productId &&
             Number(i.priceAtSale) === Number(finalPrice)
      );

      if (existingItem) {
        // Update quantity of existing item
        await tx.orderItem.update({
          where: { id: existingItem.id },
          data: { quantity: { increment: item.quantity } },
        });
        additionalAmount += finalPrice * item.quantity;
      } else {
        // Create new item
        await tx.orderItem.create({
          data: {
            orderId,
            productId: item.productId,
            quantity: item.quantity,
            priceAtSale: finalPrice,
            basePriceAtSale: basePrice,
          },
        });
        additionalAmount += finalPrice * item.quantity;
      }
    }

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        totalAmount: { increment: additionalAmount },
      },
      include: { items: { include: { product: true } } },
    });

    return updatedOrder;
  });
}

/**
 * Process split bill: mark a chosen quantity of specific items as paid and
 * calculate the partial total. `items` is an array of { itemId, quantity },
 * where quantity is how many units of that item are being paid for now
 * (must not exceed the item's remaining unpaid quantity).
 */
async function splitBill(orderId, items) {
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

    for (const req of items) {
      const item = await tx.orderItem.findUnique({
        where: { id: req.itemId },
      });

      if (!item || item.orderId !== orderId) {
        const err = new Error(`Invalid item: ${req.itemId}`);
        err.status = 400;
        throw err;
      }

      const remainingQuantity = item.quantity - item.paidQuantity;
      if (remainingQuantity <= 0) {
        continue; // Already fully paid
      }

      if (req.quantity > remainingQuantity) {
        const err = new Error(
          `Requested quantity (${req.quantity}) exceeds remaining quantity (${remainingQuantity}) for item ${req.itemId}`
        );
        err.status = 400;
        throw err;
      }

      const itemTotal = Number(item.priceAtSale) * req.quantity;
      splitTotal += itemTotal;

      // Mark the requested quantity as paid (not necessarily the full item).
      await tx.orderItem.update({
        where: { id: req.itemId },
        data: {
          paidQuantity: { increment: req.quantity },
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
        data: {
          status: 'closed',
          tableId: null, // Clear tableId to allow new orders for this table
        },
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
 *
 * `items` (optional): array of { itemId, quantity }. When provided, only the
 * given quantity of each specified order item is moved — the source item's
 * quantity is decremented (or the row deleted if the full remaining quantity
 * is moved), and a matching item is created/merged on the destination order.
 * Only up to the item's remaining unpaid quantity (quantity - paidQuantity)
 * may be moved.
 *
 * When `items` is omitted, the entire order (all items, in full) is
 * transferred — same as the original whole-order behavior.
 */
async function transferOrder(orderId, fromTableId, toTableId, userId, items = null) {
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

    // ---- Partial transfer: specific items, with a chosen quantity each ----
    if (items && items.length > 0) {
      // Validate every requested item up-front before mutating anything.
      for (const req of items) {
        const orderItem = order.items.find((i) => i.id === req.itemId);
        if (!orderItem) {
          const err = new Error(`Item not found in this order: ${req.itemId}`);
          err.status = 400;
          throw err;
        }
        const availableQty = orderItem.quantity - orderItem.paidQuantity;
        if (req.quantity > availableQty) {
          const err = new Error(
            `Requested quantity (${req.quantity}) exceeds available quantity (${availableQty}) for item ${req.itemId}`
          );
          err.status = 400;
          throw err;
        }
      }

      // Find or create the destination order.
      let destOrder = await tx.order.findFirst({
        where: { tableId: toTableId, status: 'open' },
      });

      if (!destOrder) {
        destOrder = await tx.order.create({
          data: {
            branchId: order.branchId,
            userId,
            tableId: toTableId,
            totalAmount: 0,
            status: 'open',
          },
        });
        await tx.table.update({ where: { id: toTableId }, data: { status: 'occupied' } });
      }

      for (const req of items) {
        const orderItem = order.items.find((i) => i.id === req.itemId);
        const moveQty = req.quantity;

        // Reduce (or remove) the item on the source order.
        if (moveQty === orderItem.quantity) {
          await tx.orderItem.delete({ where: { id: orderItem.id } });
        } else {
          await tx.orderItem.update({
            where: { id: orderItem.id },
            data: { quantity: { decrement: moveQty } },
          });
        }

        // Merge into (or create on) the destination order.
        const destExistingItem = await tx.orderItem.findFirst({
          where: {
            orderId: destOrder.id,
            productId: orderItem.productId,
            priceAtSale: orderItem.priceAtSale,
          },
        });

        if (destExistingItem) {
          await tx.orderItem.update({
            where: { id: destExistingItem.id },
            data: { quantity: { increment: moveQty } },
          });
        } else {
          await tx.orderItem.create({
            data: {
              orderId: destOrder.id,
              productId: orderItem.productId,
              quantity: moveQty,
              priceAtSale: orderItem.priceAtSale,
              basePriceAtSale: orderItem.basePriceAtSale,
            },
          });
        }
      }

      // Recompute source order total; close it and free the table if now empty.
      const remainingSourceItems = await tx.orderItem.findMany({ where: { orderId } });
      const newSourceTotal = remainingSourceItems.reduce(
        (sum, i) => sum + Number(i.priceAtSale) * i.quantity,
        0
      );
      await tx.order.update({ where: { id: orderId }, data: { totalAmount: newSourceTotal } });

      if (remainingSourceItems.length === 0) {
        await tx.order.update({ where: { id: orderId }, data: { status: 'closed', tableId: null } });
        await tx.table.update({ where: { id: fromTableId }, data: { status: 'available' } });
      }

      // Recompute destination order total.
      const destItemsFinal = await tx.orderItem.findMany({ where: { orderId: destOrder.id } });
      const destTotal = destItemsFinal.reduce((sum, i) => sum + Number(i.priceAtSale) * i.quantity, 0);
      const finalDestOrder = await tx.order.update({
        where: { id: destOrder.id },
        data: { totalAmount: destTotal },
        include: { items: { include: { product: true } } },
      });

      await tx.tableTransferLog.create({
        data: { fromTableId, toTableId, orderId, transferredBy: userId },
      });

      return finalDestOrder;
    }

    // ---- Whole-order transfer (no items specified) ----
    const existingOrder = await tx.order.findFirst({
      where: { tableId: toTableId, status: 'open' },
      include: { items: true },
    });

    if (existingOrder) {
      // Merge all items into the existing destination order.
      for (const item of order.items) {
        const existingItem = existingOrder.items.find(
          (i) => i.productId === item.productId && Number(i.priceAtSale) === Number(item.priceAtSale)
        );

        if (existingItem) {
          await tx.orderItem.update({
            where: { id: existingItem.id },
            data: { quantity: { increment: item.quantity } },
          });
        } else {
          await tx.orderItem.create({
            data: {
              orderId: existingOrder.id,
              productId: item.productId,
              quantity: item.quantity,
              priceAtSale: item.priceAtSale,
              basePriceAtSale: item.basePriceAtSale,
            },
          });
        }
      }

      const updatedTargetOrder = await tx.order.findUnique({
        where: { id: existingOrder.id },
        include: { items: true },
      });

      const newTotal = updatedTargetOrder.items.reduce(
        (sum, item) => sum + Number(item.priceAtSale) * item.quantity,
        0
      );

      const targetOrder = await tx.order.update({
        where: { id: existingOrder.id },
        data: { totalAmount: newTotal },
        include: { items: { include: { product: true } } },
      });

      // Close source order and free the table
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'closed', tableId: null },
      });

      await tx.table.update({
        where: { id: fromTableId },
        data: { status: 'available' },
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

      return targetOrder;
    } else {
      // Transfer the order to available table
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { tableId: toTableId },
        include: { items: { include: { product: true } } },
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
    }
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