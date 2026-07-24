import { prisma } from "@bigwing/db";

async function dedupe() {
  console.log("Looking for duplicate Meta leads...");
  
  // Get all leads from Facebook
  const allFacebookLeads = await prisma.lead.findMany({
    where: { channel: "SOCIAL" },
    orderBy: { id: "asc" }
  });

  const seen = new Set();
  let deletedCount = 0;

  for (const lead of allFacebookLeads) {
    // We uniquely identify a lead by its customer ID and the Date it came in.
    // (If the exact same person submitted 2 forms on the exact same day, it will be treated as a duplicate)
    const uniqueKey = `${lead.customerId}_${lead.enquiryDate.toISOString().split("T")[0]}`;
    
    if (seen.has(uniqueKey)) {
        // This is a duplicate!
        // We will permanently delete it.
        await prisma.lead.delete({ where: { id: lead.id } });
        deletedCount++;
        console.log(`Deleted duplicate lead ID ${lead.id} for customer ${lead.customerId}`);
    } else {
        seen.add(uniqueKey);
    }
  }

  console.log(`✅ Successfully removed ${deletedCount} duplicate leads!`);
}

dedupe()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
