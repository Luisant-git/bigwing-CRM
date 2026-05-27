import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const stages = await prisma.lead.groupBy({
    by: ['stage'],
    _count: {
      stage: true,
    },
  });

  console.log("=== Lead Counts by Stage ===");
  stages.forEach(s => {
    console.log(`${s.stage}: ${s._count.stage}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
