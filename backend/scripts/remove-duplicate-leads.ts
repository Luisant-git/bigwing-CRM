import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixDuplicates() {
  console.log("Fetching imported Meta leads...");
  
  // Find all leads imported by the sync script
  const imported = await prisma.lead.findMany({
    where: { remark: { contains: "Historical Meta Lead ID" } },
    orderBy: { createdAt: "asc" }
  });

  const byCustomer: Record<number, bigint[]> = {};

  // Group lead IDs by customerId
  for (let l of imported) {
    if (!byCustomer[Number(l.customerId)]) {
      byCustomer[Number(l.customerId)] = [];
    }
    byCustomer[Number(l.customerId)].push(l.id);
  }

  let toDelete: bigint[] = [];

  for (let cid in byCustomer) {
    if (byCustomer[cid].length > 1) {
      // Keep the first (oldest) lead for this customer, and mark the rest for deletion
      toDelete.push(...byCustomer[cid].slice(1));
    }
  }

  console.log(`Found ${toDelete.length} duplicate leads to remove.`);

  if (toDelete.length > 0) {
    console.log("Deleting duplicates from the database...");
    await prisma.lead.deleteMany({
      where: { id: { in: toDelete } }
    });
    console.log(`Successfully deleted ${toDelete.length} duplicate leads!`);
  } else {
    console.log("No duplicate leads found to delete.");
  }
}

fixDuplicates()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error removing duplicates:", error);
    process.exit(1);
  });
