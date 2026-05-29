import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const metaLeads = await prisma.lead.findMany({
    where: { channel: 'SOCIAL', referredFromBranch: { not: null } }
  });

  let totalReverted = 0;

  for (const lead of metaLeads) {
    if (lead.remark && lead.remark.includes('Form: ')) {
      const formName = lead.remark.split('Form: ')[1].trim();
      
      // If the referredFromBranch is identical to the form name, it means it was populated by our previous logic.
      if (lead.referredFromBranch === formName) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { referredFromBranch: null }
        });
        totalReverted++;
      }
    }
  }

  console.log(`Successfully cleared branch field for ${totalReverted} Meta leads to allow manual entry.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
