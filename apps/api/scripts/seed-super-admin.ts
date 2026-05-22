import { PrismaClient } from '@prisma/client';
import { seedSuperAdmin } from '../src/modules/seed/super-admin-seed';

const prisma = new PrismaClient();

seedSuperAdmin(prisma, {
  email: process.env.SUPER_ADMIN_EMAIL,
  password: process.env.SUPER_ADMIN_PASSWORD,
  name: process.env.SUPER_ADMIN_NAME,
})
  .then((result) => {
    console.log('Super admin seed completed:', result.user.email);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
