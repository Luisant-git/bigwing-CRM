const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { importService } = require('./dist/modules/imports/service.js');
const { brandContext } = require('./dist/middlewares/brand.js');

async function main() {
  const batch = await prisma.importBatch.findFirst({
    where: { fileName: '1782561341465-Follow_Up_Detailed_Report_(26).csv' }
  });
  
  if (!batch) {
    console.log("Batch not found!");
    return;
  }
  console.log("Processing batch:", batch.id);

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { status: 'PENDING' }
  });

  brandContext.run("BIGWING", async () => {
    try {
      const result = await importService.commit(batch.id, undefined, undefined);
      console.log("Import result:", result);
      
      const updated = await prisma.leadFollowup.findMany({
        where: { remark: { contains: '1-1ZTKTDLZ' } }
      });
      console.log("After import:", updated);
    } catch (e) {
      console.error(e);
    } finally {
      await prisma.$disconnect();
    }
  });
}

main();
