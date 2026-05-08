import { prisma } from "../db/src/index.js";

async function main() {
  const lastErrors = await prisma.importRowError.findMany({
    orderBy: { id: "desc" },
    take: 10,
    include: {
      batch: true
    }
  });

  console.log(JSON.stringify(lastErrors, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2));
}

main().catch(console.error);
