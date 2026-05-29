import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.lead.updateMany({
    where: { 
      channel: 'SOCIAL',
      referredFromBranch: { not: null }
    },
    data: { 
      referredFromBranch: null 
    }
  });

  console.log(`Successfully cleared referredFromBranch for ${result.count} Meta leads.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
