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

  // ─── Departments ──────────────────────────────────────────────────────────
  const seedDepartments = [
    {
      name: 'Management',
      description: 'Hotel leadership and administration',
      color: 'bg-blue-500',
    },
    {
      name: 'Operations',
      description: 'Day-to-day hotel operations',
      color: 'bg-violet-500',
    },
    {
      name: 'Front Desk',
      description: 'Guest check-in, check-out and reception',
      color: 'bg-amber-500',
    },
    {
      name: 'Housekeeping',
      description: 'Room cleaning and maintenance',
      color: 'bg-emerald-500',
    },
    {
      name: 'Finance',
      description: 'Billing, cashier and financial operations',
      color: 'bg-orange-500',
    },
    {
      name: 'Security',
      description: 'Hotel security and safety',
      color: 'bg-red-500',
    },
    {
      name: 'Maintenance',
      description: 'Repairs and technical operations',
      color: 'bg-slate-500',
    },
    {
      name: 'Bar',
      description: 'Bar operations and beverage service',
      color: 'bg-pink-500',
    },
  ];

  for (const dept of seedDepartments) {
    await prisma.department.upsert({
      where: { hotelId_name: { hotelId: hotel.id, name: dept.name } },
      update: {
        description: dept.description,
        color: dept.color,
      },
      create: {
        hotelId: hotel.id,
        name: dept.name,
        description: dept.description,
        color: dept.color,
      },
    });
  }
  console.log(`✅ ${seedDepartments.length} departments seeded`);

  // ─── Inventory Categories ─────────────────────────────────────────────────
  const seedCategories = [
    { name: 'Spirits', description: 'Whiskey, vodka, gin, rum, brandy', color: 'bg-amber-500' },
    { name: 'Beer', description: 'Lager, stout, ale, cider', color: 'bg-orange-500' },
    { name: 'Wine', description: 'Red, white, rosé, sparkling', color: 'bg-red-500' },
    { name: 'Cocktails', description: 'Mixes, syrups, bitters', color: 'bg-pink-500' },
    { name: 'Soft Drinks', description: 'Juices, sodas, water, energy drinks', color: 'bg-sky-500' },
    { name: 'Food', description: 'Snacks, bar bites, kitchen items', color: 'bg-emerald-500' },
  ];

  for (const cat of seedCategories) {
    await prisma.inventoryCategory.upsert({
      where: { hotelId_name: { hotelId: hotel.id, name: cat.name } },
      update: { description: cat.description, color: cat.color },
      create: {
        hotelId: hotel.id,
        name: cat.name,
        description: cat.description,
        color: cat.color,
      },
    });
  }
  console.log(`✅ ${seedCategories.length} inventory categories seeded`);

  // ─── Suppliers ───────────────────────────────────────────────────────────
  const seedSuppliers = [
    {
      name: 'Metro Drinks',
      contact: 'Olu Adeyinka',
      phone: '+234 801 555 0001',
      email: 'olu@metrodrinks.ng',
      address: 'Lagos, Nigeria',
      categories: ['Spirits', 'Cocktails', 'Wine'],
    },
    {
      name: 'BrewCo Nigeria',
      contact: 'Emeka Osu',
      phone: '+234 802 555 0002',
      email: 'emeka@brewco.ng',
      address: 'Onitsha, Nigeria',
      categories: ['Beer'],
    },
    {
      name: 'Soft Bev Ltd',
      contact: 'Taiwo Adeleke',
      phone: '+234 803 555 0003',
      email: 'taiwo@softbev.ng',
      address: 'Ibadan, Nigeria',
      categories: ['Soft Drinks'],
    },
    {
      name: 'Fresh Foods Co',
      contact: 'Chioma Nwachukwu',
      phone: '+234 804 555 0004',
      email: 'chioma@freshfoods.ng',
      address: 'Port Harcourt, Nigeria',
      categories: ['Food'],
      notes: 'Delivers every Mon & Thu morning',
    },
  ];

  for (const sup of seedSuppliers) {
    await prisma.supplier.upsert({
      where: { hotelId_name: { hotelId: hotel.id, name: sup.name } },
      update: {
        contact: sup.contact,
        phone: sup.phone,
        email: sup.email,
        address: sup.address,
        notes: sup.notes ?? null,
        categories: sup.categories ?? [],
      },
      create: {
        hotelId: hotel.id,
        name: sup.name,
        contact: sup.contact,
        phone: sup.phone,
        email: sup.email,
        address: sup.address,
        notes: sup.notes ?? null,
        categories: sup.categories ?? [],
      },
    });
  }
  console.log(`✅ ${seedSuppliers.length} suppliers seeded`);

  // ─── Inventory Items ─────────────────────────────────────────────────────
  const seedInventoryItems = [
    {
      name: 'Sparkling Water',
      sku: 'BV-101',
      category: 'Soft Drinks',
      description: 'Premium bottled sparkling water',
      unit: 'crate (24)',
      quantity: 64,
      minStock: 80,
      costPerUnit: 8,
      sellPrice: 12,
      supplier: 'Soft Bev Ltd',
      location: 'Main Store',
    },
    {
      name: 'House Red Wine',
      sku: 'BV-214',
      category: 'Wine',
      description: 'House red wine - 750ml',
      unit: 'bottle',
      quantity: 18,
      minStock: 30,
      costPerUnit: 12,
      sellPrice: 30,
      supplier: 'Metro Drinks',
      location: 'Bar Storage',
    },
    {
      name: 'Classic Burger',
      sku: 'KT-188',
      category: 'Food',
      description: 'Grilled beef burger with fries',
      unit: 'portion',
      quantity: 16,
      minStock: 25,
      costPerUnit: 4.5,
      sellPrice: 12,
      supplier: 'Fresh Foods Co',
      location: 'Kitchen',
    },
    {
      name: 'Caesar Salad',
      sku: 'KT-164',
      category: 'Food',
      description: 'Romaine lettuce with caesar dressing',
      unit: 'portion',
      quantity: 9,
      minStock: 15,
      costPerUnit: 3.8,
      sellPrice: 9,
      supplier: 'Fresh Foods Co',
      location: 'Kitchen',
    },
    {
      name: 'Spa Oil Set',
      sku: 'RT-221',
      category: 'Cocktails',
      description: 'Signature spa oil set',
      unit: 'bottle',
      quantity: 7,
      minStock: 12,
      costPerUnit: 6,
      sellPrice: 18,
      supplier: 'Metro Drinks',
      location: 'Spa Store',
    },
  ];

  for (const item of seedInventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { hotelId_sku: { hotelId: hotel.id, sku: item.sku } },
      update: {
        name: item.name,
        category: item.category,
        unit: item.unit,
        quantity: item.quantity,
        minStock: item.minStock,
        costPerUnit: item.costPerUnit,
        sellPrice: item.sellPrice ?? null,
        description: item.description ?? null,
        supplier: item.supplier,
        location: item.location,
      },
      create: {
        hotelId: hotel.id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        unit: item.unit,
        quantity: item.quantity,
        minStock: item.minStock,
        costPerUnit: item.costPerUnit,
        sellPrice: item.sellPrice ?? null,
        description: item.description ?? null,
        supplier: item.supplier,
        location: item.location,
      },
    });
  }
  console.log(`✅ ${seedInventoryItems.length} inventory items seeded`);

  // ─── Shift Templates ──────────────────────────────────────────────────────
  const seedShifts = [
    {
      name: 'Morning',
      startTime: '07:00',
      endTime: '15:00',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      color: 'bg-amber-500',
    },
    {
      name: 'Evening',
      startTime: '15:00',
      endTime: '23:00',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      color: 'bg-violet-500',
    },
    {
      name: 'Night',
      startTime: '23:00',
      endTime: '07:00',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      color: 'bg-slate-500',
    },
    {
      name: 'Half Day',
      startTime: '08:00',
      endTime: '13:00',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      color: 'bg-emerald-500',
    },
  ];

  for (const shift of seedShifts) {
    await prisma.shiftTemplate.upsert({
      where: { hotelId_name: { hotelId: hotel.id, name: shift.name } },
      update: {
        startTime: shift.startTime,
        endTime: shift.endTime,
        days: shift.days,
        color: shift.color,
      },
      create: {
        hotelId: hotel.id,
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        days: shift.days,
        color: shift.color,
      },
    });
  }
  console.log(`✅ ${seedShifts.length} shift templates seeded`);

  // ─── Room Type Configs ────────────────────────────────────────────────────
  const seedRoomTypes = [
    {
      name: 'Standard',
      description: 'Comfortable room with essential amenities',
      baseRate: 150,
      capacity: 2,
      beds: '1 Queen',
      amenities: ['WiFi', 'AC', 'TV'],
      color: 'bg-slate-500',
    },
    {
      name: 'Deluxe',
      description: 'Spacious room with premium furnishings',
      baseRate: 220,
      capacity: 2,
      beds: '1 King',
      amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Safe'],
      color: 'bg-blue-500',
    },
    {
      name: 'Suite',
      description: 'Luxurious suite with separate living area',
      baseRate: 380,
      capacity: 3,
      beds: '1 King + Sofa',
      amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Balcony', 'Jacuzzi', 'Safe'],
      color: 'bg-violet-500',
    },
    {
      name: 'Presidential',
      description: 'Ultimate luxury with panoramic views',
      baseRate: 800,
      capacity: 4,
      beds: '2 King',
      amenities: [
        'WiFi',
        'AC',
        'TV',
        'Mini Bar',
        'Balcony',
        'Sea View',
        'Jacuzzi',
        'Kitchen',
        'Safe',
        'Bathtub',
      ],
      color: 'bg-amber-500',
    },
    {
      name: 'Family',
      description: 'Large room designed for families',
      baseRate: 280,
      capacity: 5,
      beds: '1 King + 2 Single',
      amenities: ['WiFi', 'AC', 'TV', 'Safe'],
      color: 'bg-emerald-500',
    },
  ];

  for (const rt of seedRoomTypes) {
    await prisma.roomTypeConfig.upsert({
      where: { hotelId_name: { hotelId: hotel.id, name: rt.name } },
      update: {
        description: rt.description,
        baseRate: rt.baseRate,
        capacity: rt.capacity,
        beds: rt.beds,
        amenities: rt.amenities,
        color: rt.color,
      },
      create: {
        hotelId: hotel.id,
        name: rt.name,
        description: rt.description,
        baseRate: rt.baseRate,
        capacity: rt.capacity,
        beds: rt.beds,
        amenities: rt.amenities,
        color: rt.color,
      },
    });
  }
  console.log(`✅ ${seedRoomTypes.length} room type configs seeded`);

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
      email: 'admin@hotel.com',
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

  // ─── Role Permissions ────────────────────────────────────────────────────
  const rolePermissions: Record<Role, string[]> = {
    [Role.SUPER_ADMIN]: [
      'view:dashboard',
      'view:rooms',
      'create:rooms',
      'edit:rooms',
      'delete:rooms',
      'view:reservations',
      'create:reservations',
      'edit:reservations',
      'delete:reservations',
      'checkin:reservations',
      'checkout:reservations',
      'view:guests',
      'create:guests',
      'edit:guests',
      'delete:guests',
      'view:staff',
      'create:staff',
      'edit:staff',
      'delete:staff',
      'view:attendance',
      'manage:attendance',
      'clock:self',
      'view:pos',
      'create:pos',
      'void:pos',
      'discount:pos',
      'view:inventory',
      'create:inventory',
      'edit:inventory',
      'delete:inventory',
      'reorder:inventory',
      'view:housekeeping',
      'manage:housekeeping',
      'view:finance',
      'create:finance',
      'edit:finance',
      'delete:finance',
      'approve:finance',
      'view:reports',
      'export:reports',
      'view:facilities',
      'manage:facilities',
      'view:settings',
      'manage:settings',
      'view:hr',
      'manage:hr',
      'manage:permissions',
    ],
    [Role.ADMIN]: [
      'view:dashboard',
      'view:rooms',
      'create:rooms',
      'edit:rooms',
      'delete:rooms',
      'view:reservations',
      'create:reservations',
      'edit:reservations',
      'delete:reservations',
      'checkin:reservations',
      'checkout:reservations',
      'view:guests',
      'create:guests',
      'edit:guests',
      'delete:guests',
      'view:staff',
      'create:staff',
      'edit:staff',
      'delete:staff',
      'view:attendance',
      'manage:attendance',
      'clock:self',
      'view:pos',
      'create:pos',
      'void:pos',
      'discount:pos',
      'view:inventory',
      'create:inventory',
      'edit:inventory',
      'delete:inventory',
      'reorder:inventory',
      'view:housekeeping',
      'manage:housekeeping',
      'view:finance',
      'create:finance',
      'edit:finance',
      'approve:finance',
      'view:reports',
      'export:reports',
      'view:facilities',
      'manage:facilities',
      'view:settings',
      'manage:settings',
      'view:hr',
      'manage:hr',
      'manage:permissions',
    ],
    [Role.MANAGER]: [
      'view:dashboard',
      'view:rooms',
      'edit:rooms',
      'view:reservations',
      'create:reservations',
      'edit:reservations',
      'checkin:reservations',
      'checkout:reservations',
      'view:guests',
      'create:guests',
      'edit:guests',
      'view:staff',
      'edit:staff',
      'view:attendance',
      'manage:attendance',
      'clock:self',
      'view:pos',
      'create:pos',
      'void:pos',
      'discount:pos',
      'view:inventory',
      'create:inventory',
      'edit:inventory',
      'reorder:inventory',
      'view:housekeeping',
      'manage:housekeeping',
      'view:finance',
      'create:finance',
      'edit:finance',
      'view:reports',
      'export:reports',
      'view:facilities',
      'manage:facilities',
      'view:settings',
      'view:hr',
      'manage:hr',
    ],
    [Role.RECEPTIONIST]: [
      'view:dashboard',
      'view:rooms',
      'view:reservations',
      'create:reservations',
      'edit:reservations',
      'checkin:reservations',
      'checkout:reservations',
      'view:guests',
      'create:guests',
      'edit:guests',
      'clock:self',
      'view:pos',
      'create:pos',
      'view:facilities',
    ],
    [Role.HOUSEKEEPING]: [
      'view:dashboard',
      'view:rooms',
      'view:housekeeping',
      'manage:housekeeping',
      'clock:self',
    ],
    [Role.CASHIER]: [
      'view:dashboard',
      'view:pos',
      'create:pos',
      'void:pos',
      'view:finance',
      'clock:self',
    ],
    [Role.BARTENDER]: [
      'view:dashboard',
      'view:pos',
      'create:pos',
      'view:inventory',
      'clock:self',
    ],
    [Role.STAFF]: ['view:dashboard', 'clock:self'],
  };

  for (const role of Object.keys(rolePermissions) as Role[]) {
    await prisma.rolePermission.upsert({
      where: { hotelId_role: { hotelId: hotel.id, role } },
      update: { permissions: rolePermissions[role] },
      create: { hotelId: hotel.id, role, permissions: rolePermissions[role] },
    });
  }
  console.log(`✅ ${Object.keys(rolePermissions).length} role permissions seeded`);

  // ─── POS Terminals ───────────────────────────────────────────────────────
  const seedTerminals = [
    {
      id: 'term-bar-01',
      name: 'Bar Terminal 01',
      location: 'Main Bar',
      group: 'Bar',
      device: 'Tablet',
      status: 'Online',
    },
    {
      id: 'term-bar-02',
      name: 'Bar Terminal 02',
      location: 'Rooftop Bar',
      group: 'Bar',
      device: 'Tablet',
      status: 'Online',
    },
    {
      id: 'term-kitchen-01',
      name: 'Kitchen Terminal 01',
      location: 'Main Kitchen',
      group: 'Kitchen',
      device: 'Desktop',
      status: 'Online',
    },
    {
      id: 'term-front-01',
      name: 'Front Desk POS',
      location: 'Lobby',
      group: 'Front Desk',
      device: 'Desktop',
      status: 'Online',
    },
  ];

  for (const t of seedTerminals) {
    await prisma.posTerminal.upsert({
      where: { id: t.id },
      update: {
        name: t.name,
        location: t.location,
        group: t.group,
        device: t.device,
        status: t.status,
      },
      create: {
        id: t.id,
        hotelId: hotel.id,
        name: t.name,
        location: t.location,
        group: t.group,
        device: t.device,
        status: t.status,
      },
    });
  }
  console.log(`✅ ${seedTerminals.length} POS terminals seeded`);

  // ─── Floors ───────────────────────────────────────────────────────────────
  const floorDefs = [
    { level: 1, name: 'Floor 1' },
    { level: 2, name: 'Floor 2' },
    { level: 3, name: 'Floor 3' },
    { level: 4, name: 'Floor 4 (Penthouse)' },
  ];

  const floorMap: Record<number, string> = {};
  for (const f of floorDefs) {
    const floor = await prisma.floor.upsert({
      where: { hotelId_level: { hotelId: hotel.id, level: f.level } },
      update: { name: f.name },
      create: { hotelId: hotel.id, level: f.level, name: f.name },
    });
    floorMap[f.level] = floor.id;
  }
  console.log(`✅ ${floorDefs.length} floors seeded`);

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
        floorId: floorMap[r.floor],
        type: r.type as any,
        status: 'AVAILABLE',
        baseRate: r.baseRate,
        maxGuests: r.type === 'PRESIDENTIAL' ? 4 : 2,
        amenities: ['WiFi', 'AC', 'TV'],
      },
    });
  }
  console.log(`✅ ${rooms.length} rooms seeded`);

  // ─── Guests ───────────────────────────────────────────────────────────────
  const guestDefs = [
    {
      id: 'seed-guest-1',
      firstName: 'Chidi',
      lastName: 'Okeke',
      email: 'chidi.okeke@gmail.com',
      phone: '+234 802 111 2233',
      nationality: 'Nigerian',
      idType: 'NATIONAL_ID',
      idNumber: 'NIN-001122334',
      stayType: 'full_time',
      isVip: false,
      notes: null,
    },
    {
      id: 'seed-guest-2',
      firstName: 'Amina',
      lastName: 'Yusuf',
      email: 'amina.yusuf@outlook.com',
      phone: '+234 803 222 3344',
      nationality: 'Nigerian',
      idType: 'PASSPORT',
      idNumber: 'A12345678',
      stayType: 'full_time',
      isVip: true,
      notes: 'VIP — prefers high floor, no feather pillows',
    },
    {
      id: 'seed-guest-3',
      firstName: 'Emeka',
      lastName: 'Nwosu',
      email: 'emeka.nwosu@yahoo.com',
      phone: '+234 805 333 4455',
      nationality: 'Nigerian',
      idType: 'DRIVERS_LICENSE',
      idNumber: 'DL-556677',
      stayType: 'full_time',
      isVip: false,
      notes: null,
    },
    {
      id: 'seed-guest-4',
      firstName: 'Ngozi',
      lastName: 'Adeyemi',
      email: 'ngozi.a@corporate.ng',
      phone: '+234 806 444 5566',
      nationality: 'Nigerian',
      idType: 'PASSPORT',
      idNumber: 'B98765432',
      stayType: 'full_time',
      isVip: true,
      notes: 'Corporate guest — invoice to Adeyemi & Associates Ltd',
    },
    {
      id: 'seed-guest-5',
      firstName: 'Tunde',
      lastName: 'Bakare',
      email: 'tunde.bakare@gmail.com',
      phone: '+234 807 555 6677',
      nationality: 'Nigerian',
      idType: 'NATIONAL_ID',
      idNumber: 'NIN-998877665',
      stayType: 'full_time',
      isVip: false,
      notes: null,
    },
    {
      id: 'seed-guest-6',
      firstName: 'Fatima',
      lastName: 'Ibrahim',
      email: 'fatima.ibrahim@gmail.com',
      phone: '+234 808 666 7788',
      nationality: 'Nigerian',
      idType: 'PASSPORT',
      idNumber: 'C11223344',
      stayType: 'short_time',
      isVip: false,
      notes: 'Allergic to shellfish — note for room service',
    },
    {
      id: 'seed-guest-7',
      firstName: 'David',
      lastName: 'Okonkwo',
      email: 'david.okonkwo@company.com',
      phone: '+234 809 777 8899',
      nationality: 'Nigerian',
      idType: 'NATIONAL_ID',
      idNumber: 'NIN-334455667',
      stayType: 'short_time',
      isVip: false,
      notes: null,
    },
    {
      id: 'seed-guest-8',
      firstName: 'Kemi',
      lastName: 'Oladele',
      email: 'kemi.oladele@gmail.com',
      phone: '+234 810 888 9900',
      nationality: 'Nigerian',
      idType: 'PASSPORT',
      idNumber: 'D55443322',
      stayType: 'short_time',
      isVip: true,
      notes: 'VIP — return guest, complimentary upgrade when available',
    },
  ];

  const guestMap: Record<string, string> = {};
  for (const g of guestDefs) {
    const guest = await prisma.guest.upsert({
      where: { id: g.id },
      update: {},
      create: {
        id: g.id,
        hotelId: hotel.id,
        firstName: g.firstName,
        lastName: g.lastName,
        email: g.email,
        phone: g.phone,
        nationality: g.nationality,
        idType: g.idType,
        idNumber: g.idNumber,
        isVip: g.isVip,
        notes: g.notes,
      },
    });
    guestMap[g.id] = guest.id;
  }
  console.log(`✅ ${guestDefs.length} guests seeded`);

  // ─── Rooms lookup ──────────────────────────────────────────────────────────
  // We need room IDs to create reservations — look them up by number
  const roomLookup: Record<string, string> = {};
  const seededRooms = await prisma.room.findMany({
    where: { hotelId: hotel.id },
    select: { id: true, number: true },
  });
  for (const r of seededRooms) roomLookup[r.number] = r.id;

  // ─── Reservations ─────────────────────────────────────────────────────────
  type ResDef = {
    id: string;
    reservationNo: string;
    guestId: string;
    roomNumber: string;
    checkIn: Date;
    checkOut: Date;
    adults: number;
    children: number;
    status: 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'PENDING';
    paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
    totalAmount: number;
    paidAmount: number;
    source: string;
    specialRequests?: string;
    notes?: string;
  };

  const today = new Date('2026-03-13');
  const d = (offset: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offset);
    return dt;
  };

  const resDefs: ResDef[] = [
    // Room 101 — checked in, staying 3 nights
    {
      id: 'seed-res-1',
      reservationNo: 'RES-2026-0001',
      guestId: 'seed-guest-1',
      roomNumber: '101',
      checkIn: d(-1),
      checkOut: d(2),
      adults: 2,
      children: 0,
      status: 'CHECKED_IN',
      paymentStatus: 'PARTIAL',
      totalAmount: 135000,
      paidAmount: 45000,
      source: 'DIRECT',
      specialRequests: 'Late check-out if possible',
    },
    // Room 102 — checked in, VIP, longer stay
    {
      id: 'seed-res-2',
      reservationNo: 'RES-2026-0002',
      guestId: 'seed-guest-2',
      roomNumber: '102',
      checkIn: d(-3),
      checkOut: d(4),
      adults: 1,
      children: 0,
      status: 'CHECKED_IN',
      paymentStatus: 'PARTIAL',
      totalAmount: 455000,
      paidAmount: 195000,
      source: 'DIRECT',
      notes: 'VIP — complimentary welcome drink arranged',
    },
    // Room 201 — confirmed, arriving tomorrow
    {
      id: 'seed-res-3',
      reservationNo: 'RES-2026-0003',
      guestId: 'seed-guest-3',
      roomNumber: '201',
      checkIn: d(1),
      checkOut: d(4),
      adults: 2,
      children: 1,
      status: 'CONFIRMED',
      paymentStatus: 'UNPAID',
      totalAmount: 195000,
      paidAmount: 0,
      source: 'BOOKING.COM',
      specialRequests: 'Extra bed for child',
    },
    // Room 203 — checked in, presidential suite
    {
      id: 'seed-res-4',
      reservationNo: 'RES-2026-0004',
      guestId: 'seed-guest-4',
      roomNumber: '203',
      checkIn: d(-2),
      checkOut: d(3),
      adults: 2,
      children: 0,
      status: 'CHECKED_IN',
      paymentStatus: 'PARTIAL',
      totalAmount: 600000,
      paidAmount: 240000,
      source: 'DIRECT',
      notes: 'Corporate booking — invoice required',
    },
    // Room 301 — confirmed, arriving in 2 days
    {
      id: 'seed-res-5',
      reservationNo: 'RES-2026-0005',
      guestId: 'seed-guest-5',
      roomNumber: '301',
      checkIn: d(2),
      checkOut: d(5),
      adults: 2,
      children: 0,
      status: 'CONFIRMED',
      paymentStatus: 'UNPAID',
      totalAmount: 360000,
      paidAmount: 0,
      source: 'DIRECT',
    },
    // Room 302 — checked in
    {
      id: 'seed-res-6',
      reservationNo: 'RES-2026-0006',
      guestId: 'seed-guest-6',
      roomNumber: '302',
      checkIn: d(-1),
      checkOut: d(2),
      adults: 1,
      children: 0,
      status: 'CHECKED_IN',
      paymentStatus: 'UNPAID',
      totalAmount: 180000,
      paidAmount: 0,
      source: 'AIRBNB',
    },
    // Room 401 — checked out yesterday (historical)
    {
      id: 'seed-res-7',
      reservationNo: 'RES-2026-0007',
      guestId: 'seed-guest-7',
      roomNumber: '401',
      checkIn: d(-5),
      checkOut: d(-1),
      adults: 2,
      children: 0,
      status: 'CHECKED_OUT',
      paymentStatus: 'PAID',
      totalAmount: 1400000,
      paidAmount: 1400000,
      source: 'DIRECT',
    },
    // Room 103 — checked in, VIP return guest
    {
      id: 'seed-res-8',
      reservationNo: 'RES-2026-0008',
      guestId: 'seed-guest-8',
      roomNumber: '103',
      checkIn: d(-2),
      checkOut: d(1),
      adults: 2,
      children: 0,
      status: 'CHECKED_IN',
      paymentStatus: 'PARTIAL',
      totalAmount: 195000,
      paidAmount: 65000,
      source: 'DIRECT',
      notes: 'Return VIP guest — complimentary upgrade applied',
    },
  ];

  // Update room statuses to match reservations
  const roomStatusUpdates: Record<string, string> = {
    '101': 'OCCUPIED',
    '102': 'OCCUPIED',
    '103': 'OCCUPIED',
    '201': 'RESERVED',
    '203': 'OCCUPIED',
    '301': 'RESERVED',
    '302': 'OCCUPIED',
    '401': 'AVAILABLE', // checked out
  };
  for (const [number, status] of Object.entries(roomStatusUpdates)) {
    if (roomLookup[number]) {
      await prisma.room.update({
        where: { id: roomLookup[number] },
        data: { status: status as any },
      });
    }
  }

  const resMap: Record<string, string> = {};
  for (const r of resDefs) {
    if (!roomLookup[r.roomNumber]) continue;
    const res = await prisma.reservation.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        hotelId: hotel.id,
        guestId: guestMap[r.guestId],
        roomId: roomLookup[r.roomNumber],
        reservationNo: r.reservationNo,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        adults: r.adults,
        children: r.children,
        status: r.status,
        paymentStatus: r.paymentStatus,
        totalAmount: r.totalAmount,
        paidAmount: r.paidAmount,
        source: r.source,
        specialRequests: r.specialRequests,
        notes: r.notes,
      },
    });
    resMap[r.id] = res.id;
  }
  console.log(`✅ ${resDefs.length} reservations seeded`);

  // ─── Folio Items ──────────────────────────────────────────────────────────
  type FolioDef = {
    reservationId: string;
    description: string;
    amount: number;
    quantity: number;
    category: string;
    createdAt: Date;
  };

  const folioDefs: FolioDef[] = [
    // RES-1 (Room 101, Chidi Okeke — 3 nights, partial payment)
    {
      reservationId: 'seed-res-1',
      description: 'Room charge — Standard (1 night)',
      amount: 45000,
      quantity: 1,
      category: 'ROOM',
      createdAt: d(-1),
    },
    {
      reservationId: 'seed-res-1',
      description: 'Room charge — Standard (1 night)',
      amount: 45000,
      quantity: 1,
      category: 'ROOM',
      createdAt: d(0),
    },
    {
      reservationId: 'seed-res-1',
      description: 'Room service — Jollof Rice & Chicken',
      amount: 8500,
      quantity: 1,
      category: 'FOOD',
      createdAt: d(0),
    },
    {
      reservationId: 'seed-res-1',
      description: 'Mini bar — water x4, Coke x2',
      amount: 3200,
      quantity: 1,
      category: 'MISC',
      createdAt: d(0),
    },
    {
      reservationId: 'seed-res-1',
      description: 'Deposit payment',
      amount: -45000,
      quantity: 1,
      category: 'MISC',
      createdAt: d(-1),
    },

    // RES-2 (Room 102, Amina Yusuf — VIP, 7 nights)
    {
      reservationId: 'seed-res-2',
      description: 'Room charge — Deluxe (1 night)',
      amount: 65000,
      quantity: 1,
      category: 'ROOM',
      createdAt: d(-3),
    },
    {
      reservationId: 'seed-res-2',
      description: 'Room charge — Deluxe (1 night)',
      amount: 65000,
      quantity: 1,
      category: 'ROOM',
      createdAt: d(-2),
    },
    {
      reservationId: 'seed-res-2',
      description: 'Room charge — Deluxe (1 night)',
      amount: 65000,
      quantity: 1,
      category: 'ROOM',
      createdAt: d(-1),
    },
    {
      reservationId: 'seed-res-2',
      description: 'Spa — Deep tissue massage (60 min)',
      amount: 35000,
      quantity: 1,
      category: 'SPA',
      createdAt: d(-2),
    },
    {
      reservationId: 'seed-res-2',
      description: 'Laundry service — 3 items',
      amount: 7500,
      quantity: 1,
      category: 'LAUNDRY',
      createdAt: d(-1),
    },
    {
      reservationId: 'seed-res-2',
      description: 'Room service — Breakfast',
      amount: 12000,
      quantity: 1,
      category: 'FOOD',
      createdAt: d(0),
    },
    {
      reservationId: 'seed-res-2',
      description: 'Advance payment',
      amount: -195000,
      quantity: 1,
      category: 'MISC',
      createdAt: d(-3),
    },

    // RES-4 (Room 203, Ngozi Adeyemi — corporate, 5 nights)
    {
      reservationId: 'seed-res-4',
      description: 'Room charge — Suite (1 night)',
      amount: 120000,
      quantity: 1,
      category: 'ROOM',
      createdAt: d(-2),
    },
    {
      reservationId: 'seed-res-4',
      description: 'Room charge — Suite (1 night)',
      amount: 120000,
      quantity: 1,
      category: 'ROOM',
      createdAt: d(-1),
    },
    {
      reservationId: 'seed-res-4',
      description: 'Conference room hire — 4 hours',
      amount: 45000,
      quantity: 1,
      category: 'MISC',
      createdAt: d(-1),
    },
    {
      reservationId: 'seed-res-4',
      description: 'Room service — Working lunch x2',
      amount: 24000,
      quantity: 1,
      category: 'FOOD',
      createdAt: d(0),
    },
    {
      reservationId: 'seed-res-4',
      description: 'Airport transfer — outbound',
      amount: 18000,
      quantity: 1,
      category: 'MISC',
      createdAt: d(-2),
    },
    {
      reservationId: 'seed-res-4',
      description: 'Advance payment',
      amount: -240000,
      quantity: 1,
      category: 'MISC',
      createdAt: d(-2),
    },

    // RES-6 (Room 302, Fatima Ibrahim — 3 nights, unpaid)
    {
      reservationId: 'seed-res-6',
      description: 'Room charge — Suite (1 night)',
      amount: 120000,
      quantity: 1,
      category: 'ROOM',
      createdAt: d(-1),
    },
    {
      reservationId: 'seed-res-6',
      description: 'Mini bar — Heineken x4, Sprite x2',
      amount: 9600,
      quantity: 1,
      category: 'MISC',
      createdAt: d(-1),
    },
    {
      reservationId: 'seed-res-6',
      description: 'Room service — Pepper soup',
      amount: 6500,
      quantity: 1,
      category: 'FOOD',
      createdAt: d(0),
    },

    // RES-8 (Room 103, Kemi Oladele — VIP return, 3 nights)
    {
      reservationId: 'seed-res-8',
      description: 'Room charge — Deluxe (1 night)',
      amount: 65000,
      quantity: 1,
      category: 'ROOM',
      createdAt: d(-2),
    },
    {
      reservationId: 'seed-res-8',
      description: 'Room charge — Deluxe (1 night)',
      amount: 65000,
      quantity: 1,
      category: 'ROOM',
      createdAt: d(-1),
    },
    {
      reservationId: 'seed-res-8',
      description: 'Complimentary welcome fruit basket',
      amount: 0,
      quantity: 1,
      category: 'MISC',
      createdAt: d(-2),
    },
    {
      reservationId: 'seed-res-8',
      description: 'Spa — Facial treatment',
      amount: 25000,
      quantity: 1,
      category: 'SPA',
      createdAt: d(-1),
    },
    {
      reservationId: 'seed-res-8',
      description: 'Advance payment',
      amount: -65000,
      quantity: 1,
      category: 'MISC',
      createdAt: d(-2),
    },
  ];

  for (const f of folioDefs) {
    if (!resMap[f.reservationId]) continue;
    await prisma.folioItem.create({
      data: {
        hotelId: hotel.id,
        reservationId: resMap[f.reservationId],
        description: f.description,
        amount: f.amount,
        quantity: f.quantity,
        category: f.category,
        createdAt: f.createdAt,
      },
    });
  }
  console.log(`✅ ${folioDefs.length} folio items seeded`);

  // ─── Invoice + Payment for checked-out guest (RES-7) ─────────────────────
  if (resMap['seed-res-7']) {
    const inv = await prisma.invoice.upsert({
      where: { invoiceNo: 'INV-2026-0001' },
      update: {},
      create: {
        hotelId: hotel.id,
        reservationId: resMap['seed-res-7'],
        invoiceNo: 'INV-2026-0001',
        issuedAt: d(-1),
        subtotal: 1304348,
        tax: 95652,
        discount: 0,
        total: 1400000,
        paymentStatus: 'PAID',
        notes: 'Settled at checkout',
      },
    });
    const existingPayment = await prisma.payment.findUnique({ where: { id: 'seed-payment-1' } });
    if (!existingPayment) {
      await prisma.payment.create({
        data: {
          id: 'seed-payment-1',
          hotelId: hotel.id,
          invoiceId: inv.id,
          amount: 1400000,
          method: 'CARD',
          reference: 'TXN-GTBANK-20260312',
          paidAt: d(-1),
          note: 'Visa card — approved',
        },
      });
    }
    console.log('✅ Invoice + payment seeded for checkout guest');
  }

  // ─── Company ──────────────────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { hotelId_name: { hotelId: hotel.id, name: 'Adeyemi & Associates Ltd' } },
    update: {},
    create: {
      id: 'seed-company-1',
      hotelId: hotel.id,
      name: 'Adeyemi & Associates Ltd',
      email: 'accounts@adeyemi-associates.ng',
      phone: '+234 1 234 5678',
      address: '25 Broad Street, Lagos Island',
      taxId: 'TIN-20240012345',
      contactName: 'Mrs Chioma Adeyemi',
      notes: 'Preferred corporate client — NET 30 payment terms',
    },
  });
  console.log('✅ Company seeded');

  // ─── Group Booking ────────────────────────────────────────────────────────
  const groupBooking = await prisma.groupBooking.upsert({
    where: { groupNo: 'GRP-2026-001' },
    update: {},
    create: {
      id: 'seed-group-1',
      hotelId: hotel.id,
      groupNo: 'GRP-2026-001',
      name: 'Nwosu Family Reunion',
      notes: '12 guests, 4 rooms, wedding weekend — 15 Mar to 17 Mar',
    },
  });
  console.log('✅ Group booking seeded');

  // ─── Update reservations with company / group / bookingType ───────────────
  // RES-4 (Ngozi Adeyemi, Room 203) → company booking
  if (resMap['seed-res-4']) {
    await prisma.reservation.update({
      where: { id: resMap['seed-res-4'] },
      data: { companyId: company.id, bookingType: 'COMPANY' },
    });
  }

  // RES-3 (Emeka Nwosu, Room 201) → group booking + family
  if (resMap['seed-res-3']) {
    await prisma.reservation.update({
      where: { id: resMap['seed-res-3'] },
      data: { groupBookingId: groupBooking.id, bookingType: 'FAMILY' },
    });
  }

  // RES-2 (Amina Yusuf, Room 102) → 2 adults
  if (resMap['seed-res-2']) {
    await prisma.reservation.update({
      where: { id: resMap['seed-res-2'] },
      data: { adults: 2, bookingType: 'INDIVIDUAL' },
    });
  }
  console.log('✅ Reservations updated with company/group/bookingType');

  // ─── ReservationGuest rows ────────────────────────────────────────────────
  // Wire up primary guests for all reservations
  const primaryGuestLinks = [
    { resId: 'seed-res-1', guestId: 'seed-guest-1', role: 'PRIMARY' },
    { resId: 'seed-res-2', guestId: 'seed-guest-2', role: 'PRIMARY' },
    { resId: 'seed-res-3', guestId: 'seed-guest-3', role: 'PRIMARY' },
    { resId: 'seed-res-4', guestId: 'seed-guest-4', role: 'PRIMARY' },
    { resId: 'seed-res-5', guestId: 'seed-guest-5', role: 'PRIMARY' },
    { resId: 'seed-res-6', guestId: 'seed-guest-6', role: 'PRIMARY' },
    { resId: 'seed-res-7', guestId: 'seed-guest-7', role: 'PRIMARY' },
    { resId: 'seed-res-8', guestId: 'seed-guest-8', role: 'PRIMARY' },
  ];

  // RES-2: Amina Yusuf + an additional adult (Chidi Okeke is in another room
  // so reuse guest-1 as her companion for demo purposes)
  const additionalGuestLinks = [
    { resId: 'seed-res-2', guestId: 'seed-guest-5', role: 'ADDITIONAL' }, // companion guest
    { resId: 'seed-res-3', guestId: 'seed-guest-6', role: 'ADDITIONAL' }, // spouse in family room
  ];

  const allLinks = [...primaryGuestLinks, ...additionalGuestLinks];
  let rgCount = 0;
  for (const link of allLinks) {
    if (!resMap[link.resId] || !guestMap[link.guestId]) continue;
    await prisma.reservationGuest.upsert({
      where: {
        reservationId_guestId: {
          reservationId: resMap[link.resId],
          guestId: guestMap[link.guestId],
        },
      },
      update: {},
      create: {
        reservationId: resMap[link.resId],
        guestId: guestMap[link.guestId],
        role: link.role as any,
      },
    });
    rgCount++;
  }
  console.log(`✅ ${rgCount} reservation-guest links seeded`);

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
