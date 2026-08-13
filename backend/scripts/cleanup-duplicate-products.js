const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Finding duplicate products...');

  // Get all products grouped by name
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' },
  });

  // Group products by name
  const productsByName = {};
  for (const product of products) {
    if (!productsByName[product.name]) {
      productsByName[product.name] = [];
    }
    productsByName[product.name].push(product);
  }

  // Find duplicates (products with same name)
  const duplicates = [];
  for (const [name, productList] of Object.entries(productsByName)) {
    if (productList.length > 1) {
      duplicates.push({ name, products: productList });
    }
  }

  if (duplicates.length === 0) {
    console.log('No duplicate products found.');
    return;
  }

  console.log(`Found ${duplicates.length} product names with duplicates:`);

  let totalToDelete = 0;
  const idsToDelete = [];

  for (const { name, products: productList } of duplicates) {
    console.log(`\nProduct: "${name}" - ${productList.length} copies`);
    
    // Keep the oldest one (first in array since sorted by createdAt asc)
    const toKeep = productList[0];
    const toDelete = productList.slice(1);
    
    console.log(`  Keeping: ID=${toKeep.id}, created at ${toKeep.createdAt.toISOString()}`);
    
    for (const product of toDelete) {
      console.log(`  Processing duplicate ID=${product.id}, created at ${product.createdAt.toISOString()}`);

      // Transfer related data to the kept product
      const transferCounts = { orderItems: 0, pricing: 0 };

      // Transfer order items
      const orderItems = await prisma.orderItem.findMany({ where: { productId: product.id } });
      for (const orderItem of orderItems) {
        await prisma.orderItem.update({ where: { id: orderItem.id }, data: { productId: toKeep.id } });
        transferCounts.orderItems++;
      }

      // Transfer pricing (delete duplicates if branch already has pricing for kept product)
      const pricings = await prisma.branchProductPricing.findMany({ where: { productId: product.id } });
      for (const pricing of pricings) {
        const existing = await prisma.branchProductPricing.findUnique({
          where: { branchId_productId: { branchId: pricing.branchId, productId: toKeep.id } }
        });
        if (existing) {
          await prisma.branchProductPricing.delete({ where: { id: pricing.id } });
        } else {
          await prisma.branchProductPricing.update({ where: { id: pricing.id }, data: { productId: toKeep.id } });
          transferCounts.pricing++;
        }
      }

      console.log(`  Transferred: orderItems=${transferCounts.orderItems}, pricing=${transferCounts.pricing}`);
      console.log(`  Will delete: ID=${product.id}`);
      idsToDelete.push(product.id);
      totalToDelete++;
    }
  }

  if (idsToDelete.length === 0) {
    console.log('\nNo products to delete (all duplicates have related data).');
    return;
  }

  console.log(`\nTotal products to delete: ${totalToDelete}`);
  console.log('Proceeding with deletion...');

  // Delete the duplicate products
  for (const id of idsToDelete) {
    await prisma.product.delete({ where: { id } });
    console.log(`Deleted product ID: ${id}`);
  }

  console.log('\nCleanup complete!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
