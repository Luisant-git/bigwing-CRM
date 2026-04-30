
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check for duplicates of H'ness (one with straight quote, one with smart quote)
  const hnessModels = await prisma.vehicleModel.findMany({
    where: { name: { contains: 'CB350' } }
  });

  console.log('Found CB350 related models:');
  hnessModels.forEach(m => console.log(`${m.id}: ${m.name}`));

  // Merge H'ness CB350 if both exist
  const smart = hnessModels.find(m => m.name.includes('’'));
  const straight = hnessModels.find(m => m.name.includes("'"));

  if (smart && straight) {
    console.log(`Merging "${straight.name}" into "${smart.name}"...`);
    await prisma.lead.updateMany({
      where: { modelId: straight.id },
      data: { modelId: smart.id }
    });
    await prisma.vehicleVariant.updateMany({
      where: { modelId: straight.id },
      data: { modelId: smart.id }
    });
    await prisma.vehicleModel.delete({ where: { id: straight.id } });
    console.log('Merge complete.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
