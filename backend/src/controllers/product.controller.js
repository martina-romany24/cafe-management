const productService = require('../services/product.service');
const prisma = require('../config/prisma');
const { calculatePricing } = require('../utils/pricing');
const { notify } = require('../utils/notify');

async function list(req, res, next) {
  try {
    if (req.user.role === 'admin') {
      const products = await productService.listForAdmin();
      return res.json(products);
    }
    // branch_manager: force their own branchId regardless of any query param
    const products = await productService.listForBranch(req.user.branchId);
    return res.json(products);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const product = await productService.create(req.body);
    // New product: no branch manager has anything to react to yet (pricing
    // is seeded silently at the default), so this stays an admin-side event.
    req.io.to('hq').emit('product_updated', { type: 'created', productId: product.id });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

/**
 * Notifies the branch_manager(s) of each given branch that a product's
 * price/margin changed, both live (socket) and persisted (Notification row).
 */
async function notifyBranchManagers(io, branchIds, message) {
  if (!branchIds || branchIds.length === 0) return;

  const managers = await prisma.user.findMany({
    where: { role: 'branch_manager', branchId: { in: branchIds }, isActive: true },
    select: { id: true, branchId: true },
  });

  for (const branchId of branchIds) {
    const managerIds = managers.filter((m) => m.branchId === branchId).map((m) => m.id);
    if (managerIds.length === 0) continue;

    await notify(io, {
      userIds: managerIds,
      type: 'product_updated',
      message,
      room: `branch:${branchId}`,
    });
  }
}

async function update(req, res, next) {
  try {
    const { affectedBranchIds = [], ...product } = await productService.update(req.params.id, req.body);

    if (affectedBranchIds.length > 0) {
      // Scoped to exactly the branches whose pricing changed — previously
      // this was `req.io.emit(...)`, a global broadcast to every connected
      // client regardless of branch.
      for (const branchId of affectedBranchIds) {
        req.io.to(`branch:${branchId}`).emit('product_updated', { type: 'updated', productId: product.id });
      }
      await notifyBranchManagers(
        req.io,
        affectedBranchIds,
        `تم تحديث سعر/هامش منتج "${product.name}"`
      );
    } else {
      // Non-pricing edit (name, description, category, isActive, etc.) —
      // no branch pricing changed, so just let HQ's own view refresh.
      req.io.to('hq').emit('product_updated', { type: 'updated', productId: product.id });
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const product = await productService.remove(req.params.id);
    req.io.to('hq').emit('product_updated', { type: 'deactivated', productId: product.id });
    res.json({ message: 'Product deactivated', product });
  } catch (err) {
    next(err);
  }
}

async function setActive(req, res, next) {
  try {
    const { isActive } = req.body;
    const product = await productService.setActive(req.params.id, isActive);
    req.io.to('hq').emit('product_updated', { type: 'availability_changed', productId: product.id, isActive });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

async function upsertPricing(req, res, next) {
  try {
    const { branchId, marginType, marginValue } = req.body;
    const pricing = await productService.upsertPricing(branchId, req.params.id, marginType, marginValue);
    req.io.to(`branch:${branchId}`).emit('product_updated', { type: 'pricing_updated', productId: req.params.id, branchId });

    const product = await prisma.product.findUnique({ where: { id: req.params.id }, select: { name: true } });
    await notifyBranchManagers(
      req.io,
      [branchId],
      `تم تحديث سعر/هامش منتج "${product?.name || ''}" في فرعك`
    );

    res.json(pricing);
  } catch (err) {
    next(err);
  }
}

/**
 * Live preview: given basePrice/marginType/marginValue (not yet saved), return computed
 * finalPrice + branchProfitPerUnit. Used by the admin margin form for instant feedback.
 */
async function previewPricing(req, res, next) {
  try {
    const { basePrice, marginType, marginValue } = req.body;
    const calc = calculatePricing(basePrice, marginType, marginValue, 1);
    res.json(calc);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, setActive, upsertPricing, previewPricing };