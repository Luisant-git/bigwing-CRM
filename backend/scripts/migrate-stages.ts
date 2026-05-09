import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Migrating stages...");

  const r1 = await prisma.lead.updateMany({
    where: { stage: "CONTACTED" },
    data: { stage: "ENQUIRED" },
  });
  console.log(`Updated ${r1.count} leads from CONTACTED to ENQUIRED`);

  const r2 = await prisma.lead.updateMany({
    where: { stage: "NOT_CONTACTED" },
    data: { stage: "NEW" },
  });
  console.log(`Updated ${r2.count} leads from NOT_CONTACTED to NEW`);

  // Update history too
  const h1 = await prisma.leadStageHistory.updateMany({
    where: { fromStage: "CONTACTED" },
    data: { fromStage: "ENQUIRED" },
  });
  const h2 = await prisma.leadStageHistory.updateMany({
    where: { toStage: "CONTACTED" },
    data: { toStage: "ENQUIRED" },
  });
  console.log(`Updated ${h1.count + h2.count} history entries for CONTACTED`);

  const h3 = await prisma.leadStageHistory.updateMany({
    where: { fromStage: "NOT_CONTACTED" },
    data: { fromStage: "NEW" },
  });
  const h4 = await prisma.leadStageHistory.updateMany({
    where: { toStage: "NOT_CONTACTED" },
    data: { toStage: "NEW" },
  });
  console.log(`Updated ${h3.count + h4.count} history entries for NOT_CONTACTED`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
