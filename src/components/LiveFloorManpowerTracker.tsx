import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  UserPlus,
  Shield,
  Wrench,
  Package,
  Scissors,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Phone,
  MessageSquare,
  Plus,
  X,
  Edit2,
  Trash2,
  Sparkles
} from 'lucide-react';
import { FactoryState, FloorWorker, WorkforceRole } from '../types';
import { DEFAULT_FLOOR_WORKERS } from '../lib/constants';

interface LiveFloorManpowerTrackerProps {
  state: FactoryState;
  onSaveState: (newState: FactoryState) => void;
  compact?: boolean;
}

export const LiveFloorManpowerTracker: React.FC<LiveFloorManpowerTrackerProps> = ({
  state,
  onSaveState,
  compact = false
}) => {
  const workers: FloorWorker[] = state.floorWorkers && state.floorWorkers.length > 0
    ? state.floorWorkers
    : DEFAULT_FLOOR_WORKERS;

  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Helper Assignment Quick Modal State
  const [editingStation, setEditingStation] = useState<{
    machine: string;
    operator: string;
    dept: string;
    currentHelpers: string[];
  } | null>(null);
  const [stationHelperInput, setStationHelperInput] = useState('');

  // Add Worker Modal State
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState<WorkforceRole>('HELPER');
  const [newWorkerDept, setNewWorkerDept] = useState('Cutting');
  const [newWorkerShift, setNewWorkerShift] = useState<'DAY' | 'NIGHT'>('DAY');
  const [newWorkerMachine, setNewWorkerMachine] = useState('Cutting-1');
  const [newWorkerPairedOp, setNewWorkerPairedOp] = useState('CUT_OP1');

  // Real-time calculation from workers list
  const presentWorkers = workers.filter((w) => w.isPresent);
  const totalFloorCount = presentWorkers.length;
  const operatorCount = presentWorkers.filter((w) => w.role === 'OPERATOR').length;
  const helperCount = presentWorkers.filter((w) => w.role === 'HELPER').length;
  const supervisorCount = presentWorkers.filter((w) => w.role === 'SUPERVISOR').length;
  const maintenanceCount = presentWorkers.filter((w) => w.role === 'MAINTENANCE').length;
  const qcCount = presentWorkers.filter((w) => w.role === 'QC_INSPECTOR').length;

  // Real-time Station Manpower Map (combining running batches and registered workers)
  const stationMap: Record<
    string,
    {
      machine: string;
      dept: string;
      operator: string;
      helpers: string[];
      jobId?: string;
      product?: string;
      status: string;
      shift: string;
    }
  > = {};

  // Initialize with known stations from running batches
  (state.jobs || []).forEach((job) => {
    (job.runningBatches || []).forEach((b) => {
      if (b.status === 'Running' || b.status === 'Held') {
        const machine = b.machine;
        const op = b.worker || 'OPERATOR';
        const batchHelpers = b.helpers || [];
        // Also look up helpers registered in floorWorkers paired with this op or machine
        const registeredHelpers = workers
          .filter(
            (w) =>
              w.role === 'HELPER' &&
              w.isPresent &&
              (w.assignedMachine === machine || w.pairedWithOperator === op)
          )
          .map((w) => w.name);

        const allHelpers = Array.from(new Set([...batchHelpers, ...registeredHelpers]));

        stationMap[machine] = {
          machine,
          dept: b.stage,
          operator: op,
          helpers: allHelpers,
          jobId: job.id,
          product: job.product,
          status: b.status,
          shift: b.shift || 'DAY'
        };
      }
    });
  });

  // Also scan registered workers who are assigned to machines not yet in stationMap
  workers.forEach((w) => {
    if (w.isPresent && w.assignedMachine && !stationMap[w.assignedMachine] && w.role === 'OPERATOR') {
      const assignedHelpers = workers
        .filter(
          (h) =>
            h.role === 'HELPER' &&
            h.isPresent &&
            (h.assignedMachine === w.assignedMachine || h.pairedWithOperator === w.name)
        )
        .map((h) => h.name);

      stationMap[w.assignedMachine] = {
        machine: w.assignedMachine,
        dept: w.department,
        operator: w.name,
        helpers: assignedHelpers,
        status: 'Active',
        shift: w.shift
      };
    }
  });

  // Ensure default presence of key machines like Cutting-1 with its 2 helpers if empty
  if (!stationMap['Cutting-1']) {
    const cut1Helpers = workers
      .filter((w) => w.role === 'HELPER' && w.isPresent && (w.assignedMachine === 'Cutting-1' || w.pairedWithOperator === 'CUT_OP1'))
      .map((w) => w.name);
    stationMap['Cutting-1'] = {
      machine: 'Cutting-1',
      dept: 'Cutting',
      operator: 'CUT_OP1',
      helpers: cut1Helpers.length > 0 ? cut1Helpers : ['SUNIL_HELPER', 'DINESH_HELPER'],
      status: 'Active',
      shift: 'DAY'
    };
  }

  const handleToggleAttendance = (workerId: string) => {
    const updated = workers.map((w) => (w.id === workerId ? { ...w, isPresent: !w.isPresent } : w));
    onSaveState({
      ...state,
      floorWorkers: updated
    });
  };

  const handleSaveStationHelpers = () => {
    if (!editingStation) return;
    const { machine, operator, currentHelpers } = editingStation;

    // Update floorWorkers: unpair existing helpers for this machine, then assign new helpers
    const updatedWorkers = workers.map((w) => {
      if (currentHelpers.includes(w.name)) {
        return {
          ...w,
          assignedMachine: machine,
          pairedWithOperator: operator,
          isPresent: true
        };
      }
      return w;
    });

    // Also update any running batch on this machine in state.jobs
    const updatedJobs = (state.jobs || []).map((j) => ({
      ...j,
      runningBatches: (j.runningBatches || []).map((b) => {
        if (b.machine === machine && (b.status === 'Running' || b.status === 'Held')) {
          return {
            ...b,
            helpers: currentHelpers,
            helperCount: currentHelpers.length
          };
        }
        return b;
      })
    }));

    onSaveState({
      ...state,
      floorWorkers: updatedWorkers,
      jobs: updatedJobs
    });

    setEditingStation(null);
  };

  const handleCreateWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim()) return;

    const newW: FloorWorker = {
      id: `FW-${Date.now()}`,
      name: newWorkerName.trim().toUpperCase(),
      role: newWorkerRole,
      department: newWorkerDept,
      shift: newWorkerShift,
      assignedMachine: newWorkerMachine || undefined,
      pairedWithOperator: newWorkerRole === 'HELPER' ? newWorkerPairedOp : undefined,
      isPresent: true,
      inTime: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    };

    onSaveState({
      ...state,
      floorWorkers: [newW, ...workers]
    });

    setNewWorkerName('');
    setIsAddWorkerOpen(false);
  };

  const generateWhatsAppAudit = () => {
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = new Date().toISOString().split('T')[0];
    let msg = `🏭 *SUNRISE PAPER PRODUCTS - LIVE FLOOR MANPOWER AUDIT*\n`;
    msg += `📅 Date: ${dateStr} | ⏰ Time: ${timeStr}\n`;
    msg += `-------------------------------------------\n`;
    msg += `👥 *TOTAL FLOOR WORKFORCE: ${totalFloorCount} MEN*\n`;
    msg += `👨‍🔧 Operators: ${operatorCount}\n`;
    msg += `🤝 Helpers: ${helperCount}\n`;
    msg += `🔬 QC Inspectors: ${qcCount}\n`;
    msg += `👔 Supervisors: ${supervisorCount}\n`;
    msg += `🔧 Maintenance Engineers: ${maintenanceCount}\n`;
    msg += `-------------------------------------------\n`;
    msg += `📍 *STATION ALLOCATION & OPERATOR-HELPER PAIRING:*\n`;

    Object.values(stationMap).forEach((st) => {
      msg += `• *${st.machine}* [${st.dept}]:\n`;
      msg += `  👨‍🔧 Operator: ${st.operator}\n`;
      msg += `  🤝 Helpers (${st.helpers.length}): ${st.helpers.length > 0 ? st.helpers.join(', ') : 'None'}\n`;
      if (st.jobId) msg += `  📦 Job: ${st.jobId} (${st.product || 'Standard'})\n`;
    });

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  // Filtered workers list
  const filteredWorkers = workers.filter((w) => {
    if (selectedDeptFilter !== 'ALL' && w.department !== selectedDeptFilter) return false;
    if (selectedRoleFilter !== 'ALL' && w.role !== selectedRoleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = w.name.toLowerCase().includes(q);
      const matchMachine = (w.assignedMachine || '').toLowerCase().includes(q);
      const matchOp = (w.pairedWithOperator || '').toLowerCase().includes(q);
      if (!matchName && !matchMachine && !matchOp) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* 1. Header Banner & KPI Summary Cards */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4 sm:p-5 rounded-2xl shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-indigo-900/60">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-indigo-300">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-wide m-0">
                  लाईव प्लांट मैनपावर व हेल्पर ट्रैकर (Live Floor Workforce Tracker)
                </h3>
                <span className="text-[10px] font-extrabold bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                  ● LIVE AUDIT
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5 m-0">
                वर्तमान में फ्लोर पर कुल कार्यरत ऑपरेटर्स, प्रत्येक ऑपरेटर के साथ नियुक्त हेल्पर, सुपरवाइजर व मेंटेनेंस टीम
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsAddWorkerOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ नया वर्कर / हेल्पर जोड़ें</span>
            </button>
            <button
              onClick={generateWhatsAppAudit}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="WhatsApp Floor Manpower Report"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp रिपोर्ट</span>
            </button>
          </div>
        </div>

        {/* 5 Distinct Live Counter Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-4 text-slate-800">
          {/* Total Floor Men */}
          <div className="col-span-2 sm:col-span-2 bg-white rounded-xl p-3 shadow-md border-2 border-indigo-400 flex items-center gap-3">
            <div className="p-3 bg-indigo-100 text-indigo-800 rounded-xl font-black">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 block">
                कुल कार्यरत व्यक्ति (Total On Floor)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-indigo-950 font-mono">{totalFloorCount}</span>
                <span className="text-xs font-bold text-emerald-700">वर्कर एक्टिव</span>
              </div>
            </div>
          </div>

          {/* Operators */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">ऑपरेटर्स (Operators)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-blue-900 font-mono">{operatorCount}</span>
              <span className="text-[11px] text-slate-400 font-bold">मशीन पर</span>
            </div>
          </div>

          {/* Helpers */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-amber-200 bg-amber-50/40">
            <span className="text-[10px] uppercase font-bold text-amber-900 block">हेल्पर (Helpers)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-amber-950 font-mono">{helperCount}</span>
              <span className="text-[11px] text-amber-700 font-bold">पेयर्ड</span>
            </div>
          </div>

          {/* QC Inspectors */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-purple-200">
            <span className="text-[10px] uppercase font-bold text-purple-900 block">क्यूसी (QC Team)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-purple-950 font-mono">{qcCount}</span>
              <span className="text-[11px] text-purple-700 font-bold">इंस्पेक्टर</span>
            </div>
          </div>

          {/* Supervisors & Maintenance */}
          <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">सुपरवाइजर + मेंटेनेंस</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-black text-slate-900 font-mono">{supervisorCount + maintenanceCount}</span>
              <span className="text-[10px] text-slate-500 font-medium">({supervisorCount} Sup / {maintenanceCount} Mnt)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Station Allocation Grid - Showing Operator + Helper attribution */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide m-0 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-blue-600" />
              <span>स्टेशनवार ऑपरेटर एवं नियुक्त हेल्पर सूची (Station-wise Operator & Helpers Allocation)</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 m-0">
              प्रत्येक मशीन पर मुख्य ऑपरेटर और उसके साथ कार्य कर रहे हेल्परों की सटीक संख्या व नाम
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {Object.keys(stationMap).length} सक्रिय वर्कस्टेशन
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.values(stationMap).map((st) => (
            <div
              key={st.machine}
              className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 hover:bg-slate-50 transition space-y-2.5"
            >
              {/* Station Header */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-black text-indigo-950 uppercase">{st.machine}</span>
                  <span className="text-[10px] font-bold text-slate-500 ml-2 bg-slate-200 px-1.5 py-0.5 rounded">
                    {st.dept}
                  </span>
                </div>
                <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase">
                  {st.shift} SHIFT
                </span>
              </div>

              {/* Operator */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-[11px] flex items-center justify-center">
                    OP
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">मुख्य ऑपरेटर:</span>
                    <span className="font-extrabold text-slate-900">{st.operator}</span>
                  </div>
                </div>
                {st.jobId && (
                  <span className="text-[11px] font-mono font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                    Job: {st.jobId}
                  </span>
                )}
              </div>

              {/* Helpers Box - Exact format requested by user: e.g. "2 Helpers" + list of names */}
              <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-lg text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-amber-950 flex items-center gap-1 uppercase">
                    🤝 <span>नियुक्त हेल्पर ({st.helpers.length} Helpers):</span>
                  </span>
                  <button
                    onClick={() =>
                      setEditingStation({
                        machine: st.machine,
                        operator: st.operator,
                        dept: st.dept,
                        currentHelpers: [...st.helpers]
                      })
                    }
                    className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    बदलें
                  </button>
                </div>

                <div className="flex flex-wrap gap-1">
                  {st.helpers.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">कोई हेल्पर नहीं (अकेला ऑपरेटर)</span>
                  ) : (
                    st.helpers.map((hName, idx) => (
                      <span
                        key={idx}
                        className="bg-white border border-amber-300 text-amber-950 font-bold text-[11px] px-2 py-0.5 rounded-md shadow-2xs"
                      >
                        Helper {idx + 1}: {hName}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Detailed Attendance & Personnel Roster Table */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide m-0 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>फ्लोर मैनपावर हाजिरी व मास्टर रोस्टर (Workforce Attendance & Roster)</span>
            </h4>
            <span className="text-xs text-slate-500">
              उपस्थिति बदलने के लिए टॉगल बटन दबाएँ (Click present badge to toggle attendance)
            </span>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="खोजें (नाम, मशीन, ऑपरेटर)..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 outline-none w-48 focus:border-indigo-500"
              />
            </div>

            {/* Department Filter */}
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">सभी विभाग (All Depts)</option>
              <option value="Cutting">Cutting</option>
              <option value="Slitting">Slitting</option>
              <option value="Forming">Forming</option>
              <option value="QC">QC</option>
              <option value="Packing">Packing</option>
              <option value="Maintenance">Maintenance</option>
            </select>

            {/* Role Filter */}
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 outline-none"
            >
              <option value="ALL">सभी पद (All Roles)</option>
              <option value="OPERATOR">ऑपरेटर्स (Operators)</option>
              <option value="HELPER">हेल्पर (Helpers)</option>
              <option value="SUPERVISOR">सुपरवाइजर (Supervisors)</option>
              <option value="QC_INSPECTOR">क्यूसी (QC Inspectors)</option>
              <option value="MAINTENANCE">मेंटेनेंस (Maintenance)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/80 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3">कर्मचारी नाम (Worker Name)</th>
                <th className="p-3">पद (Role)</th>
                <th className="p-3">विभाग (Department)</th>
                <th className="p-3">आवंटित स्टेशन / ऑपरेटर (Station / Paired Op)</th>
                <th className="p-3">शिफ्ट (Shift)</th>
                <th className="p-3">आने का समय (In-Time)</th>
                <th className="p-3 text-right">उपस्थिति स्थिति (Status)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWorkers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 font-medium">
                    कोई कर्मचारी नहीं मिला (No workers matched the filter)
                  </td>
                </tr>
              ) : (
                filteredWorkers.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-black text-slate-900 flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-full text-white font-black text-xs flex items-center justify-center shrink-0 ${
                          w.role === 'OPERATOR'
                            ? 'bg-blue-600'
                            : w.role === 'HELPER'
                            ? 'bg-amber-500'
                            : w.role === 'SUPERVISOR'
                            ? 'bg-slate-800'
                            : w.role === 'QC_INSPECTOR'
                            ? 'bg-purple-600'
                            : 'bg-emerald-600'
                        }`}
                      >
                        {w.role === 'OPERATOR'
                          ? 'OP'
                          : w.role === 'HELPER'
                          ? 'HL'
                          : w.role === 'SUPERVISOR'
                          ? 'SP'
                          : w.role === 'QC_INSPECTOR'
                          ? 'QC'
                          : 'MT'}
                      </div>
                      <div>
                        <span className="block">{w.name}</span>
                        {w.notes && <span className="text-[10px] font-normal text-slate-400">{w.notes}</span>}
                      </div>
                    </td>

                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded font-extrabold text-[10px] tracking-wide uppercase ${
                          w.role === 'OPERATOR'
                            ? 'bg-blue-100 text-blue-900 border border-blue-200'
                            : w.role === 'HELPER'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : w.role === 'SUPERVISOR'
                            ? 'bg-slate-200 text-slate-900 border border-slate-300'
                            : w.role === 'QC_INSPECTOR'
                            ? 'bg-purple-100 text-purple-900 border border-purple-200'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}
                      >
                        {w.role}
                      </span>
                    </td>

                    <td className="p-3 font-semibold text-slate-700">{w.department}</td>

                    <td className="p-3">
                      {w.role === 'HELPER' ? (
                        <div className="font-bold text-amber-950">
                          <span>🤝 With {w.pairedWithOperator || 'Operator'}</span>
                          {w.assignedMachine && (
                            <span className="text-[10px] text-slate-500 block font-normal">
                              Station: {w.assignedMachine}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-bold text-blue-900">{w.assignedMachine || 'Floor / General'}</span>
                      )}
                    </td>

                    <td className="p-3">
                      <span className="font-mono font-bold text-slate-700">{w.shift}</span>
                    </td>

                    <td className="p-3 text-slate-500 font-mono text-[11px]">{w.inTime || '08:00 AM'}</td>

                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleAttendance(w.id)}
                        className={`px-3 py-1 rounded-full text-xs font-extrabold transition cursor-pointer active:scale-95 ${
                          w.isPresent
                            ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                        }`}
                      >
                        {w.isPresent ? '● उपस्थित (Present)' : '○ अनुपस्थित (Absent)'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Helper Quick Assignment Modal */}
      {editingStation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-slate-800">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide m-0">
                  हेल्पर असाइनमेंट ({editingStation.machine})
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 m-0">
                  ऑपरेटर: <b>{editingStation.operator}</b> ({editingStation.dept})
                </p>
              </div>
              <button
                onClick={() => setEditingStation(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  इस ऑपरेटर के साथ नियुक्त हेल्पर ({editingStation.currentHelpers.length} Helpers):
                </label>
                <div className="flex flex-wrap gap-1.5 min-h-8 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  {editingStation.currentHelpers.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">कोई हेल्पर नहीं</span>
                  ) : (
                    editingStation.currentHelpers.map((h) => (
                      <span
                        key={h}
                        className="inline-flex items-center gap-1 bg-amber-100 text-amber-950 font-bold text-xs px-2 py-0.5 rounded border border-amber-300"
                      >
                        <span>🤝 {h}</span>
                        <button
                          onClick={() =>
                            setEditingStation({
                              ...editingStation,
                              currentHelpers: editingStation.currentHelpers.filter((item) => item !== h)
                            })
                          }
                          className="hover:text-rose-600 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Helper Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={stationHelperInput}
                  onChange={(e) => setStationHelperInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const trimmed = stationHelperInput.trim().toUpperCase();
                      if (trimmed && !editingStation.currentHelpers.includes(trimmed)) {
                        setEditingStation({
                          ...editingStation,
                          currentHelpers: [...editingStation.currentHelpers, trimmed]
                        });
                        setStationHelperInput('');
                      }
                    }
                  }}
                  placeholder="हेल्पर का नाम लिखें (उदा. SUNIL_HELPER)..."
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold uppercase text-slate-800 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const trimmed = stationHelperInput.trim().toUpperCase();
                    if (trimmed && !editingStation.currentHelpers.includes(trimmed)) {
                      setEditingStation({
                        ...editingStation,
                        currentHelpers: [...editingStation.currentHelpers, trimmed]
                      });
                      setStationHelperInput('');
                    }
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  + जोड़ें
                </button>
              </div>

              {/* Quick Suggestions */}
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  उपलब्ध हेल्पर (Quick Pick):
                </span>
                <div className="flex flex-wrap gap-1">
                  {workers
                    .filter((w) => w.role === 'HELPER' && !editingStation.currentHelpers.includes(w.name))
                    .map((w) => (
                      <button
                        key={w.id}
                        onClick={() =>
                          setEditingStation({
                            ...editingStation,
                            currentHelpers: [...editingStation.currentHelpers, w.name]
                          })
                        }
                        className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded border border-slate-300 transition cursor-pointer"
                      >
                        + {w.name}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingStation(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleSaveStationHelpers}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg shadow-sm transition cursor-pointer"
              >
                सुरक्षित करें (Save Allocation)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Worker Modal */}
      {isAddWorkerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <form
            onSubmit={handleCreateWorker}
            className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-slate-800"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide m-0">
                  + नया फ्लोर वर्कर / हेल्पर जोड़ें
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 m-0">
                  नया ऑपरेटर, हेल्पर या सुपरवाइजर मास्टर रोस्टर में दर्ज करें
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddWorkerOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  कर्मचारी का नाम (Worker Name) *:
                </label>
                <input
                  type="text"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  placeholder="उदा. SUNIL_HELPER"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold uppercase text-slate-800 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">पद (Role) *:</label>
                  <select
                    value={newWorkerRole}
                    onChange={(e) => setNewWorkerRole(e.target.value as WorkforceRole)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="HELPER">हेल्पर (Helper)</option>
                    <option value="OPERATOR">ऑपरेटर (Operator)</option>
                    <option value="SUPERVISOR">सुपरवाइजर (Supervisor)</option>
                    <option value="QC_INSPECTOR">क्यूसी इंस्पेक्टर (QC)</option>
                    <option value="MAINTENANCE">मेंटेनेंस (Maintenance)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">विभाग (Dept):</label>
                  <select
                    value={newWorkerDept}
                    onChange={(e) => setNewWorkerDept(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="Cutting">Cutting</option>
                    <option value="Slitting">Slitting</option>
                    <option value="Forming">Forming</option>
                    <option value="QC">QC</option>
                    <option value="Packing">Packing</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">शिफ्ट (Shift):</label>
                  <select
                    value={newWorkerShift}
                    onChange={(e) => setNewWorkerShift(e.target.value as 'DAY' | 'NIGHT')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  >
                    <option value="DAY">DAY SHIFT</option>
                    <option value="NIGHT">NIGHT SHIFT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">आवंटित मशीन:</label>
                  <input
                    type="text"
                    value={newWorkerMachine}
                    onChange={(e) => setNewWorkerMachine(e.target.value)}
                    placeholder="उदा. Cutting-1"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              {newWorkerRole === 'HELPER' && (
                <div>
                  <label className="block text-xs font-bold text-amber-900 uppercase mb-1">
                    किस ऑपरेटर के साथ नियुक्त है (Paired With Operator):
                  </label>
                  <input
                    type="text"
                    value={newWorkerPairedOp}
                    onChange={(e) => setNewWorkerPairedOp(e.target.value)}
                    placeholder="उदा. CUT_OP1"
                    className="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold uppercase text-amber-950 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddWorkerOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg shadow-sm transition cursor-pointer"
              >
                + वर्कर सेव करें
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
