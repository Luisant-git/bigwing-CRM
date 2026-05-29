import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'redwing@bigwing.in';
  
  // Check if exists
  let user = await prisma.user.findUnique({ where: { email } });
  
  if (!user) {
    const hashedPassword = await bcrypt.hash('redwing123', 12);
    const role = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    
    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName: 'Redwing Admin',
        isActive: true,
        userRoles: {
          create: { roleId: role!.id }
        }
      }
    });
    console.log('Created user:', user.email);
  } else {
    console.log('User already exists:', user.email);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
