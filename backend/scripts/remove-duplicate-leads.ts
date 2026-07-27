import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixDuplicates() {
  console.log("Fetching all SOCIAL leads...");
  
  // Find all leads from SOCIAL channel
  const allSocialLeads = await prisma.lead.findMany({
    where: { channel: "SOCIAL" },
    orderBy: { createdAt: "asc" }
  });

  const byCustomer: Record<number, any[]> = {};

  // Group SOCIAL leads by customerId
  for (let l of allSocialLeads) {
    if (!byCustomer[Number(l.customerId)]) {
      byCustomer[Number(l.customerId)] = [];
    }
    byCustomer[Number(l.customerId)].push(l);
  }

  let toDelete: bigint[] = [];

  for (let cid in byCustomer) {
    const leads = byCustomer[cid];
    if (leads.length > 1) {
      // We have duplicates! Let's score them to decide which one to KEEP
      // Higher score = better lead to keep
      leads.sort((a, b) => {
        const scoreA = (a.stage !== "NEW" ? 100 : 0) + (a.metaStatus ? 50 : 0) + (a.assignedTo ? 25 : 0) + (a.telecallerRemark ? 10 : 0) + (a.remark && !a.remark.includes("Historical Meta Lead") ? 5 : 0);
        const scoreB = (b.stage !== "NEW" ? 100 : 0) + (b.metaStatus ? 50 : 0) + (b.assignedTo ? 25 : 0) + (b.telecallerRemark ? 10 : 0) + (b.remark && !b.remark.includes("Historical Meta Lead") ? 5 : 0);
        
        if (scoreB !== scoreA) {
            return scoreB - scoreA; // Descending order of score
        }
        
        // If scores are equal, prefer the OLDEST lead
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
      
      // Keep the first (best) lead, mark the rest for deletion
      const duplicatesToDelete = leads.slice(1).map(l => l.id);
      toDelete.push(...duplicatesToDelete);
    }
  }

  console.log(`Found ${toDelete.length} total duplicate Meta leads to remove.`);

  if (toDelete.length > 0) {
    console.log("Deleting duplicates from the database...");
    
    // Process in batches if there are many
    const batchSize = 100;
    for (let i = 0; i < toDelete.length; i += batchSize) {
      const batch = toDelete.slice(i, i + batchSize);
      await prisma.lead.deleteMany({
        where: { id: { in: batch } }
      });
    }
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
