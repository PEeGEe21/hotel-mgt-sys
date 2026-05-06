import { Prisma, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const toNullableJson = (value: Prisma.InputJsonValue | null) =>
  value === null ? Prisma.JsonNull : value;

const DASHBOARD_WIDGETS = [
  {
    id: 'occupancy_overview',
    title: 'Occupancy Overview',
    permissionKey: 'view:rooms',
    featureFlag: null,
    defaultEnabled: true,
    defaultSize: 'compact',
    allowedSizes: ['compact', 'wide', 'full'],
  },
  {
    id: 'todays_checkins_outs',
    title: "Today's Check-ins/Outs",
    permissionKey: 'view:reservations',
    featureFlag: null,
    defaultEnabled: true,
    defaultSize: 'wide',
    allowedSizes: ['compact', 'wide', 'full'],
  },
  {
    id: 'room_status_grid',
    title: 'Room Status Grid',
    permissionKey: 'view:rooms',
    featureFlag: null,
    defaultEnabled: true,
    defaultSize: 'wide',
    allowedSizes: ['compact', 'wide', 'full'],
  },
  {
    id: 'revenue_today',
    title: 'Revenue Today',
    permissionKey: 'view:finance',
    featureFlag: null,
    defaultEnabled: true,
    defaultSize: 'compact',
    allowedSizes: ['compact', 'wide', 'full'],
  },
  {
    id: 'outstanding_folios',
    title: 'Outstanding Folios',
    permissionKey: 'view:finance',
    featureFlag: null,
    defaultEnabled: true,
    defaultSize: 'compact',
    allowedSizes: ['compact', 'wide', 'full'],
  },
  {
    id: 'pos_sales_today',
    title: 'POS Sales Today',
    permissionKey: 'view:pos',
    featureFlag: null,
    defaultEnabled: true,
    defaultSize: 'compact',
    allowedSizes: ['compact', 'wide', 'full'],
  },
  {
    id: 'active_pos_orders',
    title: 'Active POS Orders',
    permissionKey: 'view:pos',
    featureFlag: null,
    defaultEnabled: true,
    defaultSize: 'wide',
    allowedSizes: ['compact', 'wide', 'full'],
  },
  {
    id: 'low_stock_alerts',
    title: 'Low Stock Alerts',
    permissionKey: 'view:inventory',
    featureFlag: null,
    defaultEnabled: true,
    defaultSize: 'compact',
    allowedSizes: ['compact', 'wide', 'full'],
  },
  {
    id: 'housekeeping_queue',
    title: 'Housekeeping Queue',
    permissionKey: 'view:housekeeping',
    featureFlag: null,
    defaultEnabled: true,
    defaultSize: 'wide',
    allowedSizes: ['compact', 'wide', 'full'],
  },
  {
    id: 'staff_on_duty',
    title: 'Staff On Duty',
    permissionKey: 'view:attendance',
    featureFlag: null,
    defaultEnabled: true,
    defaultSize: 'compact',
    allowedSizes: ['compact', 'wide', 'full'],
  },
  {
    id: 'my_attendance_today',
    title: 'My Attendance Today',
    permissionKey: 'clock:self',
    featureFlag: null,
    defaultEnabled: true,
    defaultSize: 'compact',
    allowedSizes: ['compact', 'wide', 'full'],
  },
  {
    id: 'my_tasks_today',
    title: 'My Tasks Today',
    permissionKey: 'view:housekeeping',
    featureFlag: null,
    defaultEnabled: true,
    defaultSize: 'wide',
    allowedSizes: ['compact', 'wide', 'full'],
  },
] as const;

type DashboardWidgetId = (typeof DASHBOARD_WIDGETS)[number]['id'];
type DashboardWidgetSize = 'compact' | 'wide' | 'full';

const DASHBOARD_ROLE_SIZE_OVERRIDES: Partial<
  Record<Role, Partial<Record<DashboardWidgetId, DashboardWidgetSize>>>
> = {
  [Role.SUPER_ADMIN]: {
    outstanding_folios: 'compact',
  },
  [Role.ADMIN]: {
    outstanding_folios: 'compact',
  },
  [Role.MANAGER]: {
    outstanding_folios: 'compact',
    housekeeping_queue: 'wide',
  },
  [Role.HOUSEKEEPING]: {
    housekeeping_queue: 'full',
    my_tasks_today: 'wide',
  },
  [Role.CASHIER]: {
    outstanding_folios: 'compact',
  },
  [Role.COOK]: {
    active_pos_orders: 'full',
  },
  [Role.BARTENDER]: {
    active_pos_orders: 'full',
  },
};

const DASHBOARD_ROLE_LAYOUTS: Record<Role, string[]> = {
  [Role.SUPER_ADMIN]: [
    'occupancy_overview',
    'todays_checkins_outs',
    'room_status_grid',
    'revenue_today',
    'outstanding_folios',
    'housekeeping_queue',
    'staff_on_duty',
    'low_stock_alerts',
    'pos_sales_today',
    'active_pos_orders',
    'my_attendance_today',
  ],
  [Role.ADMIN]: [
    'occupancy_overview',
    'todays_checkins_outs',
    'room_status_grid',
    'revenue_today',
    'outstanding_folios',
    'housekeeping_queue',
    'staff_on_duty',
    'low_stock_alerts',
    'pos_sales_today',
    'active_pos_orders',
    'my_attendance_today',
  ],
  [Role.MANAGER]: [
    'occupancy_overview',
    'todays_checkins_outs',
    'room_status_grid',
    'revenue_today',
    'outstanding_folios',
    'housekeeping_queue',
    'staff_on_duty',
    'low_stock_alerts',
    'pos_sales_today',
    'active_pos_orders',
    'my_attendance_today',
  ],
  [Role.RECEPTIONIST]: [
    'todays_checkins_outs',
    'room_status_grid',
    'occupancy_overview',
    'my_attendance_today',
  ],
  [Role.HOUSEKEEPING]: [
    'housekeeping_queue',
    'my_tasks_today',
    'room_status_grid',
    'my_attendance_today',
  ],
  [Role.CASHIER]: [
    'revenue_today',
    'outstanding_folios',
    'pos_sales_today',
    'active_pos_orders',
    'my_attendance_today',
  ],
  [Role.COOK]: ['active_pos_orders', 'low_stock_alerts', 'my_attendance_today'],
  [Role.BARTENDER]: [
    'pos_sales_today',
    'active_pos_orders',
    'low_stock_alerts',
    'my_attendance_today',
  ],
  [Role.STAFF]: ['my_attendance_today'],
};

const DASHBOARD_FEATURE_FLAGS = [
  {
    key: 'revenue_analytics',
    enabled: true,
    planRequired: null,
    description: 'Reserved for future finance analytics widgets. Non-blocking pre-SaaS.',
  },
  {
    key: 'guest_satisfaction',
    enabled: true,
    planRequired: null,
    description: 'Reserved for future guest satisfaction widgets. Non-blocking pre-SaaS.',
  },
  {
    key: 'advanced_reports',
    enabled: true,
    planRequired: null,
    description: 'Reserved for future advanced report widgets. Non-blocking pre-SaaS.',
  },
] as const;

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Hotel ────────────────────────────────────────────────────────────────
  const hotel = await prisma.hotel.upsert({
    where: { id: 'seed-hotel-id' },
    update: {},
    create: {
      id: 'seed-hotel-id',
      name: 'Grand Lagos Hotel',
      domain: 'hotel.com',
      address: '14 Adeola Odeku Street',
      city: 'Lagos',
      country: 'Nigeria',
      phone: '+234 801 234 5678',
      email: 'info@hotel.com',
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
    {
      name: 'Soft Drinks',
      description: 'Juices, sodas, water, energy drinks',
      color: 'bg-sky-500',
    },
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
      email: 'manager@hotel.com',
      password: 'password',
      role: Role.MANAGER,
      firstName: 'Ngozi',
      lastName: 'Adeyemi',
      department: 'Operations',
      position: 'Operations Manager',
      employeeCode: 'EMP-002',
    },
    {
      email: 'reception@hotel.com',
      password: 'password',
      role: Role.RECEPTIONIST,
      firstName: 'Fatima',
      lastName: 'Bello',
      department: 'Front Desk',
      position: 'Senior Receptionist',
      employeeCode: 'EMP-003',
    },
    {
      email: 'housekeeping@hotel.com',
      password: 'password',
      role: Role.HOUSEKEEPING,
      firstName: 'Emeka',
      lastName: 'Eze',
      department: 'Housekeeping',
      position: 'Head Housekeeper',
      employeeCode: 'EMP-004',
    },
    {
      email: 'cashier@hotel.com',
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

    const existingStaff = await prisma.staff.findFirst({
      where: {
        OR: [{ userId: user.id }, { employeeCode: u.employeeCode }],
      },
    });

    if (existingStaff) {
      await prisma.staff.update({
        where: { id: existingStaff.id },
        data: {
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
    } else {
      await prisma.staff.create({
        data: {
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
    }

    console.log(`✅ ${u.role}: ${u.email} / ${u.password}`);
  }

  const seededStaff = await prisma.staff.findMany({
    where: { hotelId: hotel.id },
    select: {
      id: true,
      employeeCode: true,
      firstName: true,
      lastName: true,
      department: true,
      position: true,
    },
  });

  const staffMap = Object.fromEntries(seededStaff.map((staff) => [staff.employeeCode, staff.id]));
  console.log(`✅ ${seededStaff.length} staff records indexed for relational seeds`);

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
      'manage:pos',
      'view:pos-kitchen-board',
      'update:pos-kitchen-board',
      'view:pos-bar-board',
      'update:pos-bar-board',
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
      'manage:pos',
      'view:pos-kitchen-board',
      'update:pos-kitchen-board',
      'view:pos-bar-board',
      'update:pos-bar-board',
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
      'manage:pos',
      'view:pos-kitchen-board',
      'update:pos-kitchen-board',
      'view:pos-bar-board',
      'update:pos-bar-board',
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
    [Role.COOK]: [
      'view:dashboard',
      'view:pos',
      'view:inventory',
      'clock:self',
      'view:pos-kitchen-board',
      'update:pos-kitchen-board',
    ],
    [Role.BARTENDER]: [
      'view:dashboard',
      'view:pos',
      'create:pos',
      'view:inventory',
      'clock:self',
      'view:pos-bar-board',
      'update:pos-bar-board',
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

  // ─── Dashboard Widgets / Layouts / Feature Flags ────────────────────────
  for (const widget of DASHBOARD_WIDGETS) {
    await prisma.dashboardWidget.upsert({
      where: { id: widget.id },
      update: {
        title: widget.title,
        permissionKey: widget.permissionKey,
        featureFlag: widget.featureFlag,
        defaultEnabled: widget.defaultEnabled,
        defaultSize: widget.defaultSize,
        allowedSizes: [...widget.allowedSizes],
      },
      create: {
        id: widget.id,
        title: widget.title,
        permissionKey: widget.permissionKey,
        featureFlag: widget.featureFlag,
        defaultEnabled: widget.defaultEnabled,
        defaultSize: widget.defaultSize,
        allowedSizes: [...widget.allowedSizes],
      },
    });
  }
  console.log(`✅ ${DASHBOARD_WIDGETS.length} dashboard widgets seeded`);

  for (const flag of DASHBOARD_FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {
        enabled: flag.enabled,
        planRequired: flag.planRequired,
        description: flag.description,
      },
      create: {
        key: flag.key,
        enabled: flag.enabled,
        planRequired: flag.planRequired,
        description: flag.description,
      },
    });
  }
  console.log(`✅ ${DASHBOARD_FEATURE_FLAGS.length} dashboard feature flags seeded`);

  await prisma.roleDashboardConfig.deleteMany({
    where: { hotelId: hotel.id },
  });

  const dashboardRoleConfigs = (Object.entries(DASHBOARD_ROLE_LAYOUTS) as [Role, string[]][])
    .flatMap(([role, widgetIds]) =>
      widgetIds.map((widgetId, position) => ({
        hotelId: hotel.id,
        role,
        widgetId,
        position,
        enabled: true,
        sizeOverride: DASHBOARD_ROLE_SIZE_OVERRIDES[role]?.[widgetId as DashboardWidgetId] ?? null,
      })),
    );

  await prisma.roleDashboardConfig.createMany({
    data: dashboardRoleConfigs,
  });
  console.log(`✅ ${dashboardRoleConfigs.length} dashboard role layout rows seeded`);

  // ─── Pos Terminal Groups ──────────────────────────────────────────────────────────
  const seedPosTerminalGroups = [
    { name: 'Bar' },
    { name: 'Kitchen' },
    { name: 'Front Desk' },
    { name: 'Pool' },
    { name: 'Spa' },
    { name: 'Other Locations' },
  ];

  let level = 1;

  for (const group of seedPosTerminalGroups) {
    await prisma.posTerminalGroup.upsert({
      where: {
        hotelId_name: {
          hotelId: hotel.id,
          name: group.name,
        },
      },
      update: {},
      create: {
        hotelId: hotel.id,
        name: group.name,
        level: level++,
      },
    });
  }

  console.log(`✅ ${seedPosTerminalGroups.length} pos terminal groups seeded`);

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

  const groups = await prisma.posTerminalGroup.findMany({
    where: { hotelId: hotel.id },
  });

  const groupMap = Object.fromEntries(groups.map((g) => [g.name, g.id]));

  for (const t of seedTerminals) {
    const groupId = groupMap[t.group] ?? null;

    await prisma.posTerminal.upsert({
      where: { id: t.id },
      update: {
        name: t.name,
        location: t.location,
        terminalGroupId: groupId,
        device: t.device,
        status: t.status,
      },
      create: {
        id: t.id,
        hotelId: hotel.id,
        name: t.name,
        location: t.location,
        terminalGroupId: groupId,
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

  // ─── Facilities QA Seed Pack ────────────────────────────────────────────
  const facilityTypeDefs = [
    {
      id: 'seed-facility-type-pool',
      name: 'Pool & Leisure',
      description: 'Pools, cabanas, and leisure water facilities',
    },
    {
      id: 'seed-facility-type-spa',
      name: 'Spa & Wellness',
      description: 'Spa, massage, and wellness facilities',
    },
    {
      id: 'seed-facility-type-gym',
      name: 'Fitness',
      description: 'Gym, yoga, and fitness spaces',
    },
    {
      id: 'seed-facility-type-event',
      name: 'Event Space',
      description: 'Meeting rooms, halls, and rentable event areas',
    },
  ];

  for (const type of facilityTypeDefs) {
    await prisma.facilityType.upsert({
      where: { id: type.id },
      update: {
        hotelId: hotel.id,
        name: type.name,
        description: type.description,
      },
      create: {
        id: type.id,
        hotelId: hotel.id,
        name: type.name,
        description: type.description,
      },
    });
  }
  console.log(`✅ ${facilityTypeDefs.length} facility types seeded`);

  const facilityLocationDefs = [
    {
      id: 'seed-facility-location-pooldeck',
      name: 'Pool Deck',
      building: 'Main Block',
      floor: 'Ground Floor',
      description: 'Outdoor recreation area behind the lobby wing',
    },
    {
      id: 'seed-facility-location-spawing',
      name: 'Spa Wing',
      building: 'East Wing',
      floor: 'First Floor',
      description: 'Dedicated wellness corridor beside the elevator core',
    },
    {
      id: 'seed-facility-location-roof',
      name: 'Rooftop',
      building: 'Tower',
      floor: 'Roof',
      description: 'Open rooftop activity and event area',
    },
    {
      id: 'seed-facility-location-conference',
      name: 'Conference Level',
      building: 'West Block',
      floor: 'Second Floor',
      description: 'Meeting rooms and conference facilities',
    },
  ];

  for (const location of facilityLocationDefs) {
    await prisma.facilityLocation.upsert({
      where: { id: location.id },
      update: {
        hotelId: hotel.id,
        name: location.name,
        building: location.building,
        floor: location.floor,
        description: location.description,
      },
      create: {
        id: location.id,
        hotelId: hotel.id,
        name: location.name,
        building: location.building,
        floor: location.floor,
        description: location.description,
      },
    });
  }
  console.log(`✅ ${facilityLocationDefs.length} facility locations seeded`);

  const facilityDepartmentDefs = [
    {
      id: 'seed-facility-dept-recreation',
      name: 'Recreation',
      headId: staffMap['EMP-002'] ?? null,
      description: 'Pool, gym, and guest activity oversight',
    },
    {
      id: 'seed-facility-dept-wellness',
      name: 'Wellness',
      headId: staffMap['EMP-002'] ?? null,
      description: 'Spa and wellness services oversight',
    },
    {
      id: 'seed-facility-dept-events',
      name: 'Events',
      headId: staffMap['EMP-003'] ?? null,
      description: 'Meeting rooms, events, and guest bookings',
    },
    {
      id: 'seed-facility-dept-maintenance',
      name: 'Maintenance Ops',
      headId: staffMap['EMP-004'] ?? null,
      description: 'Repairs, inspections, and preventive upkeep',
    },
  ];

  for (const department of facilityDepartmentDefs) {
    await prisma.facilityDepartment.upsert({
      where: { id: department.id },
      update: {
        hotelId: hotel.id,
        name: department.name,
        headId: department.headId,
        description: department.description,
      },
      create: {
        id: department.id,
        hotelId: hotel.id,
        name: department.name,
        headId: department.headId,
        description: department.description,
      },
    });
  }
  console.log(`✅ ${facilityDepartmentDefs.length} facility departments seeded`);

  const facilityDefs = [
    {
      id: 'seed-facility-pool',
      name: 'Infinity Pool',
      typeId: 'seed-facility-type-pool',
      locationId: 'seed-facility-location-pooldeck',
      departmentId: 'seed-facility-dept-recreation',
      managerId: staffMap['EMP-002'] ?? null,
      description: 'Outdoor infinity pool with shaded lounge seating',
      capacity: 40,
      status: 'ACTIVE',
      openTime: '08:00',
      closeTime: '20:00',
      operatingSchedule: {
        mon: ['08:00', '20:00'],
        tue: ['08:00', '20:00'],
        wed: ['08:00', '20:00'],
        thu: ['08:00', '20:00'],
        fri: ['08:00', '21:00'],
        sat: ['08:00', '21:00'],
        sun: ['09:00', '19:00'],
      },
      baseRate: 15000,
      rateUnit: 'FLAT',
      requiresApproval: false,
      minDurationMins: 60,
      maxDurationMins: 240,
      images: [],
      amenities: ['Pool towels', 'Lifeguard chair', 'Changing room'],
    },
    {
      id: 'seed-facility-spa',
      name: 'Serenity Spa Suite',
      typeId: 'seed-facility-type-spa',
      locationId: 'seed-facility-location-spawing',
      departmentId: 'seed-facility-dept-wellness',
      managerId: staffMap['EMP-002'] ?? null,
      description: 'Private spa treatment suite for wellness bookings',
      capacity: 6,
      status: 'ACTIVE',
      openTime: '09:00',
      closeTime: '22:00',
      operatingSchedule: {
        mon: ['09:00', '22:00'],
        tue: ['09:00', '22:00'],
        wed: ['09:00', '22:00'],
        thu: ['09:00', '22:00'],
        fri: ['09:00', '22:00'],
        sat: ['09:00', '23:00'],
        sun: ['10:00', '20:00'],
      },
      baseRate: 35000,
      rateUnit: 'PER_SESSION',
      requiresApproval: true,
      minDurationMins: 60,
      maxDurationMins: 180,
      images: [],
      amenities: ['Steam room', 'Massage beds', 'Aromatherapy setup'],
    },
    {
      id: 'seed-facility-gym',
      name: 'Skyline Fitness Studio',
      typeId: 'seed-facility-type-gym',
      locationId: 'seed-facility-location-roof',
      departmentId: 'seed-facility-dept-recreation',
      managerId: staffMap['EMP-004'] ?? null,
      description: 'Rooftop gym and instructor-led class space',
      capacity: 18,
      status: 'MAINTENANCE',
      openTime: '06:00',
      closeTime: '22:00',
      operatingSchedule: {
        mon: ['06:00', '22:00'],
        tue: ['06:00', '22:00'],
        wed: ['06:00', '22:00'],
        thu: ['06:00', '22:00'],
        fri: ['06:00', '22:00'],
        sat: ['07:00', '21:00'],
        sun: ['07:00', '20:00'],
      },
      baseRate: 5000,
      rateUnit: 'PER_DAY',
      requiresApproval: false,
      minDurationMins: 30,
      maxDurationMins: 180,
      images: [],
      amenities: ['Free weights', 'Cardio machines', 'Locker bay'],
    },
    {
      id: 'seed-facility-boardroom',
      name: 'Executive Boardroom',
      typeId: 'seed-facility-type-event',
      locationId: 'seed-facility-location-conference',
      departmentId: 'seed-facility-dept-events',
      managerId: staffMap['EMP-003'] ?? null,
      description: 'Boardroom for meetings, interviews, and private sessions',
      capacity: 14,
      status: 'ACTIVE',
      openTime: '08:00',
      closeTime: '18:00',
      operatingSchedule: {
        mon: ['08:00', '18:00'],
        tue: ['08:00', '18:00'],
        wed: ['08:00', '18:00'],
        thu: ['08:00', '18:00'],
        fri: ['08:00', '18:00'],
      },
      baseRate: 50000,
      rateUnit: 'PER_HOUR',
      requiresApproval: true,
      minDurationMins: 60,
      maxDurationMins: 480,
      images: [],
      amenities: ['Projector', 'Conference phone', 'Tea service'],
    },
    {
      id: 'seed-facility-rooftop',
      name: 'Sunset Rooftop Terrace',
      typeId: 'seed-facility-type-event',
      locationId: 'seed-facility-location-roof',
      departmentId: 'seed-facility-dept-events',
      managerId: staffMap['EMP-002'] ?? null,
      description: 'Open-air terrace for private dinners and social events',
      capacity: 80,
      status: 'INACTIVE',
      openTime: '16:00',
      closeTime: '23:00',
      operatingSchedule: {
        fri: ['16:00', '23:00'],
        sat: ['16:00', '23:00'],
        sun: ['16:00', '22:00'],
      },
      baseRate: 120000,
      rateUnit: 'FLAT',
      requiresApproval: true,
      minDurationMins: 120,
      maxDurationMins: 360,
      images: [],
      amenities: ['String lights', 'Portable bar', 'AV access'],
    },
  ] as const;

  for (const facility of facilityDefs) {
    await prisma.facility.upsert({
      where: { id: facility.id },
      update: {
        hotelId: hotel.id,
        name: facility.name,
        typeId: facility.typeId,
        locationId: facility.locationId,
        departmentId: facility.departmentId,
        managerId: facility.managerId,
        description: facility.description,
        capacity: facility.capacity,
        status: facility.status as any,
        openTime: facility.openTime,
        closeTime: facility.closeTime,
        operatingSchedule: facility.operatingSchedule,
        baseRate: facility.baseRate,
        rateUnit: facility.rateUnit,
        requiresApproval: facility.requiresApproval,
        minDurationMins: facility.minDurationMins,
        maxDurationMins: facility.maxDurationMins,
        images: [...facility.images],
        amenities: [...facility.amenities],
      },
      create: {
        id: facility.id,
        hotelId: hotel.id,
        name: facility.name,
        typeId: facility.typeId,
        locationId: facility.locationId,
        departmentId: facility.departmentId,
        managerId: facility.managerId,
        description: facility.description,
        capacity: facility.capacity,
        status: facility.status as any,
        openTime: facility.openTime,
        closeTime: facility.closeTime,
        operatingSchedule: facility.operatingSchedule,
        baseRate: facility.baseRate,
        rateUnit: facility.rateUnit,
        requiresApproval: facility.requiresApproval,
        minDurationMins: facility.minDurationMins,
        maxDurationMins: facility.maxDurationMins,
        images: [...facility.images],
        amenities: [...facility.amenities],
      },
    });
  }
  console.log(`✅ ${facilityDefs.length} facilities seeded`);

  const facilityBookingDefs = [
    {
      id: 'seed-facility-booking-1',
      facilityId: 'seed-facility-pool',
      reservationId: resMap['seed-res-2'] ?? null,
      guestId: guestMap['seed-guest-2'] ?? null,
      guestName: 'Amina Yusuf',
      roomNo: '102',
      startTime: new Date('2026-03-14T10:00:00.000Z'),
      endTime: new Date('2026-03-14T12:00:00.000Z'),
      durationMins: 120,
      status: 'CONFIRMED',
      pax: 2,
      amount: 15000,
      chargeType: 'ROOM_CHARGE',
      isPaid: false,
      approvedBy: null,
      approvedAt: null,
      notes: 'VIP poolside reservation',
      cancelledAt: null,
      cancelReason: null,
      refundMethod: null,
      creditNoteId: null,
      refundId: null,
      createdBy: staffMap['EMP-003'] ?? null,
    },
    {
      id: 'seed-facility-booking-2',
      facilityId: 'seed-facility-spa',
      reservationId: resMap['seed-res-8'] ?? null,
      guestId: guestMap['seed-guest-8'] ?? null,
      guestName: 'Kemi Oladele',
      roomNo: '103',
      startTime: new Date('2026-03-14T15:00:00.000Z'),
      endTime: new Date('2026-03-14T16:30:00.000Z'),
      durationMins: 90,
      status: 'COMPLETED',
      pax: 1,
      amount: 35000,
      chargeType: 'DIRECT_PAYMENT',
      isPaid: true,
      approvedBy: staffMap['EMP-002'] ?? null,
      approvedAt: new Date('2026-03-14T13:00:00.000Z'),
      notes: 'Facial and aromatherapy session',
      cancelledAt: null,
      cancelReason: null,
      refundMethod: null,
      creditNoteId: null,
      refundId: null,
      createdBy: staffMap['EMP-003'] ?? null,
    },
    {
      id: 'seed-facility-booking-3',
      facilityId: 'seed-facility-boardroom',
      reservationId: resMap['seed-res-4'] ?? null,
      guestId: guestMap['seed-guest-4'] ?? null,
      guestName: 'Ngozi Adeyemi',
      roomNo: '203',
      startTime: new Date('2026-03-15T09:00:00.000Z'),
      endTime: new Date('2026-03-15T13:00:00.000Z'),
      durationMins: 240,
      status: 'IN_PROGRESS',
      pax: 8,
      amount: 200000,
      chargeType: 'ROOM_CHARGE',
      isPaid: false,
      approvedBy: staffMap['EMP-002'] ?? null,
      approvedAt: new Date('2026-03-14T17:00:00.000Z'),
      notes: 'Corporate strategy session setup',
      cancelledAt: null,
      cancelReason: null,
      refundMethod: null,
      creditNoteId: null,
      refundId: null,
      createdBy: staffMap['EMP-003'] ?? null,
    },
    {
      id: 'seed-facility-booking-4',
      facilityId: 'seed-facility-rooftop',
      reservationId: null,
      guestId: guestMap['seed-guest-5'] ?? null,
      guestName: 'Tunde Bakare',
      roomNo: null,
      startTime: new Date('2026-03-16T18:00:00.000Z'),
      endTime: new Date('2026-03-16T21:00:00.000Z'),
      durationMins: 180,
      status: 'CANCELLED',
      pax: 20,
      amount: 120000,
      chargeType: 'DIRECT_PAYMENT',
      isPaid: false,
      approvedBy: null,
      approvedAt: null,
      notes: 'Private birthday dinner request',
      cancelledAt: new Date('2026-03-15T12:00:00.000Z'),
      cancelReason: 'Terrace unavailable due to weatherproofing works',
      refundMethod: 'BANK_TRANSFER',
      creditNoteId: null,
      refundId: null,
      createdBy: staffMap['EMP-003'] ?? null,
    },
  ];

  for (const booking of facilityBookingDefs) {
    await prisma.facilityBooking.upsert({
      where: { id: booking.id },
      update: {
        hotelId: hotel.id,
        facilityId: booking.facilityId,
        reservationId: booking.reservationId,
        guestId: booking.guestId,
        guestName: booking.guestName,
        roomNo: booking.roomNo,
        startTime: booking.startTime,
        endTime: booking.endTime,
        durationMins: booking.durationMins,
        status: booking.status,
        pax: booking.pax,
        amount: booking.amount,
        chargeType: booking.chargeType,
        isPaid: booking.isPaid,
        approvedBy: booking.approvedBy,
        approvedAt: booking.approvedAt,
        notes: booking.notes,
        cancelledAt: booking.cancelledAt,
        cancelReason: booking.cancelReason,
        refundMethod: booking.refundMethod,
        creditNoteId: booking.creditNoteId,
        refundId: booking.refundId,
        createdBy: booking.createdBy,
      },
      create: {
        id: booking.id,
        hotelId: hotel.id,
        facilityId: booking.facilityId,
        reservationId: booking.reservationId,
        guestId: booking.guestId,
        guestName: booking.guestName,
        roomNo: booking.roomNo,
        startTime: booking.startTime,
        endTime: booking.endTime,
        durationMins: booking.durationMins,
        status: booking.status,
        pax: booking.pax,
        amount: booking.amount,
        chargeType: booking.chargeType,
        isPaid: booking.isPaid,
        approvedBy: booking.approvedBy,
        approvedAt: booking.approvedAt,
        notes: booking.notes,
        cancelledAt: booking.cancelledAt,
        cancelReason: booking.cancelReason,
        refundMethod: booking.refundMethod,
        creditNoteId: booking.creditNoteId,
        refundId: booking.refundId,
        createdBy: booking.createdBy,
      },
    });
  }
  console.log(`✅ ${facilityBookingDefs.length} facility bookings seeded`);

  const inspectionDefs = [
    {
      id: 'seed-facility-inspection-1',
      inspectionNo: 'INSP-2026-3001',
      inspectionType: 'INTERNAL',
      scheduledBy: staffMap['EMP-002']!,
      inspectorName: 'Ngozi Adeyemi',
      inspectorOrganization: 'Hotel Operations',
      facilityId: 'seed-facility-pool',
      area: 'Filtration and deck area',
      scheduledAt: new Date('2026-03-13T08:30:00.000Z'),
      checklist: { filtration: 'PASS', tiles: 'PASS', signage: 'PASS' },
      findings: 'Minor deck cleaning needed before guest use.',
      score: 88,
      status: 'CLOSED',
    },
    {
      id: 'seed-facility-inspection-2',
      inspectionNo: 'INSP-2026-3002',
      inspectionType: 'REGULATORY',
      scheduledBy: staffMap['EMP-002']!,
      inspectorName: 'Lagos Safety Bureau',
      inspectorOrganization: 'Lagos Safety Bureau',
      facilityId: 'seed-facility-gym',
      area: 'Equipment and emergency exits',
      scheduledAt: new Date('2026-03-14T09:00:00.000Z'),
      checklist: { treadmills: 'FAIL', exits: 'PASS', mats: 'PASS' },
      findings: 'Two treadmills need urgent electrical servicing.',
      score: 61,
      status: 'SUBMITTED',
    },
    {
      id: 'seed-facility-inspection-3',
      inspectionNo: 'INSP-2026-3003',
      inspectionType: 'THIRD_PARTY',
      scheduledBy: staffMap['EMP-003']!,
      inspectorName: 'Apex Events AV',
      inspectorOrganization: 'Apex Events AV',
      facilityId: 'seed-facility-boardroom',
      area: 'AV panel and conferencing stack',
      scheduledAt: new Date('2026-03-15T08:45:00.000Z'),
      checklist: { projector: 'PASS', mic: 'PASS', panel: 'PENDING' },
      findings: 'AV vendor still validating panel latency issue.',
      score: null,
      status: 'IN_PROGRESS',
    },
    {
      id: 'seed-facility-inspection-4',
      inspectionNo: 'INSP-2026-3004',
      inspectionType: 'INTERNAL',
      scheduledBy: staffMap['EMP-002']!,
      inspectorName: 'Chukwuemeka Obi',
      inspectorOrganization: 'Hotel Management',
      facilityId: 'seed-facility-spa',
      area: 'Treatment suite readiness',
      scheduledAt: new Date('2026-03-16T10:00:00.000Z'),
      checklist: null,
      findings: 'Scheduled pre-weekend readiness review.',
      score: null,
      status: 'SCHEDULED',
    },
  ];

  for (const inspection of inspectionDefs) {
    await prisma.facilityInspection.upsert({
      where: { id: inspection.id },
      update: {
        hotelId: hotel.id,
        inspectionNo: inspection.inspectionNo,
        inspectionType: inspection.inspectionType,
        scheduledBy: inspection.scheduledBy,
        inspectorName: inspection.inspectorName,
        inspectorOrganization: inspection.inspectorOrganization,
        facilityId: inspection.facilityId,
        area: inspection.area,
        scheduledAt: inspection.scheduledAt,
        checklist: toNullableJson(inspection.checklist),
        findings: inspection.findings,
        score: inspection.score,
        status: inspection.status,
      },
      create: {
        id: inspection.id,
        hotelId: hotel.id,
        inspectionNo: inspection.inspectionNo,
        inspectionType: inspection.inspectionType,
        scheduledBy: inspection.scheduledBy,
        inspectorName: inspection.inspectorName,
        inspectorOrganization: inspection.inspectorOrganization,
        facilityId: inspection.facilityId,
        area: inspection.area,
        scheduledAt: inspection.scheduledAt,
        checklist: toNullableJson(inspection.checklist),
        findings: inspection.findings,
        score: inspection.score,
        status: inspection.status,
      },
    });
  }
  console.log(`✅ ${inspectionDefs.length} facility inspections seeded`);

  const maintenanceDefs = [
    {
      id: 'seed-facility-maintenance-1',
      requestNo: 'MR-2026-3001',
      facilityId: 'seed-facility-gym',
      roomId: null,
      title: 'Repair faulty treadmills',
      description: 'Two treadmills intermittently shut down during use.',
      category: 'ELECTRICAL',
      priority: 'HIGH',
      status: 'PENDING_PARTS',
      reportedBy: staffMap['EMP-002'] ?? null,
      assignedTo: staffMap['EMP-004'] ?? null,
      assignedAt: new Date('2026-03-14T10:15:00.000Z'),
      startedAt: new Date('2026-03-14T11:00:00.000Z'),
      resolvedAt: null,
      closedAt: null,
      estimatedMins: 180,
      actualMins: 90,
      partsUsed: { motorRelay: 2, lubricationKit: 1 },
      totalCost: 125000,
      images: [],
      notes: 'Awaiting replacement relay shipment from supplier.',
      inspectionId: 'seed-facility-inspection-2',
      verificationInspectionId: null,
    },
    {
      id: 'seed-facility-maintenance-2',
      requestNo: 'MR-2026-3002',
      facilityId: 'seed-facility-pool',
      roomId: null,
      title: 'Pool deck surface treatment',
      description: 'Deep clean deck and apply anti-slip treatment.',
      category: 'STRUCTURAL',
      priority: 'NORMAL',
      status: 'RESOLVED',
      reportedBy: staffMap['EMP-002'] ?? null,
      assignedTo: staffMap['EMP-004'] ?? null,
      assignedAt: new Date('2026-03-13T09:00:00.000Z'),
      startedAt: new Date('2026-03-13T10:00:00.000Z'),
      resolvedAt: new Date('2026-03-13T14:15:00.000Z'),
      closedAt: null,
      estimatedMins: 240,
      actualMins: 255,
      partsUsed: { antiSlipCoat: 4, cleaningAgent: 2 },
      totalCost: 85000,
      images: [],
      notes: 'Ready for manager verification pass.',
      inspectionId: 'seed-facility-inspection-1',
      verificationInspectionId: 'seed-facility-inspection-1',
    },
    {
      id: 'seed-facility-maintenance-3',
      requestNo: 'MR-2026-3003',
      facilityId: 'seed-facility-boardroom',
      roomId: null,
      title: 'Conference panel latency check',
      description: 'Investigate AV control panel response delay.',
      category: 'EQUIPMENT',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      reportedBy: staffMap['EMP-003'] ?? null,
      assignedTo: staffMap['EMP-004'] ?? null,
      assignedAt: new Date('2026-03-15T08:15:00.000Z'),
      startedAt: new Date('2026-03-15T09:00:00.000Z'),
      resolvedAt: null,
      closedAt: null,
      estimatedMins: 120,
      actualMins: null,
      partsUsed: null,
      totalCost: 30000,
      images: [],
      notes: 'Vendor and maintenance team troubleshooting together.',
      inspectionId: 'seed-facility-inspection-3',
      verificationInspectionId: null,
    },
    {
      id: 'seed-facility-maintenance-4',
      requestNo: 'MR-2026-3004',
      facilityId: 'seed-facility-spa',
      roomId: null,
      title: 'Steam room thermostat calibration',
      description: 'Temperature drift reported by staff during readiness check.',
      category: 'HVAC',
      priority: 'LOW',
      status: 'OPEN',
      reportedBy: staffMap['EMP-002'] ?? null,
      assignedTo: null,
      assignedAt: null,
      startedAt: null,
      resolvedAt: null,
      closedAt: null,
      estimatedMins: 60,
      actualMins: null,
      partsUsed: null,
      totalCost: 15000,
      images: [],
      notes: 'Raised for pre-weekend readiness.',
      inspectionId: null,
      verificationInspectionId: null,
    },
  ];

  for (const maintenance of maintenanceDefs) {
    await prisma.maintenanceRequest.upsert({
      where: { id: maintenance.id },
      update: {
        hotelId: hotel.id,
        facilityId: maintenance.facilityId,
        roomId: maintenance.roomId,
        requestNo: maintenance.requestNo,
        title: maintenance.title,
        description: maintenance.description,
        category: maintenance.category,
        priority: maintenance.priority,
        status: maintenance.status,
        reportedBy: maintenance.reportedBy,
        assignedTo: maintenance.assignedTo,
        assignedAt: maintenance.assignedAt,
        startedAt: maintenance.startedAt,
        resolvedAt: maintenance.resolvedAt,
        closedAt: maintenance.closedAt,
        estimatedMins: maintenance.estimatedMins,
        actualMins: maintenance.actualMins,
        partsUsed: toNullableJson(maintenance.partsUsed),
        totalCost: maintenance.totalCost,
        images: [...maintenance.images],
        notes: maintenance.notes,
        inspectionId: maintenance.inspectionId,
        verificationInspectionId: maintenance.verificationInspectionId,
      },
      create: {
        id: maintenance.id,
        hotelId: hotel.id,
        facilityId: maintenance.facilityId,
        roomId: maintenance.roomId,
        requestNo: maintenance.requestNo,
        title: maintenance.title,
        description: maintenance.description,
        category: maintenance.category,
        priority: maintenance.priority,
        status: maintenance.status,
        reportedBy: maintenance.reportedBy,
        assignedTo: maintenance.assignedTo,
        assignedAt: maintenance.assignedAt,
        startedAt: maintenance.startedAt,
        resolvedAt: maintenance.resolvedAt,
        closedAt: maintenance.closedAt,
        estimatedMins: maintenance.estimatedMins,
        actualMins: maintenance.actualMins,
        partsUsed: toNullableJson(maintenance.partsUsed),
        totalCost: maintenance.totalCost,
        images: [...maintenance.images],
        notes: maintenance.notes,
        inspectionId: maintenance.inspectionId,
        verificationInspectionId: maintenance.verificationInspectionId,
      },
    });
  }
  console.log(`✅ ${maintenanceDefs.length} facility maintenance requests seeded`);

  const complaintDefs = [
    {
      id: 'seed-facility-complaint-1',
      complaintNo: 'CP-2026-3001',
      reporterType: 'GUEST',
      reporterStaffId: null,
      reporterGuestId: guestMap['seed-guest-2'] ?? null,
      channel: 'IN_PERSON',
      facilityId: 'seed-facility-pool',
      roomId: null,
      title: 'Pool water looked cloudy',
      description: 'Guest reported that the pool water clarity was poor after breakfast.',
      category: 'Cleanliness',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      maintenanceRequestId: 'seed-facility-maintenance-2',
      createdAt: new Date('2026-03-13T08:10:00.000Z'),
      resolvedAt: null,
    },
    {
      id: 'seed-facility-complaint-2',
      complaintNo: 'CP-2026-3002',
      reporterType: 'STAFF',
      reporterStaffId: staffMap['EMP-003'] ?? null,
      reporterGuestId: null,
      channel: 'PHONE',
      facilityId: 'seed-facility-boardroom',
      roomId: null,
      title: 'Boardroom display lag',
      description: 'Reception logged a lag issue reported before a corporate session.',
      category: 'AV',
      priority: 'HIGH',
      status: 'ACKNOWLEDGED',
      maintenanceRequestId: null,
      createdAt: new Date('2026-03-15T07:45:00.000Z'),
      resolvedAt: null,
    },
    {
      id: 'seed-facility-complaint-3',
      complaintNo: 'CP-2026-3003',
      reporterType: 'STAFF',
      reporterStaffId: staffMap['EMP-004'] ?? null,
      reporterGuestId: null,
      channel: 'IN_PERSON',
      facilityId: 'seed-facility-gym',
      roomId: null,
      title: 'Gym equipment sparking',
      description: 'Housekeeping supervisor reported visible sparks on treadmill startup.',
      category: 'Electrical',
      priority: 'URGENT',
      status: 'RESOLVED',
      maintenanceRequestId: 'seed-facility-maintenance-1',
      createdAt: new Date('2026-03-14T09:35:00.000Z'),
      resolvedAt: new Date('2026-03-15T16:00:00.000Z'),
    },
    {
      id: 'seed-facility-complaint-4',
      complaintNo: 'CP-2026-3004',
      reporterType: 'GUEST',
      reporterStaffId: null,
      reporterGuestId: guestMap['seed-guest-8'] ?? null,
      channel: 'EMAIL',
      facilityId: 'seed-facility-spa',
      roomId: null,
      title: 'Spa room too cold',
      description: 'Guest noted that the spa suite felt cold before treatment.',
      category: 'Comfort',
      priority: 'NORMAL',
      status: 'NEW',
      maintenanceRequestId: null,
      createdAt: new Date('2026-03-16T09:20:00.000Z'),
      resolvedAt: null,
    },
    {
      id: 'seed-facility-complaint-5',
      complaintNo: 'CP-2026-3005',
      reporterType: 'GUEST',
      reporterStaffId: null,
      reporterGuestId: guestMap['seed-guest-4'] ?? null,
      channel: 'WEB',
      facilityId: 'seed-facility-rooftop',
      roomId: null,
      title: 'Rooftop booking cancellation follow-up',
      description: 'Guest requested clarity after rooftop terrace cancellation.',
      category: 'Service',
      priority: 'LOW',
      status: 'CLOSED',
      maintenanceRequestId: null,
      createdAt: new Date('2026-03-15T13:00:00.000Z'),
      resolvedAt: new Date('2026-03-15T15:00:00.000Z'),
    },
  ];

  for (const complaint of complaintDefs) {
    await prisma.facilityComplaint.upsert({
      where: { id: complaint.id },
      update: {
        hotelId: hotel.id,
        complaintNo: complaint.complaintNo,
        reporterType: complaint.reporterType,
        reporterStaffId: complaint.reporterStaffId,
        reporterGuestId: complaint.reporterGuestId,
        channel: complaint.channel,
        facilityId: complaint.facilityId,
        roomId: complaint.roomId,
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        priority: complaint.priority,
        status: complaint.status,
        maintenanceRequestId: complaint.maintenanceRequestId,
        createdAt: complaint.createdAt,
        resolvedAt: complaint.resolvedAt,
      },
      create: {
        id: complaint.id,
        hotelId: hotel.id,
        complaintNo: complaint.complaintNo,
        reporterType: complaint.reporterType,
        reporterStaffId: complaint.reporterStaffId,
        reporterGuestId: complaint.reporterGuestId,
        channel: complaint.channel,
        facilityId: complaint.facilityId,
        roomId: complaint.roomId,
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        priority: complaint.priority,
        status: complaint.status,
        maintenanceRequestId: complaint.maintenanceRequestId,
        createdAt: complaint.createdAt,
        resolvedAt: complaint.resolvedAt,
      },
    });
  }
  console.log(`✅ ${complaintDefs.length} facility complaints seeded`);

  const requisitionDefs = [
    {
      id: 'seed-facility-req-1',
      facilityId: 'seed-facility-gym',
      requestedBy: staffMap['EMP-004']!,
      title: 'Replacement treadmill relays',
      description: 'Urgent relays needed to restore full treadmill service.',
      priority: 'URGENT',
      status: 'PENDING',
      items: [
        { item: 'Relay switch kit', quantity: 2, unitCost: 42000 },
        { item: 'Electrical contact cleaner', quantity: 1, unitCost: 8000 },
      ],
      estimatedTotal: 92000,
      approvedBy: null,
      approvedAt: null,
      fulfilledAt: null,
      rejectionReason: null,
      inventoryLinked: false,
    },
    {
      id: 'seed-facility-req-2',
      facilityId: 'seed-facility-pool',
      requestedBy: staffMap['EMP-002']!,
      title: 'Pool treatment chemicals',
      description: 'Restock treatment supplies after guest complaint response.',
      priority: 'HIGH',
      status: 'APPROVED',
      items: [
        { item: 'Chlorine drums', quantity: 2, unitCost: 18000 },
        { item: 'PH stabilizer', quantity: 3, unitCost: 9500 },
      ],
      estimatedTotal: 64500,
      approvedBy: staffMap['EMP-001'] ?? null,
      approvedAt: new Date('2026-03-13T12:00:00.000Z'),
      fulfilledAt: null,
      rejectionReason: null,
      inventoryLinked: true,
    },
    {
      id: 'seed-facility-req-3',
      facilityId: 'seed-facility-boardroom',
      requestedBy: staffMap['EMP-003']!,
      title: 'Conference AV backup kit',
      description: 'Backup adapters and HDMI matrix for corporate events.',
      priority: 'NORMAL',
      status: 'FULFILLED',
      items: [
        { item: 'HDMI matrix', quantity: 1, unitCost: 55000 },
        { item: 'Wireless presenter', quantity: 2, unitCost: 12000 },
      ],
      estimatedTotal: 79000,
      approvedBy: staffMap['EMP-002'] ?? null,
      approvedAt: new Date('2026-03-15T10:00:00.000Z'),
      fulfilledAt: new Date('2026-03-15T16:30:00.000Z'),
      rejectionReason: null,
      inventoryLinked: true,
    },
    {
      id: 'seed-facility-req-4',
      facilityId: 'seed-facility-rooftop',
      requestedBy: staffMap['EMP-003']!,
      title: 'Rooftop weatherproofing consumables',
      description: 'Requested support materials for weatherproofing project.',
      priority: 'LOW',
      status: 'REJECTED',
      items: [{ item: 'Sealant packs', quantity: 10, unitCost: 5000 }],
      estimatedTotal: 50000,
      approvedBy: staffMap['EMP-001'] ?? null,
      approvedAt: new Date('2026-03-15T09:30:00.000Z'),
      fulfilledAt: null,
      rejectionReason: 'Deferred until next maintenance budget cycle.',
      inventoryLinked: false,
    },
  ];

  for (const requisition of requisitionDefs) {
    await prisma.facilityRequisition.upsert({
      where: { id: requisition.id },
      update: {
        hotelId: hotel.id,
        facilityId: requisition.facilityId,
        requestedBy: requisition.requestedBy,
        title: requisition.title,
        description: requisition.description,
        priority: requisition.priority,
        status: requisition.status,
        items: requisition.items,
        estimatedTotal: requisition.estimatedTotal,
        approvedBy: requisition.approvedBy,
        approvedAt: requisition.approvedAt,
        fulfilledAt: requisition.fulfilledAt,
        rejectionReason: requisition.rejectionReason,
        inventoryLinked: requisition.inventoryLinked,
      },
      create: {
        id: requisition.id,
        hotelId: hotel.id,
        facilityId: requisition.facilityId,
        requestedBy: requisition.requestedBy,
        title: requisition.title,
        description: requisition.description,
        priority: requisition.priority,
        status: requisition.status,
        items: requisition.items,
        estimatedTotal: requisition.estimatedTotal,
        approvedBy: requisition.approvedBy,
        approvedAt: requisition.approvedAt,
        fulfilledAt: requisition.fulfilledAt,
        rejectionReason: requisition.rejectionReason,
        inventoryLinked: requisition.inventoryLinked,
      },
    });
  }
  console.log(`✅ ${requisitionDefs.length} facility requisitions seeded`);

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

  // ─── Chart of Accounts ───────────────────────────────────────────────────
  const HOTEL_COA = [
    { code: '1000', name: 'Cash on Hand',          type: 'ASSET',   normalBalance: 'DEBIT',  description: 'Physical cash in registers',                isSystem: true  },
    { code: '1010', name: 'Cash — Bank Account',   type: 'ASSET',   normalBalance: 'DEBIT',  description: 'Hotel bank account balance',                isSystem: true  },
    { code: '1020', name: 'Cash — POS Terminal',   type: 'ASSET',   normalBalance: 'DEBIT',  description: 'Card/POS terminal settlements',             isSystem: false },
    { code: '1100', name: 'Guest Ledger (AR)',      type: 'ASSET',   normalBalance: 'DEBIT',  description: 'Amounts owed by in-house guests',           isSystem: true  },
    { code: '1110', name: 'City Ledger (AR)',       type: 'ASSET',   normalBalance: 'DEBIT',  description: 'Amounts owed by corporate accounts',        isSystem: false },
    { code: '1200', name: 'Inventory Asset',        type: 'ASSET',   normalBalance: 'DEBIT',  description: 'Cost value of items in stock',              isSystem: true  },
    { code: '1300', name: 'Prepaid Expenses',       type: 'ASSET',   normalBalance: 'DEBIT',  description: 'Expenses paid in advance',                  isSystem: false },
    { code: '2000', name: 'Accounts Payable',       type: 'LIABILITY', normalBalance: 'CREDIT', description: 'Amounts owed to suppliers',               isSystem: false },
    { code: '2100', name: 'Advance Deposits',       type: 'LIABILITY', normalBalance: 'CREDIT', description: 'Guest deposits for future reservations',   isSystem: true  },
    { code: '2200', name: 'VAT Payable',            type: 'LIABILITY', normalBalance: 'CREDIT', description: 'VAT collected on behalf of government',    isSystem: true  },
    { code: '2300', name: 'Salary Payable',         type: 'LIABILITY', normalBalance: 'CREDIT', description: 'Accrued salaries not yet paid',            isSystem: false },
    { code: '2400', name: 'Pension Payable',        type: 'LIABILITY', normalBalance: 'CREDIT', description: 'Employee pension contributions payable',    isSystem: false },
    { code: '3000', name: "Owner's Equity",         type: 'EQUITY',  normalBalance: 'CREDIT', description: "Owner's investment in the business",        isSystem: false },
    { code: '3100', name: 'Retained Earnings',      type: 'EQUITY',  normalBalance: 'CREDIT', description: 'Accumulated profits retained in business',  isSystem: false },
    { code: '4000', name: 'Revenue',                type: 'REVENUE', normalBalance: 'CREDIT', description: 'Total revenue parent account',              isSystem: true  },
    { code: '4100', name: 'Room Revenue',           type: 'REVENUE', normalBalance: 'CREDIT', description: 'Revenue from room charges',                 isSystem: true  },
    { code: '4200', name: 'Food & Beverage Revenue',type: 'REVENUE', normalBalance: 'CREDIT', description: 'Revenue from restaurant and room service',   isSystem: true  },
    { code: '4300', name: 'Bar Revenue',            type: 'REVENUE', normalBalance: 'CREDIT', description: 'Revenue from bar sales',                    isSystem: true  },
    { code: '4400', name: 'Spa & Wellness Revenue', type: 'REVENUE', normalBalance: 'CREDIT', description: 'Revenue from spa and wellness services',     isSystem: false },
    { code: '4500', name: 'Facilities Revenue',     type: 'REVENUE', normalBalance: 'CREDIT', description: 'Revenue from conference rooms, pool etc',    isSystem: false },
    { code: '4600', name: 'Laundry Revenue',        type: 'REVENUE', normalBalance: 'CREDIT', description: 'Revenue from laundry services',             isSystem: false },
    { code: '4900', name: 'Miscellaneous Revenue',  type: 'REVENUE', normalBalance: 'CREDIT', description: 'Other revenue not categorised above',        isSystem: false },
    { code: '5000', name: 'Cost of Goods Sold',     type: 'EXPENSE', normalBalance: 'DEBIT',  description: 'Direct cost of items sold',                 isSystem: true  },
    { code: '5100', name: 'Cost of Food Sold',      type: 'EXPENSE', normalBalance: 'DEBIT',  description: 'Cost of food items consumed in sales',       isSystem: true  },
    { code: '5200', name: 'Cost of Beverages Sold', type: 'EXPENSE', normalBalance: 'DEBIT',  description: 'Cost of beverage items consumed in sales',   isSystem: true  },
    { code: '6000', name: 'Operating Expenses',     type: 'EXPENSE', normalBalance: 'DEBIT',  description: 'Total operating expenses parent account',    isSystem: false },
    { code: '6100', name: 'Salaries & Wages',       type: 'EXPENSE', normalBalance: 'DEBIT',  description: 'Employee salaries and wages',                isSystem: false },
    { code: '6110', name: 'Employer Pension',        type: 'EXPENSE', normalBalance: 'DEBIT',  description: 'Employer pension contribution (10%)',        isSystem: false },
    { code: '6200', name: 'Housekeeping Supplies',  type: 'EXPENSE', normalBalance: 'DEBIT',  description: 'Cleaning and housekeeping materials',         isSystem: false },
    { code: '6300', name: 'Utilities',              type: 'EXPENSE', normalBalance: 'DEBIT',  description: 'Electricity, water, gas',                    isSystem: false },
    { code: '6400', name: 'Maintenance & Repairs',  type: 'EXPENSE', normalBalance: 'DEBIT',  description: 'Equipment and facility maintenance',          isSystem: false },
    { code: '6500', name: 'Marketing & Advertising',type: 'EXPENSE', normalBalance: 'DEBIT',  description: 'Sales and marketing costs',                  isSystem: false },
    { code: '6600', name: 'Bank Charges',           type: 'EXPENSE', normalBalance: 'DEBIT',  description: 'Bank fees and transaction charges',           isSystem: false },
    { code: '6900', name: 'Miscellaneous Expenses', type: 'EXPENSE', normalBalance: 'DEBIT',  description: 'Other expenses not categorised above',        isSystem: false },
  ];

  let coaSeeded = 0;
  for (const account of HOTEL_COA) {
    await prisma.account.upsert({
      where:  { hotelId_code: { hotelId: hotel.id, code: account.code } },
      update: { name: account.name, description: account.description },
      create: { hotelId: hotel.id, ...account },
    });
    coaSeeded++;
  }
  console.log(`✅ ${coaSeeded} chart of accounts entries seeded`);

  console.log('\n🏨 Seed complete!');
  console.log('─────────────────────────────────────');
  console.log('Login credentials:');
  console.log('  Admin:        admin@hotel.com     / password');
  console.log('  Manager:      manager@hotel.com   / password');
  console.log('  Receptionist: reception@hotel.com / password');
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
