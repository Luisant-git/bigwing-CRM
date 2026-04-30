
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const stages = await prisma.lead.groupBy({
    by: ['stage'],
    _count: { id: true }
  });
  console.log('Lead Stages Distribution:');
  stages.forEach(s => console.log(`${s.stage}: ${s._count.id}`));

  const deliveries = await prisma.lead.count({
    where: { stage: 'DELIVERED_CLOSED' }
  });
  console.log(`Total DELIVERED_CLOSED: ${deliveries}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
