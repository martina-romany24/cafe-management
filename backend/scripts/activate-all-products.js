const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Activating all inactive products...');

  const inactiveProducts = await prisma.product.findMany({
    where: { isActive: false },
    select: { id: true, name: true }
  });

  console.log(`Found ${inactiveProducts.length} inactive products`);

  for (const product of inactiveProducts) {
    console.log(`Activating: ${product.name}`);
    await prisma.product.update({
      where: { id: product.id },
      data: { isActive: true }
    });
  }

  console.log('\nAll products activated!');

  // Now fix missing pricing for all active products
  console.log('\nFixing missing pricing...');

  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, defaultMargin: true, marginType: true }
  });

  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true }
  });

  let fixedCount = 0;

  for (const product of products) {
    for (const branch of branches) {
      const pricing = await prisma.branchProductPricing.findUnique({
        where: {
          branchId_productId: {
            branchId: branch.id,
            productId: product.id
          }
        }
      });

      if (!pricing) {
        await prisma.branchProductPricing.create({
          data: {
            branchId: branch.id,
            productId: product.id,
            marginType: product.marginType,
            marginValue: product.defaultMargin,
          }
        });
        fixedCount++;
        console.log(`Added pricing for "${product.name}" in "${branch.name}"`);
      }
    }
  }

  console.log(`\nFixed ${fixedCount} missing pricing entries`);
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
