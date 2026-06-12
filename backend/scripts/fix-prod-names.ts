import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixProductionLeads() {
  console.log("Starting production lead names cleanup...");

  // 1. SARATH KUMAR R -> SHARATH KUMAR R
  const sarathResult = await prisma.lead.updateMany({
    where: { 
      executiveName: {
        contains: 'SARATH KUMAR',
        mode: 'insensitive'
      },
      NOT: {
        executiveName: {
          contains: 'SHARATH KUMAR',
          mode: 'insensitive'
        }
      }
    },
    data: { executiveName: 'SHARATH KUMAR R' }
  });
  console.log(`Updated ${sarathResult.count} leads to SHARATH KUMAR R`);

  // 2. VISHNU BHAVA GR -> VISHNU GR
  const vishnuResult = await prisma.lead.updateMany({
    where: { 
      executiveName: {
        contains: 'VISHNU BHAVA',
        mode: 'insensitive'
      }
    },
    data: { executiveName: 'VISHNU GR' }
  });
  console.log(`Updated ${vishnuResult.count} leads to VISHNU GR`);

  // 3. ARJUN M P -> ARJUN M B
  const arjunResult = await prisma.lead.updateMany({
    where: { 
      executiveName: {
        contains: 'ARJUN M P',
        mode: 'insensitive'
      }
    },
    data: { executiveName: 'ARJUN M B' }
  });
  console.log(`Updated ${arjunResult.count} leads to ARJUN M B`);

  console.log("Cleanup complete!");
}

fixProductionLeads()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
