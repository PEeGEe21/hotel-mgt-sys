// ─── HotelOS Permission System ────────────────────────────────────────────────
// Two-layer system:
//   1. Role permissions — the baseline every user with that role gets
//   2. User overrides  — per-user grants or denials on top of their role
//
// Resolution order:  USER_DENY > USER_GRANT > ROLE_PERMISSION

export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'RECEPTIONIST'
  | 'HOUSEKEEPING'
  | 'CASHIER'
  | 'BARTENDER'
  | 'STAFF';

export type Permission =
  // Dashboard
  | 'view:dashboard'
  // Rooms
  | 'view:rooms'
  | 'create:rooms'
  | 'edit:rooms'
  | 'delete:rooms'
  // Reservations
  | 'view:reservations'
  | 'create:reservations'
  | 'edit:reservations'
  | 'delete:reservations'
  | 'checkin:reservations'
  | 'checkout:reservations'
  // Guests
  | 'view:guests'
  | 'create:guests'
  | 'edit:guests'
  | 'delete:guests'
  // Staff
  | 'view:staff'
  | 'create:staff'
  | 'edit:staff'
  | 'delete:staff'
  // Attendance
  | 'view:attendance'
  | 'manage:attendance'
  | 'clock:self'
  // POS
  | 'view:pos'
  | 'create:pos'
  | 'void:pos'
  | 'discount:pos'
  // Inventory
  | 'view:inventory'
  | 'create:inventory'
  | 'edit:inventory'
  | 'delete:inventory'
  | 'reorder:inventory'
  // Housekeeping
  | 'view:housekeeping'
  | 'manage:housekeeping'
  // Finance
  | 'view:finance'
  | 'create:finance'
  | 'edit:finance'
  | 'delete:finance'
  | 'approve:finance'
  // Reports
  | 'view:reports'
  | 'export:reports'
  // Facilities
  | 'view:facilities'
  | 'manage:facilities'
  // Settings
  | 'view:settings'
  | 'manage:settings'
  // HR
  | 'view:hr'
  | 'manage:hr'
  | 'manage:permissions';

// ─── Permission groups (for UI rendering) ────────────────────────────────────
export type PermissionGroup = {
  label: string;
  key: string;
  permissions: { key: Permission; label: string; description: string }[];
};

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: 'Rooms',
    key: 'rooms',
    permissions: [
      { key: 'view:rooms', label: 'View Rooms', description: 'See room list and details' },
      { key: 'create:rooms', label: 'Add Rooms', description: 'Create new room records' },
      { key: 'edit:rooms', label: 'Edit Rooms', description: 'Update room info and status' },
      { key: 'delete:rooms', label: 'Delete Rooms', description: 'Remove rooms from system' },
    ],
  },
  {
    label: 'Reservations',
    key: 'reservations',
    permissions: [
      { key: 'view:reservations', label: 'View', description: 'See reservation list' },
      { key: 'create:reservations', label: 'Create', description: 'Make new reservations' },
      { key: 'edit:reservations', label: 'Edit', description: 'Modify existing reservations' },
      {
        key: 'delete:reservations',
        label: 'Cancel/Delete',
        description: 'Cancel or remove reservations',
      },
      { key: 'checkin:reservations', label: 'Check In', description: 'Perform guest check-ins' },
      { key: 'checkout:reservations', label: 'Check Out', description: 'Perform guest check-outs' },
    ],
  },
  {
    label: 'Guests',
    key: 'guests',
    permissions: [
      { key: 'view:guests', label: 'View', description: 'See guest profiles' },
      { key: 'create:guests', label: 'Create', description: 'Add new guest records' },
      { key: 'edit:guests', label: 'Edit', description: 'Update guest information' },
      { key: 'delete:guests', label: 'Delete', description: 'Remove guest records' },
    ],
  },
  {
    label: 'POS / Bar',
    key: 'pos',
    permissions: [
      { key: 'view:pos', label: 'View POS', description: 'Access POS and orders' },
      { key: 'create:pos', label: 'Create Orders', description: 'Place new POS orders' },
      { key: 'void:pos', label: 'Void Orders', description: 'Cancel or void orders' },
      { key: 'discount:pos', label: 'Apply Discounts', description: 'Apply discounts to orders' },
    ],
  },
  {
    label: 'Inventory',
    key: 'inventory',
    permissions: [
      { key: 'view:inventory', label: 'View', description: 'See inventory levels' },
      { key: 'create:inventory', label: 'Add Items', description: 'Create inventory entries' },
      { key: 'edit:inventory', label: 'Edit', description: 'Update stock and prices' },
      { key: 'delete:inventory', label: 'Delete', description: 'Remove inventory items' },
      { key: 'reorder:inventory', label: 'Reorder', description: 'Trigger stock reorders' },
    ],
  },
  {
    label: 'Finance',
    key: 'finance',
    permissions: [
      { key: 'view:finance', label: 'View', description: 'View financial records' },
      { key: 'create:finance', label: 'Create Entries', description: 'Add invoices and payments' },
      { key: 'edit:finance', label: 'Edit', description: 'Modify financial records' },
      { key: 'delete:finance', label: 'Delete', description: 'Remove financial records' },
      { key: 'approve:finance', label: 'Approve', description: 'Approve payments and expenses' },
    ],
  },
  {
    label: 'Reports',
    key: 'reports',
    permissions: [
      { key: 'view:reports', label: 'View Reports', description: 'Access reports and analytics' },
      { key: 'export:reports', label: 'Export Reports', description: 'Download Excel/PDF exports' },
    ],
  },
  {
    label: 'Staff & HR',
    key: 'hr',
    permissions: [
      { key: 'view:staff', label: 'View Staff', description: 'See staff profiles' },
      { key: 'create:staff', label: 'Add Staff', description: 'Create staff records' },
      { key: 'edit:staff', label: 'Edit Staff', description: 'Update staff info' },
      { key: 'delete:staff', label: 'Delete Staff', description: 'Remove staff records' },
      { key: 'view:hr', label: 'View HR', description: 'Access HR module' },
      { key: 'manage:hr', label: 'Manage HR', description: 'Payroll, contracts' },
      {
        key: 'manage:permissions',
        label: 'Manage Permissions',
        description: 'Edit user permissions',
      },
    ],
  },
  {
    label: 'Attendance',
    key: 'attendance',
    permissions: [
      { key: 'view:attendance', label: 'View Attendance', description: 'See attendance records' },
      {
        key: 'manage:attendance',
        label: 'Manage Attendance',
        description: 'Edit and correct records',
      },
      { key: 'clock:self', label: 'Clock In/Out', description: 'Clock self in and out' },
    ],
  },
  {
    label: 'Settings',
    key: 'settings',
    permissions: [
      { key: 'view:settings', label: 'View Settings', description: 'Access settings pages' },
      { key: 'manage:settings', label: 'Manage Settings', description: 'Change system settings' },
    ],
  },
];

