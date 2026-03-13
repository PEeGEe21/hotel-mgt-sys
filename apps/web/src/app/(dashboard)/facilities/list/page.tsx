'use client';

import { useState } from 'react';
import {
  Building2, Plus, Search, Pencil, Trash2, X, Eye,
  MapPin, Layers, Users
} from 'lucide-react';

type FacilityStatus = 'Active' | 'Inactive' | 'Under Maintenance';
type Facility = {
  id: string; name: string; type: string; location: string;
  department: string; status: FacilityStatus; quantities: number;
  manager: string; description: string; inspections: number;
};
type FacilityType = { id: string; name: string; description: string; count: number; };
type FacilityLocation = { id: string; name: string; building: string; floor: string; count: number; };
type FacilityDepartment = { id: string; name: string; head: string; facilityCount: number; };

const initFacilities: Facility[] = [
  { id: 'f1', name: 'Main Entrance', type: 'Building', location: 'Block A - Ground Floor', department: 'Security', status: 'Active', quantities: 0, manager: 'Seun Lawal', description: 'Main entrance and reception area', inspections: 2 },
  { id: 'f2', name: 'Generator House', type: 'Utility', location: 'Rear Compound', department: 'Maintenance', status: 'Active', quantities: 0, manager: 'Yetunde Aina', description: '100kva backup generator', inspections: 1 },
  { id: 'f3', name: 'Swimming Pool', type: 'Recreation', location: 'Block B - Ground Floor', department: 'Housekeeping', status: 'Active', quantities: 1, manager: 'Emeka Obi', description: 'Outdoor heated swimming pool', inspections: 3 },
  { id: 'f4', name: 'Conference Hall A', type: 'Event', location: 'Block C - 1st Floor', department: 'Management', status: 'Active', quantities: 1, manager: 'Blessing Adeyemi', description: 'Main conference hall, capacity 120', inspections: 0 },
  { id: 'f5', name: 'Gym & Fitness', type: 'Recreation', location: 'Block B - 1st Floor', department: 'Housekeeping', status: 'Active', quantities: 4, manager: 'Emeka Obi', description: 'Fully equipped fitness centre', inspections: 1 },
  { id: 'f6', name: 'Kitchen', type: 'Utility', location: 'Block A - Ground Floor', department: 'Food & Beverage', status: 'Active', quantities: 0, manager: 'Tunde Bakare', description: 'Main hotel kitchen', inspections: 2 },
  { id: 'f7', name: 'Parking Lot', type: 'Building', location: 'Rear Compound', department: 'Security', status: 'Active', quantities: 0, manager: 'Seun Lawal', description: '40-space parking facility', inspections: 0 },
  { id: 'f8', name: 'Rooftop Bar', type: 'Recreation', location: 'Block A - Rooftop', department: 'Bar', status: 'Under Maintenance', quantities: 0, manager: 'Tunde Bakare', description: 'Rooftop bar and lounge area', inspections: 1 },
  { id: 'f9', name: 'Laundry Room', type: 'Utility', location: 'Block B - Ground Floor', department: 'Housekeeping', status: 'Active', quantities: 0, manager: 'Adaeze Okafor', description: 'Hotel laundry and dry cleaning', inspections: 0 },
  { id: 'f10', name: 'Spa & Wellness', type: 'Recreation', location: 'Block C - Ground Floor', department: 'Housekeeping', status: 'Inactive', quantities: 2, manager: '', description: 'Spa, sauna and wellness centre', inspections: 0 },
];

const initTypes: FacilityType[] = [
  { id: 't1', name: 'Building', description: 'Structural buildings and spaces', count: 3 },
  { id: 't2', name: 'Utility', description: 'Essential utilities and services', count: 3 },
  { id: 't3', name: 'Recreation', description: 'Leisure and recreational facilities', count: 4 },
  { id: 't4', name: 'Event', description: 'Event and conference spaces', count: 1 },
];

const initLocations: FacilityLocation[] = [
  { id: 'l1', name: 'Block A - Ground Floor', building: 'Block A', floor: 'Ground', count: 3 },
  { id: 'l2', name: 'Block A - Rooftop', building: 'Block A', floor: 'Rooftop', count: 1 },
  { id: 'l3', name: 'Block B - Ground Floor', building: 'Block B', floor: 'Ground', count: 2 },
  { id: 'l4', name: 'Block B - 1st Floor', building: 'Block B', floor: '1st', count: 1 },
  { id: 'l5', name: 'Block C - Ground Floor', building: 'Block C', floor: 'Ground', count: 1 },
  { id: 'l6', name: 'Block C - 1st Floor', building: 'Block C', floor: '1st', count: 1 },
  { id: 'l7', name: 'Rear Compound', building: 'External', floor: 'Ground', count: 2 },
];

