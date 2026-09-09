import React, { useState } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  Clock,
  User,
  Gauge,
  Layers,
  AlertTriangle,
  X,
  FileText,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { Job, RunningBatch, OperatorRunSlice } from '../types';

export interface ShiftHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  batch: RunningBatch;
  job: Job;
  machine: string;
  stageName: 'Slitting' | 'Cutting' | 'Forming' | 'QC' | 'Packing' | string;
  availableWorkers: string[];
  unitLabel?: string; // e.g. "Crates", "Rolls", "KG"
  piecesPerUnit?: number; // e.g. 10000 for cutting, 7000 for forming
  onConfirmHandover: (handoverData: {
    relievedByOperator: string;
    nextShift: 'DAY' | 'NIGHT' | string;
    handoverTime: string;
    meterReading: number;
    sliceProducedQty: number;
    sliceProducedPieces?: number;
    sliceScrapQty: number;
    handoverNotes: string;
  }) => void;
}

export const ShiftHandoverModal: React.FC<ShiftHandoverModalProps> = ({
  isOpen,
  onClose,
  batch,
  job,
  machine,
  stageName,
  availableWorkers,
  unitLabel = 'Crates',
  piecesPerUnit = 0,
  onConfirmHandover
}) => {
  if (!isOpen) return null;

  const currentShift = (batch.shift || 'DAY').toUpperCase();
  const suggestedNextShift = currentShift === 'DAY' ? 'NIGHT' : 'DAY';

  const [relievingOperator, setRelievingOperator] = useState<string>('');
  const [customWorkerInput, setCustomWorkerInput] = useState<string>('');
  const [nextShift, setNextShift] = useState<'DAY' | 'NIGHT' | string>(suggestedNextShift);

  // Meter Reading at handover
  const [meterReadingInput, setMeterReadingInput] = useState<string>(
    batch.meterReading ? String(batch.meterReading) : ''
  );

  // Units produced by current operator during their shift
  const [sliceProducedQtyInput, setSliceProducedQtyInput] = useState<string>(
    batch.producedQty ? String(batch.producedQty) : '0'
  );

  // Scrap produced during this shift
  const defaultScrap = stageName === 'Slitting' || stageName === 'Cutting' ? batch.scrapKg || 0 : batch.scrapPcs || 0;
  const [sliceScrapQtyInput, setSliceScrapQtyInput] = useState<string>(String(defaultScrap));

  // Handover checklist notes
  const [handoverNotes, setHandoverNotes] = useState<string>('');
  const [handoverConfirmed, setHandoverConfirmed] = useState<boolean>(true);

  // Current time
  const nowTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const parsedProduced = parseFloat(sliceProducedQtyInput) || 0;
  const calculatedPieces = piecesPerUnit > 0 ? parsedProduced * piecesPerUnit : undefined;
  const parsedScrap = parseFloat(sliceScrapQtyInput) || 0;
  const parsedMeter = parseFloat(meterReadingInput) || 0;

  const finalRelievingOperator = (customWorkerInput.trim() || relievingOperator || '').toUpperCase();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!finalRelievingOperator) {
      alert('Please select or enter the Relieving Operator (आने वाले ऑपरेटर का नाम चुनें/दर्ज करें).');
      return;
    }

    if (finalRelievingOperator.toLowerCase() === batch.worker.trim().toLowerCase()) {
      alert('Relieving operator must be different from current outgoing operator (आने वाला ऑपरेटर वर्तमान ऑपरेटर से भिन्न होना चाहिए).');
      return;
    }

    onConfirmHandover({
      relievedByOperator: finalRelievingOperator,
      nextShift,
      handoverTime: nowTime,
      meterReading: parsedMeter,
      sliceProducedQty: parsedProduced,
      sliceProducedPieces: calculatedPieces,
      sliceScrapQty: parsedScrap,
      handoverNotes: handoverNotes.trim()
    });

    onClose();
  };

  const existingSlices: OperatorRunSlice[] = batch.slices || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4 sm:p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-300">
              <RotateCcw className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-wide m-0">
                  Continuous Shift Handover Protocol
                </h3>
                <span className="text-[10px] font-extrabold bg-blue-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {stageName} Desk
                </span>
              </div>
              <p className="text-xs text-blue-200/90 mt-0.5 m-0">
                मशीन रोके बिना ऑपरेटर A का उत्पादन व स्क्रैप लॉक करें और ऑपरेटर B को हैंडओवर दें
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800">
          {/* Active Job & Batch Summary Header */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Workstation:</span>
              <span className="font-extrabold text-blue-900">{machine}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Job / Lot ID:</span>
              <span className="font-mono font-extrabold text-indigo-900">{job.id}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Product:</span>
              <span className="font-bold text-slate-800">{job.product}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Batch:</span>
              <span className="font-mono font-bold text-slate-700">{batch.batchId}</span>
            </div>
          </div>

          {/* Slices History Timeline (if multi-shift run) */}
          {existingSlices.length > 0 && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-950 uppercase flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Prior Shift Slices on this Ongoing Batch ({existingSlices.length}):</span>
                </span>
                <span className="text-[10px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                  Cumulative Continuous Run
                </span>
              </div>
              <div className="divide-y divide-indigo-100 max-h-32 overflow-y-auto">
                {existingSlices.map((slice, idx) => (
                  <div key={slice.sliceId || idx} className="py-1.5 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-indigo-900">
                        Shift {idx + 1} ({slice.shift}):
                      </span>
                      <span className="font-bold text-slate-800">{slice.operator}</span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-500">{slice.relievedByOperator}</span>
                    </div>
                    <div className="font-mono text-xs">
                      <span className="font-bold text-emerald-800">{slice.producedQty} {unitLabel}</span>
                      {slice.scrapQty > 0 && (
                        <span className="text-rose-700 ml-1.5">({slice.scrapQty} Scrap)</span>
                      )}
                      <span className="text-slate-400 text-[10px] ml-1.5">@{slice.handoverTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 1: Outgoing Operator Snapshot (Operator A) */}
          <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center">
                  A
                </div>
                <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide m-0">
                  Outgoing Operator Sign-off (कार्यमुक्त होने वाले ऑपरेटर का रिकॉर्ड)
                </h4>
              </div>
              <span className="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                Current: <b>{batch.worker}</b> ({currentShift} Shift)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-blue-600" />
                  <span>Meter / Stroke Counter:</span>
                </label>
                <input
                  type="number"
                  value={meterReadingInput}
                  onChange={(e) => setMeterReadingInput(e.target.value)}
                  placeholder="e.g. 14500"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">हैंडओवर के समय मशीन का मीटर अंक</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-emerald-900 uppercase mb-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{unitLabel} Produced in Shift A:</span>
                </label>
                <input
                  type="number"
                  value={sliceProducedQtyInput}
                  onChange={(e) => setSliceProducedQtyInput(e.target.value)}
                  placeholder={`e.g. 4 ${unitLabel}`}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-extrabold text-emerald-900 outline-none focus:border-emerald-500"
                  required
                />
                {calculatedPieces !== undefined && (
                  <span className="text-[10px] text-emerald-700 font-bold mt-0.5 block">
                    = {calculatedPieces.toLocaleString()} Pieces (नंग)
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-rose-900 uppercase mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Scrap Produced in Shift A:</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={sliceScrapQtyInput}
                  onChange={(e) => setSliceScrapQtyInput(e.target.value)}
                  placeholder="e.g. 1.2"
                  className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs font-extrabold text-rose-900 outline-none focus:border-rose-500"
                />
                <span className="text-[10px] text-rose-600 mt-0.5 block">
                  {stageName === 'Slitting' || stageName === 'Cutting' ? 'किलो में स्क्रैप (Kg)' : 'खराब नंग (Defect Pcs)'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Handover Observations & Machine Status Note:</span>
              </label>
              <textarea
                value={handoverNotes}
                onChange={(e) => setHandoverNotes(e.target.value)}
                placeholder="e.g. Blade alignment OK; 35% jumbo roll remaining; die temperature calibrated at 140°C."
                rows={2}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </div>

          {/* Section 2: Incoming Operator Assignment (Operator B) */}
          <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                  B
                </div>
                <h4 className="text-xs font-black text-blue-950 uppercase tracking-wide m-0">
                  Incoming Relieving Operator (कार्यभार संभालने वाले ऑपरेटर का चयन)
                </h4>
              </div>
              <span className="text-[11px] font-bold text-blue-900 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded">
                Handover Time: <b>{nowTime}</b>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Select Relieving Operator (नया ऑपरेटर):</span>
                </label>
                <select
                  value={relievingOperator}
                  onChange={(e) => {
                    setRelievingOperator(e.target.value);
                    if (e.target.value) setCustomWorkerInput('');
                  }}
                  className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose Operator from List --</option>
                  {availableWorkers
                    .filter((w) => w.trim().toLowerCase() !== batch.worker.trim().toLowerCase())
                    .map((w, wIdx) => (
                      <option key={wIdx} value={w}>
                        👨‍🔧 {w}
                      </option>
                    ))}
                </select>

                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Or Type:</span>
                  <input
                    type="text"
                    value={customWorkerInput}
                    onChange={(e) => {
                      setCustomWorkerInput(e.target.value);
                      if (e.target.value) setRelievingOperator('');
                    }}
                    placeholder="Enter custom operator name..."
                    className="flex-1 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Incoming Shift Schedule:</span>
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setNextShift('DAY')}
                    className={`py-2 px-3 rounded-lg text-xs font-extrabold border transition cursor-pointer flex items-center justify-center gap-1 ${
                      nextShift === 'DAY'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ☀️ DAY SHIFT
                  </button>
                  <button
                    type="button"
                    onClick={() => setNextShift('NIGHT')}
                    className={`py-2 px-3 rounded-lg text-xs font-extrabold border transition cursor-pointer flex items-center justify-center gap-1 ${
                      nextShift === 'NIGHT'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🌙 NIGHT SHIFT
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  अगली शिफ्ट में इस ऑपरेटर के खाते में ही आगे का उत्पादन जुड़ेगा।
                </span>
              </div>
            </div>
          </div>

          {/* Interlocking Confirmation Checkbox */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5">
            <input
              type="checkbox"
              id="handover-confirm"
              checked={handoverConfirmed}
              onChange={(e) => setHandoverConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="handover-confirm" className="text-xs text-emerald-950 font-bold leading-relaxed cursor-pointer select-none">
              <span>Shift Handover Verification:</span>
              <span className="font-normal block text-emerald-800 text-[11px] mt-0.5">
                मैंने मशीन की स्थिति, कच्चा माल बफर, और ऑपरेटर <b>{batch.worker}</b> द्वारा उत्पादित <b>{parsedProduced} {unitLabel}</b> की भौतिक गिनती सत्यापित कर ली है।
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition"
            >
              Cancel (रद्द करें)
            </button>
            <button
              type="submit"
              disabled={!finalRelievingOperator || !handoverConfirmed}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Lock Operator A Slice & Complete Handover</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
