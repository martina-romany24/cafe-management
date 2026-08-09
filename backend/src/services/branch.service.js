const prisma = require('../config/prisma');

async function list() {
  return prisma.branch.findMany({ orderBy: { createdAt: 'asc' } });
}

async function get(id) {
  return prisma.branch.findUnique({ where: { id } });
}

/**
 * Creates a branch and immediately seeds BranchProductPricing for every active
 * product using that product's defaultMargin/marginType, so a new branch always
 * starts with the same pricing as every other branch (admin's default is the
 * single source of truth).
 */
async function create(data) {
  return prisma.$transaction(async (tx) => {
    const branch = await tx.branch.create({ data });

    const products = await tx.product.findMany({ where: { isActive: true }, select: { id: true, marginType: true, defaultMargin: true } });

    if (products.length > 0) {
      await tx.branchProductPricing.createMany({
        data: products.map((p) => ({
          branchId: branch.id,
          productId: p.id,
          marginType: p.marginType,
          marginValue: p.defaultMargin,
        })),
      });
    }

    return branch;
  });
}

async function update(id, data) {
  return prisma.branch.update({ where: { id }, data });
}

async function setActive(id, isActive) {
  return prisma.branch.update({ where: { id }, data: { isActive } });
}

module.exports = { list, get, create, update, setActive };