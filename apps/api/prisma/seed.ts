import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Hotel ────────────────────────────────────────────────────────────────
  const hotel = await prisma.hotel.upsert({
    where: { id: 'seed-hotel-id' },
    update: {},
    create: {
      id: 'seed-hotel-id',
      name: 'Grand Lagos Hotel',
      domain: 'grandlagos.com',
      address: '14 Adeola Odeku Street',
      city: 'Lagos',
      country: 'Nigeria',
      phone: '+234 801 234 5678',
      email: 'info@grandlagos.com',
      currency: 'NGN',
      timezone: 'Africa/Lagos',
    },
  });
  console.log(`✅ Hotel: ${hotel.name}`);

  // ─── Users + Staff ────────────────────────────────────────────────────────
  const seedUsers: Array<{
    email: string;
    password: string;
    role: Role;
    firstName: string;
    lastName: string;
    department: string;
    position: string;
    employeeCode: string;
  }> = [
    {
      email: 'admin@example.com',
      password: 'password',
      role: Role.ADMIN,
      firstName: 'Chukwuemeka',
      lastName: 'Obi',
      department: 'Management',
      position: 'Hotel Administrator',
      employeeCode: 'EMP-001',
    },
    {
      email: 'manager@grandlagos.com',
      password: 'password',
      role: Role.MANAGER,
      firstName: 'Ngozi',
      lastName: 'Adeyemi',
      department: 'Operations',
      position: 'Operations Manager',
      employeeCode: 'EMP-002',
    },
    {
      email: 'reception@grandlagos.com',
      password: 'password',
      role: Role.RECEPTIONIST,
      firstName: 'Fatima',
      lastName: 'Bello',
      department: 'Front Desk',
      position: 'Senior Receptionist',
      employeeCode: 'EMP-003',
    },
    {
      email: 'housekeeping@grandlagos.com',
      password: 'password',
      role: Role.HOUSEKEEPING,
      firstName: 'Emeka',
      lastName: 'Eze',
      department: 'Housekeeping',
      position: 'Head Housekeeper',
      employeeCode: 'EMP-004',
    },
    {
      email: 'cashier@grandlagos.com',
      password: 'password',
      role: Role.CASHIER,
      firstName: 'Adaeze',
      lastName: 'Okafor',
      department: 'Finance',
      position: 'Cashier',
      employeeCode: 'EMP-005',
    },
  ];

  for (const u of seedUsers) {
    const passwordHash = await bcrypt.hash(u.password, 12);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash,
        role: u.role,
        isActive: true,
      },
    });

    await prisma.staff.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        hotelId: hotel.id,
        employeeCode: u.employeeCode,
        firstName: u.firstName,
        lastName: u.lastName,
        department: u.department,
        position: u.position,
        hireDate: new Date('2024-01-01'),
        salary: 0,
      },
    });

    console.log(`✅ ${u.role}: ${u.email} / ${u.password}`);
  }

  // ─── Rooms ────────────────────────────────────────────────────────────────
  const rooms = [
    { number: '101', floor: 1, type: 'STANDARD', baseRate: 45000 },
    { number: '102', floor: 1, type: 'STANDARD', baseRate: 45000 },
    { number: '103', floor: 1, type: 'DELUXE', baseRate: 65000 },
    { number: '201', floor: 2, type: 'DELUXE', baseRate: 65000 },
    { number: '202', floor: 2, type: 'DELUXE', baseRate: 65000 },
    { number: '203', floor: 2, type: 'SUITE', baseRate: 120000 },
    { number: '301', floor: 3, type: 'SUITE', baseRate: 120000 },
    { number: '302', floor: 3, type: 'EXECUTIVE', baseRate: 180000 },
    { number: '401', floor: 4, type: 'PRESIDENTIAL', baseRate: 350000 },
  ] as const;

  for (const r of rooms) {
    await prisma.room.upsert({
      where: { hotelId_number: { hotelId: hotel.id, number: r.number } },
      update: {},
      create: {
        hotelId: hotel.id,
        number: r.number,
        floor: r.floor,
        type: r.type as any,
        status: 'AVAILABLE',
        baseRate: r.baseRate,
        maxGuests: r.type === 'PRESIDENTIAL' ? 4 : 2,
        amenities: ['WiFi', 'AC', 'TV'],
      },
    });
  }
  console.log(`✅ ${rooms.length} rooms seeded`);

  console.log('\n🏨 Seed complete!');
  console.log('─────────────────────────────────────');
  console.log('Login credentials:');
  console.log('  Admin:        admin@example.com     / password');
  console.log('  Manager:      manager@grandlagos.com   / password');
  console.log('  Receptionist: reception@grandlagos.com / password');
  console.log('─────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
