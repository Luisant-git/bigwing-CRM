import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all BIGWING branches
  const branches = await prisma.referredBranch.findMany({
    where: { brand: 'BIGWING' }
  });

  console.log(`Found ${branches.length} Bigwing branches to check.`);
  let totalUpdated = 0;

  for (const branch of branches) {
    if (branch.networkCode && branch.networkCode.trim() !== '') {
      // Find leads that have the network code instead of the branch name
      const result = await prisma.lead.updateMany({
        where: {
          brand: 'BIGWING',
          referredFromBranch: branch.networkCode
        },
        data: {
          referredFromBranch: branch.name // Update to the correct branch name
        }
      });
      
      if (result.count > 0) {
        console.log(`Updated ${result.count} leads: Changed '${branch.networkCode}' to '${branch.name}'.`);
        totalUpdated += result.count;
      }
    }
  }

  console.log(`\nDone! Total leads updated: ${totalUpdated}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
