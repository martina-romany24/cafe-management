const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, branchId: true }
  });
  
  console.log('Users:');
  users.forEach(u => {
    console.log(`- ${u.name} (${u.email}) - Role: ${u.role}, Branch: ${u.branchId || 'N/A'}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
