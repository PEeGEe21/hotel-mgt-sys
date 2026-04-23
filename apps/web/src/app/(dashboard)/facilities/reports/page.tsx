'use client';

import { useEffect, useState } from 'react';
import { FileBarChart, Wrench, AlertTriangle, ClipboardList, Receipt, TrendingUp } from 'lucide-react';
import api from '@/lib/api';

export default function FacilityReportsPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [facilities, setFacilities] = useState<any[]>([]);
  const [summaryCards, setSummaryCards] = useState<any[]>([]);
  const [facilityHealth, setFacilityHealth] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [facilitiesRes, complaintsRes, inspectionsRes, maintenanceRes, requisitionsRes] = await Promise.all([
          api.get('/facilities', { params: { limit: 1000 } }),
          api.get('/facilities/complaints/list', { params: { limit: 1000, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined } }),
          api.get('/facilities/inspections/list', { params: { limit: 1000, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined } }),
          api.get('/facilities/maintenances/list', { params: { limit: 1000, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined } }),
          api.get('/facilities/requisitions/list', { params: { limit: 1000, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined } }),
        ]);

        const facilities = facilitiesRes.data?.facilities ?? [];
        const complaints = complaintsRes.data?.complaints ?? [];
        const inspections = inspectionsRes.data?.inspections ?? [];
        const maintenance = maintenanceRes.data?.maintenanceRequests ?? [];
        const requisitions = requisitionsRes.data?.requisitions ?? [];

        const activeFacilities = facilities.filter((f: any) => f.status === 'Active').length;
        const inactiveFacilities = facilities.filter((f: any) => f.status === 'Inactive').length;
        const maintenanceFacilities = facilities.filter((f: any) => f.status === 'Under Maintenance').length;

        const openComplaints = complaints.filter((c: any) => ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(c.status)).length;
        const resolvedComplaints = complaints.filter((c: any) => ['RESOLVED', 'CLOSED'].includes(c.status)).length;

        const submittedInspections = inspections.filter((i: any) => i.status === 'SUBMITTED').length;
        const scheduledInspections = inspections.filter((i: any) => i.status === 'SCHEDULED').length;

        const activeMaintenance = maintenance.filter((m: any) => !['RESOLVED', 'CLOSED'].includes(m.status)).length;
        const closedMaintenance = maintenance.filter((m: any) => ['RESOLVED', 'CLOSED'].includes(m.status)).length;

        const pendingRequisitions = requisitions.filter((r: any) => r.status === 'PENDING').length;
        const approvedRequisitions = requisitions.filter((r: any) => r.status === 'APPROVED').length;
        const fulfilledRequisitions = requisitions.filter((r: any) => r.status === 'FULFILLED').length;

        const maintenanceSpend = maintenance
          .filter((m: any) => ['RESOLVED', 'CLOSED'].includes(m.status))
          .reduce((sum: number, m: any) => sum + Number(m.totalCost ?? 0), 0);

        const healthRows = facilities.map((f: any) => {
          const compCount = complaints.filter((c: any) => c.facilityId === f.id).length;
          const inspList = inspections.filter((i: any) => i.facilityId === f.id);
          const maintCount = maintenance.filter((m: any) => m.facilityId === f.id).length;
          const avgScore = inspList.length ? Math.round(inspList.reduce((s: number, i: any) => s + Number(i.score ?? 0), 0) / inspList.length) : 0;
          const health = avgScore >= 80 ? 'Good' : avgScore >= 60 ? 'Fair' : (avgScore > 0 ? 'Poor' : (maintCount > 0 ? 'Maintenance' : 'Not Inspected'));
          return {
            name: f.name ?? f.id,
            complaints: compCount,
            inspections: inspList.length,
            maintenance: maintCount,
            score: avgScore,
            health,
          };
        });

        const cards = [
          { label: 'Total Facilities', value: `${facilities.length}`, sub: `${activeFacilities} Active · ${inactiveFacilities} Inactive · ${maintenanceFacilities} Maintenance`, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', icon: FileBarChart },
          { label: 'Complaints', value: `${complaints.length}`, sub: `${openComplaints} Open · ${resolvedComplaints} Resolved`, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', icon: AlertTriangle },
          { label: 'Inspections', value: `${inspections.length}`, sub: `${submittedInspections} Submitted · ${scheduledInspections} Scheduled`, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', icon: ClipboardList },
          { label: 'Maintenance Tasks', value: `${maintenance.length}`, sub: `${closedMaintenance} Closed · ${activeMaintenance} Active`, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: Wrench },
          { label: 'Requisitions', value: `${requisitions.length}`, sub: `${pendingRequisitions} Pending · ${approvedRequisitions} Approved · ${fulfilledRequisitions} Fulfilled`, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Receipt },
          { label: 'Maintenance Spend', value: `₦${Math.round(maintenanceSpend / 1000)}k`, sub: 'Resolved work', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20', icon: TrendingUp },
        ];

        if (active) {
          setFacilities(facilities);
          setSummaryCards(cards);
          setFacilityHealth(healthRows);
        }
      } catch (e: any) {
        if (active) setError(e?.message ?? 'Failed to load reports');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [dateFrom, dateTo]);

  const healthStyle: Record<string, string> = {
    Good: 'bg-emerald-500/15 text-emerald-400',
    Fair: 'bg-amber-500/15 text-amber-400',
    Poor: 'bg-red-500/15 text-red-400',
    Maintenance: 'bg-orange-500/15 text-orange-400',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Facility Reports</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Overview of facility health and activity{dateFrom || dateTo ? ` · ${dateFrom || 'Start'} to ${dateTo || 'Today'}` : ''}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-[#161b27] border border-[#1e2536] rounded-xl p-4">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Date Range</p>
          <p className="text-sm text-slate-300 mt-1">Filter all report cards and tables</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200" />
          <span className="text-slate-500 text-xs">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-200" />
          <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-lg">Applied</button>
          {loading && <span className="text-xs text-slate-600">Loading…</span>}
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {summaryCards.map(({ label, value, sub, color, bg, icon: Icon }) => (
          <div key={label} className={`${bg} border rounded-xl p-5`}>
            <div className="flex items-center gap-3 mb-3">
              <Icon size={16} className={color} />
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</span>
            </div>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-1.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1e2536]">
          <h2 className="text-sm font-semibold text-white">Facility Health Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">Inspection scores and activity summary per facility</p>
          <p className="text-[11px] text-amber-400 mt-2">Health score methodology: TBD (configurable weighting across inspections, complaint SLA, and open critical issues).</p>
        </div>
        <table className="w-full">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['Facility', 'Complaints', 'Inspections', 'Maintenance', 'Inspection Score', 'Health'].map(h => (
                <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facilityHealth.map(f => (
              <tr key={f.name} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-slate-200 whitespace-nowrap">{f.name}</td>
                <td className="px-4 py-3 text-sm text-slate-400 text-center">{f.complaints}</td>
                <td className="px-4 py-3 text-sm text-slate-400 text-center">{f.inspections}</td>
                <td className="px-4 py-3 text-sm text-slate-400 text-center">{f.maintenance}</td>
                <td className="px-4 py-3">
                  {f.score > 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#0f1117] rounded-full overflow-hidden max-w-[80px]">
                        <div className={`h-full rounded-full ${f.score >= 80 ? 'bg-emerald-500' : f.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${f.score}%` }} />
                      </div>
                      <span className={`text-sm font-bold ${f.score >= 80 ? 'text-emerald-400' : f.score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{f.score}%</span>
                    </div>
                  ) : <span className="text-xs text-slate-600">Not inspected</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${healthStyle[f.health]}`}>{f.health}</span>
                </td>
              </tr>
            ))}
            {facilityHealth.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-xs text-slate-500" colSpan={6}>No facility report data found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { title: 'By Type', key: 'type' },
          { title: 'By Location', key: 'location' },
          { title: 'By Department', key: 'department' },
        ].map(({ title, key }) => {
          const grouped = facilities.reduce((acc: Record<string, number>, f: any) => {
            const k = f[key]?.name ?? f[key] ?? 'Unassigned';
            acc[k] = (acc[k] || 0) + 1;
            return acc;
          }, {});
          const rows = Object.entries(grouped);
          return (
            <div key={title} className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1e2536]">
                <h2 className="text-sm font-semibold text-white">{title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Facility distribution</p>
              </div>
              <table className="w-full">
                <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                  <tr>
                    {['Group', 'Count'].map((h) => (
                      <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td className="px-4 py-4 text-xs text-slate-500" colSpan={2}>No data</td>
                    </tr>
                  )}
                  {rows.map(([group, count]) => (
                    <tr key={group} className="border-b border-[#1e2536] last:border-0">
                      <td className="px-4 py-3 text-sm text-slate-300">{group}</td>
                      <td className="px-4 py-3 text-sm text-slate-200 font-semibold">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
