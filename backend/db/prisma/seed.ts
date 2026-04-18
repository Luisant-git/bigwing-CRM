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
    where: { email: adminEmail },
    update: {},
    create: {
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
      where: { name: sources[i] },
      update: {},
      create: { name: sources[i], displayOrder: (i + 1) * 10 },
    });
  }
  console.log(`  ✅ ${sources.length} enquiry sources seeded`);

  // ─── Enquiry Types (master.enquiry_type) ────────────────────────
  const types = ["New", "Service", "Spares", "Insurance", "Accessories"];
  for (let i = 0; i < types.length; i++) {
    await prisma.enquiryTypeLookup.upsert({
      where: { name: types[i] },
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
      where: { name: reasons[i] },
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
      where: { name: il.name },
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
      where: { name: models[i].name },
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
      where: { name: modelName },
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
      where: { name: colours[i] },
      update: {},
      create: { name: colours[i], displayOrder: (i + 1) * 10 },
    });
  }
  console.log(`  ✅ ${colours.length} vehicle colours seeded`);

  // ─── Referred Branches (master.referred_branch) ─────────────────
  const branches = [
    "Bigwing Mysore",
    "Bigwing Hubli",
    "Bigwing Mangalore",
    "Bigwing Belgaum",
  ];
  for (let i = 0; i < branches.length; i++) {
    await prisma.referredBranch.upsert({
      where: { name: branches[i] },
      update: {},
      create: { name: branches[i], displayOrder: (i + 1) * 10 },
    });
  }
  console.log(`  ✅ ${branches.length} referred branches seeded`);

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
      where: { email: u.email },
      update: {},
      create: {
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
