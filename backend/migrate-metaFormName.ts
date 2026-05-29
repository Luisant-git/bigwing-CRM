import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const metaLeads = await prisma.lead.findMany({
    where: { channel: 'SOCIAL' }
  });

  let totalUpdated = 0;

  for (const lead of metaLeads) {
    if (lead.remark && lead.remark.includes('Form: ')) {
      const formName = lead.remark.split('Form: ')[1].trim();
      
      if (formName && lead.metaFormName !== formName) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { metaFormName: formName }
        });
        totalUpdated++;
      }
    }
  }

  console.log(`Successfully migrated ${totalUpdated} Meta leads to use metaFormName.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
