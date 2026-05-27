import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Fetching branches...");
  const branches = await prisma.referredBranch.findMany();
  
  const branchMap = new Map<string, string>();
  for (const b of branches) {
    if (b.networkCode) {
      branchMap.set(b.networkCode.toUpperCase(), b.name);
    }
  }

  if (branchMap.size === 0) {
    console.log("⚠️ No branches found in the database. Please run seed-branches.ts first!");
    return;
  }

  console.log("Finding leads with missing branches...");
  const leadsToFix = await prisma.lead.findMany({
    where: {
      referredFromBranch: null,
      enquiryNo: { startsWith: "VEHENQ-" }
    },
    select: { id: true, enquiryNo: true }
  });

  if (leadsToFix.length === 0) {
    console.log("✅ No leads found that need fixing.");
    return;
  }

  console.log(`Found ${leadsToFix.length} leads to fix. Updating...`);

  let updatedCount = 0;
  for (const lead of leadsToFix) {
    const parts = String(lead.enquiryNo).split("-");
    if (parts.length >= 2) {
      const networkCode = parts[1].toUpperCase();
      const branchName = branchMap.get(networkCode);

      if (branchName) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { referredFromBranch: branchName }
        });
        updatedCount++;
      }
    }
  }

  console.log(`✅ Successfully updated ${updatedCount} leads with their correct branches!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
