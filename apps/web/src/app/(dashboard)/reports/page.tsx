'use client';

import { useState } from 'react';
import { Tabs } from '@/components/ui/tabs';
import {
  useCogsReport,
  useGuestInsightsReport,
  useInventoryInsightsReport,
  useOccupancyInsightsReport,
  useReportsOverview,
  useRevenueReport,
  useStaffInsightsReport,
} from '@/hooks/finance/useReports';
import { ExpensesTab } from './_components/ExpensesTab';
import { GuestsTab } from './_components/GuestsTab';
import { InventoryTab } from './_components/InventoryTab';
import { OccupancyTab } from './_components/OccupancyTab';
import { OverviewTab } from './_components/OverviewTab';
import { ReportsHeader } from './_components/ReportsHeader';
import { ReportsTabsNav } from './_components/ReportsTabsNav';
import { RevenueTab } from './_components/RevenueTab';
import { StaffTab } from './_components/StaffTab';
import { ReportsExportProvider, type Tab } from './_components/reports-shared';
import { resolveReportRange } from '../../../utils/report-utils';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [dateRange, setDateRange] = useState('Last 6 Months');

  const reportRange = resolveReportRange(dateRange);

  const overviewReport = useReportsOverview(reportRange, { enabled: activeTab === 'overview' });
  const revenueReport = useRevenueReport(reportRange, {
    enabled: activeTab === 'revenue' || activeTab === 'expenses',
  });
  const cogsReport = useCogsReport(reportRange, { enabled: activeTab === 'expenses' });
  const guestsReport = useGuestInsightsReport(reportRange, { enabled: activeTab === 'guests' });
  const staffReport = useStaffInsightsReport(reportRange, { enabled: activeTab === 'staff' });
  const inventoryReport = useInventoryInsightsReport(reportRange, {
    enabled: activeTab === 'inventory',
  });
  const occupancyReport = useOccupancyInsightsReport(reportRange, {
    enabled: activeTab === 'overview' || activeTab === 'occupancy',
  });

  const overview = overviewReport.data;
  const guests = guestsReport.data;
  const staff = staffReport.data;
  const inventory = inventoryReport.data;
  const occupancy = occupancyReport.data;

  const revenueTotal = revenueReport.data?.summary.invoiceTotal ?? overview?.summary.revenueTotal ?? 0;

  return (
    <ReportsExportProvider range={reportRange}>
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as Tab)}
        className="space-y-6 flex-col"
      >
      <ReportsHeader activeTab={activeTab} dateRange={dateRange} onDateRangeChange={setDateRange} />
      <ReportsTabsNav />

      <OverviewTab
        revenueTotal={overview?.summary.revenueTotal ?? 0}
        revenueIsFetching={overviewReport.isFetching}
        dateRange={dateRange}
        occupancyRate={overview?.summary.occupancyRate ?? 0}
        occupancySubtext={
          overview
            ? `${overview.summary.occupiedRooms} of ${overview.summary.totalRooms} rooms occupied`
            : '+10% vs Feb'
        }
        adrValue={overview?.summary.adr ?? 0}
        outstandingFolios={overview?.summary.outstandingFolios ?? 0}
        outstandingCount={overview?.summary.outstandingCount ?? 0}
        revenueData={overview?.revenueChart ?? []}
        occupancyData={occupancy?.occupancyData ?? []}
        guestSourceData={overview?.guestSourceData ?? []}
        roomTypeRevenue={occupancy?.roomTypeRevenue ?? []}
      />

      <RevenueTab
        roomRevenue={revenueReport.data?.summary.byStream.rooms ?? 0}
        fnbRevenue={revenueReport.data?.summary.byStream.fnb ?? 0}
        eventRevenue={revenueReport.data?.summary.byStream.events ?? 0}
        revenueTotal={revenueTotal}
        outstanding={revenueReport.data?.summary.outstanding ?? 0}
        revenueData={revenueReport.data?.streamDaily ?? []}
      />

      <OccupancyTab
        occupancyRate={occupancy?.summary.occupancyRate ?? 0}
        occupiedRoomsText={
          occupancy ? `${occupancy.summary.occupiedRooms} occupied rooms` : '6-month average'
        }
        checkedIn={occupancy?.summary.checkedIn ?? 0}
        adr={occupancy?.summary.adr ?? 0}
        revPar={occupancy?.summary.revPar ?? 0}
        occupancyData={occupancy?.occupancyData ?? []}
        roomTypeRevenue={occupancy?.roomTypeRevenue ?? []}
      />

      <ExpensesTab
        cogsTotal={cogsReport.data?.summary.totalCost ?? 0}
        totalQuantity={cogsReport.data?.summary.totalQuantity ?? 0}
        costRatio={cogsReport.data?.summary.costRatio ?? 0}
        grossProfit={cogsReport.data?.summary.grossProfit ?? 0}
        expenseData={cogsReport.data?.expenseRows ?? []}
        dateRange={dateRange}
      />

      <GuestsTab
        totalGuests={`${guests?.summary.totalGuests ?? 84}`}
        totalGuestsSub={
          guests ? `${guests.summary.inHouse} currently in house` : '+8% vs Feb'
        }
        vipGuests={`${guests?.summary.vipGuests ?? 6}`}
        vipGuestsSub={
          guests
            ? `${Math.round((guests.summary.vipGuests / Math.max(guests.summary.totalGuests, 1)) * 100)}% of total`
            : '7% of total'
        }
        repeatGuests={`${guests?.summary.repeatGuests ?? 22}`}
        repeatGuestsSub={
          guests
            ? `${Math.round((guests.summary.repeatGuests / Math.max(guests.summary.totalGuests, 1)) * 100)}% retention`
            : '26% retention'
        }
        avgStayNights={guests?.summary.avgStayNights ?? '3.4'}
        sourceData={guests?.sourceData ?? []}
        nationalityMix={guests?.nationalityMix ?? []}
        reservationStatusRows={guests?.reservationStatusRows ?? []}
        guestTrend={guests?.guestTrend ?? []}
        bookingSourceTrend={guests?.bookingSourceTrend ?? []}
      />

      <StaffTab
        totalStaff={`${staff?.summary.totalStaff ?? 21}`}
        attendanceRate={`${staff?.summary.attendanceRate ?? 0}%`}
        avgHoursWorked={`${staff?.summary.avgHoursWorked ?? '0.0'}h`}
        lateArrivals={`${staff?.summary.lateArrivals ?? 0}`}
        attendanceWeek={staff?.attendanceWeek ?? []}
        departmentRows={staff?.departmentRows ?? []}
      />

      <InventoryTab
        totalItems={`${inventory?.summary.totalItems ?? 142}`}
        lowStockCount={`${inventory?.summary.lowStockCount ?? 0}`}
        inventoryValue={inventory?.summary.inventoryValue ?? 8200}
        turnoverRate={`${inventory?.summary.turnoverRate ?? 0}`}
        inventoryAlertRows={inventory?.inventoryAlertRows ?? []}
      />
      </Tabs>
    </ReportsExportProvider>
  );
}
