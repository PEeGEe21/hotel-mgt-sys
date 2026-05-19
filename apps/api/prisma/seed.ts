import { PrismaClient } from '@prisma/client';
import { runSeedData } from '../src/modules/seed/seed-data';

const prisma = new PrismaClient();

runSeedData(prisma)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
