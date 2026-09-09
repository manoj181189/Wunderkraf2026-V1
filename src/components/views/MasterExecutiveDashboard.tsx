import React from 'react';
import { ArrowLeft, Activity, Layers, Package, Trash2, Scroll, Play, Pause, Circle, Wrench, AlertTriangle, Clock, SearchCheck, Box, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { FactoryState } from '../../types';
import { calculateAvailableScrapKg } from '../../lib/utils';
import { ALL_MACHINES_LIST } from '../../lib/constants';
import { LiveMaintenanceTracker } from '../LiveMaintenanceTracker';

interface MasterExecutiveDashboardProps {
  state: FactoryState;
  onBackToHub: () => void;
  onOpenStationModal: (machineName: string) => void;
  onOpenAttendModal?: (machineName: string, incidentId?: string) => void;
}

export const MasterExecutiveDashboard: React.FC<MasterExecutiveDashboardProps> = ({
  state,
  onBackToHub,
  onOpenStationModal,
  onOpenAttendModal
}) => {
  const { jobs, packJobs, logs, scrapSales, maintenanceIncidents = [] } = state;

  let totalSlitPaperKg = 0;
  let totalPackedBoxes = 0;

  logs.forEach((l) => {
    if (l.action && l.action.includes('Finished') && l.stage === 'Slitting') {
      const matchKg = l.action.match(/(\d+)\s*KG/i);
      if (matchKg) totalSlitPaperKg += parseInt(matchKg[1], 10) || 0;
    }
    if (l.action && l.action.includes('Packed')) {
      const matchBox = l.action.match(/(\d+)\s*Boxes/i);
      if (matchBox) totalPackedBoxes += parseInt(matchBox[1], 10) || 0;
    }
  });

  const availableScrap = calculateAvailableScrapKg(logs, scrapSales);

  // Real-time QC Pipeline & Inspector Status
  const activeQcBatches: Array<{ job: any; batch: any }> = [];
  jobs.forEach((j) => {
    (j.runningBatches || []).forEach((b) => {
      if ((b.stage === 'QC' || b.machine === 'QC-Desk') && (b.status === 'Running' || b.status === 'Held')) {
        activeQcBatches.push({ job: j, batch: b });
      }
    });
  });

  const pendingQcJobs = jobs.filter((j) => (j.availableFormingCrates || 0) > 0);
  const totalPendingQcCrates = pendingQcJobs.reduce((sum, j) => sum + (j.availableFormingCrates || 0), 0);
  const totalActiveQcCrates = activeQcBatches.reduce((sum, item) => sum + (item.batch.issuedQty || 0), 0);
  const totalQcInspectors = Array.from(new Set(activeQcBatches.map((item) => item.batch.worker).filter(Boolean)));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5 flex-wrap gap-2">
        <button
          onClick={onBackToHub}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Main Menu</span>
        </button>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
          <h3 className="text-base font-bold text-[#1a365d] uppercase tracking-wide m-0">
            Executive Control Center (Live Factory Pulse)
          </h3>
        </div>
      </div>

      {/* Quick Floor KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <Scroll className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide">Total Paper Slit</span>
            <div className="text-xl font-extrabold text-blue-950">{totalSlitPaperKg.toLocaleString()} KG</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center">
            <SearchCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wide">QC Crates Pipeline</span>
            <div className="text-xl font-extrabold text-purple-950">
              {(totalActiveQcCrates + totalPendingQcCrates).toLocaleString()} Crates
            </div>
            <div className="text-[10px] text-purple-700 font-semibold">
              {totalActiveQcCrates} In Inspection • {totalPendingQcCrates} Pending QC
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">Packed Output</span>
            <div className="text-xl font-extrabold text-emerald-950">{totalPackedBoxes.toLocaleString()} Boxes</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wide">Available Scrap</span>
            <div className="text-xl font-extrabold text-rose-950">{availableScrap} KG</div>
          </div>
        </div>
      </div>

      {/* Live Floor Maintenance & Breakdown Tracking Banner */}
      <div className="mb-6">
        <LiveMaintenanceTracker
          state={state}
          onOpenAttendModal={onOpenAttendModal || ((m) => onOpenStationModal(m))}
        />
      </div>

      {/* ======================================================== */}
      {/* LIVE QC DISPATCH & INSPECTOR DETAILS (REAL-TIME PIPELINE) */}
      {/* ======================================================== */}
      <div className="mb-6 p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-600 text-white rounded-lg">
              <SearchCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black text-purple-950 uppercase tracking-wide m-0">
                Live QC Dispatch & Inspector Pipeline (रियल-टाइम क्यूसी डिस्पैच व इंस्पेक्टर स्थिति)
              </h4>
              <p className="text-[11px] text-purple-700 m-0">
                फॉर्मिंग से डिस्पैच किए गए क्रेट्स, नियुक्त इंस्पेक्टर (Assigned Inspector) व स्टेज स्थिति
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold bg-purple-200/80 text-purple-900 px-2.5 py-1 rounded-full border border-purple-300">
              Active Inspectors: {totalQcInspectors.length > 0 ? totalQcInspectors.join(', ') : 'None Active'}
            </span>
            <span className="text-[11px] font-extrabold bg-indigo-100 text-indigo-900 px-2.5 py-1 rounded-full border border-indigo-200">
              Allocated Crates: {totalActiveQcCrates}
            </span>
          </div>
        </div>

        {/* List of active QC batches & pending dispatches */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Active Inspections */}
          {activeQcBatches.map(({ job: j, batch: b }) => (
            <div
              key={b.batchId}
              onClick={() => onOpenStationModal('QC-Desk')}
              className="bg-white border-2 border-emerald-400 rounded-xl p-3 shadow-xs hover:shadow-md transition cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-indigo-900">{j.id}</span>
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  ● In Inspection
                </span>
              </div>
              <div className="font-bold text-xs text-slate-800">{j.product}</div>
              <div className="text-xs pt-1 border-t border-slate-100 space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-semibold">Assigned Inspector:</span>
                  <span className="font-black text-purple-950">👨‍🔬 {b.worker || 'Inspector'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-semibold">QC Crates Count:</span>
                  <span className="font-extrabold text-blue-900">{b.issuedQty || 0} Crates</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-semibold">Stage Status:</span>
                  <span className="font-extrabold text-emerald-700">In Inspection (Desk Active)</span>
                </div>
              </div>
            </div>
          ))}

          {/* Pending Dispatches */}
          {pendingQcJobs.map((j) => (
            <div
              key={j.id}
              onClick={() => onOpenStationModal('QC-Desk')}
              className="bg-white border-2 border-amber-300 rounded-xl p-3 shadow-xs hover:shadow-md transition cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-indigo-900">{j.id}</span>
                <span className="text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                  Pending QC
                </span>
              </div>
              <div className="font-bold text-xs text-slate-800">{j.product}</div>
              <div className="text-xs pt-1 border-t border-slate-100 space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-semibold">Assigned Inspector:</span>
                  <span className="font-bold text-amber-800">Awaiting Assignment</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-semibold">QC Crates Count:</span>
                  <span className="font-extrabold text-amber-900">{j.availableFormingCrates || 0} Crates Queued</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-semibold">Stage Status:</span>
                  <span className="font-extrabold text-amber-700">Pending QC (Dispatched from Forming)</span>
                </div>
              </div>
            </div>
          ))}

          {activeQcBatches.length === 0 && pendingQcJobs.length === 0 && (
            <div className="col-span-full py-3 text-center text-xs text-slate-500 italic bg-white/60 rounded-xl border border-purple-100">
              QC Pipeline is clear. No crates currently pending or in inspection.
            </div>
          )}
        </div>
      </div>

      {/* Live Floor Workstation Grid */}
      <div>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 mb-3">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>Live Workstations Status (Click Card for Station History & Breakdown Resolution)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {ALL_MACHINES_LIST.map((m) => {
            let isRunning = false;
            let isHeld = false;
            let activeBatches: Array<{ job: string; op: string; reason?: string }> = [];

            if (m.startsWith('Packing-') || m.startsWith('Manual-')) {
              packJobs.forEach((pj) => {
                if (pj.machine === m && (pj.status === 'Running' || pj.status === 'Held')) {
                  if (pj.status === 'Running') isRunning = true;
                  if (pj.status === 'Held') isHeld = true;
                  activeBatches.push({
                    job: `${pj.id} (${pj.customer})`,
                    op: pj.worker || 'Packing Team',
                    reason: pj.holdReason
                  });
                }
              });
            } else {
              jobs.forEach((j) => {
                if (j.runningBatches) {
                  j.runningBatches.forEach((b) => {
                    if (b.machine === m && (b.status === 'Running' || b.status === 'Held')) {
                      if (b.status === 'Running') isRunning = true;
                      if (b.status === 'Held') isHeld = true;
                      activeBatches.push({
                        job: `${j.id} (${j.product})`,
                        op: b.worker || 'Operator',
                        reason: b.holdReason
                      });
                    }
                  });
                }
              });
            }

            // Cross reference active maintenance incident
            const activeInc = maintenanceIncidents.find(
              (inc) => inc.machine === m && (inc.status === 'OPEN' || inc.status === 'IN_PROGRESS')
            );
            const isUnderRepair = activeInc?.status === 'IN_PROGRESS';
            const isOpenDown = activeInc?.status === 'OPEN';

            const getElapsedMins = (iso?: string) => {
              if (!iso) return 1;
              try {
                return Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
              } catch {
                return 1;
              }
            };

            const repairMins = getElapsedMins(activeInc?.repairStartTime || activeInc?.attendingStartedAt);
            const downMins = getElapsedMins(activeInc?.breakdownStartTime);

            const borderStatus = isUnderRepair
              ? 'border-t-4 border-amber-500 bg-amber-50/40'
              : isOpenDown || isHeld
              ? 'border-t-4 border-red-500 bg-red-50/40'
              : isRunning
              ? 'border-t-4 border-blue-600 bg-blue-50/40'
              : 'border-t-4 border-slate-300 bg-white';

            return (
              <div
                key={m}
                onClick={() => onOpenStationModal(m)}
                className={`border border-slate-200 rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 ${borderStatus}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-xs text-slate-800 uppercase">{m}</span>
                  {isUnderRepair ? (
                    <span className="flex items-center gap-1 text-[10px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full animate-pulse">
                      <Wrench className="w-2.5 h-2.5" /> REPAIRING
                    </span>
                  ) : isOpenDown || isHeld ? (
                    <span className="flex items-center gap-1 text-[10px] font-extrabold text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded-full animate-pulse">
                      <Pause className="w-2.5 h-2.5 fill-red-700" /> DOWN ({downMins}m)
                    </span>
                  ) : isRunning ? (
                    <span className="flex items-center gap-1 text-[10px] font-extrabold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      <Play className="w-2.5 h-2.5 fill-blue-700" /> RUNNING
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      <Circle className="w-2 h-2" /> IDLE
                    </span>
                  )}
                </div>

                {/* Maintenance Technician Attendance Badge */}
                {isUnderRepair && (
                  <div className="mb-2 p-2 bg-amber-100/80 border border-amber-300 rounded-lg text-xs">
                    <div className="text-[10px] font-bold text-amber-800 uppercase">कार्यरत टेक्नीशियन:</div>
                    <div className="font-black text-amber-950 flex items-center justify-between">
                      <span>👨‍🔧 {activeInc?.technicianName || 'Technician'}</span>
                      <span className="font-mono text-[11px]">⏱️ {repairMins}m</span>
                    </div>
                    {onOpenAttendModal && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAttendModal(m, activeInc?.id);
                        }}
                        className="mt-1.5 w-full py-1 text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer transition text-center shadow-2xs"
                      >
                        ✅ रिपेयर पूरा करें (Mark Ready)
                      </button>
                    )}
                  </div>
                )}

                {isOpenDown && !isUnderRepair && (
                  <div className="mb-2 p-2 bg-red-100/80 border border-red-300 rounded-lg text-xs">
                    <div className="text-[10px] font-bold text-red-800 uppercase">ब्रेकडाउन (इंतज़ार जारी):</div>
                    <div className="font-bold text-red-950 truncate">{activeInc?.reason || 'Machine Stopped'}</div>
                    {onOpenAttendModal && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenAttendModal(m, activeInc?.id);
                        }}
                        className="mt-1.5 w-full py-1 text-[10px] font-extrabold bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded cursor-pointer transition text-center shadow-2xs"
                      >
                        👨‍🔧 मैं अटेंड कर रहा हूँ (Start Repair)
                      </button>
                    )}
                  </div>
                )}

                {m === 'QC-Desk' ? (
                  <div className="space-y-1.5 text-xs">
                    {activeBatches.length > 0 ? (
                      activeBatches.map((b, idx) => (
                        <div key={idx} className="bg-purple-50/80 p-2 rounded-lg border border-purple-200">
                          <div className="font-mono font-bold text-indigo-900 truncate">{b.job}</div>
                          <div className="text-[11px] text-purple-950 font-bold mt-0.5 flex items-center justify-between">
                            <span>Assigned Inspector:</span>
                            <span className="text-purple-700">👨‍🔬 {b.op}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 font-semibold flex items-center justify-between">
                            <span>Stage Status:</span>
                            <span className="font-extrabold text-emerald-700">In Inspection</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        {totalPendingQcCrates > 0 ? (
                          <div className="space-y-1">
                            <div className="font-extrabold text-amber-800 flex items-center gap-1">
                              <span>⏳ Stage Status:</span>
                              <span className="bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">Pending QC</span>
                            </div>
                            <div className="font-bold text-slate-700">
                              QC Crates Count: <span className="text-indigo-900 font-extrabold">{totalPendingQcCrates} Crates Queued</span>
                            </div>
                            <div className="text-[10px] text-slate-500">Inspector: Awaiting assignment on Desk</div>
                          </div>
                        ) : (
                          <div className="italic text-slate-400 py-1">
                            QC Desk Ready • No pending crates
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : activeBatches.length > 0 ? (
                  <div className="space-y-1 text-xs">
                    {activeBatches.map((b, idx) => (
                      <div key={idx} className="bg-white/80 p-2 rounded-lg border border-slate-200">
                        <div className="font-bold text-slate-900 truncate">{b.job}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">Op: <b>{b.op}</b></div>
                        {b.reason && !activeInc && (
                          <div className="text-[10px] text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded mt-1 font-semibold">
                            ⚠️ {b.reason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : !isUnderRepair && !isOpenDown ? (
                  <div className="text-[11px] text-slate-400 italic py-2">
                    Station ready for next work assignment
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
