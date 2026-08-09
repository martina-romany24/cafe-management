const productService = require('../services/product.service');
const prisma = require('../config/prisma');
const { calculatePricing } = require('../utils/pricing');

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
    req.io.emit('product_updated', { type: 'created', productId: product.id });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const product = await productService.update(req.params.id, req.body);
    req.io.emit('product_updated', { type: 'updated', productId: product.id });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const product = await productService.remove(req.params.id);
    req.io.emit('product_updated', { type: 'deactivated', productId: product.id });
    res.json({ message: 'Product deactivated', product });
  } catch (err) {
    next(err);
  }
}

async function setActive(req, res, next) {
  try {
    const { isActive } = req.body;
    const product = await productService.setActive(req.params.id, isActive);
    req.io.emit('product_updated', { type: 'availability_changed', productId: product.id, isActive });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

async function upsertPricing(req, res, next) {
  try {
    const { branchId, marginType, marginValue } = req.body;
    const pricing = await productService.upsertPricing(branchId, req.params.id, marginType, marginValue);
    req.io.emit('product_updated', { type: 'pricing_updated', productId: req.params.id, branchId });
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
