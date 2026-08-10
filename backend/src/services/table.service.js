const prisma = require('../config/prisma');

async function list(branchId) {
  const tables = await prisma.table.findMany({
    where: branchId ? { branchId } : undefined,
    orderBy: { number: 'asc' },
    include: { branch: true },
  });

  // Get active orders for all tables
  const activeOrders = await prisma.order.findMany({
    where: {
      status: 'open',
      tableId: { not: null },
      ...(branchId ? { branchId } : {}),
    },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  // Map orders to tables
  const orderMap = {};
  activeOrders.forEach(order => {
    orderMap[order.tableId] = order;
  });

  // Attach orders to tables
  return tables.map(table => ({
    ...table,
    order: orderMap[table.id] || null,
  }));
}

async function get(id) {
  const table = await prisma.table.findUnique({
    where: { id },
    include: { branch: true },
  });

  if (!table) return null;

  const order = await prisma.order.findFirst({
    where: {
      tableId: id,
      status: 'open',
    },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  return {
    ...table,
    order,
  };
}

async function create(data) {
  return prisma.table.create({
    data,
    include: { branch: true },
  });
}

async function update(id, data) {
  return prisma.table.update({
    where: { id },
    data,
    include: { branch: true },
  });
}

async function updateStatus(id, status) {
  return prisma.table.update({
    where: { id },
    data: { status },
    include: { branch: true },
  });
}

async function remove(id) {
  const table = await prisma.table.findUnique({
    where: { id },
  });

  if (!table) {
    const err = new Error('Table not found');
    err.status = 404;
    throw err;
  }

  const activeOrder = await prisma.order.findFirst({
    where: {
      tableId: id,
      status: 'open',
    },
  });

  if (activeOrder) {
    const err = new Error('Cannot delete table with active order');
    err.status = 400;
    throw err;
  }

  return prisma.table.delete({ where: { id } });
}

async function getAvailableTables(branchId) {
  return prisma.table.findMany({
    where: { 
      branchId,
      status: 'available',
    },
    orderBy: { number: 'asc' },
  });
}

module.exports = { 
  list, 
  get, 
  create, 
  update, 
  updateStatus, 
  remove, 
  getAvailableTables 
};
