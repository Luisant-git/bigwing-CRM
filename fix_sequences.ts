import { prisma } from "./backend/db/src/index.ts";
async function run() {
  try {
    console.log("Fixing lead follow-up sequences...");
    const result = await prisma.$executeRawUnsafe(`
      WITH resequenced AS (
        SELECT id, row_number() OVER (PARTITION BY lead_id ORDER BY followup_date ASC, created_at ASC, id ASC) as new_seq
        FROM core.lead_followup
      )
      UPDATE core.lead_followup
      SET seq_no = resequenced.new_seq
      FROM resequenced
      WHERE core.lead_followup.id = resequenced.id;
    `);
    console.log(`Successfully re-sequenced ${result} follow-up records.`);
  } catch (err) {
    console.error("Error fixing sequences:", err);
  } finally {
    await prisma.$disconnect();
  }
}
run();
