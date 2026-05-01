'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Plus,
  Star,
  Phone,
  MapPin,
  BedDouble,
  Clock,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import Pagination from '@/components/ui/pagination';
import TableScroll from '@/components/ui/table-scroll';
import { useGuests} from '@/hooks/useGuests';
import { useDebounce } from '@/hooks/useDebounce';
import { addDays } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import AddGuestModal from './_components/AddGuestModal';

// ─── Constants ────────────────────────────────────────────────────────────────
const STAY_TYPES_FILTER = [
  { value: 'all', label: 'All Stay Types' },
  { value: 'full_time', label: 'Full Time' },
  { value: 'short_time', label: 'Short Time' },
];
type STAY_TYPES_FILTER = 'all' | 'full_time' | 'short_time';
type StatusFilter = 'all' | 'in_house' | 'reserved' | 'checked_out';
const STATUS_OPTS = [
  { value: 'all' as StatusFilter, label: 'All Guests' },
  { value: 'in_house' as StatusFilter, label: 'Checked In' },
  { value: 'reserved' as StatusFilter, label: 'Reserved' },
  { value: 'checked_out' as StatusFilter, label: 'Checked Out' },
];



// ─── Status from reservation ──────────────────────────────────────────────────
function guestStatusLabel(guest: any) {
  const r = guest.reservations?.[0];
  if (!r) return { label: 'No Stays', cls: 'bg-slate-500/10 text-slate-600' };
  if (r.status === 'CHECKED_IN')
    return { label: 'Checked In', cls: 'bg-emerald-500/15 text-emerald-400' };
  if (r.status === 'CONFIRMED' || r.status === 'PENDING')
    return { label: 'Reserved', cls: 'bg-blue-500/15    text-blue-400' };
  return { label: 'Checked Out', cls: 'bg-slate-500/15   text-slate-400' };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GuestsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [isVipOnly, setIsVipOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [stayType, setStayType] = useState<STAY_TYPES_FILTER>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 20),
    to: addDays(new Date(new Date().getFullYear(), 0, 20), 20),
  });

  const debouncedSearch = useDebounce(search, 400);
  const resetPage = () => setPage(1);

  const { data, isLoading, isFetching } = useGuests({
    search: debouncedSearch || undefined,
    status: status !== 'all' ? status : undefined,
    isVip: isVipOnly || undefined,
    page,
    limit,
    stayType: stayType !== 'all' ? stayType : undefined,
  });

  const guests = data?.guests ?? [];
  const stats = data?.stats;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Guests
              {isFetching && !isLoading && (
                <Loader2 size={14} className="animate-spin text-slate-500" />
              )}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {stats?.totalGuests ?? '—'} registered guests
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={15} /> New Guest
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: 'Total Guests',
              value: stats?.totalGuests,
              icon: Users,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10   border-blue-500/20',
            },
            {
              label: 'In House',
              value: stats?.inHouse,
              icon: BedDouble,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10 border-emerald-500/20',
            },
            {
              label: 'Reserved',
              value: stats?.reserved,
              icon: Clock,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10  border-amber-500/20',
            },
            {
              label: 'VIP Guests',
              value: stats?.vips,
              icon: Star,
              color: 'text-violet-400',
              bg: 'bg-violet-500/10 border-violet-500/20',
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className={`${bg} border rounded-xl px-4 py-4 flex items-center gap-3`}
            >
              <Icon size={18} className={color} />
              <div>
                <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              resetPage();
            }}
            className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 transition-colors"
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 flex-1 min-w-56">
            <Search size={14} className="text-slate-500 shrink-0" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder="Name, email, phone, ID…"
              className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1"
            />
          </div>
          <div className="flex gap-1">
            {STATUS_OPTS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setStatus(opt.value);
                  resetPage();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${status === opt.value ? 'bg-blue-600/20 border-blue-500/30 text-blue-400' : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setIsVipOnly((v) => !v);
              resetPage();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isVipOnly ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200'}`}
          >
            <Star size={11} className={isVipOnly ? 'fill-amber-400' : ''} /> VIP Only
          </button>
          {/* <select
            value={stayType}
            onChange={(e) => {
              setStayType(e.target.value as STAY_TYPES_FILTER);
              resetPage();
            }}
            className="bg-[#161b27] border border-[#1e2536] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none focus:border-blue-500 transition-colors"
          >
            {STAY_TYPES_FILTER.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select> */}
          {/*<Field className="mx-auto w-60">
          <Popover>
            <PopoverTrigger asChild>
              <button
                id="date-picker-range"
                className="flex items-center justify-start px-2.5 font-normal text-sm gap-2 py-2 bg-[#161b27] border-[#1e2536] text-slate-400 hover:text-slate-200"
              >
                <CalendarIcon size={11} />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(date.from, 'LLL dd, y')
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0 bg-[#161b27] border border-[#1e2536]"
              align="start"
            >
              <Calendar
                className="bg-[#161b27] border border-[#1e2536] text-white"
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </Field> */}
        </div>

        {/* Table */}
        <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 size={24} className="animate-spin text-slate-500" />
            </div>
          ) : guests.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={32} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No guests found</p>
            </div>
          ) : (
            <TableScroll>
            <table className="w-full">
              <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
                <tr>
                  {['#', 'Guest', 'Contact', 'Nationality', 'Status', 'Stays', 'Last Stay', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {guests.map((guest, index) => {
                  const { label, cls } = guestStatusLabel(guest);
                  const latest = guest.reservations?.[0];
                  return (
                    <tr
                      key={guest.id}
                      onClick={() => router.push(`/guests/${guest.id}`)}
                      className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-400">
                          {(page - 1) * (data?.meta.per_page ?? limit) + index + 1}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-violet-500/30 border border-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                            {guest.firstName[0]}
                            {guest.lastName[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-slate-200 capitalize">
                                {guest.firstName} {guest.lastName}
                              </p>
                              {guest.isVip && (
                                <Star size={11} className="text-amber-400 fill-amber-400" />
                              )}
                            </div>
                            {latest?.room && (
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <BedDouble size={10} /> Room {latest.room.number}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-400 flex items-center gap-1.5">
                          <Phone size={10} className="text-slate-600 shrink-0" />
                          {guest.phone}
                        </p>
                        {guest.email && (
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <MapPin size={10} className="text-slate-600 shrink-0" />
                            {guest.email}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-slate-400">{guest.nationality ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cls}`}>
                          {label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {guest._count?.reservations ?? 0}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {latest
                          ? new Date(latest.checkIn).toLocaleDateString('en-NG', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight size={16} className="text-slate-600" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </TableScroll>
          )}

          {data?.meta && guests.length > 0 && (
            <Pagination meta={data.meta} currentPage={page} handlePageChange={setPage} />
          )}
        </div>
      </div>
      <AddGuestModal isOpen={showAdd} onClose={() => setShowAdd(false)} />
    </>
  );
}
