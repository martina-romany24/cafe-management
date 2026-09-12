const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, category: true, basePrice: true }
  });
  
  console.log(`Total products: ${products.length}`);
  console.log('Products:');
  products.forEach(p => {
    console.log(`- ${p.name} (${p.category}) - ${p.basePrice}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
