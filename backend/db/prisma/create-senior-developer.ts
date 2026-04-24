import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

// One-shot script to upsert the senior developer account used by the
// Truncate-All-Data button on the Import page. Idempotent — rerun safely.
//
// Run with:  npx tsx backend/db/prisma/create-senior-developer.ts
//            (or: npm run -w @bigwing/db -- exec tsx prisma/create-senior-developer.ts)

const EMAIL = "seniordeveloper@bigwing.in";
const PASSWORD = "SeniorDev@2026";
const FULL_NAME = "Senior Developer";
const ROLE_NAME = "SUPER_ADMIN";

const prisma = new PrismaClient();

async function main() {
  const role = await prisma.role.findUnique({ where: { name: ROLE_NAME } });
  if (!role) {
    throw new Error(
      `Role ${ROLE_NAME} not found. Run the main seed first: npm run -w @bigwing/db seed`
    );
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { password: passwordHash, fullName: FULL_NAME, isActive: true },
    create: {
      email: EMAIL,
      password: passwordHash,
      fullName: FULL_NAME,
      isActive: true,
      userRoles: { create: { roleId: role.id } },
    },
    include: { userRoles: true },
  });

  // Ensure the SUPER_ADMIN role mapping exists even for pre-existing users
  const hasRole = user.userRoles.some((ur) => ur.roleId === role.id);
  if (!hasRole) {
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
  }

  console.log(`Senior developer account ready — ${EMAIL} (id=${user.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
