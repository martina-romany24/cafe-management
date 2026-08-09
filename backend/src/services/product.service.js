const prisma = require('../config/prisma');
const { calculatePricing } = require('../utils/pricing');

/**
 * Admin view: full product list with base price and all branch margins/final prices.
 */
async function listForAdmin() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      pricings: {
        include: { branch: { select: { id: true, name: true, isActive: true } } },
      },
    },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    basePrice: p.basePrice,
    defaultMargin: p.defaultMargin,
    marginType: p.marginType,
    category: p.category,
    isActive: p.isActive,
    branchPricing: p.pricings.map((pr) => {
      const calc = calculatePricing(p.basePrice, pr.marginType, pr.marginValue, 1);
      return {
        branchId: pr.branchId,
        branchName: pr.branch.name,
        marginType: pr.marginType,
        marginValue: pr.marginValue,
        finalPrice: calc.finalPrice,
        branchProfitPerUnit: calc.branchProfitPerUnit,
      };
    }),
  }));
}

/**
 * Branch view: only active products, only final price. No base price / margin / hqRevenue exposed.
 * Uses defaultMargin from product if no branch-specific pricing exists.
 */
async function listForBranch(branchId) {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      pricings: {
        where: { branchId },
      },
    },
  });

  return products.map((p) => {
    // Use branch-specific pricing if exists, otherwise use defaultMargin
    const branchPricing = p.pricings[0];
    const marginType = branchPricing ? branchPricing.marginType : p.marginType;
    const marginValue = branchPricing ? branchPricing.marginValue : p.defaultMargin;
    const calc = calculatePricing(p.basePrice, marginType, marginValue, 1);

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      price: calc.finalPrice, // final price ONLY
    };
  });
}

/**
 * Creates a product and immediately seeds BranchProductPricing for every active
 * branch using the product's defaultMargin/marginType. Branch managers never set
 * their own margins — admin's default is the single source of truth per branch.
 */
async function create(data) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({ data });

    const branches = await tx.branch.findMany({ where: { isActive: true }, select: { id: true } });

    if (branches.length > 0) {
      await tx.branchProductPricing.createMany({
        data: branches.map((b) => ({
          branchId: b.id,
          productId: product.id,
          marginType: product.marginType,
          marginValue: product.defaultMargin,
        })),
      });
    }

    return product;
  });
}

/**
 * Updates a product. Whenever defaultMargin and/or marginType change, the new
 * value is propagated to every branch's BranchProductPricing row for this
 * product, so the admin's default is always what every branch actually uses.
 */
async function update(id, data) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.update({ where: { id }, data });

    const marginChanged = Object.prototype.hasOwnProperty.call(data, 'defaultMargin')
      || Object.prototype.hasOwnProperty.call(data, 'marginType');

    if (marginChanged) {
      await tx.branchProductPricing.updateMany({
        where: { productId: id },
        data: {
          marginType: product.marginType,
          marginValue: product.defaultMargin,
        },
      });
    }

    return product;
  });
}

async function remove(id) {
  // Soft delete: set inactive rather than hard delete, preserves order history integrity
  return prisma.product.update({ where: { id }, data: { isActive: false } });
}

async function setActive(id, isActive) {
  return prisma.product.update({ where: { id }, data: { isActive } });
}

/**
 * Upsert a branch's margin on a given product (admin only).
 * Kept for cases where the admin wants to fix/repair a single branch's row directly
 * (e.g. a branch was created before this product existed).
 */
async function upsertPricing(branchId, productId, marginType, marginValue) {
  return prisma.branchProductPricing.upsert({
    where: { branchId_productId: { branchId, productId } },
    update: { marginType, marginValue },
    create: { branchId, productId, marginType, marginValue },
  });
}

module.exports = { listForAdmin, listForBranch, create, update, remove, setActive, upsertPricing };