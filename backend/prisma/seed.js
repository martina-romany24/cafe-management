const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('Password123', 10);

  // --- Branches ---
  const branch1 = await prisma.branch.create({ data: { name: 'فرع المعادي', location: 'القاهرة - المعادي' } });
  const branch2 = await prisma.branch.create({ data: { name: 'فرع مدينة نصر', location: 'القاهرة - مدينة نصر' } });
  const branch3 = await prisma.branch.create({ data: { name: 'فرع الإسكندرية', location: 'الإسكندرية - سموحة' } });

  // --- Admin user ---
  const admin = await prisma.user.create({
    data: {
      name: 'Admin HQ',
      email: 'admin@cafe.com',
      password: passwordHash,
      role: 'admin',
    },
  });

  // --- Branch managers ---
  const manager1 = await prisma.user.create({
    data: { name: 'مدير المعادي', email: 'manager1@cafe.com', password: passwordHash, role: 'branch_manager', branchId: branch1.id },
  });
  const manager2 = await prisma.user.create({
    data: { name: 'مدير مدينة نصر', email: 'manager2@cafe.com', password: passwordHash, role: 'branch_manager', branchId: branch2.id },
  });
  const manager3 = await prisma.user.create({
    data: { name: 'مدير الإسكندرية', email: 'manager3@cafe.com', password: passwordHash, role: 'branch_manager', branchId: branch3.id },
  });

  // --- Products ---
  // NOTE: defaultMargin is a WHOLE percent number when marginType is 'percentage'
  // (e.g. 25 means 25%), and a flat EGP amount when marginType is 'fixed'.
  const products = await Promise.all([
    prisma.product.create({ data: { name: 'شاي', description: 'شاي أحمر مصري', basePrice: 30, defaultMargin: 5, marginType: 'fixed', category: 'مشروبات ساخنة' } }),
    prisma.product.create({ data: { name: 'قهوة تركي', description: 'قهوة تركية أصلية', basePrice: 35, defaultMargin: 10, marginType: 'percentage', category: 'مشروبات ساخنة' } }),
    prisma.product.create({ data: { name: 'كابتشينو', description: 'كابتشينو إيطالي', basePrice: 55, defaultMargin: 7, marginType: 'fixed', category: 'مشروبات ساخنة' } }),
    prisma.product.create({ data: { name: 'عصير مانجو', description: 'عصير مانجو طازج', basePrice: 45, defaultMargin: 15, marginType: 'fixed', category: 'عصائر' } }),
    prisma.product.create({ data: { name: 'سموزي ليمون بالنعناع', description: 'ليمون بالنعناع', basePrice: 40, defaultMargin: 10, marginType: 'fixed', category: 'عصائر' } }),
    prisma.product.create({ data: { name: 'كرواسون', description: 'كروسون زبدة', basePrice: 50, defaultMargin: 8, marginType: 'fixed', category: 'مخبوزات' } }),
  ]);

  const [tea, turkishCoffee, cappuccino, mango, lemonade, croissant] = products;

  // --- Branch pricing for all products in all branches ---
  const branches = [branch1, branch2, branch3];
  const pricingData = [];

  for (const branch of branches) {
    for (const product of products) {
      pricingData.push({
        branchId: branch.id,
        productId: product.id,
        marginType: product.marginType,
        marginValue: product.defaultMargin,
      });
    }
  }

  for (const p of pricingData) {
    await prisma.branchProductPricing.create({ data: p });
  }

  console.log('Seed complete!');
  console.log('---');
  console.log('Admin login: admin@cafe.com / Password123');
  console.log('Branch manager logins: manager1@cafe.com, manager2@cafe.com, manager3@cafe.com / Password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });