const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for missing branch pricing...');

  // Get all active products
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, defaultMargin: true, marginType: true }
  });

  // Get all active branches
  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true }
  });

  console.log(`Found ${products.length} active products and ${branches.length} active branches`);

  let missingCount = 0;
  let fixedCount = 0;

  for (const product of products) {
    for (const branch of branches) {
      // Check if pricing exists for this product-branch combination
      const pricing = await prisma.branchProductPricing.findUnique({
        where: {
          branchId_productId: {
            branchId: branch.id,
            productId: product.id
          }
        }
      });

      if (!pricing) {
        missingCount++;
        console.log(`Missing pricing: Product "${product.name}" (${product.id}) for Branch "${branch.name}" (${branch.id})`);

        // Create missing pricing
        await prisma.branchProductPricing.create({
          data: {
            branchId: branch.id,
            productId: product.id,
            marginType: product.marginType,
            marginValue: product.defaultMargin,
          }
        });
        fixedCount++;
        console.log(`  ✓ Fixed - added pricing with marginType: ${product.marginType}, marginValue: ${product.defaultMargin}`);
      }
    }
  }

  console.log(`\nSummary:`);
  console.log(`- Missing pricing entries found: ${missingCount}`);
  console.log(`- Fixed: ${fixedCount}`);
  console.log('\nDone!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