// ─── Role permission matrix ───────────────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
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

  ADMIN: [
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

  MANAGER: [
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

  RECEPTIONIST: [
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

  HOUSEKEEPING: [
    'view:dashboard',
    'view:rooms',
    'view:housekeeping',
    'manage:housekeeping',
    'clock:self',
  ],

  CASHIER: ['view:dashboard', 'view:pos', 'create:pos', 'void:pos', 'view:finance', 'clock:self'],

  BARTENDER: ['view:dashboard', 'view:pos', 'create:pos', 'view:inventory', 'clock:self'],

  STAFF: ['view:dashboard', 'clock:self'],
};

// ─── Nav visibility map ───────────────────────────────────────────────────────
export const NAV_PERMISSIONS: Record<string, Permission> = {
  '/dashboard': 'view:dashboard',
  '/rooms': 'view:rooms',
  '/reservations': 'view:reservations',
  '/guests': 'view:guests',
  '/staff': 'view:staff',
  '/attendance': 'view:attendance',
  '/pos': 'view:pos',
  '/inventory': 'view:inventory',
  '/housekeeping': 'view:housekeeping',
  '/finance': 'view:finance',
  '/reports': 'view:reports',
  '/facilities': 'view:facilities',
  '/settings': 'view:settings',
  '/hr': 'view:hr',
};

// ─── User override type ───────────────────────────────────────────────────────
// Stored in the DB per user. Loaded into auth store on login.
export type UserPermissionOverride = {
  userId: string;
  grants: Permission[]; // permissions added on top of role
  denies: Permission[]; // permissions removed from role
};

// ─── Resolve effective permissions ───────────────────────────────────────────
// Given a role + overrides, return the final permission set.
export function resolvePermissions(
  role: Role,
  overrides?: { grants?: Permission[]; denies?: Permission[] },
): Permission[] {
  const base = new Set(ROLE_PERMISSIONS[role] ?? []);
  if (overrides?.grants) overrides.grants.forEach((p) => base.add(p));
  if (overrides?.denies) overrides.denies.forEach((p) => base.delete(p));
  return Array.from(base);
}
