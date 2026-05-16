import { prisma } from "./backend/db/src/index.ts";
async function run() {
  try {
    const leads = await prisma.lead.findMany({
      take: 20,
      select: {
        id: true,
        enquiryNo: true,
        _count: {
          select: { followups: true }
        },
        followups: {
          select: { seqNo: true }
        }
      }
    });
    console.log(JSON.stringify(leads, (key, value) =>
      typeof value === 'bigint'
          ? value.toString()
          : value 
    , 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
