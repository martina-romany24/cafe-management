const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Fixing branch product pricing...');

  const branches = await prisma.branch.findMany();
  const products = await prisma.product.findMany();

  console.log(`Found ${branches.length} branches and ${products.length} products`);

  let created = 0;
  let skipped = 0;

  for (const branch of branches) {
    for (const product of products) {
      const existing = await prisma.branchProductPricing.findUnique({
        where: {
          branchId_productId: {
            branchId: branch.id,
            productId: product.id,
          },
        },
      });

      if (!existing) {
        await prisma.branchProductPricing.create({
          data: {
            branchId: branch.id,
            productId: product.id,
            marginType: product.marginType || 'percentage',
            marginValue: product.defaultMargin || 0.2,
          },
        });
        created++;
        console.log(`Created pricing for ${product.name} in ${branch.name}`);
      } else {
        skipped++;
      }
    }
  }

  console.log('Fix complete!');
  console.log(`Created: ${created} records`);
  console.log(`Skipped: ${skipped} existing records`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
