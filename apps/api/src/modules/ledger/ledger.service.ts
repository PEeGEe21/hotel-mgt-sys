import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ─── Standard Hotel Chart of Accounts ────────────────────────────────────────
export const HOTEL_COA = [
  // ── ASSETS ──────────────────────────────────────────────────────────────
  {
    code: '1000',
    name: 'Cash on Hand',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    description: 'Physical cash in registers and cashboxes',
    isSystem: true,
  },
  {
    code: '1010',
    name: 'Cash — Bank Account',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    description: 'Hotel bank account balance',
    isSystem: true,
  },
  {
    code: '1020',
    name: 'Cash — POS Terminal',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    description: 'Card/POS terminal settlements',
    isSystem: false,
  },
  {
    code: '1100',
    name: 'Guest Ledger (AR)',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    description: 'Amounts owed by in-house guests',
    isSystem: true,
  },
  {
    code: '1110',
    name: 'City Ledger (AR)',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    description: 'Amounts owed by corporate accounts',
    isSystem: false,
  },
  {
    code: '1200',
    name: 'Inventory Asset',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    description: 'Cost value of items in stock',
    isSystem: true,
  },
  {
    code: '1300',
    name: 'Prepaid Expenses',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    description: 'Expenses paid in advance',
    isSystem: false,
  },

  // ── LIABILITIES ──────────────────────────────────────────────────────────
  {
    code: '2000',
    name: 'Accounts Payable',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    description: 'Amounts owed to suppliers',
    isSystem: false,
  },
  {
    code: '2100',
    name: 'Advance Deposits',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    description: 'Guest deposits for future reservations',
    isSystem: true,
  },
  {
    code: '2200',
    name: 'VAT Payable',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    description: 'VAT collected on behalf of government',
    isSystem: true,
  },
  {
    code: '2300',
    name: 'Salary Payable',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    description: 'Accrued salaries not yet paid',
    isSystem: false,
  },
  {
    code: '2400',
    name: 'Pension Payable',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    description: 'Employee pension contributions payable',
    isSystem: false,
  },

  // ── EQUITY ────────────────────────────────────────────────────────────────
  {
    code: '3000',
    name: "Owner's Equity",
    type: 'EQUITY',
    normalBalance: 'CREDIT',
    description: "Owner's investment in the business",
    isSystem: false,
  },
  {
    code: '3100',
    name: 'Retained Earnings',
    type: 'EQUITY',
    normalBalance: 'CREDIT',
    description: 'Accumulated profits retained in business',
    isSystem: false,
  },

  // ── REVENUE ───────────────────────────────────────────────────────────────
  {
    code: '4000',
    name: 'Revenue',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    description: 'Total revenue parent account',
    isSystem: true,
  },
  {
    code: '4100',
    name: 'Room Revenue',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    description: 'Revenue from room charges',
    isSystem: true,
  },
  {
    code: '4200',
    name: 'Food & Beverage Revenue',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    description: 'Revenue from restaurant and room service',
    isSystem: true,
  },
  {
    code: '4300',
    name: 'Bar Revenue',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    description: 'Revenue from bar sales',
    isSystem: true,
  },
  {
    code: '4400',
    name: 'Spa & Wellness Revenue',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    description: 'Revenue from spa and wellness services',
    isSystem: false,
  },
  {
    code: '4500',
    name: 'Facilities Revenue',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    description: 'Revenue from conference rooms, pool etc',
    isSystem: false,
  },
  {
    code: '4600',
    name: 'Laundry Revenue',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    description: 'Revenue from laundry services',
    isSystem: false,
  },
  {
    code: '4900',
    name: 'Miscellaneous Revenue',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    description: 'Other revenue not categorised above',
    isSystem: false,
  },

  // ── COST OF GOODS SOLD ────────────────────────────────────────────────────
  {
    code: '5000',
    name: 'Cost of Goods Sold',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    description: 'Direct cost of items sold',
    isSystem: true,
  },
  {
    code: '5100',
    name: 'Cost of Food Sold',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    description: 'Cost of food items consumed in sales',
    isSystem: true,
  },
  {
    code: '5200',
    name: 'Cost of Beverages Sold',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    description: 'Cost of beverage items consumed in sales',
    isSystem: true,
  },

  // ── OPERATING EXPENSES ────────────────────────────────────────────────────
  {
    code: '6000',
    name: 'Operating Expenses',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    description: 'Total operating expenses parent account',
    isSystem: false,
  },
  {
    code: '6100',
    name: 'Salaries & Wages',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    description: 'Employee salaries and wages',
    isSystem: false,
  },
  {
    code: '6110',
    name: 'Employer Pension',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    description: 'Employer pension contribution (10%)',
    isSystem: false,
  },
  {
    code: '6200',
    name: 'Housekeeping Supplies',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    description: 'Cleaning and housekeeping materials',
    isSystem: false,
  },
  {
    code: '6300',
    name: 'Utilities',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    description: 'Electricity, water, gas',
    isSystem: false,
  },
  {
    code: '6400',
    name: 'Maintenance & Repairs',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    description: 'Equipment and facility maintenance',
    isSystem: false,
  },
  {
    code: '6500',
    name: 'Marketing & Advertising',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    description: 'Sales and marketing costs',
    isSystem: false,
  },
  {
    code: '6600',
    name: 'Bank Charges',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    description: 'Bank fees and transaction charges',
    isSystem: false,
  },
  {
    code: '6900',
    name: 'Miscellaneous Expenses',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    description: 'Other expenses not categorised above',
    isSystem: false,
  },
];

