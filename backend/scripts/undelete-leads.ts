import { prisma } from "@bigwing/db";

async function undeleteLeads() {
  console.log("Un-deleting all REDWING Facebook leads...");
  
  const result = await prisma.$executeRaw`
    UPDATE core.lead 
    SET is_deleted = false 
    WHERE brand = 'REDWING' AND channel = 'SOCIAL'
  `;
  
  console.log(`✅ Successfully restored leads back to your CRM! Refresh your page.`);
}

undeleteLeads()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