const initDepartments: FacilityDepartment[] = [
  { id: 'dep1', name: 'Security', head: 'Seun Lawal', facilityCount: 2 },
  { id: 'dep2', name: 'Maintenance', head: 'Yetunde Aina', facilityCount: 1 },
  { id: 'dep3', name: 'Housekeeping', head: 'Emeka Obi', facilityCount: 4 },
  { id: 'dep4', name: 'Management', head: 'Blessing Adeyemi', facilityCount: 1 },
  { id: 'dep5', name: 'Food & Beverage', head: 'Tunde Bakare', facilityCount: 1 },
  { id: 'dep6', name: 'Bar', head: 'Tunde Bakare', facilityCount: 1 },
];

const statusStyle: Record<FacilityStatus, string> = {
  'Active': 'bg-emerald-500/15 text-emerald-400',
  'Inactive': 'bg-slate-500/15 text-slate-400',
  'Under Maintenance': 'bg-amber-500/15 text-amber-400',
};

function SimpleModal({ title, fields, onClose }: {
  title: string;
  fields: { label: string; placeholder: string; col?: number; type?: string; options?: string[] }[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b27] border border-[#1e2536] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {fields.map(({ label, placeholder, col, type, options }) => (
            <div key={label} className={col === 2 ? 'col-span-2' : ''}>
              <label className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 block">{label}</label>
              {options ? (
                <select className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500 transition-colors">
                  <option value="">Select {label}</option>
                  {options.map(o => <option key={o}>{o}</option>)}
                </select>
              ) : (
                <input type={type ?? 'text'} placeholder={placeholder}
                  className="w-full bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-blue-500 transition-colors" />
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors">Cancel</button>
          <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Facility List ───────────────────────────────────────────────────────
function FacilityListTab({ facilities, types, locations, departments }: {
  facilities: Facility[]; types: FacilityType[]; locations: FacilityLocation[]; departments: FacilityDepartment[];
}) {
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const filtered = facilities.filter(f =>
    `${f.name} ${f.type} ${f.department}`.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-[#0f1117] border border-[#1e2536] rounded-lg px-3 py-2 w-72">
          <Search size={14} className="text-slate-500 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search facilities..."
            className="bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none flex-1" />
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={15} /> Add Facility
        </button>
      </div>
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['#', 'Facility Name', 'Type', 'Qty', 'Assigned Locations', 'Status', 'Inspections', 'Manager', 'Description', ''].map(h => (
                <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((f, i) => (
              <tr key={f.id} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-sm text-slate-500">{i + 1}</td>
                <td className="px-4 py-3 text-sm font-medium text-blue-400 hover:text-blue-300 cursor-pointer whitespace-nowrap">{f.name}</td>
                <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">{f.type}</td>
                <td className="px-4 py-3 text-sm text-slate-400 text-center">{f.quantities}</td>
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-400 flex items-center gap-1 whitespace-nowrap">
                    <Eye size={11} className="text-slate-600" /> {f.quantities}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${statusStyle[f.status]}`}>{f.status}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-400 flex items-center gap-1 whitespace-nowrap">
                    <Eye size={11} className="text-slate-600" /> {f.inspections}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{f.manager || '—'}</td>
                <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">{f.description}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 whitespace-nowrap">
                    <button className="text-xs bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 px-2 py-1 rounded-lg transition-colors font-medium">Details</button>
                    <button className="text-xs bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 px-2 py-1 rounded-lg transition-colors font-medium">Edit</button>
                    <button className="text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 px-2 py-1 rounded-lg transition-colors font-medium">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAdd && (
        <SimpleModal title="Add Facility" onClose={() => setShowAdd(false)} fields={[
          { label: 'Facility Name', placeholder: 'e.g. Conference Hall B', col: 2 },
          { label: 'Facility Type', placeholder: '', options: types.map(t => t.name) },
          { label: 'Location', placeholder: '', options: locations.map(l => l.name) },
          { label: 'Department', placeholder: '', options: departments.map(d => d.name) },
          { label: 'Manager', placeholder: 'Manager name' },
          { label: 'Status', placeholder: '', options: ['Active', 'Inactive', 'Under Maintenance'] },
          { label: 'Description', placeholder: 'Brief description', col: 2 },
        ]} />
      )}
    </div>
  );
}

// ─── Tab: Types ───────────────────────────────────────────────────────────────
function FacilityTypesTab({ types }: { types: FacilityType[] }) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={15} /> Add Type
        </button>
      </div>
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['#', 'Type Name', 'Description', 'Facilities', ''].map(h => (
                <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {types.map((t, i) => (
              <tr key={t.id} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-sm text-slate-500">{i + 1}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-200">{t.name}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{t.description}</td>
                <td className="px-4 py-3 text-sm font-bold text-white">{t.count}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"><Pencil size={13} /></button>
                    <button className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAdd && <SimpleModal title="Add Facility Type" onClose={() => setShowAdd(false)}
        fields={[{ label: 'Type Name', placeholder: 'e.g. Utility', col: 2 }, { label: 'Description', placeholder: 'Brief description', col: 2 }]} />}
    </div>
  );
}

// ─── Tab: Locations ───────────────────────────────────────────────────────────
function FacilityLocationsTab({ locations }: { locations: FacilityLocation[] }) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={15} /> Add Location
        </button>
      </div>
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['#', 'Location Name', 'Building', 'Floor', 'Facilities', ''].map(h => (
                <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {locations.map((l, i) => (
              <tr key={l.id} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-sm text-slate-500">{i + 1}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-200 flex items-center gap-1.5"><MapPin size={12} className="text-slate-500 shrink-0" />{l.name}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{l.building}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{l.floor}</td>
                <td className="px-4 py-3 text-sm font-bold text-white">{l.count}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"><Pencil size={13} /></button>
                    <button className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAdd && <SimpleModal title="Add Location" onClose={() => setShowAdd(false)}
        fields={[
          { label: 'Location Name', placeholder: 'e.g. Block D - 2nd Floor', col: 2 },
          { label: 'Building', placeholder: 'e.g. Block D' },
          { label: 'Floor', placeholder: 'e.g. 2nd Floor' },
        ]} />}
    </div>
  );
}

// ─── Tab: Departments ─────────────────────────────────────────────────────────
function FacilityDepartmentsTab({ departments }: { departments: FacilityDepartment[] }) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus size={15} /> Add Department
        </button>
      </div>
      <div className="bg-[#161b27] border border-[#1e2536] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[#1e2536] bg-[#0f1117]/50">
            <tr>
              {['#', 'Department Name', 'Department Head', 'Facilities Managed', ''].map(h => (
                <th key={h} className="text-xs text-slate-500 uppercase tracking-wider font-medium px-4 py-3 text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {departments.map((d, i) => (
              <tr key={d.id} className="border-b border-[#1e2536] last:border-0 hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-sm text-slate-500">{i + 1}</td>
                <td className="px-4 py-3 text-sm font-medium text-slate-200 flex items-center gap-2"><Users size={13} className="text-slate-500 shrink-0" />{d.name}</td>
                <td className="px-4 py-3 text-sm text-slate-400">{d.head}</td>
                <td className="px-4 py-3 text-sm font-bold text-white">{d.facilityCount}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"><Pencil size={13} /></button>
                    <button className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAdd && <SimpleModal title="Add Facility Department" onClose={() => setShowAdd(false)}
        fields={[{ label: 'Department Name', placeholder: 'e.g. IT', col: 2 }, { label: 'Department Head', placeholder: 'Staff name', col: 2 }]} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type Tab = 'list' | 'types' | 'locations' | 'departments';

export default function FacilitiesPage() {
  const [tab, setTab] = useState<Tab>('list');
  const facilities = initFacilities;
  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'list',        label: 'Facility List',        icon: Building2 },
    { key: 'types',       label: 'Facility Types',       icon: Layers },
    { key: 'locations',   label: 'Facility Locations',   icon: MapPin },
    { key: 'departments', label: 'Facility Departments', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Facility Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage hotel facilities, types, locations and departments</p>
        </div>
        <div className="flex items-center gap-2 text-sm flex-wrap">
          <span className="bg-blue-500/15 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-lg font-semibold">{facilities.length} Total</span>
          <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-lg font-semibold">{facilities.filter(f => f.status === 'Active').length} Active</span>
          <span className="bg-amber-500/15 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg font-semibold">{facilities.filter(f => f.status === 'Under Maintenance').length} Maintenance</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 bg-[#161b27] border border-[#1e2536] rounded-xl p-1 w-fit flex-wrap">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === key ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200'
            }`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'list'        && <FacilityListTab facilities={facilities} types={initTypes} locations={initLocations} departments={initDepartments} />}
      {tab === 'types'       && <FacilityTypesTab types={initTypes} />}
      {tab === 'locations'   && <FacilityLocationsTab locations={initLocations} />}
      {tab === 'departments' && <FacilityDepartmentsTab departments={initDepartments} />}
    </div>
  );
}