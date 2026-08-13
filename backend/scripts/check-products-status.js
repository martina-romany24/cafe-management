const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Checking all products status...');

  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      isActive: true,
      category: true,
      basePrice: true,
      createdAt: true
    }
  });

  console.log(`\nTotal products: ${products.length}`);
  console.log(`Active products: ${products.filter(p => p.isActive).length}`);
  console.log(`Inactive products: ${products.filter(p => !p.isActive).length}`);

  console.log('\n--- Product Details ---');
  for (const product of products) {
    console.log(`${product.isActive ? '✓' : '✗'} ${product.name} (${product.category}) - Active: ${product.isActive}, Price: ${product.basePrice}`);
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
