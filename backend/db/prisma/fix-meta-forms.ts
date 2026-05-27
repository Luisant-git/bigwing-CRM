import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Removing 'Honda BigWing Bangalore - Silk Board' from Meta Leads...");
  
  const result = await prisma.lead.updateMany({
    where: {
      channel: 'SOCIAL',
      referredFromBranch: 'Honda BigWing Bangalore - Silk Board'
    },
    data: {
      referredFromBranch: null
    }
  });
  
  console.log(`✅ Update complete. Rows affected: ${result.count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
