import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const batches = await prisma.importBatch.findMany({
    select: {
      id: true,
      brand: true,
      fileName: true,
      status: true
    }
  });
  console.log("Batches in DB:");
  console.dir(batches, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());