// Map folio categories to revenue accounts
export const FOLIO_CATEGORY_ACCOUNT: Record<string, string> = {
  ROOM: '4100',
  FOOD: '4200',
  BAR: '4300',
  SPA: '4400',
  LAUNDRY: '4600',
  MISC: '4900',
};

// Map POS order types to revenue accounts
export const POS_TYPE_ACCOUNT: Record<string, string> = {
  DINE_IN: '4200',
  ROOM_SERVICE: '4200',
  TAKEAWAY: '4200',
  RETAIL: '4900',
  BAR: '4300',
};

// Map payment methods to asset accounts
export const PAYMENT_METHOD_ACCOUNT: Record<string, string> = {
  CASH: '1000',
  CARD: '1020',
  BANK_TRANSFER: '1010',
  TRANSFER: '1010',
  MOBILE_MONEY: '1010',
  ROOM_CHARGE: '1100', // debit guest ledger (already there)
};

// ─── Service ──────────────────────────────────────────────────────────────────
@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaService) {}

  private async assertStaffBelongsToHotel(hotelId: string, staffId?: string | null) {
    if (!staffId) return;
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, hotelId },
      select: { id: true },
    });
    if (!staff) throw new NotFoundException('Staff not found.');
  }

  // ── Seed COA for a hotel ───────────────────────────────────────────────────
  async seedChartOfAccounts(hotelId: string) {
    const existing = await this.prisma.account.count({ where: { hotelId } });
    if (existing > 0) {
      throw new BadRequestException('Chart of accounts already exists for this hotel.');
    }

    await this.prisma.account.createMany({
      data: HOTEL_COA.map((a) => ({ ...a, hotelId })),
    });

    return {
      seeded: HOTEL_COA.length,
      message: `${HOTEL_COA.length} accounts created.`,
    };
  }

  // ── List accounts ──────────────────────────────────────────────────────────
  async listAccounts(hotelId: string, type?: string) {
    const where: any = { hotelId, isActive: true };
    if (type) where.type = type;

    const accounts = await this.prisma.account.findMany({
      where,
      orderBy: { code: 'asc' },
    });

    // Attach running balances
    const balances = await this.prisma.journalLine.groupBy({
      by: ['accountId', 'type'],
      where: { journalEntry: { hotelId } },
      _sum: { amount: true },
    });

    const balanceMap: Record<string, { debit: number; credit: number }> = {};
    balances.forEach((b) => {
      if (!balanceMap[b.accountId]) balanceMap[b.accountId] = { debit: 0, credit: 0 };
      const amt = Number(b._sum.amount ?? 0);
      if (b.type === 'DEBIT') balanceMap[b.accountId].debit += amt;
      if (b.type === 'CREDIT') balanceMap[b.accountId].credit += amt;
    });

    return accounts.map((acc) => {
      const b = balanceMap[acc.id] ?? { debit: 0, credit: 0 };
      const balance = acc.normalBalance === 'DEBIT' ? b.debit - b.credit : b.credit - b.debit;
      return { ...acc, debit: b.debit, credit: b.credit, balance };
    });
  }

  // ── Post a journal entry ───────────────────────────────────────────────────
  async postEntry(
    hotelId: string,
    dto: {
      date?: Date;
      description: string;
      reference?: string;
      sourceType?: string;
      sourceId?: string;
      postedBy?: string;
      lines: {
        accountCode: string;
        type: 'DEBIT' | 'CREDIT';
        amount: number;
        description?: string;
      }[];
    },
  ) {
    await this.assertStaffBelongsToHotel(hotelId, dto.postedBy);

    // Validate balanced entry
    if (!dto.lines?.length || dto.lines.length < 2) {
      throw new BadRequestException('Journal entry must have at least two lines.');
    }

    const invalidLines = dto.lines.filter((line) => line.amount <= 0);
    if (invalidLines.length > 0) {
      throw new BadRequestException('Journal line amounts must be greater than zero.');
    }

    const totalDebit = dto.lines
      .filter((l) => l.type === 'DEBIT')
      .reduce((s, l) => s + l.amount, 0);
    const totalCredit = dto.lines
      .filter((l) => l.type === 'CREDIT')
      .reduce((s, l) => s + l.amount, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Journal entry is not balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`,
      );
    }

    // Resolve account codes to IDs
    const codes = dto.lines.map((l) => l.accountCode);
    const accounts = await this.prisma.account.findMany({
      where: { hotelId, code: { in: codes }, isActive: true },
    });
    const accountMap = Object.fromEntries(accounts.map((a) => [a.code, a]));

    const missing = codes.filter((c) => !accountMap[c]);
    if (missing.length > 0) {
      throw new NotFoundException(`Accounts not found: ${missing.join(', ')}`);
    }

    // Generate entry number
    const entryNo = await this.nextEntryNo(hotelId);

    return this.prisma.journalEntry.create({
      data: {
        hotelId,
        entryNo,
        date: dto.date ?? new Date(),
        description: dto.description,
        reference: dto.reference,
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        postedBy: dto.postedBy,
        lines: {
          create: dto.lines.map((line) => ({
            accountId: accountMap[line.accountCode].id,
            type: line.type,
            amount: line.amount,
            description: line.description,
          })),
        },
      },
      include: { lines: { include: { account: true } } },
    });
  }

  // ── Post room charge (folio item created) ──────────────────────────────────
  async postFolioCharge(
    hotelId: string,
    dto: {
      amount: number;
      category: string; // ROOM, FOOD, SPA etc
      description: string;
      reservationId: string;
      folioItemId: string;
    },
  ) {
    const revenueCode = FOLIO_CATEGORY_ACCOUNT[dto.category] ?? '4900';

    return this.postEntry(hotelId, {
      description: dto.description,
      sourceType: 'FOLIO',
      sourceId: dto.folioItemId,
      reference: dto.reservationId,
      lines: [
        { accountCode: '1100', type: 'DEBIT', amount: dto.amount, description: dto.description },
        {
          accountCode: revenueCode,
          type: 'CREDIT',
          amount: dto.amount,
          description: dto.description,
        },
      ],
    });
  }

  // ── Post payment received ──────────────────────────────────────────────────
  async postPayment(
    hotelId: string,
    dto: {
      amount: number;
      method: string;
      description: string;
      invoiceId: string;
      paymentId: string;
      isRoomCharge?: boolean; // room charge settles AR not cash
    },
  ) {
    const cashAccount = PAYMENT_METHOD_ACCOUNT[dto.method.toUpperCase()] ?? '1000';

    // Room charge to guest ledger: debit cash, credit guest AR
    // All other: debit cash account, credit guest AR
    return this.postEntry(hotelId, {
      description: dto.description,
      sourceType: 'PAYMENT',
      sourceId: dto.paymentId,
      reference: dto.invoiceId,
      lines: [
        {
          accountCode: cashAccount,
          type: 'DEBIT',
          amount: dto.amount,
          description: `Payment — ${dto.method}`,
        },
        { accountCode: '1100', type: 'CREDIT', amount: dto.amount, description: dto.description },
      ],
    });
  }

  // ── Post POS sale (walk-in) ────────────────────────────────────────────────
  async postPosSale(
    hotelId: string,
    dto: {
      subtotal: number;
      tax: number;
      total: number;
      orderType: string;
      method: string;
      orderId: string;
      invoiceId: string;
      cogsLines?: { amount: number; description: string }[];
    },
  ) {
    const revenueCode = POS_TYPE_ACCOUNT[dto.orderType] ?? '4200';
    const cashAccount = PAYMENT_METHOD_ACCOUNT[dto.method.toUpperCase()] ?? '1000';

    const lines: any[] = [
      // Revenue: debit cash, credit revenue
      {
        accountCode: cashAccount,
        type: 'DEBIT',
        amount: dto.total,
        description: `POS sale — ${dto.orderType}`,
      },
      {
        accountCode: revenueCode,
        type: 'CREDIT',
        amount: dto.subtotal,
        description: `Revenue — ${dto.orderType}`,
      },
    ];

    // VAT
    if (dto.tax > 0) {
      lines.push({
        accountCode: '2200',
        type: 'CREDIT',
        amount: dto.tax,
        description: 'VAT collected',
      });
    }

    // COGS lines (one per product ingredient consumed)
    if (dto.cogsLines?.length) {
      dto.cogsLines.forEach((cogs) => {
        lines.push({
          accountCode: '5200',
          type: 'DEBIT',
          amount: cogs.amount,
          description: cogs.description,
        });
        lines.push({
          accountCode: '1200',
          type: 'CREDIT',
          amount: cogs.amount,
          description: cogs.description,
        });
      });
    }

    return this.postEntry(hotelId, {
      description: `POS Sale — ${dto.orderId}`,
      sourceType: 'POS_SALE',
      sourceId: dto.orderId,
      reference: dto.invoiceId,
      lines,
    });
  }

  // ── Post deposit received (reservation advance payment) ────────────────────
  async postDeposit(
    hotelId: string,
    dto: {
      amount: number;
      method: string;
      description: string;
      reservationId: string;
      paymentId: string;
    },
  ) {
    const cashAccount = PAYMENT_METHOD_ACCOUNT[dto.method.toUpperCase()] ?? '1000';

    return this.postEntry(hotelId, {
      description: dto.description,
      sourceType: 'PAYMENT',
      sourceId: dto.paymentId,
      reference: dto.reservationId,
      lines: [
        {
          accountCode: cashAccount,
          type: 'DEBIT',
          amount: dto.amount,
          description: `Deposit — ${dto.method}`,
        },
        {
          accountCode: '2100',
          type: 'CREDIT',
          amount: dto.amount,
          description: 'Advance deposit received',
        },
      ],
    });
  }

  // ── Post deposit recognition (deposit → revenue at check-in) ───────────────
  async recognizeDeposit(
    hotelId: string,
    dto: {
      amount: number;
      description: string;
      reservationId: string;
    },
  ) {
    return this.postEntry(hotelId, {
      description: dto.description,
      sourceType: 'RESERVATION',
      sourceId: dto.reservationId,
      lines: [
        {
          accountCode: '2100',
          type: 'DEBIT',
          amount: dto.amount,
          description: 'Deposit recognized',
        },
        {
          accountCode: '4100',
          type: 'CREDIT',
          amount: dto.amount,
          description: 'Room revenue recognized',
        },
      ],
    });
  }

  // ── Day Book — all entries for a date ─────────────────────────────────────
  async getDayBook(hotelId: string, date: string, page = 1, limit = 50) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const [total, entries] = await Promise.all([
      this.prisma.journalEntry.count({
        where: { hotelId, date: { gte: start, lte: end } },
      }),
      this.prisma.journalEntry.findMany({
        where: { hotelId, date: { gte: start, lte: end } },
        orderBy: { date: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          lines: {
            include: { account: { select: { code: true, name: true, type: true } } },
            orderBy: { type: 'asc' },
          },
        },
      }),
    ]);

    // Totals for the day
    const totalDebits = entries.reduce(
      (s, e) =>
        s + e.lines.filter((l) => l.type === 'DEBIT').reduce((a, l) => a + Number(l.amount), 0),
      0,
    );
    const totalCredits = entries.reduce(
      (s, e) =>
        s + e.lines.filter((l) => l.type === 'CREDIT').reduce((a, l) => a + Number(l.amount), 0),
      0,
    );

    return {
      date,
      entries,
      summary: { totalEntries: total, totalDebits, totalCredits },
      meta: {
        total,
        current_page: page,
        per_page: limit,
        last_page: Math.max(1, Math.ceil(total / limit)),
        from: (page - 1) * limit + 1,
        to: Math.min(total, page * limit),
      },
    };
  }

  // ── Trial Balance ──────────────────────────────────────────────────────────
  async getTrialBalance(hotelId: string, asOf?: string) {
    const endDate = asOf ? new Date(asOf) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const accounts = await this.prisma.account.findMany({
      where: { hotelId, isActive: true },
      orderBy: { code: 'asc' },
    });

    const lines = await this.prisma.journalLine.findMany({
      where: {
        journalEntry: { hotelId, date: { lte: endDate } },
      },
      include: {
        account: { select: { id: true, code: true, name: true, type: true, normalBalance: true } },
      },
    });

    // Aggregate by account
    const totals: Record<string, { debit: number; credit: number }> = {};
    lines.forEach((line) => {
      const id = line.accountId;
      if (!totals[id]) totals[id] = { debit: 0, credit: 0 };
      const amt = Number(line.amount);
      if (line.type === 'DEBIT') totals[id].debit += amt;
      if (line.type === 'CREDIT') totals[id].credit += amt;
    });

    const rows = accounts
      .map((acc) => {
        const t = totals[acc.id] ?? { debit: 0, credit: 0 };
        const balance = acc.normalBalance === 'DEBIT' ? t.debit - t.credit : t.credit - t.debit;
        return { ...acc, debit: t.debit, credit: t.credit, balance };
      })
      .filter((r) => r.debit > 0 || r.credit > 0); // only show accounts with activity

    const totalDebits = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredits = rows.reduce((s, r) => s + r.credit, 0);
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

    return {
      asOf: endDate.toISOString(),
      rows,
      totalDebits,
      totalCredits,
      isBalanced,
    };
  }

  // ── Profit & Loss ──────────────────────────────────────────────────────────
  async getProfitAndLoss(hotelId: string, from: string, to: string) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);

    const lines = await this.prisma.journalLine.findMany({
      where: {
        journalEntry: {
          hotelId,
          date: { gte: start, lte: end },
        },
        account: {
          type: { in: ['REVENUE', 'EXPENSE'] },
        },
      },
      include: {
        account: { select: { id: true, code: true, name: true, type: true, normalBalance: true } },
      },
    });

    // Group by account
    const accountTotals: Record<string, { account: any; debit: number; credit: number }> = {};
    lines.forEach((line) => {
      const id = line.accountId;
      if (!accountTotals[id]) accountTotals[id] = { account: line.account, debit: 0, credit: 0 };
      const amt = Number(line.amount);
      if (line.type === 'DEBIT') accountTotals[id].debit += amt;
      if (line.type === 'CREDIT') accountTotals[id].credit += amt;
    });

    const rows = Object.values(accountTotals).map(({ account, debit, credit }) => ({
      ...account,
      debit,
      credit,
      balance: account.normalBalance === 'DEBIT' ? debit - credit : credit - debit,
    }));

    const revenue = rows.filter((r) => r.type === 'REVENUE');
    const expenses = rows.filter((r) => r.type === 'EXPENSE');

    const totalRevenue = revenue.reduce((s, r) => s + r.balance, 0);
    const totalExpenses = expenses.reduce((s, r) => s + r.balance, 0);
    const netProfit = totalRevenue - totalExpenses;

    // Group revenue by category
    const revenueByCategory: Record<string, number> = {};
    revenue.forEach((r) => {
      revenueByCategory[r.name] = r.balance;
    });

    return {
      period: { from: start.toISOString(), to: end.toISOString() },
      revenue: {
        total: totalRevenue,
        rows: revenue.sort((a, b) => a.code.localeCompare(b.code)),
        byCategory: revenueByCategory,
      },
      expenses: {
        total: totalExpenses,
        rows: expenses.sort((a, b) => a.code.localeCompare(b.code)),
      },
      netProfit,
      margin: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0,
    };
  }

  // ── Account Statement ──────────────────────────────────────────────────────
  async getAccountStatement(hotelId: string, accountCode: string, from?: string, to?: string) {
    const account = await this.prisma.account.findFirst({ where: { hotelId, code: accountCode } });
    if (!account) throw new NotFoundException(`Account ${accountCode} not found.`);

    const where: any = { accountId: account.id, journalEntry: { hotelId } };
    if (from || to) {
      where.journalEntry = {
        hotelId,
        date: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      };
    }

    const lines = await this.prisma.journalLine.findMany({
      where,
      orderBy: { journalEntry: { date: 'asc' } },
      include: {
        journalEntry: {
          select: {
            entryNo: true,
            date: true,
            description: true,
            reference: true,
            sourceType: true,
          },
        },
      },
    });

    let runningBalance = 0;
    const rows = lines.map((line) => {
      const amt = Number(line.amount);
      if (account.normalBalance === 'DEBIT') {
        runningBalance += line.type === 'DEBIT' ? amt : -amt;
      } else {
        runningBalance += line.type === 'CREDIT' ? amt : -amt;
      }
      return { ...line, runningBalance };
    });

    return {
      account,
      rows,
      closingBalance: runningBalance,
    };
  }

  // ── Create/update account ──────────────────────────────────────────────────
  async createAccount(
    hotelId: string,
    dto: {
      code: string;
      name: string;
      type: string;
      normalBalance: string;
      description?: string;
    },
  ) {
    const code = dto.code.trim();
    const name = dto.name.trim();
    const description = dto.description?.trim();

    if (!name) throw new BadRequestException('Account name is required.');

    const exists = await this.prisma.account.findFirst({ where: { hotelId, code } });
    if (exists) throw new BadRequestException(`Account code ${code} already exists.`);

    return this.prisma.account.create({
      data: {
        hotelId,
        ...dto,
        code,
        name,
        description,
        isActive: true,
        isSystem: false,
      },
    });
  }

  async updateAccount(
    hotelId: string,
    id: string,
    dto: Partial<{
      name: string;
      description: string;
      isActive: boolean;
    }>,
  ) {
    const account = await this.prisma.account.findFirst({ where: { id, hotelId } });
    if (!account) throw new NotFoundException('Account not found.');
    if (account.isSystem && dto.isActive === false) {
      throw new BadRequestException('System accounts cannot be deactivated.');
    }

    const data = {
      ...dto,
      name: dto.name?.trim(),
      description: dto.description?.trim(),
    };

    if (dto.name !== undefined && !data.name) {
      throw new BadRequestException('Account name is required.');
    }

    return this.prisma.account.update({ where: { id: account.id }, data });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private async nextEntryNo(hotelId: string): Promise<string> {
    const year = new Date().getFullYear();
    const last = await this.prisma.journalEntry.findFirst({
      where: { hotelId, entryNo: { startsWith: `JE-${year}-` } },
      orderBy: { entryNo: 'desc' },
      select: { entryNo: true },
    });
    const seq = last ? parseInt(last.entryNo.split('-')[2]) + 1 : 1;
    return `JE-${year}-${String(seq).padStart(4, '0')}`;
  }
}
