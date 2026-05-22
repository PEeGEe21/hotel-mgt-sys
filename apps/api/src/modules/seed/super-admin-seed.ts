import { ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export async function seedSuperAdmin(
  prisma: PrismaClient,
  config: {
    email?: string;
    password?: string;
    name?: string;
  },
) {
  const email = config.email?.trim().toLowerCase();
  const password = config.password?.trim();
  const name = config.name?.trim() || 'Platform Super Admin';

  if (!email || !password) {
    throw new InternalServerErrorException(
      'SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be configured for super-admin seed.',
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { staff: true },
  });

  const passwordHash = await bcrypt.hash(password, 12);
  const username = email.includes('@') ? email.split('@')[0] : email;
  const [firstName, ...rest] = name.split(/\s+/).filter(Boolean);
  const lastName = rest.join(' ');

  if (existing?.staff) {
    throw new ConflictException('Super admin seed email is already attached to a hotel staff account.');
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
      username,
    },
    create: {
      email,
      username,
      passwordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  return {
    ok: true,
    seeded: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: firstName || null,
      lastName: lastName || null,
    },
  };
}
