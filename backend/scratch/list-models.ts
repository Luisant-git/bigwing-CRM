
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const models = await prisma.vehicleModel.findMany({
    select: { id: true, name: true }
  });
  console.log('Current Models:');
  models.forEach(m => console.log(`${m.id}: ${m.name}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
