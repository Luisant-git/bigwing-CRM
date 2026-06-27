const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const batch = await prisma.importBatch.findUnique({
    where: { id: 59n }
  });
  console.log("Batch:", batch);

  const errors = await prisma.importRowError.findMany({
    where: { batchId: 59n },
    take: 10
  });
  console.log("First 10 errors:", errors);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
