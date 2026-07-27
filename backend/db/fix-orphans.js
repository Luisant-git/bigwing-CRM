import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('Fixing orphaned updated_by leads...');
  try {
    const result = await prisma.$executeRawUnsafe(`UPDATE core.lead SET updated_by = NULL WHERE updated_by IS NOT NULL AND updated_by NOT IN (SELECT id FROM auth."user");`);
    console.log('Successfully fixed ' + result + ' orphaned leads.');
  } catch (error) {
    console.error('Error fixing leads:', error);
  } finally {
    await prisma.$disconnect();
  }
}
main();
