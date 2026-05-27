import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const branches = [
    { displayOrder: 1, name: "Bommanahalli", branchName: "Bommanahalli", networkCode: "KA010008", networkType: "MAIN DEALER", inventoryLocation: "HMSI-PARTS-S-KA-KA010008-HEAD BRANCH-ANANDA HONDA", brand: "BIGWING" },
    { displayOrder: 2, name: "Hosa Road", branchName: "Hosa Road", networkCode: "KA01BD08", networkType: "BRANCH", inventoryLocation: "HMSI-PARTS-S-KA-KA01BD08-HOSA ROAD-ANDHON", brand: "BIGWING" },
    { displayOrder: 3, name: "Sarjapura", branchName: "Sarjapura", networkCode: "KA01BB08", networkType: "BRANCH", inventoryLocation: "HMSI-PARTS-S-KA-KA01BB08-SARJPURA-ANDHON", brand: "BIGWING" },
    { displayOrder: 4, name: "Hebbagodi", branchName: "Hebbagodi", networkCode: "KA01BA08", networkType: "BRANCH", inventoryLocation: "BA08-HEBBAGODI-ANDHON", brand: "BIGWING" },
    { displayOrder: 5, name: "Chandapura", branchName: "Chandapura", networkCode: "KA01AE08", networkType: "ASC", inventoryLocation: "HMSI-PARTS-S-KA-KA01AE08-CHANDAPURA-ANDHON", brand: "BIGWING" },
    { displayOrder: 6, name: "Jigani", branchName: "Jigani", networkCode: "KA01BC08", networkType: "BRANCH", inventoryLocation: "HMSI-PARTS-S-KA-KA01BC08-JIGANI-ANDHON", brand: "BIGWING" },
    { displayOrder: 7, name: "Attibele", branchName: "Attibele", networkCode: "KA01BF08", networkType: "AD OWNED", inventoryLocation: "HMSI-PARTS-S-KA-KA01BF08-Attibele-ANDHON", brand: "BIGWING" },
    { displayOrder: 8, name: "E-city", branchName: "E-city", networkCode: "KA01AD08", networkType: "ASC", inventoryLocation: "HMSI-PARTS-S-KA-KA01AD08-ELECTRONIC CITY-ANDHON", brand: "BIGWING" },
    { displayOrder: 9, name: "Kasavanahalli", branchName: "Kasavanahalli", networkCode: "KA01AF08", networkType: "ASC", inventoryLocation: "HMSI-PARTS-S-KA-KA01AF08-JAIL ROAD-ANDHON", brand: "BIGWING" },
    { displayOrder: 10, name: "Gopasandra", branchName: "Gopasandra", networkCode: "KA01AG08", networkType: "ASC", inventoryLocation: "HMSI-PARTS-S-KA-KA01AG08-Gopasandra-ANDHON", brand: "BIGWING" },
    { displayOrder: 11, name: "Devarchiknahalli", branchName: "Devarchiknahalli", networkCode: "KA01BE08", networkType: "AD OWNED", inventoryLocation: "HMSI-PARTS-S-KA-KA01BE08-Begur-ANDHON", brand: "BIGWING" }
  ];

  const redWingBranches = branches.map(b => ({
    ...b,
    brand: "REDWING",
    name: b.name,
    branchName: b.branchName
  }));

  const allBranches = [...branches, ...redWingBranches];

  // Clean up any old ones that got created with the (Red Wing) suffix
  await prisma.referredBranch.deleteMany({
    where: {
      name: {
        endsWith: "(Red Wing)"
      }
    }
  });

  for (const b of allBranches) {
    await prisma.referredBranch.upsert({
      where: { brand_name: { brand: b.brand, name: b.name } },
      update: b,
      create: b,
    });
  }
  console.log(`✅ ${allBranches.length} referred branches seeded with inventory locations (BigWing & RedWing)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
