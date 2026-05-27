import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Running stage fix for QUOTATION_SHARED...");
  
  const result = await prisma.$executeRawUnsafe(`
    UPDATE core.lead 
    SET stage = 'QUOTATION_SHARED' 
    WHERE stage = 'QUOTATION SHARED' OR stage = 'QUOTATION';
  `);
  
  console.log(`✅ Update complete. Rows affected: ${result}`);
}

main()
  .catch((e) => {
    console.error("❌ Failed to update stages:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
