const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Updating existing products with defaultMargin and marginType...');

  const products = await prisma.product.findMany();

  for (const product of products) {
    if (product.defaultMargin === null || product.defaultMargin === undefined) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          defaultMargin: 0.2,
          marginType: 'percentage',
        },
      });
      console.log(`Updated: ${product.name}`);
    }
  }

  console.log('Update complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
