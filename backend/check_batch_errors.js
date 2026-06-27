const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Looking for the most recent import batch...");
  const batch = await prisma.importBatch.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  if (!batch) {
    console.log("No batches found in the database.");
    return;
  }

  console.log(`Latest Batch ID: ${batch.id}`);
  console.log(`Status: ${batch.status}`);
  console.log(`Total Rows: ${batch.totalRows}`);
  console.log(`Success Rows: ${batch.successRows}`);
  console.log(`Error Rows: ${batch.errorRows}`);
  console.log(`Skipped Rows: ${batch.skippedRows}`);

  if (batch.errorRows > 0) {
    const errors = await prisma.importRowError.findMany({
      where: { batchId: batch.id },
      take: 10
    });
    console.log("First 10 errors:", errors);
  } else {
    console.log("NO ERRORS in this batch!");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
