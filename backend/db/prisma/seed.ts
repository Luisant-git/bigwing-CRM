import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Roles ──────────────────────────────────────────────────────
  const roles = [
    { name: "SUPER_ADMIN", description: "Unrestricted access" },
    { name: "ADMIN", description: "Full access except system config" },
    { name: "MANAGER", description: "Team management, all data read" },
    { name: "SALES_EXECUTIVE", description: "Own leads, customers, follow-ups" },
    { name: "TELE_CALLER", description: "Tele-enquiry leads, follow-ups" },
    { name: "SERVICE", description: "Service enquiries only" },
    { name: "VIEWER", description: "Read-only dashboard access" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log(`  ✅ ${roles.length} roles seeded`);

  // ─── SuperAdmin user ────────────────────────────────────────────
  const adminEmail = "admin@bigwing.in";
  const adminPassword = await bcrypt.hash("BigWing@2026", 12);
  const superAdminRole = await prisma.role.findUnique({
    where: { name: "SUPER_ADMIN" },
  });

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: adminEmail,
      password: adminPassword,
      fullName: "Super Admin",
      isActive: true,
      userRoles: {
        create: { roleId: superAdminRole!.id },
      },
    },
  });
  console.log(`  ✅ SuperAdmin user seeded (${adminEmail})`);

  // ─── Enquiry Sources (master.enquiry_source) ────────────────────
  const sources = [
    "Google", "Instagram", "Facebook", "Reference", "Walk-in",
    "Website", "WhatsApp", "Call at Showroom", "Campaign",
    "Meta Lead Ads", "Other",
  ];
  for (let i = 0; i < sources.length; i++) {
    await prisma.enquirySource.upsert({
      where: { brand_name: { brand: "BIGWING", name: sources[i] } },
      update: {},
      create: { name: sources[i], displayOrder: (i + 1) * 10 },
    });
  }
  console.log(`  ✅ ${sources.length} enquiry sources seeded`);

  // ─── Enquiry Types (master.enquiry_type) ────────────────────────
  const types = ["New", "Service", "Spares", "Insurance", "Accessories"];
  for (let i = 0; i < types.length; i++) {
    await prisma.enquiryTypeLookup.upsert({
      where: { brand_name: { brand: "BIGWING", name: types[i] } },
      update: {},
      create: { name: types[i], displayOrder: (i + 1) * 10 },
    });
  }
  console.log(`  ✅ ${types.length} enquiry types seeded`);

  // ─── Closure Reasons (master.closure_reason) ────────────────────
  const reasons = [
    "Booked with competitor", "Postponed purchase", "Budget issue",
    "Model not available", "Cancelled after booking", "Not Interested",
    "Not Reachable (aged out)",
  ];
  for (let i = 0; i < reasons.length; i++) {
    await prisma.closureReason.upsert({
      where: { brand_name: { brand: "BIGWING", name: reasons[i] } },
      update: {},
      create: { name: reasons[i], displayOrder: (i + 1) * 10 },
    });
  }
  console.log(`  ✅ ${reasons.length} closure reasons seeded`);

  // ─── Interest Levels (master.interest_level) ─────────────────────
  const interestLevels = [
    { name: "HOT", displayOrder: 10 },
    { name: "WARM", displayOrder: 20 },
    { name: "COLD", displayOrder: 30 },
  ];
  for (const il of interestLevels) {
    await prisma.interestLevelLookup.upsert({
      where: { brand_name: { brand: "BIGWING", name: il.name } },
      update: {},
      create: il,
    });
  }
  console.log(`  ✅ ${interestLevels.length} interest levels seeded`);

  // ─── Vehicle Models (master.vehicle_model) ──────────────────────
  const models = [
    { name: "H'ness CB350", segment: "Premium Cruiser", bodyType: "Cruiser" },
    { name: "CB350RS", segment: "Premium Roadster", bodyType: "Roadster" },
    { name: "CB300F", segment: "Street Naked", bodyType: "Naked" },
    { name: "CB300R", segment: "Neo-Cafe Racer", bodyType: "Cafe Racer" },
    { name: "NX500", segment: "Adventure", bodyType: "ADV" },
    { name: "CB500X", segment: "Adventure", bodyType: "ADV" },
    { name: "CBR650R", segment: "Supersport", bodyType: "Sport" },
    { name: "CB650R", segment: "Naked Sport", bodyType: "Naked" },
    { name: "CRF1100L Africa Twin", segment: "Adventure", bodyType: "ADV" },
    { name: "Gold Wing", segment: "Grand Tourer", bodyType: "Tourer" },
  ];
  for (let i = 0; i < models.length; i++) {
    await prisma.vehicleModel.upsert({
      where: { brand_name: { brand: "BIGWING", name: models[i].name } },
      update: {},
      create: { ...models[i], displayOrder: (i + 1) * 10 },
    });
  }
  console.log(`  ✅ ${models.length} vehicle models seeded`);

  // ─── Vehicle Variants (master.vehicle_variant) ──────────────────
  const variantMap: Record<string, string[]> = {
    "H'ness CB350": ["DLX", "DLX Pro"],
    "CB350RS": ["STD", "DLX Pro"],
    "CB300F": ["STD", "DLX"],
    "CB300R": ["STD"],
    "NX500": ["STD"],
    "CB500X": ["STD"],
    "CBR650R": ["STD"],
    "CB650R": ["STD"],
    "CRF1100L Africa Twin": ["STD", "Adventure Sport"],
    "Gold Wing": ["Tour", "Tour DCT Airbag"],
  };
  let variantCount = 0;
  for (const [modelName, variants] of Object.entries(variantMap)) {
    const model = await prisma.vehicleModel.findUnique({
      where: { brand_name: { brand: "BIGWING", name: modelName } },
    });
    if (!model) continue;
    for (let i = 0; i < variants.length; i++) {
      await prisma.vehicleVariant.upsert({
        where: { modelId_name: { modelId: model.id, name: variants[i] } },
        update: {},
        create: {
          modelId: model.id,
          name: variants[i],
          displayOrder: (i + 1) * 10,
        },
      });
      variantCount++;
    }
  }
  console.log(`  ✅ ${variantCount} vehicle variants seeded`);

  // ─── Vehicle Colours (master.vehicle_colour) ────────────────────
  const colours = [
    "Pearl Nightstar Black",
    "Matt Marshal Green Metallic",
    "Dual Tone – Black with Silver",
    "Dual Tone – Black with Red",
    "Pearl Deep Mud Grey",
    "Matte Axis Grey Metallic",
    "Grand Prix Red",
    "Sports Red",
    "Mat Gunpowder Black Metallic",
    "Pearl Spartan Red",
    "Candy Caribbean Blue Sea",
    "White",
  ];
  for (let i = 0; i < colours.length; i++) {
    await prisma.vehicleColour.upsert({
      where: { brand_name: { brand: "BIGWING", name: colours[i] } },
      update: {},
      create: { name: colours[i], displayOrder: (i + 1) * 10 },
    });
  }
  console.log(`  ✅ ${colours.length} vehicle colours seeded`);

  // ─── Referred Branches (master.referred_branch) ─────────────────
  const branches = [
    { displayOrder: 1, name: "Bommanahalli", branchName: "Bommanahalli", networkCode: "KA010008", networkType: "MAIN DEALER", inventoryLocation: "HMSI-PARTS-S-KA-KA010008-HEAD BRANCH-ANANDA HONDA" },
    { displayOrder: 2, name: "Hosa Road", branchName: "Hosa Road", networkCode: "KA01BD08", networkType: "BRANCH", inventoryLocation: "HMSI-PARTS-S-KA-KA01BD08-HOSA ROAD-ANDHON" },
    { displayOrder: 3, name: "Sarjapura", branchName: "Sarjapura", networkCode: "KA01BB08", networkType: "BRANCH", inventoryLocation: "HMSI-PARTS-S-KA-KA01BB08-SARJPURA-ANDHON" },
    { displayOrder: 4, name: "Hebbagodi", branchName: "Hebbagodi", networkCode: "KA01BA08", networkType: "BRANCH", inventoryLocation: "BA08-HEBBAGODI-ANDHON" },
    { displayOrder: 5, name: "Chandapura", branchName: "Chandapura", networkCode: "KA01AE08", networkType: "ASC", inventoryLocation: "HMSI-PARTS-S-KA-KA01AE08-CHANDAPURA-ANDHON" },
    { displayOrder: 6, name: "Jigani", branchName: "Jigani", networkCode: "KA01BC08", networkType: "BRANCH", inventoryLocation: "HMSI-PARTS-S-KA-KA01BC08-JIGANI-ANDHON" },
    { displayOrder: 7, name: "Attibele", branchName: "Attibele", networkCode: "KA01BF08", networkType: "AD OWNED", inventoryLocation: "HMSI-PARTS-S-KA-KA01BF08-Attibele-ANDHON" },
    { displayOrder: 8, name: "E-city", branchName: "E-city", networkCode: "KA01AD08", networkType: "ASC", inventoryLocation: "HMSI-PARTS-S-KA-KA01AD08-ELECTRONIC CITY-ANDHON" },
    { displayOrder: 9, name: "Kasavanahalli", branchName: "Kasavanahalli", networkCode: "KA01AF08", networkType: "ASC", inventoryLocation: "HMSI-PARTS-S-KA-KA01AF08-JAIL ROAD-ANDHON" },
    { displayOrder: 10, name: "Gopasandra", branchName: "Gopasandra", networkCode: "KA01AG08", networkType: "ASC", inventoryLocation: "HMSI-PARTS-S-KA-KA01AG08-Gopasandra-ANDHON" },
    { displayOrder: 11, name: "Devarchiknahalli", branchName: "Devarchiknahalli", networkCode: "KA01BE08", networkType: "AD OWNED", inventoryLocation: "HMSI-PARTS-S-KA-KA01BE08-Begur-ANDHON" }
  ];
  const redWingBranches = branches.map(b => ({
    ...b,
    brand: "REDWING",
    name: b.name,
    branchName: b.branchName
  }));

  const allBranches = [...branches, ...redWingBranches];

  await prisma.referredBranch.deleteMany({
    where: {
      name: {
        endsWith: "(Red Wing)"
      }
    }
  });

  for (const b of allBranches) {
    await prisma.referredBranch.upsert({
      where: { brand_name: { brand: b.brand ?? "BIGWING", name: b.name } },
      update: b,
      create: b,
    });
  }
  console.log(`  ✅ ${allBranches.length} referred branches seeded`);

  // ─── Dev / Test Users ───────────────────────────────────────────
  const devUsers = [
    {
      email: "manager@bigwing.in",
      fullName: "Rajesh Kumar",
      mobile: "9876543210",
      role: "MANAGER",
    },
    {
      email: "sales1@bigwing.in",
      fullName: "Priya Sharma",
      mobile: "9876543211",
      role: "SALES_EXECUTIVE",
    },
    {
      email: "sales2@bigwing.in",
      fullName: "Arun Nair",
      mobile: "9876543212",
      role: "SALES_EXECUTIVE",
    },
    {
      email: "telecaller@bigwing.in",
      fullName: "Meena Reddy",
      mobile: "9876543213",
      role: "TELE_CALLER",
    },
  ];
  const devPassword = await bcrypt.hash("BigWing@2026", 12);
  for (const u of devUsers) {
    const role = await prisma.role.findUnique({ where: { name: u.role } });
    if (!role) continue;
    await prisma.user.upsert({
      where: { username: u.email.split("@")[0] },
      update: {},
      create: {
        username: u.email.split("@")[0],
        email: u.email,
        password: devPassword,
        fullName: u.fullName,
        mobile: u.mobile,
        isActive: true,
        userRoles: { create: { roleId: role.id } },
      },
    });
  }
  console.log(`  ✅ ${devUsers.length} dev users seeded`);

  // ─── Requested Telecaller User ──────────────────────────────────
  const reqTeleEmail = "telecaller@example.com";
  const reqTelePassword = await bcrypt.hash("tele@123", 12);
  const teleRole = await prisma.role.findUnique({ where: { name: "TELE_CALLER" } });
  if (teleRole) {
    await prisma.user.upsert({
      where: { username: "telecaller_req" },
      update: {},
      create: {
        username: "telecaller_req",
        email: reqTeleEmail,
        password: reqTelePassword,
        fullName: "Tele",
        isActive: true,
        userRoles: { create: { roleId: teleRole.id } },
      },
    });
    console.log(`  ✅ Specific Telecaller user seeded (${reqTeleEmail})`);
  }

  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
