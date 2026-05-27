import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const branches = [
  { displayOrder: 1, name: "Bommanahalli", branchName: "Bommanahalli", networkCode: "KA010008", networkType: "MAIN DEALER", brand: "BIGWING" },
  { displayOrder: 2, name: "Hosa Road", branchName: "Hosa Road", networkCode: "KA01BD08", networkType: "BRANCH", brand: "BIGWING" },
  { displayOrder: 3, name: "Sarjapura", branchName: "Sarjapura", networkCode: "KA01BB08", networkType: "BRANCH", brand: "BIGWING" },
  { displayOrder: 4, name: "Hebbagodi", branchName: "Hebbagodi", networkCode: "KA01BA08", networkType: "BRANCH", brand: "BIGWING" },
  { displayOrder: 5, name: "Chandapura", branchName: "Chandapura", networkCode: "KA01AE08", networkType: "ASC", brand: "BIGWING" },
  { displayOrder: 6, name: "Jigani", branchName: "Jigani", networkCode: "KA01BC08", networkType: "BRANCH", brand: "BIGWING" },
  { displayOrder: 7, name: "Attibele", branchName: "Attibele", networkCode: "KA01BF08", networkType: "AD Owned", brand: "BIGWING" },
  { displayOrder: 8, name: "E-city", branchName: "E-city", networkCode: "KA01AD08", networkType: "ASC", brand: "BIGWING" },
  { displayOrder: 9, name: "Kasavanahalli", branchName: "Kasavanahalli", networkCode: "KA01AF08", networkType: "ASC", brand: "BIGWING" },
  { displayOrder: 10, name: "Gopasandra", branchName: "Gopasandra", networkCode: "KA01AG08", networkType: "ASC", brand: "BIGWING" },
  { displayOrder: 11, name: "Devarchiknahalli", branchName: "Devarchiknahalli", networkCode: "KA01BE08", networkType: "AD Owned", brand: "BIGWING" }
];

async function main() {
  console.log("Deleting existing referred branches...");
  await prisma.referredBranch.deleteMany();
  
  console.log("Seeding new referred branches...");
  for (const b of branches) {
    await prisma.referredBranch.upsert({
      where: { brand_name: { brand: "BIGWING", name: b.name } },
      update: b,
      create: b,
    });
  }

  console.log("Seeding complete!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
