'use client';
import { BedDouble, Users, DollarSign, TrendingUp, Clock, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const stats = [
  { label: 'Occupancy Rate', value: '78%', change: '+4.2%', icon: BedDouble, color: 'blue' },
  { label: 'Total Guests', value: '142', change: '+12', icon: Users, color: 'violet' },
  { label: "Today's Revenue", value: '$8,420', change: '+18.3%', icon: DollarSign, color: 'emerald' },
  { label: 'RevPAR', value: '$124', change: '+6.1%', icon: TrendingUp, color: 'amber' },
];

const revenueData = [
  { day: 'Mon', revenue: 6200, bookings: 18 },
  { day: 'Tue', revenue: 7100, bookings: 22 },
  { day: 'Wed', revenue: 5800, bookings: 15 },
  { day: 'Thu', revenue: 8400, bookings: 27 },
  { day: 'Fri', revenue: 9200, bookings: 31 },
  { day: 'Sat', revenue: 11500, bookings: 38 },
  { day: 'Sun', revenue: 8420, bookings: 25 },
];

const recentBookings = [
  { guest: 'James Okafor', room: '304', type: 'Suite', checkIn: 'Today', status: 'Checked In' },
  { guest: 'Amara Diallo', room: '112', type: 'Deluxe', checkIn: 'Today', status: 'Pending' },
  { guest: 'Chen Wei', room: '215', type: 'Standard', checkIn: 'Tomorrow', status: 'Confirmed' },
  { guest: 'Sofia Martins', room: '401', type: 'Presidential', checkIn: 'Today', status: 'Checked In' },
];

const housekeepingTasks = [
  { room: '101', type: 'Cleaning', priority: 'High', status: 'In Progress' },
  { room: '203', type: 'Turndown', priority: 'Normal', status: 'Pending' },
  { room: '315', type: 'Maintenance', priority: 'Urgent', status: 'Pending' },
  { room: '402', type: 'Inspection', priority: 'Normal', status: 'Done' },
];

const colorMap: any = {
  blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400',
  violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/20 text-violet-400',
  emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/20 text-emerald-400',
  amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/20 text-amber-400',
};

const statusColors: any = {
  'Checked In': 'bg-emerald-500/15 text-emerald-400',
  'Pending': 'bg-amber-500/15 text-amber-400',
  'Confirmed': 'bg-blue-500/15 text-blue-400',
  'In Progress': 'bg-blue-500/15 text-blue-400',
  'Done': 'bg-emerald-500/15 text-emerald-400',
  'Urgent': 'bg-red-500/15 text-red-400',
  'High': 'bg-orange-500/15 text-orange-400',
  'Normal': 'bg-slate-500/15 text-slate-400',
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Good morning 👋</h1>
          <p className="text-slate-500 text-sm mt-0.5">Here's what's happening at your hotel today.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400 bg-[#161b27] border border-[#1e2536] px-4 py-2 rounded-lg">
          <Clock size={14} />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, change, icon: Icon, color }) => (
          <div key={label} className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl p-5`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">{label}</p>
                <p className="text-3xl font-bold text-white mt-1.5">{value}</p>
                <p className="text-xs text-emerald-400 mt-1">{change} from yesterday</p>
              </div>
              <Icon size={20} className="opacity-60" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Revenue This Week</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" />
              <XAxis dataKey="day" stroke="#475569" tick={{ fontSize: 12 }} />
              <YAxis stroke="#475569" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#161b27', border: '1px solid #1e2536', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#rev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Daily Bookings</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2536" />
              <XAxis dataKey="day" stroke="#475569" tick={{ fontSize: 12 }} />
              <YAxis stroke="#475569" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#161b27', border: '1px solid #1e2536', borderRadius: 8 }}
              />
              <Bar dataKey="bookings" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Bookings */}
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Recent Bookings</h2>
            <a href="/reservations" className="text-xs text-blue-400 hover:text-blue-300">View all →</a>
          </div>
          <div className="space-y-3">
            {recentBookings.map((b, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#1e2536] last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs text-white font-bold">
                    {b.guest[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{b.guest}</p>
                    <p className="text-xs text-slate-500">Room {b.room} · {b.type} · {b.checkIn}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[b.status]}`}>{b.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Housekeeping */}
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Sparkles size={14} /> Housekeeping</h2>
            <a href="/housekeeping" className="text-xs text-blue-400 hover:text-blue-300">View all →</a>
          </div>
          <div className="space-y-3">
            {housekeepingTasks.map((t, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#1e2536] last:border-0">
                <div className="flex items-center gap-3">
                  {t.status === 'Done' ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertCircle size={16} className="text-amber-400" />}
                  <div>
                    <p className="text-sm font-medium text-slate-200">Room {t.room} · {t.type}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[t.priority]}`}>{t.priority}</span>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[t.status]}`}>{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
