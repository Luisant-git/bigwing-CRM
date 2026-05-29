import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const execs = await prisma.salesExecutive.findMany();
  console.dir(execs, { depth: null });
}
main().catch(console.error).finally(() => prisma.$disconnect());
