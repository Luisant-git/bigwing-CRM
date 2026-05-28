import { prisma } from "@bigwing/db";

async function fixBranches() {
  console.log("Starting branch cleanup for Meta Leads...");
  
  const result = await prisma.lead.updateMany({
    where: {
      channel: "SOCIAL",
      referredFromBranch: { not: null },
    },
    data: {
      referredFromBranch: null,
    },
  });

  console.log(`Successfully cleared branch for ${result.count} Meta leads.`);
}

fixBranches()
  .catch((e) => {
    console.error("Error updating branches:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Done.");
  });
