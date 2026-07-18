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
    await prisma.customer.update({
      where: { id: c.id },
      data: { mobile: fixed }
    });
  }

  // Check altMobile as well
  const brokenAlt = customers.filter(c => c.altMobile && c.altMobile.length === 8);
  console.log('Found broken altMobile numbers:', brokenAlt.length);
  
  for (let c of brokenAlt) {
    const fixed = '91' + c.altMobile;
    console.log(`Fixing altMobile customer ${c.id}: ${c.altMobile} -> ${fixed}`);
    await prisma.customer.update({
      where: { id: c.id },
      data: { altMobile: fixed }
    });
  }
  
  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
