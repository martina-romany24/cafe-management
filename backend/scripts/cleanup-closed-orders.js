const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupClosedOrders() {
  try {
    console.log('Finding closed orders with tableId...');
    
    const closedOrdersWithTable = await prisma.order.findMany({
      where: {
        status: 'closed',
        tableId: { not: null },
      },
      select: {
        id: true,
        tableId: true,
      },
    });

    console.log(`Found ${closedOrdersWithTable.length} closed orders with tableId`);

    if (closedOrdersWithTable.length === 0) {
      console.log('No cleanup needed');
      return;
    }

    // Clear tableId from all closed orders
    const result = await prisma.order.updateMany({
      where: {
        status: 'closed',
        tableId: { not: null },
      },
      data: {
        tableId: null,
      },
    });

    console.log(`Cleared tableId from ${result.count} closed orders`);
    
    // Ensure tables are marked as available if they have no open orders
    const occupiedTables = await prisma.table.findMany({
      where: {
        status: 'occupied',
      },
    });

    for (const table of occupiedTables) {
      const openOrders = await prisma.order.findMany({
        where: {
          tableId: table.id,
          status: 'open',
        },
      });

      if (openOrders.length === 0) {
        await prisma.table.update({
          where: { id: table.id },
          data: { status: 'available' },
        });
        console.log(`Marked table ${table.id} as available (no open orders)`);
      }
    }

    console.log('Cleanup completed successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

cleanupClosedOrders();
