import React, { useState, useEffect } from 'react';
import {
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  User,
  X,
  Plus,
  Trash2,
  Send,
  Check,
  ShieldAlert,
  Play,
  Share2,
  Radio,
  FileText
} from 'lucide-react';
import { FactoryState, MaintenanceIncident, SparePartItem, MachineReadyAlert, LogEntry } from '../types';
import { DEFAULT_MAINTENANCE_TECHNICIANS, COMMON_SPARE_PARTS } from '../lib/constants';
import { CustomSparePartModal } from './CustomSparePartModal';

interface TechnicianAttendModalProps {
  isOpen: boolean;
  machineName?: string;
  incidentId?: string;
  state: FactoryState;
  onClose: () => void;
  onSaveState: (state: FactoryState) => void;
  currentUser?: { username: string; perms: string[] } | null;
}

export const TechnicianAttendModal: React.FC<TechnicianAttendModalProps> = ({
  isOpen,
  machineName,
  incidentId,
  state,
  onClose,
  onSaveState,
  currentUser
}) => {
  // Timer tick for live minute counter
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const incidents = state.maintenanceIncidents || [];

  // Find active incident for the machine or ID
  const activeIncident = incidentId
    ? incidents.find((inc) => inc.id === incidentId)
    : machineName
    ? incidents.find(
        (inc) =>
          inc.machine === machineName &&
          (inc.status === 'OPEN' || inc.status === 'IN_PROGRESS')
      )
    : incidents.find((inc) => inc.status === 'OPEN' || inc.status === 'IN_PROGRESS');

  const targetMachine = activeIncident?.machine || machineName || 'Slitting-1';

  // Technicians list
  const baseTechnicians =
    state.maintenanceTechniciansMaster && state.maintenanceTechniciansMaster.length > 0
      ? state.maintenanceTechniciansMaster
      : DEFAULT_MAINTENANCE_TECHNICIANS;

  const technicianList = Array.from(
    new Set([
      'Manoj Kumar (Plant Head / Maintenance Manager)',
      ...baseTechnicians
    ])
  );

  // Form states for Attend
  const [selectedTech, setSelectedTech] = useState<string>(technicianList[0] || 'Ramesh Sharma (Head Mech)');
  const [customTech, setCustomTech] = useState('');
  const [attendNotes, setAttendNotes] = useState('');

  // Form states for Finish / Complete Repair
  const [actionTaken, setActionTaken] = useState('');
  const [sparesList, setSparesList] = useState<SparePartItem[]>([]);
  const [sparesOptions, setSparesOptions] = useState<string[]>(COMMON_SPARE_PARTS);
  const [newPartName, setNewPartName] = useState(COMMON_SPARE_PARTS[0] || 'Band Heater Element 1500W');
  const [newPartQty, setNewPartQty] = useState('1');
  const [newPartUnit, setNewPartUnit] = useState('Nos');
  const [newPartNotes, setNewPartNotes] = useState('');
  const [sendWhatsAppHandover, setSendWhatsAppHandover] = useState(true);
  const [isCustomSpareModalOpen, setIsCustomSpareModalOpen] = useState(false);
  const [isDirectPartInput, setIsDirectPartInput] = useState(false);
  const [directPartNameInput, setDirectPartNameInput] = useState('');

  if (!isOpen) return null;

  // Helper to compute minutes from start time
  const getElapsedMinutes = (startTimeIso?: string) => {
    if (!startTimeIso) return 0;
    try {
      const start = new Date(startTimeIso).getTime();
      const now = Date.now();
      return Math.max(1, Math.round((now - start) / 60000));
    } catch {
      return 0;
    }
  };

  const effectiveTechName = customTech.trim() ? customTech.trim() : selectedTech;

  // 1. Action: Start Attending Breakdown
  const handleStartAttending = (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveTechName) {
      alert('⚠️ कृपया टेक्नीशियन का नाम चुनें या दर्ज करें।');
      return;
    }

    const nowIso = new Date().toISOString();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const todayStr = new Date().toISOString().split('T')[0];

    let updatedIncidents = incidents;
    let incidentToUpdate = activeIncident;

    if (!incidentToUpdate) {
      // If no incident existed yet for this machine, create one on the fly
      const incidentSeq = incidents.length + 1;
      const newInc: MaintenanceIncident = {
        id: `MNT-${String(incidentSeq).padStart(3, '0')}`,
        machine: targetMachine,
        stage: targetMachine.split('-')[0] || 'Production',
        reason: 'Breakdown reported on workstation',
        description: attendNotes || 'Technician attended directly on floor',
        reportedBy: currentUser?.username || 'Operator',
        priority: 'Urgent',
        status: 'IN_PROGRESS',
        breakdownStartTime: nowIso,
        breakdownDate: todayStr,
        repairStartTime: nowIso,
        attendingStartedAt: nowIso,
        technicianName: effectiveTechName,
        attendedBy: effectiveTechName,
        responseTimeMinutes: 1
      };
      updatedIncidents = [newInc, ...incidents];
      incidentToUpdate = newInc;
    } else {
      const respTime = getElapsedMinutes(incidentToUpdate.breakdownStartTime);
      updatedIncidents = incidents.map((inc) => {
        if (inc.id === incidentToUpdate!.id) {
          return {
            ...inc,
            status: 'IN_PROGRESS' as const,
            repairStartTime: nowIso,
            attendingStartedAt: nowIso,
            technicianName: effectiveTechName,
            attendedBy: effectiveTechName,
            responseTimeMinutes: respTime,
            technicianRemarks: attendNotes || inc.technicianRemarks
          };
        }
        return inc;
      });
    }

    // Add Audit Log
    const newLog: LogEntry = {
      jobId: targetMachine,
      product: 'Workstation',
      stage: 'Breakdown Attended',
      machine: targetMachine,
      action: `👨‍🔧 Technician ${effectiveTechName} started attending breakdown on ${targetMachine} (${incidentToUpdate.reason}). Response Time: ${getElapsedMinutes(incidentToUpdate.breakdownStartTime)} mins.`,
      user: effectiveTechName,
      startTime: nowTime,
      rawDate: todayStr,
      timestamp: new Date().toLocaleString()
    };

    onSaveState({
      ...state,
      maintenanceIncidents: updatedIncidents,
      logs: [...state.logs, newLog]
    });

    alert(`✅ ${effectiveTechName} ने ${targetMachine} पर काम शुरू कर दिया है। डैशबोर्ड पर "काम चालू है" अपडेट हो गया है।`);
  };

  // 2. Action: Add Spare Part
  const handleAddSpare = () => {
    const finalPartName = isDirectPartInput ? directPartNameInput.trim() : newPartName.trim();
    if (!finalPartName) {
      alert('⚠️ कृपया स्पेयर पार्ट का नाम दर्ज करें!');
      return;
    }
    const qty = parseInt(newPartQty) || 1;
    setSparesList([
      ...sparesList,
      {
        name: finalPartName,
        qty,
        unit: newPartUnit,
        notes: newPartNotes.trim()
      }
    ]);
    if (!sparesOptions.includes(finalPartName)) {
      setSparesOptions((prev) => [finalPartName, ...prev]);
    }
    setDirectPartNameInput('');
    setNewPartNotes('');
    setNewPartQty('1');
  };

  const handleAddCustomSpare = (part: SparePartItem) => {
    setSparesList((prev) => [...prev, part]);
    if (!sparesOptions.includes(part.name)) {
      setSparesOptions((prev) => [part.name, ...prev]);
    }
    setNewPartName(part.name);
  };

  const handleRemoveSpare = (idx: number) => {
    setSparesList(sparesList.filter((_, i) => i !== idx));
  };

  // 3. Action: Complete Repair & Mark Ready for Run
  const handleFinishRepair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeIncident) return;

    const nowIso = new Date().toISOString();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const todayStr = new Date().toISOString().split('T')[0];

    const repairDuration = getElapsedMinutes(activeIncident.repairStartTime || activeIncident.attendingStartedAt || activeIncident.breakdownStartTime);
    const totalDowntime = getElapsedMinutes(activeIncident.breakdownStartTime);

    const partsSummary =
      sparesList.length > 0
        ? sparesList.map((p) => `${p.name} (Qty: ${p.qty} ${p.unit || ''})`).join(', ')
        : 'No spare parts replaced (Calibrated & Adjusted)';

    // Update Incident
    const updatedIncidents = incidents.map((inc) => {
      if (inc.id === activeIncident.id) {
        return {
          ...inc,
          status: 'REPAIRED_READY' as const,
          repairedAt: nowIso,
          repairDurationMinutes: repairDuration,
          totalDowntimeMinutes: totalDowntime,
          technicianName: activeIncident.technicianName || effectiveTechName,
          attendedBy: activeIncident.attendedBy || effectiveTechName,
          actionTaken: actionTaken.trim() || 'Breakdown attended, repaired, calibrated, and certified OK for production.',
          spareParts: sparesList
        };
      }
      return inc;
    });

    // Automatically Un-hold machine batches in state.jobs and state.packJobs
    const updatedJobs = state.jobs.map((j) => {
      let hasChange = false;
      const batches = (j.runningBatches || []).map((b) => {
        if (b.machine === targetMachine && b.status === 'Held') {
          hasChange = true;
          return {
            ...b,
            status: 'Running' as const,
            holdReason: undefined
          };
        }
        return b;
      });
      return hasChange ? { ...j, runningBatches: batches } : j;
    });

    const updatedPackJobs = state.packJobs.map((pj) => {
      if (pj.machine === targetMachine && pj.status === 'Held') {
        return {
          ...pj,
          status: 'Running' as const,
          holdReason: undefined
        };
      }
      return pj;
    });

    // Ready Alert for Operator Notification
    const newReadyAlert: MachineReadyAlert = {
      incidentId: activeIncident.id,
      machine: targetMachine,
      technician: activeIncident.technicianName || effectiveTechName,
      repairedAt: nowIso,
      actionTaken: actionTaken.trim() || 'Repair completed and tested OK',
      sparePartsSummary: partsSummary,
      downtimeMinutes: totalDowntime,
      active: true
    };

    // Full Traceability Audit Log
    const newLog: LogEntry = {
      jobId: targetMachine,
      product: 'Workstation',
      stage: 'Maintenance Clearance',
      machine: targetMachine,
      action: `✅ Machine ${targetMachine} Repaired & Handover OK by Tech ${activeIncident.technicianName || effectiveTechName}. Repair Duration: ${repairDuration}m | Total Downtime: ${totalDowntime}m | Spares: ${partsSummary} | Work Done: ${actionTaken || 'Calibrated & Tested'}`,
      user: activeIncident.technicianName || effectiveTechName,
      startTime: nowTime,
      rawDate: todayStr,
      timestamp: new Date().toLocaleString()
    };

    onSaveState({
      ...state,
      jobs: updatedJobs,
      packJobs: updatedPackJobs,
      maintenanceIncidents: updatedIncidents,
      machineReadyAlerts: [newReadyAlert, ...(state.machineReadyAlerts || [])],
      logs: [...state.logs, newLog]
    });

    // Optional WhatsApp Handover Notification
    if (sendWhatsAppHandover && activeIncident.maintenancePhone) {
      const cleanPhone = activeIncident.maintenancePhone.replace(/[^\d]/g, '');
      const msg = encodeURIComponent(
        `✅ *WÜNDERKRAF ERP - REPAIR COMPLETED & HANDOVER OK* ✅\n\n` +
        `🛠️ *Machine:* ${targetMachine}\n` +
        `👨‍🔧 *Attended By:* ${activeIncident.technicianName || effectiveTechName}\n` +
        `⏱️ *Repair Time:* ${repairDuration} Minutes\n` +
        `🛑 *Total Downtime:* ${totalDowntime} Minutes\n` +
        `🔧 *Action Taken:* ${actionTaken || 'Repaired and certified ready'}\n` +
        `🔩 *Spares Used:* ${partsSummary}\n` +
        `⏰ *Time:* ${nowTime}\n\n` +
        `📢 *Status:* "मेरी साइड से मशीन ओके है - रेडी टू रन!" Operator can resume production immediately.`
      );
      const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${msg}` : `https://api.whatsapp.com/send?text=${msg}`;
      window.open(waUrl, '_blank');
    }

    alert(`🎉 मशीन ${targetMachine} का रिपेयर कार्य पूरा हो गया है और मशीन अब "RUNNING" स्थिति में तैयार है!`);
    onClose();
  };

  const isUnderRepair = activeIncident?.status === 'IN_PROGRESS';
  const isOpenWaiting = activeIncident?.status === 'OPEN';

  const elapsedWaiting = getElapsedMinutes(activeIncident?.breakdownStartTime);
  const elapsedRepairing = getElapsedMinutes(activeIncident?.repairStartTime || activeIncident?.attendingStartedAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between text-white ${
            isUnderRepair
              ? 'bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 border-amber-800'
              : 'bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 border-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center font-bold text-white shadow-inner">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-wide uppercase m-0">
                  {targetMachine} • Breakdown & Repair Desk
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 border border-white/30 text-white">
                  {isUnderRepair ? '🟡 Under Repair (काम चालू)' : '🔴 Stopped (बंद है)'}
                </span>
              </div>
              <p className="text-[11px] text-white/80 m-0 mt-0.5">
                {isUnderRepair
                  ? `Attended by ${activeIncident?.technicianName || 'Technician'} • Live tracking & resolution`
                  : 'Breakdown response, technician acknowledgment & repair tracking'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 text-xs">
          {/* Active Incident Summary Card */}
          {activeIncident ? (
            <div
              className={`p-4 rounded-xl border ${
                isUnderRepair
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-rose-50/70 border-rose-200'
              } space-y-2.5`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs uppercase px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-800">
                    Ticket: {activeIncident.id}
                  </span>
                  <span className="font-bold text-[11px] text-slate-600">
                    Stage: <b>{activeIncident.stage}</b>
                  </span>
                  <span
                    className={`font-black text-[10px] px-2 py-0.5 rounded-full uppercase ${
                      activeIncident.priority === 'Critical'
                        ? 'bg-red-600 text-white'
                        : 'bg-amber-600 text-white'
                    }`}
                  >
                    {activeIncident.priority || 'Urgent'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <span className="text-slate-500">Breakdown:</span>
                  <span className="font-mono text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {new Date(activeIncident.breakdownStartTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase">Reason / कारण:</div>
                <div className="text-sm font-extrabold text-slate-900 mt-0.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{activeIncident.reason}</span>
                </div>
                {activeIncident.description && (
                  <p className="text-xs text-slate-600 mt-1 italic pl-5">
                    "{activeIncident.description}"
                  </p>
                )}
              </div>

              {/* Time & Technician Status Row */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-2 text-[11px]">
                <div className="flex items-center gap-3">
                  <span>
                    Reported By: <b>{activeIncident.reportedBy}</b>
                  </span>
                  {activeIncident.maintenancePhone && (
                    <span className="text-slate-500">
                      Phone: <b>{activeIncident.maintenancePhone}</b>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-600 font-bold">Total Downtime:</span>
                  <span className="font-black text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-300">
                    ⏱️ {elapsedWaiting} mins
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <Clock className="w-5 h-5 text-slate-400" />
              <div>
                <div className="font-bold text-slate-800">
                  {targetMachine} पर वर्तमान में कोई खुला ब्रेकडाउन टिकट नहीं है।
                </div>
                <div className="text-[11px] text-slate-500">
                  यदि मशीन बंद है या मेंटेनेंस की आवश्यकता है, तो नीचे से सीधे अटेंड करें।
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: If machine is WAITING (OPEN) -> Technician Attend Form */}
          {isOpenWaiting && (
            <form
              onSubmit={handleStartAttending}
              className="p-4 sm:p-5 bg-white border-2 border-dashed border-rose-300 rounded-xl space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-2 text-rose-800 font-extrabold uppercase tracking-wide text-xs">
                <Radio className="w-4 h-4 text-rose-600 animate-pulse" />
                <span>स्टेप 1: मशीन अटेंड करें (Technician Reply & Acknowledgment)</span>
              </div>
              <p className="text-xs text-slate-600">
                जब आप मशीन पर पहुँचें, तो तुरंत अपना नाम चुनकर <b>"मैं अटेंड कर रहा हूँ"</b> बटन दबाएं।
                इससे ऑपरेटर डेस्क और मेंटेनेंस डैशबोर्ड पर तुरंत दिख जाएगा कि आप इस मशीन पर काम कर रहे हैं।
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    टेक्नीशियन का नाम (Select Technician):
                  </label>
                  <select
                    value={selectedTech}
                    onChange={(e) => setSelectedTech(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-rose-500 focus:bg-white"
                  >
                    {technicianList.map((tech) => (
                      <option key={tech} value={tech}>
                        👨‍🔧 {tech}
                      </option>
                    ))}
                    <option value="">+ Other / Custom Name (अन्य)</option>
                  </select>
                </div>

                {!selectedTech && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      अन्य टेक्नीशियन का नाम (Enter Custom Name):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. मुकेश प्रजापति"
                      value={customTech}
                      onChange={(e) => setCustomTech(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-rose-500 focus:bg-white"
                    />
                  </div>
                )}

                <div className={selectedTech ? 'sm:col-span-2' : ''}>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    शुरुआती निरीक्षण / नोट्स (Inspection / Action Note - Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="उदा. हीटर और थर्मोकपल की जांच शुरू की..."
                    value={attendNotes}
                    onChange={(e) => setAttendNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:border-rose-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>👨‍🔧 मैं इस ब्रेकडाउन को अटेंड कर रहा हूँ (Start Attending)</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: If machine is UNDER REPAIR (IN_PROGRESS) -> Live Timer & Completion Form */}
          {isUnderRepair && (
            <div className="space-y-4">
              {/* Live Repairing Banner */}
              <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold animate-pulse shadow-sm">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-amber-900 uppercase">
                      रिपेयरिंग कार्य चालू है (Under Repair)
                    </div>
                    <div className="text-sm font-black text-amber-950 mt-0.5">
                      👨‍🔧 यह आदमी यहां पर काम कर रहा है: <b>{activeIncident?.technicianName || activeIncident?.attendedBy || effectiveTechName}</b>
                    </div>
                    <div className="text-[11px] text-amber-800 mt-0.5 font-medium">
                      काम शुरू होने का समय:{' '}
                      <b>
                        {activeIncident?.repairStartTime
                          ? new Date(activeIncident.repairStartTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Just started'}
                      </b>{' '}
                      (रिस्पांस टाइम: {activeIncident?.responseTimeMinutes || 1} मिनट)
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold text-amber-700 uppercase">
                    चालू रिपेयर समय (Repairing Time):
                  </div>
                  <div className="text-xl font-black text-amber-950 font-mono">
                    ⏱️ {elapsedRepairing} Mins
                  </div>
                </div>
              </div>

              {/* Complete Repair Form */}
              <form
                onSubmit={handleFinishRepair}
                className="p-4 sm:p-5 bg-white border border-slate-200 rounded-xl space-y-4 shadow-xs"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-extrabold text-xs text-slate-800 uppercase flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>स्टेप 2: रिपेयर पूरा करें और मशीन हैंडओवर करें (Finish & Handover)</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    मशीन ठीक होने के बाद यहाँ से बंद करें
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    क्या कार्य / सुधार किया गया (Action Taken & Root Cause): <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    placeholder="उदा. हीटर एलिमेंट 1500W रिप्लेस किया, टेम्परेचर कैलिब्रेट किया और वायर टर्मिनल टाइट किए..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:border-emerald-500 focus:bg-white"
                    required
                  />
                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="text-[10px] text-slate-400 font-bold self-center">Presets:</span>
                    {[
                      'हीटर एलिमेंट रिप्लेस किया',
                      'थर्मोकपल सेंसर कैलिब्रेट किया',
                      'ब्लेड शार्प और री-अलाइन किया',
                      'टेफ्लॉन टेप चेंज किया',
                      'न्यूमेटिक प्रेशर और वॉल्व ट्यून किया'
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setActionTaken((prev) => (prev ? `${prev}, ${preset}` : preset))}
                        className="text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md transition cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Spare Parts Consumed Section */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="block text-xs font-bold text-slate-700">
                      बदले गए स्पेयर पार्ट्स (Spare Parts Replaced):
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsCustomSpareModalOpen(true)}
                        className="text-[11px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>➕ कस्टम पार्ट पॉप-अप</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDirectPartInput(!isDirectPartInput)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                          isDirectPartInput
                            ? 'bg-amber-600 text-white border-amber-700'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {isDirectPartInput ? '📋 लिस्ट से चुनें' : '✍️ सीधे नाम टाइप करें'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-6">
                      {isDirectPartInput ? (
                        <input
                          type="text"
                          autoFocus
                          value={directPartNameInput}
                          onChange={(e) => setDirectPartNameInput(e.target.value)}
                          placeholder="स्पेयर पार्ट का नाम टाइप करें (उदा. Brass Bush 32mm)..."
                          className="w-full p-2 bg-white border-2 border-amber-400 rounded-lg text-xs font-bold text-slate-900 outline-none"
                        />
                      ) : (
                        <select
                          value={newPartName}
                          onChange={(e) => {
                            if (e.target.value === 'CUSTOM_PART_POPUP') {
                              setIsCustomSpareModalOpen(true);
                            } else {
                              setNewPartName(e.target.value);
                            }
                          }}
                          className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                        >
                          <option value="CUSTOM_PART_POPUP">➕ नया कस्टम पार्ट लिखें (Type Custom Part)...</option>
                          {sparesOptions.map((sp) => (
                            <option key={sp} value={sp}>
                              {sp}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        min="1"
                        value={newPartQty}
                        onChange={(e) => setNewPartQty(e.target.value)}
                        placeholder="Qty"
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <select
                        value={newPartUnit}
                        onChange={(e) => setNewPartUnit(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value="Nos">Nos</option>
                        <option value="Set">Set</option>
                        <option value="Meters">Meters</option>
                        <option value="Rolls">Rolls</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={handleAddSpare}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>

                  {sparesList.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {sparesList.map((sp, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                        >
                          <div className="font-bold text-slate-800">
                            🔩 {sp.name} — <span className="text-blue-700 font-extrabold">{sp.qty} {sp.unit}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSpare(idx)}
                            className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Handover Notice & WhatsApp Checkbox */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={sendWhatsAppHandover}
                      onChange={(e) => setSendWhatsAppHandover(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                    />
                    <span>📲 ऑपरेटर / फ्लोर हेड को व्हाट्सएप पर "रेडी टू रन" मैसेज भेजें</span>
                  </label>

                  <div className="text-[11px] text-slate-500 font-medium">
                    कुल डाउनटाइम: <b>{elapsedWaiting} मिनट</b> | रिपेयर समय: <b>{elapsedRepairing} मिनट</b>
                  </div>
                </div>

                {/* Finish & Run Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-green-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>✅ मेरी साइड से ओके है - रिपेयर पूरा हुआ (Handover & Set Machine Running)</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Custom Spare Part Modal */}
      <CustomSparePartModal
        isOpen={isCustomSpareModalOpen}
        onClose={() => setIsCustomSpareModalOpen(false)}
        onAddPart={handleAddCustomSpare}
      />
    </div>
  );
};
