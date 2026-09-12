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

  // --- Delete old data (orders, products, pricings, notifications) ---
  await prisma.notification.deleteMany({});
  await prisma.tableTransferLog.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.branchProductPricing.deleteMany({});
  await prisma.product.deleteMany({});

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
    // ركن العصائر Fresh
    prisma.product.upsert({
      where: { id: 'prod-orange' },
      update: {},
      create: { id: 'prod-orange', name: 'برتقال', description: 'عصير برتقال طازج', basePrice: 40, defaultMargin: 0, marginType: 'fixed', category: 'ركن العصائر Fresh' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-mango-juice' },
      update: {},
      create: { id: 'prod-mango-juice', name: 'مانجو', description: 'عصير مانجو طازج', basePrice: 40, defaultMargin: 0, marginType: 'fixed', category: 'ركن العصائر Fresh' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-guava' },
      update: {},
      create: { id: 'prod-guava', name: 'جوافة', description: 'عصير جوافة طازج', basePrice: 40, defaultMargin: 0, marginType: 'fixed', category: 'ركن العصائر Fresh' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-strawberry-juice' },
      update: {},
      create: { id: 'prod-strawberry-juice', name: 'فراولة', description: 'عصير فراولة طازج', basePrice: 40, defaultMargin: 0, marginType: 'fixed', category: 'ركن العصائر Fresh' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-banana-milk' },
      update: {},
      create: { id: 'prod-banana-milk', name: 'موز بحليب', description: 'موز بالحليب', basePrice: 40, defaultMargin: 0, marginType: 'fixed', category: 'ركن العصائر Fresh' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-yogurt-plain' },
      update: {},
      create: { id: 'prod-yogurt-plain', name: 'زبادي سادة', description: 'زبادي سادة', basePrice: 40, defaultMargin: 0, marginType: 'fixed', category: 'ركن العصائر Fresh' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-yogurt-honey' },
      update: {},
      create: { id: 'prod-yogurt-honey', name: 'زبادي عسل', description: 'زبادي بالعسل', basePrice: 45, defaultMargin: 0, marginType: 'fixed', category: 'ركن العصائر Fresh' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-kiwi' },
      update: {},
      create: { id: 'prod-kiwi', name: 'كيوي', description: 'عصير كيوي طازج', basePrice: 60, defaultMargin: 0, marginType: 'fixed', category: 'ركن العصائر Fresh' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-mix-juice' },
      update: {},
      create: { id: 'prod-mix-juice', name: 'ميكس عصير', description: 'ميكس عصائر', basePrice: 60, defaultMargin: 0, marginType: 'fixed', category: 'ركن العصائر Fresh' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-fruit-salad' },
      update: {},
      create: { id: 'prod-fruit-salad', name: 'سلطة فواكه', description: 'سلطة فواكه طازجة', basePrice: 50, defaultMargin: 0, marginType: 'fixed', category: 'ركن العصائر Fresh' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-cocktail' },
      update: {},
      create: { id: 'prod-cocktail', name: 'كوكتيل', description: 'كوكتيل فواكه', basePrice: 80, defaultMargin: 0, marginType: 'fixed', category: 'ركن العصائر Fresh' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-lemon-juice' },
      update: {},
      create: { id: 'prod-lemon-juice', name: 'ليمون', description: 'عصير ليمون', basePrice: 25, defaultMargin: 0, marginType: 'fixed', category: 'ركن العصائر Fresh' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-lemon-mint-juice' },
      update: {},
      create: { id: 'prod-lemon-mint-juice', name: 'ليمون نعناع', description: 'ليمون بالنعناع', basePrice: 35, defaultMargin: 0, marginType: 'fixed', category: 'ركن العصائر Fresh' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-jujube' },
      update: {},
      create: { id: 'prod-jujube', name: 'عناب', description: 'عصير عناب', basePrice: 25, defaultMargin: 0, marginType: 'fixed', category: 'ركن العصائر Fresh' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-cantaloupe' },
      update: {},
      create: { id: 'prod-cantaloupe', name: 'كنتالوب', description: 'عصير كنتالوب', basePrice: 40, defaultMargin: 0, marginType: 'fixed', category: 'ركن العصائر Fresh' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-cantaloupe-milk' },
      update: {},
      create: { id: 'prod-cantaloupe-milk', name: 'كنتالوب حليب', description: 'كنتالوب بالحليب', basePrice: 50, defaultMargin: 0, marginType: 'fixed', category: 'ركن العصائر Fresh' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-oreo-drink' },
      update: {},
      create: { id: 'prod-oreo-drink', name: 'أوريو ساقع', description: 'مشروب أوريو', basePrice: 50, defaultMargin: 0, marginType: 'fixed', category: 'ركن العصائر Fresh' }
    }),

    // ركن الميلك تشيك
    prisma.product.upsert({
      where: { id: 'prod-milkshake-mango' },
      update: {},
      create: { id: 'prod-milkshake-mango', name: 'ميلك تشيك مانجو', description: 'ميلك تشيك بالمانجو', basePrice: 60, defaultMargin: 0, marginType: 'fixed', category: 'ركن الميلك تشيك' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-milkshake-strawberry' },
      update: {},
      create: { id: 'prod-milkshake-strawberry', name: 'ميلك تشيك فراولة', description: 'ميلك تشيك بالفراولة', basePrice: 60, defaultMargin: 0, marginType: 'fixed', category: 'ركن الميلك تشيك' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-milkshake-vanilla' },
      update: {},
      create: { id: 'prod-milkshake-vanilla', name: 'ميلك تشيك فانيليا', description: 'ميلك تشيك فانيليا', basePrice: 60, defaultMargin: 0, marginType: 'fixed', category: 'ركن الميلك تشيك' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-milkshake-chocolate' },
      update: {},
      create: { id: 'prod-milkshake-chocolate', name: 'ميلك تشيك شيكولاتة', description: 'ميلك تشيك بالشوكولاتة', basePrice: 60, defaultMargin: 0, marginType: 'fixed', category: 'ركن الميلك تشيك' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-milkshake-oreo' },
      update: {},
      create: { id: 'prod-milkshake-oreo', name: 'ميلك تشيك أوريو', description: 'ميلك تشيك أوريو', basePrice: 60, defaultMargin: 0, marginType: 'fixed', category: 'ركن الميلك تشيك' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-milkshake-kitkat' },
      update: {},
      create: { id: 'prod-milkshake-kitkat', name: 'ميلك تشيك كيت كات', description: 'ميلك تشيك كيت كات', basePrice: 60, defaultMargin: 0, marginType: 'fixed', category: 'ركن الميلك تشيك' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-milkshake-hohoz' },
      update: {},
      create: { id: 'prod-milkshake-hohoz', name: 'ميلك تشيك هوهوز', description: 'ميلك تشيك هوهوز', basePrice: 60, defaultMargin: 0, marginType: 'fixed', category: 'ركن الميلك تشيك' }
    }),

    // ركن الأسموزي
    prisma.product.upsert({
      where: { id: 'prod-smoothie-mango' },
      update: {},
      create: { id: 'prod-smoothie-mango', name: 'سموزي مانجو', description: 'سموزي مانجو', basePrice: 50, defaultMargin: 0, marginType: 'fixed', category: 'ركن الأسموزي' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-smoothie-strawberry' },
      update: {},
      create: { id: 'prod-smoothie-strawberry', name: 'سموزي فراولة', description: 'سموزي فراولة', basePrice: 50, defaultMargin: 0, marginType: 'fixed', category: 'ركن الأسموزي' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-smoothie-kiwi' },
      update: {},
      create: { id: 'prod-smoothie-kiwi', name: 'سموزي كيوي', description: 'سموزي كيوي', basePrice: 50, defaultMargin: 0, marginType: 'fixed', category: 'ركن الأسموزي' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-smoothie-lemon' },
      update: {},
      create: { id: 'prod-smoothie-lemon', name: 'سموزي ليمون', description: 'سموزي ليمون', basePrice: 30, defaultMargin: 0, marginType: 'fixed', category: 'ركن الأسموزي' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-smoothie-lemon-mint' },
      update: {},
      create: { id: 'prod-smoothie-lemon-mint', name: 'سموزي ليمون نعناع', description: 'سموزي ليمون نعناع', basePrice: 35, defaultMargin: 0, marginType: 'fixed', category: 'ركن الأسموزي' }
    }),

    // ركن الباور
    prisma.product.upsert({
      where: { id: 'prod-ginger-power' },
      update: {},
      create: { id: 'prod-ginger-power', name: 'جنزبيل باور', description: 'جنزبيل باور', basePrice: 40, defaultMargin: 0, marginType: 'fixed', category: 'ركن الباور' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-avocado' },
      update: {},
      create: { id: 'prod-avocado', name: 'أفوكادو', description: 'عصير أفوكادو', basePrice: 100, defaultMargin: 0, marginType: 'fixed', category: 'ركن الباور' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-avocado-nuts' },
      update: {},
      create: { id: 'prod-avocado-nuts', name: 'أفوكادو مكسرات', description: 'أفوكادو بالمكسرات', basePrice: 120, defaultMargin: 0, marginType: 'fixed', category: 'ركن الباور' }
    }),

    // أم علي
    prisma.product.upsert({
      where: { id: 'prod-om-ali-plain' },
      update: {},
      create: { id: 'prod-om-ali-plain', name: 'ام علي سادة', description: 'أم علي سادة', basePrice: 60, defaultMargin: 0, marginType: 'fixed', category: 'أم علي' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-om-ali-nuts' },
      update: {},
      create: { id: 'prod-om-ali-nuts', name: 'ام علي مكسرات', description: 'أم علي بالمكسرات', basePrice: 70, defaultMargin: 0, marginType: 'fixed', category: 'أم علي' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-om-ali-fruits' },
      update: {},
      create: { id: 'prod-om-ali-fruits', name: 'ام علي فواكه', description: 'أم علي بالفواكه', basePrice: 80, defaultMargin: 0, marginType: 'fixed', category: 'أم علي' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-om-ali-luxury-nuts' },
      update: {},
      create: { id: 'prod-om-ali-luxury-nuts', name: 'ام علي مكسرات لوكس', description: 'أم علي مكسرات لوكس', basePrice: 70, defaultMargin: 0, marginType: 'fixed', category: 'أم علي' }
    }),

    // ركن القهوة Coffee
    prisma.product.upsert({
      where: { id: 'prod-turkish-coffee' },
      update: {},
      create: { id: 'prod-turkish-coffee', name: 'قهوة تركي', description: 'قهوة تركية', basePrice: 25, defaultMargin: 0, marginType: 'fixed', category: 'ركن القهوة Coffee' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-mahj-coffee' },
      update: {},
      create: { id: 'prod-mahj-coffee', name: 'قهوة محوج', description: 'قهوة محوج', basePrice: 25, defaultMargin: 0, marginType: 'fixed', category: 'ركن القهوة Coffee' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-dark-coffee' },
      update: {},
      create: { id: 'prod-dark-coffee', name: 'قهوة غامق', description: 'قهوة غامق', basePrice: 25, defaultMargin: 0, marginType: 'fixed', category: 'ركن القهوة Coffee' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-french-coffee' },
      update: {},
      create: { id: 'prod-french-coffee', name: 'قهوة فرنساوي', description: 'قهوة فرنساوي', basePrice: 40, defaultMargin: 0, marginType: 'fixed', category: 'ركن القهوة Coffee' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-hazelnut-coffee' },
      update: {},
      create: { id: 'prod-hazelnut-coffee', name: 'قهوة بندق', description: 'قهوة بندق', basePrice: 30, defaultMargin: 0, marginType: 'fixed', category: 'ركن القهوة Coffee' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-chocolate-coffee' },
      update: {},
      create: { id: 'prod-chocolate-coffee', name: 'قهوة شيكولاتة', description: 'قهوة شيكولاتة', basePrice: 30, defaultMargin: 0, marginType: 'fixed', category: 'ركن القهوة Coffee' }
    }),

    // هوت
    prisma.product.upsert({
      where: { id: 'prod-hot-chocolate' },
      update: {},
      create: { id: 'prod-hot-chocolate', name: 'هوت شوكليت', description: 'هوت شوكليت', basePrice: 60, defaultMargin: 0, marginType: 'fixed', category: 'هوت' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-hot-oreo' },
      update: {},
      create: { id: 'prod-hot-oreo', name: 'هوت أوريو', description: 'هوت أوريو', basePrice: 60, defaultMargin: 0, marginType: 'fixed', category: 'هوت' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-sahlab-plain' },
      update: {},
      create: { id: 'prod-sahlab-plain', name: 'سحلب سادة', description: 'سحلب سادة', basePrice: 40, defaultMargin: 0, marginType: 'fixed', category: 'هوت' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-sahlab-nuts' },
      update: {},
      create: { id: 'prod-sahlab-nuts', name: 'سحلب مكسرات', description: 'سحلب مكسرات', basePrice: 50, defaultMargin: 0, marginType: 'fixed', category: 'هوت' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-sahlab-fruits' },
      update: {},
      create: { id: 'prod-sahlab-fruits', name: 'سحلب فواكه', description: 'سحلب فواكه', basePrice: 70, defaultMargin: 0, marginType: 'fixed', category: 'هوت' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-sahlab-mix' },
      update: {},
      create: { id: 'prod-sahlab-mix', name: 'سحلب ميكس', description: 'سحلب ميكس', basePrice: 80, defaultMargin: 0, marginType: 'fixed', category: 'هوت' }
    }),

    // ركن الصودا
    prisma.product.upsert({
      where: { id: 'prod-canzy' },
      update: {},
      create: { id: 'prod-canzy', name: 'كانز', description: 'كانز', basePrice: 25, defaultMargin: 0, marginType: 'fixed', category: 'ركن الصودا' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-fayrouz' },
      update: {},
      create: { id: 'prod-fayrouz', name: 'فيروز', description: 'فيروز', basePrice: 30, defaultMargin: 0, marginType: 'fixed', category: 'ركن الصودا' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-birel' },
      update: {},
      create: { id: 'prod-birel', name: 'بيرل', description: 'بيرل', basePrice: 30, defaultMargin: 0, marginType: 'fixed', category: 'ركن الصودا' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-7up' },
      update: {},
      create: { id: 'prod-7up', name: 'استنج', description: 'استنج', basePrice: 25, defaultMargin: 0, marginType: 'fixed', category: 'ركن الصودا' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-sunshine' },
      update: {},
      create: { id: 'prod-sunshine', name: 'صن شاين', description: 'صن شاين', basePrice: 35, defaultMargin: 0, marginType: 'fixed', category: 'ركن الصودا' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-mojito-mint' },
      update: {},
      create: { id: 'prod-mojito-mint', name: 'موهيتو نعناع', description: 'موهيتو نعناع', basePrice: 40, defaultMargin: 0, marginType: 'fixed', category: 'ركن الصودا' }
    }),

    // مشروبات ساخنة
    prisma.product.upsert({
      where: { id: 'prod-tea' },
      update: {},
      create: { id: 'prod-tea', name: 'شاي', description: 'شاي', basePrice: 10, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-green-tea' },
      update: {},
      create: { id: 'prod-green-tea', name: 'شاي أخضر', description: 'شاي أخضر', basePrice: 10, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-tea-bag' },
      update: {},
      create: { id: 'prod-tea-bag', name: 'شاي فتلة', description: 'شاي فتلة', basePrice: 10, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-clove-tea' },
      update: {},
      create: { id: 'prod-clove-tea', name: 'شاي قرنفل', description: 'شاي قرنفل', basePrice: 10, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-anise-tea' },
      update: {},
      create: { id: 'prod-anise-tea', name: 'ينسون', description: 'ينسون', basePrice: 10, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-mint-tea' },
      update: {},
      create: { id: 'prod-mint-tea', name: 'نعناع', description: 'نعناع', basePrice: 10, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-hibiscus' },
      update: {},
      create: { id: 'prod-hibiscus', name: 'كركديه', description: 'كركديه', basePrice: 10, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-jujube-tea' },
      update: {},
      create: { id: 'prod-jujube-tea', name: 'عناب', description: 'عناب', basePrice: 10, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-cinnamon-tea' },
      update: {},
      create: { id: 'prod-cinnamon-tea', name: 'قرفة', description: 'قرفة', basePrice: 10, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-fenugreek-tea' },
      update: {},
      create: { id: 'prod-fenugreek-tea', name: 'حلبة', description: 'حلبة', basePrice: 10, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-cocoa' },
      update: {},
      create: { id: 'prod-cocoa', name: 'كاكاو', description: 'كاكاو', basePrice: 15, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-hot-lemon' },
      update: {},
      create: { id: 'prod-hot-lemon', name: 'ليمون سخن', description: 'ليمون سخن', basePrice: 10, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-nescafe-plain' },
      update: {},
      create: { id: 'prod-nescafe-plain', name: 'نسكافيه سادة', description: 'نسكافيه سادة', basePrice: 20, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-cappuccino-plain' },
      update: {},
      create: { id: 'prod-cappuccino-plain', name: 'كابتشينو سادة', description: 'كابتشينو سادة', basePrice: 20, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-coffee-mix' },
      update: {},
      create: { id: 'prod-coffee-mix', name: 'كوفي ميكس', description: 'كوفي ميكس', basePrice: 20, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-tea-milk' },
      update: {},
      create: { id: 'prod-tea-milk', name: 'شاي حليب', description: 'شاي حليب', basePrice: 25, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-cinnamon-milk' },
      update: {},
      create: { id: 'prod-cinnamon-milk', name: 'قرفة حليب', description: 'قرفة حليب', basePrice: 30, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-fenugreek-milk' },
      update: {},
      create: { id: 'prod-fenugreek-milk', name: 'حلبة حليب', description: 'حلبة حليب', basePrice: 25, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-nescafe-milk' },
      update: {},
      create: { id: 'prod-nescafe-milk', name: 'نسكافيه حليب', description: 'نسكافيه حليب', basePrice: 30, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-cappuccino-milk' },
      update: {},
      create: { id: 'prod-cappuccino-milk', name: 'كابتشينو حليب', description: 'كابتشينو حليب', basePrice: 30, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-cocoa-milk' },
      update: {},
      create: { id: 'prod-cocoa-milk', name: 'كاكاو حليب', description: 'كاكاو حليب', basePrice: 30, defaultMargin: 0, marginType: 'fixed', category: 'مشروبات ساخنة' }
    }),

    // ركن الشيشة
    prisma.product.upsert({
      where: { id: 'prod-shisha-qas' },
      update: {},
      create: { id: 'prod-shisha-qas', name: 'شيشة قص', description: 'شيشة قص', basePrice: 10, defaultMargin: 0, marginType: 'fixed', category: 'ركن الشيشة' }
    }),
    prisma.product.upsert({
      where: { id: 'prod-shisha-fruits' },
      update: {},
      create: { id: 'prod-shisha-fruits', name: 'شيشة فواكه', description: 'شيشة فواكه', basePrice: 30, defaultMargin: 0, marginType: 'fixed', category: 'ركن الشيشة' }
    }),
  ]);

  // Products array is now used directly in the loop below

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
          marginValue: 0,
        },
        create: {
          branchId: branch.id,
          productId: product.id,
          marginType: product.marginType,
          marginValue: 0,
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