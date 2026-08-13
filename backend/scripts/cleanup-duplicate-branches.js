const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Finding duplicate branches...');

  // Get all branches grouped by name
  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: 'asc' },
  });

  // Group branches by name
  const branchesByName = {};
  for (const branch of branches) {
    if (!branchesByName[branch.name]) {
      branchesByName[branch.name] = [];
    }
    branchesByName[branch.name].push(branch);
  }

  // Find duplicates (branches with same name)
  const duplicates = [];
  for (const [name, branchList] of Object.entries(branchesByName)) {
    if (branchList.length > 1) {
      duplicates.push({ name, branches: branchList });
    }
  }

  if (duplicates.length === 0) {
    console.log('No duplicate branches found.');
    return;
  }

  console.log(`Found ${duplicates.length} branch names with duplicates:`);

  let totalToDelete = 0;
  const idsToDelete = [];

  for (const { name, branches: branchList } of duplicates) {
    console.log(`\nBranch: "${name}" - ${branchList.length} copies`);
    
    // Keep the oldest one (first in array since sorted by createdAt asc)
    const toKeep = branchList[0];
    const toDelete = branchList.slice(1);
    
    console.log(`  Keeping: ID=${toKeep.id}, created at ${toKeep.createdAt.toISOString()}`);
    
    for (const branch of toDelete) {
      console.log(`  Processing duplicate ID=${branch.id}, created at ${branch.createdAt.toISOString()}`);

      // Transfer related data to the kept branch
      const transferCounts = { users: 0, orders: 0, tables: 0, pricing: 0, reports: 0 };

      // Transfer users
      const users = await prisma.user.findMany({ where: { branchId: branch.id } });
      for (const user of users) {
        await prisma.user.update({ where: { id: user.id }, data: { branchId: toKeep.id } });
        transferCounts.users++;
      }

      // Transfer orders
      const orders = await prisma.order.findMany({ where: { branchId: branch.id } });
      for (const order of orders) {
        await prisma.order.update({ where: { id: order.id }, data: { branchId: toKeep.id } });
        transferCounts.orders++;
      }

      // Transfer tables
      const tables = await prisma.table.findMany({ where: { branchId: branch.id } });
      for (const table of tables) {
        await prisma.table.update({ where: { id: table.id }, data: { branchId: toKeep.id } });
        transferCounts.tables++;
      }

      // Transfer pricing (delete duplicates if product already has pricing in kept branch)
      const pricings = await prisma.branchProductPricing.findMany({ where: { branchId: branch.id } });
      for (const pricing of pricings) {
        const existing = await prisma.branchProductPricing.findUnique({
          where: { branchId_productId: { branchId: toKeep.id, productId: pricing.productId } }
        });
        if (existing) {
          await prisma.branchProductPricing.delete({ where: { id: pricing.id } });
        } else {
          await prisma.branchProductPricing.update({ where: { id: pricing.id }, data: { branchId: toKeep.id } });
          transferCounts.pricing++;
        }
      }

      // Transfer reports (delete duplicates if month/year already exists for kept branch)
      const reports = await prisma.monthlyReport.findMany({ where: { branchId: branch.id } });
      for (const report of reports) {
        const existing = await prisma.monthlyReport.findUnique({
          where: { branchId_month_year: { branchId: toKeep.id, month: report.month, year: report.year } }
        });
        if (existing) {
          await prisma.monthlyReport.delete({ where: { id: report.id } });
        } else {
          await prisma.monthlyReport.update({ where: { id: report.id }, data: { branchId: toKeep.id } });
          transferCounts.reports++;
        }
      }

      console.log(`  Transferred: users=${transferCounts.users}, orders=${transferCounts.orders}, tables=${transferCounts.tables}, pricing=${transferCounts.pricing}, reports=${transferCounts.reports}`);
      console.log(`  Will delete: ID=${branch.id}`);
      idsToDelete.push(branch.id);
      totalToDelete++;
    }
  }

  if (idsToDelete.length === 0) {
    console.log('\nNo branches to delete (all duplicates have related data).');
    return;
  }

  console.log(`\nTotal branches to delete: ${totalToDelete}`);
  console.log('Proceeding with deletion...');

  // Delete the duplicate branches
  for (const id of idsToDelete) {
    await prisma.branch.delete({ where: { id } });
    console.log(`Deleted branch ID: ${id}`);
  }

  console.log('\nCleanup complete!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
