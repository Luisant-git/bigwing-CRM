import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching customers...');
  const customers = await prisma.customer.findMany();
  
  const broken = customers.filter(c => c.mobile.length === 8);
  console.log('Found broken mobile numbers:', broken.length);
  
  for (let c of broken) {
    const fixed = '91' + c.mobile;
    console.log(`Fixing customer ${c.id}: ${c.mobile} -> ${fixed}`);
    
    try {
      await prisma.customer.update({
        where: { id: c.id },
        data: { mobile: fixed }
      });
      console.log(`  -> Successfully updated mobile for customer ${c.id}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`  -> Conflict detected: Customer with ${fixed} already exists. Merging...`);
        // Find the existing correct customer
        const existing = await prisma.customer.findUnique({
          where: { brand_mobile: { brand: c.brand, mobile: fixed } }
        });
        
        if (existing) {
          // Reassign leads
          await prisma.lead.updateMany({
            where: { customerId: c.id },
            data: { customerId: existing.id }
          });
          console.log(`  -> Reassigned leads from ${c.id} to ${existing.id}`);
          
          // Reassign contacts
          await prisma.customerContact.updateMany({
            where: { customerId: c.id },
            data: { customerId: existing.id }
          });
          console.log(`  -> Reassigned contacts from ${c.id} to ${existing.id}`);

          // Delete the broken customer
          await prisma.customer.delete({
            where: { id: c.id }
          });
          console.log(`  -> Deleted broken customer ${c.id}`);
        }
      } else {
        console.error(`  -> Failed to update customer ${c.id}:`, error.message);
      }
    }
  }

  // Check altMobile as well
  const brokenAlt = customers.filter(c => c.altMobile && c.altMobile.length === 8);
  console.log('Found broken altMobile numbers:', brokenAlt.length);
  
  for (let c of brokenAlt) {
    const fixed = '91' + c.altMobile;
    console.log(`Fixing altMobile customer ${c.id}: ${c.altMobile} -> ${fixed}`);
    try {
      await prisma.customer.update({
        where: { id: c.id },
        data: { altMobile: fixed }
      });
    } catch (e: any) {
       console.log(`  -> Failed to update altMobile for ${c.id}: ${e.message}`);
    }
  }
  
  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
