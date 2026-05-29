import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({ 
    take: 3,
    orderBy: { createdAt: 'desc' },
    select: { 
      id: true, 
      executiveName: true, 
      assignedTo: { select: { fullName: true } }, 
      referredFromBranch: true 
    } 
  });
  console.dir(leads, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
