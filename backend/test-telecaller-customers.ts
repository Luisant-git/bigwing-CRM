import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({
    where: {
      isDeleted: false,
      leads: { none: { channel: 'SOCIAL', isDeleted: false } },
      OR: [
        { leads: { some: { channel: 'SOCIAL' } } }
      ]
    },
    include: { leads: true }
  });
  console.log("Customers with ONLY deleted SOCIAL leads:", customers.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
