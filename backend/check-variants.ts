import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const model = await prisma.vehicleModel.findFirst({ where: { name: 'CB350RS' }, include: { variants: true } });
  console.dir(model, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
