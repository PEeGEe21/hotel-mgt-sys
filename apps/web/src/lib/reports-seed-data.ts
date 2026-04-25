import { C } from "@/utils/report-utils";

export const revenueData = [
  { month: 'Oct', rooms: 98200, fnb: 14200, events: 4100, total: 116500 },
  { month: 'Nov', rooms: 104800, fnb: 16800, events: 5200, total: 126800 },
  { month: 'Dec', rooms: 138400, fnb: 22100, events: 9800, total: 170300 },
  { month: 'Jan', rooms: 112000, fnb: 17400, events: 3600, total: 133000 },
  { month: 'Feb', rooms: 106200, fnb: 15800, events: 4400, total: 126400 },
  { month: 'Mar', rooms: 118400, fnb: 18200, events: 6240, total: 142840 },
];

export const occupancyData = [
  { month: 'Oct', occupancy: 72, adr: 285, revpar: 205 },
  { month: 'Nov', occupancy: 78, adr: 290, revpar: 226 },
  { month: 'Dec', occupancy: 91, adr: 348, revpar: 317 },
  { month: 'Jan', occupancy: 75, adr: 294, revpar: 220 },
  { month: 'Feb', occupancy: 71, adr: 282, revpar: 200 },
  { month: 'Mar', occupancy: 81, adr: 312, revpar: 253 },
];

export const expenseData = [
  {
    month: 'Oct',
    payroll: 17200,
    supplies: 4100,
    utilities: 1900,
    maintenance: 680,
    marketing: 820,
  },
  {
    month: 'Nov',
    payroll: 17800,
    supplies: 4400,
    utilities: 2000,
    maintenance: 420,
    marketing: 760,
  },
  {
    month: 'Dec',
    payroll: 19200,
    supplies: 5800,
    utilities: 2400,
    maintenance: 1100,
    marketing: 940,
  },
  {
    month: 'Jan',
    payroll: 18100,
    supplies: 4200,
    utilities: 2200,
    maintenance: 340,
    marketing: 780,
  },
  {
    month: 'Feb',
    payroll: 17900,
    supplies: 4000,
    utilities: 1800,
    maintenance: 290,
    marketing: 720,
  },
  {
    month: 'Mar',
    payroll: 18500,
    supplies: 4950,
    utilities: 2100,
    maintenance: 750,
    marketing: 860,
  },
];

export const guestSourceData = [
  { name: 'Direct', value: 38, color: C.blue },
  { name: 'Booking.com', value: 28, color: C.sky },
  { name: 'Expedia', value: 18, color: C.violet },
  { name: 'Walk-in', value: 10, color: C.emerald },
  { name: 'Other', value: 6, color: C.slate },
];

export const roomTypeRevenue = [
  { type: 'Standard', revenue: 12800, nights: 68, adr: 188 },
  { type: 'Deluxe', revenue: 29040, nights: 96, adr: 302 },
  { type: 'Suite', revenue: 47880, nights: 84, adr: 570 },
  { type: 'Presidential', revenue: 19200, nights: 16, adr: 1200 },
  { type: 'Family', revenue: 9480, nights: 24, adr: 395 },
];

export const attendanceWeek = [
  { day: 'Mon', present: 18, late: 2, absent: 1 },
  { day: 'Tue', present: 20, late: 1, absent: 0 },
  { day: 'Wed', present: 17, late: 3, absent: 1 },
  { day: 'Thu', present: 19, late: 2, absent: 0 },
  { day: 'Fri', present: 21, late: 0, absent: 0 },
  { day: 'Sat', present: 16, late: 1, absent: 2 },
  { day: 'Sun', present: 14, late: 0, absent: 4 },
];

export const inventoryAlerts = [
  { item: 'Whisky (Jameson)', current: 8, par: 24, unit: 'btl', category: 'Bar' },
  { item: 'Toilet Paper Rolls', current: 42, par: 200, unit: 'rolls', category: 'Housekeeping' },
  { item: 'Red Wine (House)', current: 6, par: 36, unit: 'btl', category: 'Bar' },
  { item: 'Shower Gel 250ml', current: 18, par: 120, unit: 'pcs', category: 'Housekeeping' },
  { item: 'Laundry Detergent', current: 3, par: 20, unit: 'kg', category: 'Housekeeping' },
];
