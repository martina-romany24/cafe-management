const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const pricings = await prisma.branchProductPricing.findMany({
    include: { product: { select: { name: true } }, branch: { select: { name: true } } }
  });
  
  console.log(`Total pricings: ${pricings.length}`);
  console.log('First 10 pricings:');
  pricings.slice(0, 10).forEach(p => {
    console.log(`- ${p.product.name} in ${p.branch.name} - marginType: ${p.marginType}, marginValue: ${p.marginValue}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
