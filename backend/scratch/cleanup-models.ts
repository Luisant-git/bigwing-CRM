
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HONDA_MODELS = [
  "H’ness CB350",
  "CB350",
  "CB350RS",
  "NX200",
  "Hornet 2.0",
  "CB750 Hornet",
  "X-ADV 750",
  "XL750 Transalp",
  "CB650R",
  "CBR650R",
  "NX500",
  "Rebel 500"
];

async function main() {
  console.log('--- Model Cleanup Started ---');

  // 1. Identify placeholder models
  const placeholders = await prisma.vehicleModel.findMany({
    where: {
      OR: [
        { name: { contains: 'Model ' } },
        { name: { in: ['Model A', 'Model B', 'Model C', 'Model F'] } }
      ]
    }
  });

  const placeholderIds = placeholders.map(p => p.id);
  console.log(`Found ${placeholders.length} placeholders: ${placeholders.map(p => p.name).join(', ')}`);

  if (placeholderIds.length > 0) {
    // 2. Unlink leads from these models
    const updatedLeads = await prisma.lead.updateMany({
      where: { modelId: { in: placeholderIds } },
      data: { modelId: null }
    });
    console.log(`Unlinked ${updatedLeads.count} leads from placeholder models.`);

    // 3. Delete placeholder variants first (due to FK)
    const delVariants = await prisma.vehicleVariant.deleteMany({
      where: { modelId: { in: placeholderIds } }
    });
    console.log(`Deleted ${delVariants.count} variants linked to placeholders.`);

    // 4. Delete placeholders
    const delModels = await prisma.vehicleModel.deleteMany({
      where: { id: { in: placeholderIds } }
    });
    console.log(`Deleted ${delModels.count} placeholder models.`);
  }

  // 5. Add/Update Honda models
  console.log('Ensuring Honda Bigwing lineup...');
  for (const name of HONDA_MODELS) {
    const existing = await prisma.vehicleModel.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    });

    if (existing) {
      console.log(`- Model "${name}" already exists.`);
    } else {
      await prisma.vehicleModel.create({
        data: { name, displayOrder: 99, isActive: true }
      });
      console.log(`+ Created Model: "${name}"`);
    }
  }

  console.log('--- Model Cleanup Finished ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
