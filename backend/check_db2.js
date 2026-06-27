const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const followups = await prisma.leadFollowup.findMany({
    where: {
      remark: { contains: '1-1ZTKTDLZ' }
    }
  });
  console.log('1-1ZTKTDLZ:', followups);
  
  const other = await prisma.leadFollowup.findMany({
    where: {
      remark: { contains: '1-6_9BQIEFB8' }
    }
  });
  console.log('1-6_9BQIEFB8:', other);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
