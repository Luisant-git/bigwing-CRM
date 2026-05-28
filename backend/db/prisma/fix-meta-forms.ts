import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Removing all branch/form names from Meta Leads...");
  
  const result = await prisma.lead.updateMany({
    where: {
      channel: 'SOCIAL'
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
