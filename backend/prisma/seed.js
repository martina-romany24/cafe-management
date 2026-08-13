const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('Password123', 10);

  // --- Branches ---
  const branch1 = await prisma.branch.upsert({
    where: { id: 'default-branch-1' },
    update: {},
    create: { id: 'default-branch-1', name: 'فرع المعادي', location: 'القاهرة - المعادي' },
  });
  const branch2 = await prisma.branch.upsert({
    where: { id: 'default-branch-2' },
    update: {},
    create: { id: 'default-branch-2', name: 'فرع مدينة نصر', location: 'القاهرة - مدينة نصر' },
  });
  const branch3 = await prisma.branch.upsert({
    where: { id: 'default-branch-3' },
    update: {},
    create: { id: 'default-branch-3', name: 'فرع الإسكندرية', location: 'الإسكندرية - سموحة' },
  });

  // --- Admin user ---
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cafe.com' },
    update: {},
    create: {
      name: 'Admin HQ',
      email: 'admin@cafe.com',
      password: passwordHash,
      role: 'admin',
    },
  });

  // --- Branch managers ---
  const manager1 = await prisma.user.upsert({
    where: { email: 'manager1@cafe.com' },
    update: { name: branch1.name },
    create: { name: branch1.name, email: 'manager1@cafe.com', password: passwordHash, role: 'branch_manager', branchId: branch1.id },
  });
  const manager2 = await prisma.user.upsert({
    where: { email: 'manager2@cafe.com' },
    update: { name: branch2.name },
    create: { name: branch2.name, email: 'manager2@cafe.com', password: passwordHash, role: 'branch_manager', branchId: branch2.id },
  });
  const manager3 = await prisma.user.upsert({
    where: { email: 'manager3@cafe.com' },
    update: { name: branch3.name },
    create: { name: branch3.name, email: 'manager3@cafe.com', password: passwordHash, role: 'branch_manager', branchId: branch3.id },
  });

  // --- Products ---
  // NOTE: defaultMargin is a WHOLE percent number when marginType is 'percentage'
  // (e.g. 25 means 25%), and a flat EGP amount when marginType is 'fixed'.
  const products = await Promise.all([
    prisma.product.upsert({
      where: { id: 'prod-tea' },
      update: {},
      create: { id: 'prod-tea', name: 'شاي', description: 'شاي أحمر مصري', basePrice: 30, defaultMargin: 5, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-turkish-coffee' },
      update: {},
      create: { id: 'prod-turkish-coffee', name: 'قهوة تركي', description: 'قهوة تركية أصلية', basePrice: 35, defaultMargin: 10, marginType: 'percentage', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-cappuccino' },
      update: {},
      create: { id: 'prod-cappuccino', name: 'كابتشينو', description: 'كابتشينو إيطالي', basePrice: 55, defaultMargin: 7, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-mango' },
      update: {},
      create: { id: 'prod-mango', name: 'عصير مانجو', description: 'عصير مانجو طازج', basePrice: 45, defaultMargin: 15, marginType: 'fixed', category: 'عصائر' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-lemonade' },
      update: {},
      create: { id: 'prod-lemonade', name: 'سموزي ليمون بالنعناع', description: 'ليمون بالنعناع', basePrice: 40, defaultMargin: 10, marginType: 'fixed', category: 'عصائر' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-croissant' },
      update: {},
      create: { id: 'prod-croissant', name: 'كرواسون', description: 'كروسون زبدة', basePrice: 50, defaultMargin: 8, marginType: 'fixed', category: 'مخبوزات' }
    }),
  ]);

  const [tea, turkishCoffee, cappuccino, mango, lemonade, croissant] = products;

  // --- Branch pricing for all products in all branches ---
  const branches = [branch1, branch2, branch3];

  for (const branch of branches) {
    for (const product of products) {
      await prisma.branchProductPricing.upsert({
        where: {
          branchId_productId: {
            branchId: branch.id,
            productId: product.id
          }
        },
        update: {
          marginType: product.marginType,
          marginValue: product.defaultMargin,
        },
        create: {
          branchId: branch.id,
          productId: product.id,
          marginType: product.marginType,
          marginValue: product.defaultMargin,
        },
      });
    }
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