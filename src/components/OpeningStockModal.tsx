import React, { useState } from 'react';
import { X, Check, Database, Layers, Scissors, Cog, SearchCheck, PackageCheck, Box, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { FactoryState, Job, JobReelItem, LogEntry, PackJob, ProductType } from '../types';
import { PRODUCTS, PAPER_BRANDS } from '../lib/constants';

interface OpeningStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: FactoryState;
  onSaveState: (nextState: FactoryState) => void;
}

export const OpeningStockModal: React.FC<OpeningStockModalProps> = ({
  isOpen,
  onClose,
  state,
  onSaveState
}) => {
  const productList = state.products && state.products.length > 0 ? state.products : PRODUCTS;

  // Form State
  const [product, setProduct] = useState<ProductType>(productList[0] as ProductType || 'Spoon');
  const [paperBrand, setPaperBrand] = useState<string>(PAPER_BRANDS[0] || 'ITC');
  const [gsm, setGsm] = useState<string>('280 GSM');
  const [stage, setStage] = useState<'Rolls' | 'Cutting' | 'Forming' | 'QC' | 'Packed'>('Rolls');
  const [qty, setQty] = useState<string>('10');
  const [pcsPerUnit, setPcsPerUnit] = useState<string>('5000');
  const [lotRef, setLotRef] = useState<string>('OPENING-STOCK');
  const [mode, setMode] = useState<'ADD' | 'SET'>('ADD');

  if (!isOpen) return null;

  // Crate capacity defaults
  const getStageDefaultPcs = (st: string) => {
    switch (st) {
      case 'Rolls':
        return '4500';
      case 'Cutting':
        return '10000';
      case 'Forming':
        return '7000';
      case 'QC':
        return '7000';
      case 'Packed':
        return '1000';
      default:
        return '5000';
    }
  };

  const handleStageChange = (newStage: 'Rolls' | 'Cutting' | 'Forming' | 'QC' | 'Packed') => {
    setStage(newStage);
    setPcsPerUnit(getStageDefaultPcs(newStage));
  };

  const parsedQty = parseFloat(qty) || 0;
  const parsedPcsPerUnit = parseInt(pcsPerUnit, 10) || 0;
  const totalPieces = Math.round(parsedQty * parsedPcsPerUnit);

  const getStageUnitLabel = () => {
    switch (stage) {
      case 'Rolls':
        return 'Rolls (रोल्स)';
      case 'Cutting':
      case 'Forming':
      case 'QC':
        return 'Crates (क्रेट्स)';
      case 'Packed':
        return 'Boxes (डिब्बे)';
      default:
        return 'Units';
    }
  };

  const handleSaveOpeningStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedQty < 0) {
      alert('⚠️ संख्या 0 या उससे अधिक होनी चाहिए।');
      return;
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const todayStr = new Date().toISOString().split('T')[0];
    const cleanLot = lotRef.trim() || `OPENING-${product.toUpperCase()}`;

    let updatedJobs = [...state.jobs];
    let updatedPackJobs = [...(state.packJobs || [])];

    if (stage === 'Packed') {
      // Stage 5: Ready Packed Boxes (Managed in packJobs)
      const existingPackJob = updatedPackJobs.find(
        (pj) => (pj.kitType === product || pj.kitItems?.includes(product)) && pj.customer.includes('OPENING')
      ) || updatedPackJobs.find((pj) => pj.kitType === product);

      if (existingPackJob) {
        updatedPackJobs = updatedPackJobs.map((pj) => {
          if (pj.id === existingPackJob.id) {
            const currentBoxes = pj.packedBoxes || 0;
            const newBoxes = mode === 'ADD' ? currentBoxes + parsedQty : parsedQty;
            return {
              ...pj,
              packedBoxes: newBoxes,
              pcsPerBox: parsedPcsPerUnit || pj.pcsPerBox || 1000
            };
          }
          return pj;
        });
      } else {
        const newPackJob: PackJob = {
          id: `ORD-OPEN-${Date.now().toString().slice(-4)}`,
          customer: 'OPENING STOCK REPOSITORY',
          kitType: product,
          orderQty: Math.max(100000, totalPieces),
          packedBoxes: parsedQty,
          dispatchedBoxes: 0,
          pcsPerBox: parsedPcsPerUnit || 1000,
          status: 'PENDING',
          dispatchDate: todayStr,
          packType: 'INDIVIDUAL',
          kitItems: [product],
          wrapping: 'Standard Bulk Box'
        };
        updatedPackJobs = [newPackJob, ...updatedPackJobs];
      }
    } else {
      // Stage 1 to 4: Slit Rolls, Cutting Crates, Forming Crates, QC Crates (Managed in Jobs)
      let targetJob = updatedJobs.find(
        (j) => j.product === product && (j.reelNo?.includes('OPENING') || j.id.includes('OPENING'))
      ) || updatedJobs.find((j) => j.product === product);

      if (targetJob) {
        updatedJobs = updatedJobs.map((j) => {
          if (j.id === targetJob!.id) {
            const currentRolls = j.availableRolls || 0;
            const currentCut = j.availableCuttingCrates || 0;
            const currentForm = j.availableFormingCrates || 0;
            const currentQC = j.availableQcCrates || 0;

            let nextRolls = currentRolls;
            let nextCut = currentCut;
            let nextForm = currentForm;
            let nextQC = currentQC;

            if (stage === 'Rolls') {
              nextRolls = mode === 'ADD' ? currentRolls + parsedQty : parsedQty;
            } else if (stage === 'Cutting') {
              nextCut = mode === 'ADD' ? currentCut + parsedQty : parsedQty;
            } else if (stage === 'Forming') {
              nextForm = mode === 'ADD' ? currentForm + parsedQty : parsedQty;
            } else if (stage === 'QC') {
              nextQC = mode === 'ADD' ? currentQC + parsedQty : parsedQty;
            }

            return {
              ...j,
              availableRolls: nextRolls,
              availableCuttingCrates: nextCut,
              availableFormingCrates: nextForm,
              availableQcCrates: nextQC,
              paperBrand: paperBrand || j.paperBrand,
              gsm: gsm || j.gsm
            };
          }
          return j;
        });
      } else {
        // Create a new dedicated Opening Stock Job
        const newJobId = `JOB-OPN-${product.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        const initialReelItem: JobReelItem = {
          reelNo: cleanLot,
          rolls: stage === 'Rolls' ? parsedQty : 0,
          weightKg: Math.round(parsedQty * 15),
          gsm,
          paperBrand,
          batchId: `B-OPN-1`,
          startTime: nowTime,
          worker: 'PLANT_ADMIN'
        };

        const newJob: Job = {
          id: newJobId,
          product,
          paperBrand,
          reelNo: cleanLot,
          reelNumbers: [cleanLot],
          reelsList: [initialReelItem],
          gsm,
          customRemark: 'Initial Opening Stock Entry',
          stage: stage === 'Rolls' ? 'Slitting' : stage === 'Cutting' ? 'Cutting' : stage === 'Forming' ? 'Forming' : 'QC',
          availableRolls: stage === 'Rolls' ? parsedQty : 0,
          availableCuttingCrates: stage === 'Cutting' ? parsedQty : 0,
          availableFormingCrates: stage === 'Forming' ? parsedQty : 0,
          availableQcCrates: stage === 'QC' ? parsedQty : 0,
          totalCutPieces: stage === 'Cutting' ? totalPieces : 0,
          totalFormedPieces: stage === 'Forming' ? totalPieces : 0,
          runningBatches: []
        };
        updatedJobs = [newJob, ...updatedJobs];
      }
    }

    // Add Audit Log
    const newLog: LogEntry = {
      jobId: cleanLot,
      product,
      stage: `Stock Adjustment`,
      machine: 'Main Floor',
      action: `⚡ Opening Stock Updated: ${product} [Stage: ${stage}] -> ${parsedQty} ${getStageUnitLabel()} (${totalPieces.toLocaleString()} Pcs) [Mode: ${mode === 'ADD' ? 'Added' : 'Set Exact'}]. Ref: ${cleanLot}`,
      user: 'admin',
      startTime: nowTime,
      rawDate: todayStr,
      timestamp: new Date().toLocaleString()
    };

    onSaveState({
      ...state,
      jobs: updatedJobs,
      packJobs: updatedPackJobs,
      logs: [newLog, ...(state.logs || [])]
    });

    alert(`✅ प्रारंभिक स्टॉक सफलतापूर्वक अपडेट किया गया!\nउत्पाद: ${product}\nस्टेज: ${stage}\nमात्रा: ${parsedQty} ${getStageUnitLabel()} (${totalPieces.toLocaleString()} अनुमानित पीस)\nलाइव स्टॉक मैट्रिक्स रिफ्रेश हो गया है।`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 sm:p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight uppercase m-0 flex items-center gap-2">
                <span>⚡ Quick Opening Stock Entry</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">1-Click Live Update</span>
              </h3>
              <p className="text-xs text-emerald-100 font-medium m-0">
                किसी भी आइटम या स्टेज के लिए प्रारंभिक स्टॉक सीधे दर्ज या अपडेट करें
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSaveOpeningStock} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* 1. Select Product */}
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase mb-1">
              1. उत्पाद चुनें (Select Product): *
            </label>
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value as ProductType)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
            >
              {productList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Brand & GSM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                पेपर मिल / ब्रांड (Mill):
              </label>
              <select
                value={paperBrand}
                onChange={(e) => setPaperBrand(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-emerald-600"
              >
                {PAPER_BRANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                GSM Thickness:
              </label>
              <input
                type="text"
                value={gsm}
                onChange={(e) => setGsm(e.target.value)}
                placeholder="e.g. 280 GSM"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* 3. Stage Selector */}
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase mb-1.5 flex items-center justify-between">
              <span>2. स्टॉक स्टेज चुनें (Select Production Stage): *</span>
              <span className="text-[11px] font-bold text-emerald-700">वर्तमान चयन: {stage}</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => handleStageChange('Rolls')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  stage === 'Rolls'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-indigo-50/50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span className="text-[11px] font-black leading-tight">1. Slit Rolls</span>
                <span className="text-[9px] opacity-80">स्लिट रोल्स</span>
              </button>

              <button
                type="button"
                onClick={() => handleStageChange('Cutting')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  stage === 'Cutting'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-purple-50/50 text-purple-900 border-purple-200 hover:bg-purple-100'
                }`}
              >
                <Scissors className="w-4 h-4" />
                <span className="text-[11px] font-black leading-tight">2. Cut Crates</span>
                <span className="text-[9px] opacity-80">कटिंग क्रेट्स</span>
              </button>

              <button
                type="button"
                onClick={() => handleStageChange('Forming')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  stage === 'Forming'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-50/50 text-amber-900 border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Cog className="w-4 h-4" />
                <span className="text-[11px] font-black leading-tight">3. Formed Crates</span>
                <span className="text-[9px] opacity-80">फॉर्मिंग क्रेट्स</span>
              </button>

              <button
                type="button"
                onClick={() => handleStageChange('QC')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  stage === 'QC'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-emerald-50/50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <SearchCheck className="w-4 h-4" />
                <span className="text-[11px] font-black leading-tight">4. QC Pass</span>
                <span className="text-[9px] opacity-80">पास क्रेट्स</span>
              </button>

              <button
                type="button"
                onClick={() => handleStageChange('Packed')}
                className={`p-2.5 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1 col-span-2 sm:col-span-1 ${
                  stage === 'Packed'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-blue-50/50 text-blue-900 border-blue-200 hover:bg-blue-100'
                }`}
              >
                <PackageCheck className="w-4 h-4" />
                <span className="text-[11px] font-black leading-tight">5. Packed</span>
                <span className="text-[9px] opacity-80">तैयार डिब्बे</span>
              </button>
            </div>
          </div>

          {/* 4. Quantity & Pieces calculation */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase mb-1">
                  ओपनिंग स्टॉक संख्या ({getStageUnitLabel()}): *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full px-3 py-2 bg-white border-2 border-emerald-300 rounded-lg text-sm font-black text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  अनुमानित पीस प्रति {stage === 'Rolls' ? 'रोल' : stage === 'Packed' ? 'बॉक्स' : 'क्रेट'} (Pcs/Unit):
                </label>
                <input
                  type="number"
                  min="1"
                  value={pcsPerUnit}
                  onChange={(e) => setPcsPerUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            {/* Total Estimated Pieces Live Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900">
                कुल अनुमानित पीस (Total Equivalent Pieces):
              </span>
              <span className="text-sm font-black text-emerald-950 font-mono">
                {totalPieces.toLocaleString()} Pcs
              </span>
            </div>
          </div>

          {/* 5. Identifier / Lot Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                लॉट / रील संदर्भ (Lot Reference):
              </label>
              <input
                type="text"
                value={lotRef}
                onChange={(e) => setLotRef(e.target.value.toUpperCase())}
                placeholder="e.g. OPENING-STOCK-01"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none uppercase focus:border-emerald-600"
              />
            </div>

            {/* 6. Mode: ADD vs SET */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                अपडेट का प्रकार (Action Mode):
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode('ADD')}
                  className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg border transition cursor-pointer text-center ${
                    mode === 'ADD'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  + Add to Existing (जोड़ें)
                </button>
                <button
                  type="button"
                  onClick={() => setMode('SET')}
                  className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg border transition cursor-pointer text-center ${
                    mode === 'SET'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Set Exact Balance (नया कुल)
                </button>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
            >
              रद्द करें (Cancel)
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shadow-md hover:shadow-lg cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>💾 Save Opening Stock (ओपनिंग स्टॉक सेव करें)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
