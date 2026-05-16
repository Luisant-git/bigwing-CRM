import { prisma } from "./backend/db/src/index.ts";
async function run() {
  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT lead_id, COUNT(*) as count, array_agg(seq_no) as seq_nos
      FROM core.lead_followup
      GROUP BY lead_id
      HAVING COUNT(*) > 1
      LIMIT 10
    `);
    console.log(JSON.stringify(result, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
