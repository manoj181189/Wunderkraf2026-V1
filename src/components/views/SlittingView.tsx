import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, Play, Pause, Square, XCircle, Plus, AlertCircle, Check, Search, Tag, ShieldCheck, Layers, Eye, AlertTriangle, RotateCcw, Calendar, Clock } from 'lucide-react';
import { FactoryState, Job, JobReelItem, ProductType, RunningBatch, OperatorRunSlice, LogEntry } from '../../types';
import { PRODUCTS, PAPER_BRANDS, DEPT_WORKERS, PRODUCT_PREFIX_MAP } from '../../lib/constants';
import {
  getCurrentExpectedShift,
  getJobAllReels,
  getJobReelsSummary,
  getJobReelItemsBreakdown,
  formatGsmString,
  getJobAllGsms,
  getJobGsmsSummary
} from '../../lib/utils';

import { MachineBreakdownBanner } from '../MachineBreakdownBanner';
import { LotGenealogyModal } from '../LotGenealogyModal';
import { ShiftHandoverModal } from '../ShiftHandoverModal';

interface SlittingViewProps {
  state: FactoryState;
  onBackToHub: () => void;
  onSaveState: (state: FactoryState) => void;
  onOpenHoldModal: (machineName: string) => void;
  onOpenAttendModal?: (machineName: string) => void;
  onOpenVoiceModalForTarget?: (callback: (text: string) => void) => void;
  onNavigateToTraceability?: (query: string) => void;
}

export const SlittingView: React.FC<SlittingViewProps> = ({
  state,
  onBackToHub,
  onSaveState,
  onOpenHoldModal,
  onOpenAttendModal,
  onOpenVoiceModalForTarget,
  onNavigateToTraceability
}) => {
  const { jobs, seriesConfig, shiftConfig } = state;
  const productList = state.products && state.products.length > 0 ? state.products : PRODUCTS;
  const paperBrandList = state.paperBrands && state.paperBrands.length > 0 ? state.paperBrands : PAPER_BRANDS;
  const slitWorkers = state.deptWorkers?.['Slitting'] || DEPT_WORKERS['Slitting'] || ['SLIT_RAMESH', 'SLIT_SURESH'];

  const [product, setProduct] = useState<ProductType>(productList[0] || 'Spoon');
  const [paperBrand, setPaperBrand] = useState(paperBrandList[0] || 'ITC');
  const [operatorName, setOperatorName] = useState(slitWorkers[0] || 'SLIT_RAMESH');
  const [shift, setShift] = useState<'DAY' | 'NIGHT'>(() => getCurrentExpectedShift(shiftConfig));
  
  // Separate Reel Number, GSM, and Remarks
  const [reelNo, setReelNo] = useState('');
  const [gsm, setGsm] = useState('280 GSM');
  const [customGsm, setCustomGsm] = useState('');
  const [reelRemarks, setReelRemarks] = useState('');
  const [jumboWeightKg, setJumboWeightKg] = useState('200');

  const [outputRolls, setOutputRolls] = useState('');
  const [outputWeightKg, setOutputWeightKg] = useState('');
  const [scrapKgInput, setScrapKgInput] = useState('');
  const [selectedActiveBatchId, setSelectedActiveBatchId] = useState('');

  // Table filter search
  const [tableSearch, setTableSearch] = useState('');

  // Genealogy Modal Job State
  const [genealogyModalJob, setGenealogyModalJob] = useState<Job | null>(null);

  // Shift Handover Modal State
  const [isShiftHandoverModalOpen, setIsShiftHandoverModalOpen] = useState(false);

  // Modals
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isAddReelModalOpen, setIsAddReelModalOpen] = useState(false);
  const [addReelJobId, setAddReelJobId] = useState('');
  const [addReelWorker, setAddReelWorker] = useState(slitWorkers[0] || 'SLIT_RAMESH');
  const [addReelNo, setAddReelNo] = useState('');
  const [addReelGsm, setAddReelGsm] = useState('280 GSM');
  const [addReelRemarks, setAddReelRemarks] = useState('');
  const [addReelWeightKg, setAddReelWeightKg] = useState('200');

  // Find all active / held batches on Slitting-1
  const activeBatches: Array<{ job: Job; batch: RunningBatch }> = [];
  jobs.forEach((j) => {
    if (j.runningBatches) {
      j.runningBatches.forEach((b) => {
        if (b.machine === 'Slitting-1' && (b.status === 'Running' || b.status === 'Held')) {
          activeBatches.push({ job: j, batch: b });
        }
      });
    }
  });

  const activeBatchObj =
    activeBatches.find((item) => item.batch?.batchId === selectedActiveBatchId) || activeBatches[0];

  // Single Active Job restriction: Only 1 job can be 'Running' on Slitting-1 at any time
  const currentRunningBatch = activeBatches.find((item) => item.batch.status === 'Running');

  const handleStartNewReel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorName.trim()) {
      alert('⚠️ Mandatory: Operator Name is required!');
      return;
    }

    // Strict Single Active Job Constraint
    if (currentRunningBatch) {
      alert(
        `⚠️ सिंगल एक्टिव जॉब प्रतिबंध (Single Active Job Constraint):\n\nमशीन [Slitting-1] पर पहले से जॉब [${currentRunningBatch.job.id}] (रील: ${currentRunningBatch.batch.reelNo || currentRunningBatch.job.reelNo}) रनिंग स्थिति में है!\n\nएक मशीन पर एक समय में केवल एक ही एक्टिव जॉब चल सकता है। जब तक वर्तमान जॉब को 'Hold' या 'Complete' नहीं किया जाता, तब तक उसी मशीन पर कोई भी नया जॉब स्टार्ट (Run) नहीं होना चाहिए।\n\n👉 अगर इसी जॉब में अतिरिक्त रील जोड़नी है, तो 'Add Reel to Running Job' विकल्प का उपयोग करें (बिना जॉब रोके/होल्ड किए)।`
      );
      return;
    }

    const prefixMap: Record<string, string> = {
      ...PRODUCT_PREFIX_MAP,
      ...(state.productPrefixMap || {})
    };
    let prefix = prefixMap[product] || product.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'ITM';
    if (!prefix.endsWith('-')) prefix += '-';

    const currentSeq = (seriesConfig.productSeqs && seriesConfig.productSeqs[product]) || 1;
    const formattedSeq = String(currentSeq).padStart(3, '0');
    const newJobId = `${prefix}${formattedSeq}`;

    const batchId = 'B-' + Math.floor(1000 + Math.random() * 9000);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Effective GSM
    const effectiveGsm = gsm === 'Custom' ? (customGsm.trim() || '280 GSM') : gsm;
    // Effective Reel Number
    const effectiveReelNo =
      reelNo.trim() ||
      `RL-${paperBrand.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'ITC'}-${Math.floor(1000 + Math.random() * 9000)}`;

    const parsedJumboWeight = parseFloat(jumboWeightKg) || 0;
    if (parsedJumboWeight <= 0) {
      alert('⚠️ Mandatory: Jumbo Reel Weight (KG) is required before starting slitting!');
      return;
    }

    const newBatch: RunningBatch = {
      batchId,
      stage: 'Slitting',
      machine: 'Slitting-1',
      shift,
      startTime: nowTime,
      status: 'Running',
      reelNo: effectiveReelNo,
      gsm: effectiveGsm,
      issuedQty: 1,
      producedQty: 0,
      inputWeightKg: parsedJumboWeight,
      outputWeightKg: 0,
      scrapKg: 0,
      scrapPercent: 0,
      worker: operatorName.trim().toUpperCase(),
      user: 'slit_user'
    };

    const initialReelItem: JobReelItem = {
      reelNo: effectiveReelNo,
      rolls: 0,
      weightKg: parsedJumboWeight,
      gsm: effectiveGsm,
      paperBrand,
      batchId,
      startTime: nowTime,
      worker: operatorName.trim().toUpperCase()
    };

    const newJob: Job = {
      id: newJobId,
      product,
      paperBrand,
      reelNo: effectiveReelNo,
      reelNumbers: [effectiveReelNo],
      reelsList: [initialReelItem],
      gsm: effectiveGsm,
      customRemark: reelRemarks.trim(),
      stage: 'Slitting',
      availableRolls: 0,
      availableCuttingCrates: 0,
      availableFormingCrates: 0,
      availableQcCrates: 0,
      inputWeightKg: parsedJumboWeight,
      outputWeightKg: 0,
      scrapKg: 0,
      scrapPercent: 0,
      runningBatches: [newBatch]
    };

    const newLog = {
      jobId: newJobId,
      product,
      stage: 'Slitting',
      machine: 'Slitting-1',
      shift,
      action: `🚀 Started New Slitting Reel [${effectiveReelNo}] | Jumbo Weight: ${parsedJumboWeight} KG | GSM: ${effectiveGsm} | Mill: ${paperBrand} (${reelRemarks || 'Standard Reel'}) | Job: ${newJobId} | Worker: ${operatorName.toUpperCase()}`,
      worker: operatorName.toUpperCase(),
      user: 'slit_user',
      startTime: nowTime,
      rawDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    };

    const nextSeqs = {
      ...seriesConfig.productSeqs,
      [product]: currentSeq + 1
    };

    onSaveState({
      ...state,
      jobs: [newJob, ...state.jobs],
      logs: [...state.logs, newLog],
      seriesConfig: {
        ...seriesConfig,
        productSeqs: nextSeqs
      }
    });

    setReelNo('');
    setReelRemarks('');
    setSelectedActiveBatchId(batchId);
    alert(`✅ New Slitting Reel Started!\nJob ID: [${newJobId}]\nReel No: [${effectiveReelNo}]\nGSM: [${effectiveGsm}]\non Slitting-1.`);
  };

  const handleConfirmAddReelToJob = () => {
    if (!addReelJobId) {
      alert('Please select an existing Job ID!');
      return;
    }
    const targetJob = jobs.find((j) => j.id === addReelJobId);
    if (!targetJob) {
      alert(`Job [${addReelJobId}] not found in database!`);
      return;
    }
    if (!addReelWorker.trim()) {
      alert('Please enter operator name!');
      return;
    }

    // If a job is currently running on Slitting-1, operator can only add reel to THAT running job!
    if (currentRunningBatch && currentRunningBatch.job.id !== targetJob.id) {
      alert(
        `⚠️ सिंगल एक्टिव जॉब प्रतिबंध (Single Active Job Constraint):\n\nमशीन [Slitting-1] पर अभी जॉब [${currentRunningBatch.job.id}] रनिंग है! आप केवल इसी एक्टिव जॉब [${currentRunningBatch.job.id}] में अतिरिक्त रील Add-on कर सकते हैं।\n\nकिसी अन्य जॉब [${targetJob.id}] को रन करने के लिए पहले वर्तमान जॉब को 'Hold' या 'Complete' करें!`
      );
      return;
    }

    const batchId = 'B-' + Math.floor(1000 + Math.random() * 9000);
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const effectiveReelNo =
      addReelNo.trim() ||
      `RL-${(targetJob.paperBrand || 'ITC').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const effectiveGsm = addReelGsm.trim() || targetJob.gsm || '280 GSM';
    const parsedAddWeight = parseFloat(addReelWeightKg) || 0;

    const newBatch: RunningBatch = {
      batchId,
      stage: 'Slitting',
      machine: 'Slitting-1',
      shift,
      startTime: nowTime,
      status: 'Running',
      reelNo: effectiveReelNo,
      gsm: effectiveGsm,
      issuedQty: 1,
      producedQty: 0,
      inputWeightKg: parsedAddWeight,
      outputWeightKg: 0,
      scrapKg: 0,
      scrapPercent: 0,
      worker: addReelWorker.trim().toUpperCase(),
      user: 'slit_user'
    };

    const existingReels = getJobAllReels(targetJob);
    const updatedReelNumbers = Array.from(new Set([...existingReels, effectiveReelNo]));
    const combinedReelNoStr = updatedReelNumbers.join(', ');

    const existingGsms = getJobAllGsms(targetJob);
    const updatedGsmList = Array.from(new Set([...existingGsms, formatGsmString(effectiveGsm)]));
    const combinedGsmStr = updatedGsmList.join(' + ');

    const newReelItem: JobReelItem = {
      reelNo: effectiveReelNo,
      rolls: 0,
      weightKg: parsedAddWeight,
      gsm: formatGsmString(effectiveGsm),
      paperBrand: targetJob.paperBrand,
      batchId,
      startTime: nowTime,
      worker: addReelWorker.trim().toUpperCase(),
      customRemark: addReelRemarks.trim()
    };

    const existingReelsList = targetJob.reelsList && targetJob.reelsList.length > 0
      ? targetJob.reelsList
      : getJobReelItemsBreakdown(targetJob);

    const updatedReelsList = [...existingReelsList, newReelItem];

    const updatedJobs = jobs.map((j) => {
      if (j.id !== targetJob.id) return j;
      const combinedRemarks = addReelRemarks.trim()
        ? j.customRemark
          ? `${j.customRemark}; ${addReelRemarks.trim()}`
          : addReelRemarks.trim()
        : j.customRemark;
      return {
        ...j,
        reelNo: combinedReelNoStr,
        reelNumbers: updatedReelNumbers,
        reelsList: updatedReelsList,
        gsm: combinedGsmStr,
        gsmList: updatedGsmList,
        gsmsSummary: combinedGsmStr,
        customRemark: combinedRemarks,
        inputWeightKg: (j.inputWeightKg || 0) + parsedAddWeight,
        runningBatches: [...(j.runningBatches || []), newBatch]
      };
    });

    const newLog = {
      jobId: targetJob.id,
      product: targetJob.product,
      stage: 'Slitting Re-open',
      machine: 'Slitting-1',
      shift,
      action: `➕ Added Reel [${effectiveReelNo}] (Weight: ${parsedAddWeight} KG | GSM: ${effectiveGsm}) to Existing Job ${targetJob.id} | Worker: ${addReelWorker.toUpperCase()}`,
      worker: addReelWorker.toUpperCase(),
      user: 'slit_user',
      startTime: nowTime,
      rawDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    };

    onSaveState({
      ...state,
      jobs: updatedJobs,
      logs: [...state.logs, newLog]
    });

    setIsAddReelModalOpen(false);
    setAddReelNo('');
    setAddReelRemarks('');
    setSelectedActiveBatchId(batchId);
    alert(`✅ Added Reel [${effectiveReelNo}] (Batch ${batchId}) to existing job [${targetJob.id}]!`);
  };

  const handleResumeSlitting = () => {
    if (!activeBatchObj) return alert('No active or held slitting batch!');
    const { job, batch } = activeBatchObj;
    if (batch.status === 'Running') return alert('This job is already running on Slitting-1.');

    // Single active job constraint: cannot resume if another job is currently Running on Slitting-1
    const otherRunning = activeBatches.find(
      (b) => b.batch.status === 'Running' && b.job.id !== job.id
    );
    if (otherRunning) {
      alert(
        `⚠️ सिंगल एक्टिव जॉब प्रतिबंध (Single Active Job Constraint):\n\nमशीन [Slitting-1] पर पहले से जॉब [${otherRunning.job.id}] (रील: ${otherRunning.batch.reelNo || otherRunning.job.reelNo}) रनिंग स्थिति में है!\n\nएक समय में केवल एक ही जॉब रन हो सकता है। कृपया पहले जॉब [${otherRunning.job.id}] को Hold या Finish करें!`
      );
      return;
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const updatedJobs = jobs.map((j) => {
      if (j.id !== job.id) return j;
      return {
        ...j,
        runningBatches: (j.runningBatches || []).map((b) => {
          if (b.batchId !== batch.batchId) return b;
          return { ...b, status: 'Running', endTime: undefined, holdReason: undefined };
        })
      };
    });

    const newLog = {
      jobId: job.id,
      product: job.product,
      stage: 'Slitting',
      machine: 'Slitting-1',
      shift: batch.shift,
      action: `▶️ Slitting Resumed from Pause/Hold | Worker: ${batch.worker}`,
      worker: batch.worker,
      user: 'slit_user',
      startTime: nowTime,
      rawDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    };

    onSaveState({
      ...state,
      jobs: updatedJobs,
      logs: [...state.logs, newLog]
    });

    alert(`▶️ Slitting Job [${job.id}] resumed to RUNNING state!`);
  };

  const handleConfirmShiftHandover = (handoverData: {
    relievedByOperator: string;
    nextShift: 'DAY' | 'NIGHT' | string;
    handoverTime: string;
    meterReading: number;
    sliceProducedQty: number;
    sliceProducedPieces?: number;
    sliceScrapQty: number;
    handoverNotes: string;
  }) => {
    if (!activeBatchObj) return;
    const { job, batch } = activeBatchObj;

    const newSlice: OperatorRunSlice = {
      sliceId: `SLICE-SLIT-${Date.now()}`,
      operator: batch.worker,
      relievedByOperator: handoverData.relievedByOperator,
      shift: batch.shift || 'DAY',
      startTime: batch.startTime,
      handoverTime: handoverData.handoverTime,
      startMeterReading: batch.startMeterReading || batch.meterReading,
      endMeterReading: handoverData.meterReading,
      strokeCount: handoverData.meterReading,
      producedQty: handoverData.sliceProducedQty,
      scrapQty: handoverData.sliceScrapQty,
      notes: handoverData.handoverNotes,
      handoverConfirmed: true
    };

    const updatedBatches = (job.runningBatches || []).map((b) => {
      if (b.batchId === batch.batchId) {
        return {
          ...b,
          worker: handoverData.relievedByOperator,
          shift: handoverData.nextShift,
          meterReading: handoverData.meterReading,
          startMeterReading: handoverData.meterReading,
          producedQty: (b.producedQty || 0) + handoverData.sliceProducedQty,
          scrapKg: (b.scrapKg || 0) + handoverData.sliceScrapQty,
          slices: [...(b.slices || []), newSlice]
        };
      }
      return b;
    });

    const updatedJobs = jobs.map((j) => {
      if (j.id !== job.id) return j;
      return {
        ...j,
        availableRolls: (j.availableRolls || 0) + handoverData.sliceProducedQty,
        runningBatches: updatedBatches
      };
    });

    const handoverLog: LogEntry = {
      jobId: job.id,
      product: job.product,
      stage: 'Slitting',
      machine: 'Slitting-1',
      shift: handoverData.nextShift,
      action: `🔄 Shift Handover: Operator [${batch.worker}] handed over active run [${batch.batchId}] to [${handoverData.relievedByOperator}] (${handoverData.nextShift}). Locked slice: ${handoverData.sliceProducedQty} Rolls, ${handoverData.sliceScrapQty}kg Scrap, Meter: ${handoverData.meterReading || 'N/A'}.`,
      worker: handoverData.relievedByOperator,
      user: 'slitting_supervisor',
      rawDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    };

    onSaveState({
      ...state,
      jobs: updatedJobs,
      logs: [handoverLog, ...(state.logs || [])]
    });

    setOutputRolls('');
    setOutputWeightKg('');
    setScrapKgInput('');
    setOperatorName(handoverData.relievedByOperator);
    setShift(handoverData.nextShift as 'DAY' | 'NIGHT');
    setIsShiftHandoverModalOpen(false);
    alert(`✅ Shift Handover Complete! Ongoing batch transferred from ${batch.worker} to ${handoverData.relievedByOperator} without stopping. ${handoverData.sliceProducedQty} Slit Rolls locked to ${batch.worker}.`);
  };

  const handleCompleteSlitting = () => {
    if (!activeBatchObj) return alert('No active slitting batch to finish!');
    const rollsCount = parseInt(outputRolls, 10) || 0;
    const weightKg = parseFloat(outputWeightKg) || 0;

    if (rollsCount <= 0) return alert('Please enter output rolls count (at least 1)!');
    if (weightKg <= 0) {
      alert('⚠️ Mandatory Field Missing: Output Weight in KG is required before finishing slitting!');
      return;
    }

    const { job, batch } = activeBatchObj;
    const inputWeight = batch.inputWeightKg || job.inputWeightKg || 200;

    // Strict physical impossibility check
    if (weightKg > inputWeight) {
      alert(
        `⛔ भौतिक रूप से असंभव (Physical Impossibility Error)!\n\n` +
        `• जंबो रील इनपुट वजन: ${inputWeight} KG\n` +
        `• दर्ज किया गया आउटपुट वजन: ${weightKg} KG\n\n` +
        `200 KG रॉ मटेरियल दिया तो 210 KG आउटपुट कैसे बन सकता है? आउटपुट वजन कभी भी इनपुट वजन (${inputWeight} KG) से अधिक नहीं हो सकता। कम हो सकता है वेस्टेज होके।\n\n` +
        `कृपया कांटे का सही वजन देखकर दर्ज करें!`
      );
      return;
    }

    const calculatedScrapKg = Math.max(0, Number((inputWeight - weightKg).toFixed(2)));
    const finalScrapKg = scrapKgInput.trim() !== '' ? Math.max(0, parseFloat(scrapKgInput) || 0) : calculatedScrapKg;

    if (weightKg + finalScrapKg > inputWeight + 0.1) {
      alert(
        `⛔ वजन असंतुलन (Weight Balance Error)!\n\n` +
        `आउटपुट वजन (${weightKg} KG) + वेस्टेज स्क्रैप (${finalScrapKg} KG) = ${(weightKg + finalScrapKg).toFixed(1)} KG\n` +
        `यह कुल इनपुट वजन (${inputWeight} KG) से अधिक है!\n\n` +
        `कृपया सही आउटपुट और स्क्रैप वजन दर्ज करें!`
      );
      return;
    }

    const stopTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const finalScrapPercent = inputWeight > 0 ? Number(((finalScrapKg / inputWeight) * 100).toFixed(2)) : 0;

    const updatedJobs = jobs.map((j) => {
      if (j.id !== job.id) return j;
      const prevScrap = j.scrapKg || 0;
      const prevOutKg = j.outputWeightKg || 0;
      const newOutKg = prevOutKg + weightKg;
      const newScrapKg = prevScrap + finalScrapKg;
      const totalInKg = j.inputWeightKg || inputWeight;
      const totalScrapPct = totalInKg > 0 ? Number(((newScrapKg / totalInKg) * 100).toFixed(2)) : finalScrapPercent;

      const allReels = getJobAllReels(j);
      const effectiveReelNumbers = allReels.length > 0 ? allReels : [batch.reelNo || j.reelNo || ''];

      const existingList = j.reelsList && j.reelsList.length > 0 ? j.reelsList : getJobReelItemsBreakdown(j);
      const updatedReelsList = existingList.map((rItem) => {
        if (rItem.batchId === batch.batchId || (batch.reelNo && rItem.reelNo === batch.reelNo)) {
          return {
            ...rItem,
            rolls: (rItem.rolls || 0) + rollsCount,
            outputWeightKg: (rItem.outputWeightKg || 0) + weightKg,
            scrapKg: (rItem.scrapKg || 0) + finalScrapKg,
            endTime: stopTime,
            worker: batch.worker
          };
        }
        return rItem;
      });

      return {
        ...j,
        reelNo: effectiveReelNumbers.join(', '),
        reelNumbers: effectiveReelNumbers,
        reelsList: updatedReelsList,
        availableRolls: (j.availableRolls || 0) + rollsCount,
        stage: 'Slitting Completed',
        outputWeightKg: newOutKg,
        scrapKg: newScrapKg,
        scrapPercent: totalScrapPct,
        runningBatches: (j.runningBatches || []).map((b) => {
          if (b.batchId !== batch.batchId) return b;
          return {
            ...b,
            status: 'Completed',
            endTime: stopTime,
            producedQty: rollsCount,
            inputWeightKg: inputWeight,
            outputWeightKg: weightKg,
            scrapKg: finalScrapKg,
            scrapPercent: finalScrapPercent
          };
        })
      };
    });

    const newLog = {
      jobId: job.id,
      product: job.product,
      stage: 'Slitting',
      machine: 'Slitting-1',
      shift: batch.shift,
      action: `⏹ Slitting Finished (${rollsCount} Rolls, ${weightKg} KG Output | Jumbo In: ${inputWeight} KG | Scrap: ${finalScrapKg} KG (${finalScrapPercent}% Wastage))`,
      worker: batch.worker,
      user: 'slit_user',
      startTime: batch.startTime,
      endTime: stopTime,
      rawDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    };

    onSaveState({
      ...state,
      jobs: updatedJobs,
      logs: [...state.logs, newLog]
    });

    setOutputRolls('');
    setOutputWeightKg('');
    setScrapKgInput('');
    setSelectedActiveBatchId('');
    alert(`✅ Slitting Finished!\n• Output: ${rollsCount} Rolls (${weightKg} KG)\n• Jumbo Loaded: ${inputWeight} KG\n• Scrap Wastage: ${finalScrapKg} KG (${finalScrapPercent}%)\nLogged to Total Traceability and Inventory!`);
  };

  const handleConfirmCancelRun = () => {
    if (!activeBatchObj) return;
    const { job, batch } = activeBatchObj;

    const updatedJobs = jobs.map((j) => {
      if (j.id !== job.id) return j;
      return {
        ...j,
        runningBatches: (j.runningBatches || []).filter((b) => b.batchId !== batch.batchId)
      };
    });

    const newLog = {
      jobId: job.id,
      product: job.product,
      stage: 'Slitting Cancelled',
      machine: 'Slitting-1',
      shift: batch.shift,
      action: `❌ Slitting Run Cancelled & Reverted (Batch ${batch.batchId} deleted)`,
      worker: batch.worker,
      user: 'slit_user',
      rawDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    };

    onSaveState({
      ...state,
      jobs: updatedJobs,
      logs: [...state.logs, newLog]
    });

    setIsCancelConfirmOpen(false);
    setSelectedActiveBatchId('');
    alert('✅ Slitting run cancelled and batch removed.');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs mb-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
        <button
          onClick={onBackToHub}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Main Menu</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#1a365d] uppercase tracking-wide m-0">
              1. Slitting Desk (Jumbo Reel to Slit Rolls)
            </h3>
            <p className="text-[11px] text-slate-500 m-0">
              Jumbo Reel Auto Numbering, Slitting Machine Operations & Rolls Log
            </p>
          </div>
        </div>
      </div>

      {/* Machine Breakdown & Technician Live Attendance Banner */}
      <MachineBreakdownBanner
        machineName="Slitting-1"
        state={state}
        onOpenAttendModal={onOpenAttendModal || onOpenHoldModal}
        onOpenHoldModal={onOpenHoldModal}
      />

      {/* Active Batches Selector */}
      {activeBatches.length > 0 && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase">
              Active / Held Slitting Batches on Slitting-1 ({activeBatches.length}):
            </label>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                activeBatchObj?.batch.status === 'Held'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {activeBatchObj?.batch.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeBatches.map(({ job, batch }) => {
              const isSelected = (selectedActiveBatchId || activeBatchObj?.batch.batchId) === batch.batchId;
              const displayReel = batch.reelNo || job.reelNo || `RL-${(job.paperBrand || 'ITC').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase()}-${job.id.replace(/[^0-9]/g, '').padStart(4, '0')}`;
              const displayGsm = batch.gsm || job.gsm || '280 GSM';
              const displayWeight = batch.inputWeightKg || job.inputWeightKg || 200;
              return (
                <button
                  key={batch.batchId}
                  type="button"
                  onClick={() => setSelectedActiveBatchId(batch.batchId)}
                  className={`text-left p-3 rounded-lg border text-xs transition cursor-pointer flex justify-between items-center ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 font-bold text-blue-900 shadow-xs ring-1 ring-blue-500'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-extrabold flex items-center gap-1.5 flex-wrap">
                      <span>{job.id} — {job.product}</span>
                      <span className="font-mono text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold border border-blue-200">
                        Reel: {displayReel}
                      </span>
                      <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                        {displayGsm}
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-900 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                        {displayWeight} KG In
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Batch #{batch.batchId} | Op: {batch.worker} | Mill: {job.paperBrand || 'ITC'} | Start: {batch.startTime}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                      batch.status === 'Held' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {batch.status}
                  </span>
                </button>
              );
            })}
          </div>

          {activeBatchObj && (() => {
            const activeInputWeight = activeBatchObj.batch.inputWeightKg || activeBatchObj.job.inputWeightKg || 200;
            const parsedOutWeight = parseFloat(outputWeightKg) || 0;
            const autoScrap = parsedOutWeight > 0 ? Math.max(0, Number((activeInputWeight - parsedOutWeight).toFixed(2))) : 0;
            const effectiveScrap = scrapKgInput.trim() !== '' ? (parseFloat(scrapKgInput) || 0) : autoScrap;
            const effectiveWastagePercent = activeInputWeight > 0 && parsedOutWeight > 0 ? Number(((effectiveScrap / activeInputWeight) * 100).toFixed(2)) : 0;
            const activeReelDisplay = activeBatchObj.batch.reelNo || activeBatchObj.job.reelNo || `RL-${(activeBatchObj.job.paperBrand || 'ITC').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase()}-1024`;
            const activeGsmDisplay = activeBatchObj.batch.gsm || activeBatchObj.job.gsm || '280 GSM';

            return (
            <div className="pt-2 border-t border-slate-200 space-y-3">
              {/* Highlight Reel & GSM currently running */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-600 uppercase">Loaded Jumbo Reel:</span>
                  <span className="font-mono font-black text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-300">
                    {activeReelDisplay}
                  </span>
                  <span className="font-bold text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-300">
                    {activeGsmDisplay}
                  </span>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ⚖️ Jumbo Weight: {activeInputWeight} KG
                  </span>
                  <span className="text-slate-600 font-medium">
                    ({activeBatchObj.job.paperBrand || 'ITC'})
                  </span>
                </div>
                {onNavigateToTraceability && (
                  <button
                    type="button"
                    onClick={() => onNavigateToTraceability(activeReelDisplay)}
                    className="text-[11px] font-bold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-1 rounded transition flex items-center gap-1 cursor-pointer"
                    title="Trace this Reel across factory"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-700" />
                    <span>Trace Reel Forward →</span>
                  </button>
                )}
              </div>

              {/* Slices History Banner */}
              {activeBatchObj.batch.slices && activeBatchObj.batch.slices.length > 0 && (
                <div className="bg-blue-50/90 border border-blue-200 p-2.5 rounded-lg flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-black text-blue-950 uppercase text-[10px]">
                      Prior Shift Slices ({activeBatchObj.batch.slices.length}):
                    </span>
                    {activeBatchObj.batch.slices.map((sl, sIdx) => (
                      <span key={sIdx} className="bg-white px-2 py-0.5 rounded border border-blue-200 text-[11px] font-bold text-blue-900">
                        {sl.operator} ({sl.producedQty} Rolls)
                      </span>
                    ))}
                    <span className="text-slate-400">➔</span>
                    <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-extrabold text-[11px] border border-emerald-300">
                      Active: {activeBatchObj.batch.worker}
                    </span>
                  </div>
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded">
                    Continuous Mid-Batch Handover Active
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 uppercase mb-1">
                    Output Slit Rolls Count (रोल संख्या):
                  </label>
                  <input
                    type="number"
                    value={outputRolls}
                    onChange={(e) => setOutputRolls(e.target.value)}
                    placeholder="e.g. 8 Rolls"
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-800 uppercase mb-1">
                    Output Slit Rolls Wt (KG) <span className="text-rose-600">*Mandatory</span>:
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={outputWeightKg}
                    onChange={(e) => setOutputWeightKg(e.target.value)}
                    placeholder="e.g. 188 KG"
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-rose-800 uppercase">
                      Trim / Scrap (KG) (ऑटो वेस्टेज):
                    </label>
                    {parsedOutWeight > 0 && (
                      <span className="text-[10px] font-bold text-slate-500">
                        Auto: {autoScrap} KG
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={scrapKgInput !== '' ? scrapKgInput : (parsedOutWeight > 0 ? autoScrap : '')}
                    onChange={(e) => setScrapKgInput(e.target.value)}
                    placeholder={parsedOutWeight > 0 ? `${autoScrap} KG` : 'Auto-calculated'}
                    className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs font-bold text-rose-900 outline-none"
                  />
                </div>
              </div>

              {/* Physical Impossibility Live Warning */}
              {parsedOutWeight > activeInputWeight && (
                <div className="bg-red-50 border-2 border-red-500 rounded-xl p-3 flex items-start gap-3 text-red-900 shadow-sm animate-pulse">
                  <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <div className="font-black text-red-700 uppercase tracking-wide">
                      ⛔ भौतिक रूप से असंभव (Physical Impossibility Error):
                    </div>
                    <div className="font-semibold text-red-800">
                      आउटपुट रोल वजन (<b>{parsedOutWeight} KG</b>) इनपुट जंबो रील (<b>{activeInputWeight} KG</b>) से अधिक है! 200 किलो रॉ मटेरियल से 210 किलो माल नहीं निकल सकता। यह एंट्री सेव नहीं हो सकती। कृपया सही कांटा वजन दर्ज करें।
                    </div>
                  </div>
                </div>
              )}

              {/* Live Scrap & Wastage calculation banner */}
              {parsedOutWeight > 0 && parsedOutWeight <= activeInputWeight && (
                <div className="bg-emerald-50/80 border border-emerald-300 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-slate-800 uppercase flex items-center gap-1">
                      <span>⚡ Auto Scrap Integration:</span>
                    </span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium text-slate-700">
                      Jumbo Input: <b>{activeInputWeight} KG</b>
                    </span>
                    <span className="text-slate-400 font-bold">-</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-blue-200 font-medium text-blue-900">
                      Rolls Output: <b>{parsedOutWeight} KG</b>
                    </span>
                    <span className="text-slate-400 font-bold">=</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-rose-300 font-bold text-rose-800">
                      Scrap: <b>{effectiveScrap} KG</b>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600">Calculated Wastage:</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-black text-xs border ${
                        effectiveWastagePercent <= 6
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : effectiveWastagePercent <= 8
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}
                    >
                      {effectiveWastagePercent}% Wastage
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setIsShiftHandoverModalOpen(true)}
                  className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                  title="Handover machine to incoming shift operator without stopping the batch"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Shift Handover
                </button>
                <button
                  type="button"
                  onClick={() => onOpenHoldModal('Slitting-1')}
                  className="py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" /> Hold / Shift
                </button>
                <button
                  type="button"
                  onClick={handleResumeSlitting}
                  className="py-2.5 bg-[#319795] hover:bg-[#285e61] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" /> Resume
                </button>
                <button
                  type="button"
                  onClick={handleCompleteSlitting}
                  disabled={parsedOutWeight > activeInputWeight}
                  title={parsedOutWeight > activeInputWeight ? 'भौतिक रूप से असंभव: आउटपुट वजन इनपुट से अधिक है!' : 'Finish and record slit rolls'}
                  className="py-2.5 bg-[#2f855a] hover:bg-[#276749] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" /> Finish Slitting
                </button>
                <button
                  type="button"
                  onClick={() => setIsCancelConfirmOpen(true)}
                  className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" /> Cancel Run
                </button>
              </div>
            </div>
            );
          })()}
        </div>
      )}

      {/* Start New Slitting Reel Form */}
      <form onSubmit={handleStartNewReel} className="space-y-4">
        {currentRunningBatch && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3.5 space-y-2 text-xs text-amber-950">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="font-extrabold uppercase tracking-wide text-amber-900">
                  🔒 Single Active Job Policy (सिंगल एक्टिव जॉब प्रतिबंध):
                </span>
                <span className="bg-amber-200 text-amber-900 font-mono font-black px-2 py-0.5 rounded">
                  Job {currentRunningBatch.job.id} ({currentRunningBatch.job.product})
                </span>
              </div>
              <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                Active Reel: {currentRunningBatch.batch.reelNo || currentRunningBatch.job.reelNo}
              </span>
            </div>
            <p className="text-[11px] text-amber-900 m-0 leading-relaxed font-medium">
              मशीन <b>Slitting-1</b> पर वर्तमान में जॉब <b>[{currentRunningBatch.job.id}]</b> एक्टिव रनिंग है। एक समय में केवल एक ही जॉब रन हो सकता है। नया जॉब शुरू करने से पहले वर्तमान जॉब को 'Hold' या 'Complete' करें, अथवा <b>बिना जॉब रोके</b> इसी एक्टिव जॉब में नया रील Add-on करें:
            </p>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <button
                type="button"
                onClick={() => {
                  setAddReelJobId(currentRunningBatch.job.id);
                  setIsAddReelModalOpen(true);
                }}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>➕ Add-on Reel to Running Job [{currentRunningBatch.job.id}]</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenHoldModal('Slitting-1')}
                className="py-1.5 px-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Put Active Job on Hold</span>
              </button>
            </div>
          </div>
        )}

        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-1">
          Start New Jumbo Reel Slitting:
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Target Product:</label>
            <select
              value={product}
              onChange={(e) => setProduct(e.target.value as ProductType)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
            >
              {productList.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Paper Brand / Mill:</label>
            <select
              value={paperBrand}
              onChange={(e) => setPaperBrand(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
            >
              {paperBrandList.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Operator Name <span className="text-rose-600">*Mandatory</span>:
            </label>
            <input
              type="text"
              list="slitWorkerList"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="Type Operator Name..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold uppercase text-slate-800 outline-none"
              required
            />
            <datalist id="slitWorkerList">
              {slitWorkers.map((w) => (
                <option key={w} value={w} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Working Shift:</label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value as any)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
            >
              <option value="DAY">DAY SHIFT</option>
              <option value="NIGHT">NIGHT SHIFT</option>
            </select>
          </div>
        </div>

        {/* Dedicated Jumbo Reel Weight, Reel Number, GSM, and Remarks columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-extrabold text-slate-800 uppercase">
                Jumbo Reel Weight (KG) <span className="text-rose-600">*</span>:
              </label>
            </div>
            <input
              type="number"
              step="0.1"
              value={jumboWeightKg}
              onChange={(e) => setJumboWeightKg(e.target.value)}
              placeholder="e.g. 200 KG"
              className="w-full px-3 py-2 bg-white border border-emerald-400 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
            <div className="flex gap-1 mt-1">
              {['180', '200', '220', '250'].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setJumboWeightKg(w)}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition ${
                    jumboWeightKg === w
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {w}k
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-extrabold text-blue-900 uppercase">
                Reel Number (रील नंबर):
              </label>
              <button
                type="button"
                onClick={() =>
                  setReelNo(
                    `RL-${paperBrand.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'ITC'}-${Math.floor(1000 + Math.random() * 9000)}`
                  )
                }
                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
              >
                Auto Generate
              </button>
            </div>
            <input
              type="text"
              value={reelNo}
              onChange={(e) => setReelNo(e.target.value)}
              placeholder="उदा. RL-ITC-1024 या बारकोड"
              className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-700 uppercase mb-1">
              GSM (जीएसएम थिकनेस):
            </label>
            <select
              value={gsm}
              onChange={(e) => setGsm(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
            >
              <option value="120 GSM">120 GSM (Standard Cutlery)</option>
              <option value="60 GSM">60 GSM (Heavy Export Grade)</option>
              <option value="115 GSM">115 GSM (Reinforced Edge)</option>
              <option value="125 GSM">125 GSM (High Tensile)</option>
              <option value="150 GSM">150 GSM (Heavy Rigidity)</option>
              <option value="90 GSM">90 GSM (Special Heavy)</option>
              <option value="Custom">Custom GSM...</option>
            </select>
            {gsm === 'Custom' && (
              <input
                type="text"
                value={customGsm}
                onChange={(e) => setCustomGsm(e.target.value)}
                placeholder="Enter custom GSM (e.g. 260 GSM)"
                className="w-full mt-1 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Reel Remarks / Lot Note (रिमार्क):
            </label>
            <input
              type="text"
              value={reelRemarks}
              onChange={(e) => setReelRemarks(e.target.value)}
              placeholder="उदा. Special Export Lot #992"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!!currentRunningBatch}
            className={`flex-1 py-3 font-extrabold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 ${
              currentRunningBatch
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                : 'bg-[#2b6cb0] hover:bg-[#1a365d] text-white cursor-pointer'
            }`}
            title={
              currentRunningBatch
                ? `मशीन Slitting-1 पर जॉब [${currentRunningBatch.job.id}] रनिंग है। एक समय में केवल एक जॉब रन हो सकता है।`
                : 'Start Slitting (Auto-Generate Job ID)'
            }
          >
            <Play className={`w-4 h-4 ${currentRunningBatch ? 'fill-slate-400' : 'fill-white'}`} />
            <span>
              {currentRunningBatch
                ? `🔒 Locked: Job [${currentRunningBatch.job.id}] Already Running`
                : 'Start Slitting (Auto-Generate Job ID)'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (currentRunningBatch) {
                setAddReelJobId(currentRunningBatch.job.id);
              }
              setIsAddReelModalOpen(true);
            }}
            className={`px-4 py-3 font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
              currentRunningBatch
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>
              {currentRunningBatch
                ? `Add-on Reel to Running Job [${currentRunningBatch.job.id}]`
                : 'Add to Existing Job'}
            </span>
          </button>
        </div>
      </form>

      {/* REEL NUMBER & JOB ID TRACEABILITY REGISTRY TABLE */}
      <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 m-0">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Slitting Reels & Traceability Register (स्लिटिंग रील व जॉब आईडी रजिस्टर)</span>
            </h4>
            <p className="text-[11px] text-slate-500 m-0">
              हर जॉब आईडी में प्रयुक्त रील नंबर, जीएसएम व आगे की स्टेज की ट्रेसेबिलिटी स्थिति
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search Reel No, Job ID, GSM, Mill..."
              className="w-full pl-8 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-xs">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-left">
                <th className="p-2.5">Job ID</th>
                <th className="p-2.5 text-indigo-900">Date (तारीख)</th>
                <th className="p-2.5 text-blue-900">Reel No. (रील नंबर)</th>
                <th className="p-2.5 text-amber-900">GSM (जीएसएम)</th>
                <th className="p-2.5">Paper Mill</th>
                <th className="p-2.5">Product</th>
                <th className="p-2.5">Remarks / Lot</th>
                <th className="p-2.5 text-right">Rolls Stock</th>
                <th className="p-2.5 text-right">In / Out / Scrap (KG)</th>
                <th className="p-2.5 text-center">Stage Status</th>
                <th className="p-2.5 text-center">Traceability (ट्रेसेबिलिटी)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs
                .filter((j) => {
                  if (!tableSearch.trim()) return true;
                  const q = tableSearch.toLowerCase();
                  const allReels = getJobAllReels(j);
                  const allGsms = getJobAllGsms(j);
                  return (
                    j.id.toLowerCase().includes(q) ||
                    allReels.some((r) => r.toLowerCase().includes(q)) ||
                    allGsms.some((g) => g.toLowerCase().includes(q)) ||
                    (j.reelNo && j.reelNo.toLowerCase().includes(q)) ||
                    (j.gsm && String(j.gsm).toLowerCase().includes(q)) ||
                    (j.paperBrand && j.paperBrand.toLowerCase().includes(q)) ||
                    j.product.toLowerCase().includes(q) ||
                    (j.customRemark && j.customRemark.toLowerCase().includes(q))
                  );
                })
                .map((j) => {
                  const allReels = getJobAllReels(j);
                  const allGsms = getJobAllGsms(j);
                  const displayReelSummary = getJobReelsSummary(j);
                  const inKg = j.inputWeightKg || 200;
                  const outKg = j.outputWeightKg || 0;
                  const scrapKg = j.scrapKg || 0;
                  const scrapPct = j.scrapPercent || (inKg > 0 && scrapKg > 0 ? Number(((scrapKg / inKg) * 100).toFixed(1)) : 0);

                  const latestLog = (state.logs || []).filter((l) => l.jobId === j.id).slice(-1)[0];
                  const entryDate = latestLog?.rawDate || (j.createdAt ? j.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
                  const entryTime = latestLog?.startTime || (latestLog?.timestamp ? latestLog.timestamp.split(',')[1]?.trim() : '');

                  return (
                    <tr key={j.id} className="hover:bg-slate-50 transition">
                      <td className="p-2.5 font-mono font-bold text-blue-800">{j.id}</td>
                      <td className="p-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 font-bold text-slate-800 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{entryDate}</span>
                        </div>
                        {entryTime && <div className="text-[10px] text-slate-400 font-mono ml-4">{entryTime}</div>}
                      </td>
                      <td className="p-2.5">
                        <div className="flex flex-wrap gap-1 items-center max-w-[220px]">
                          {allReels.map((r, idx) => (
                            <span
                              key={idx}
                              className="font-mono font-bold text-[11px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200"
                              title={`Jumbo Reel #${idx + 1}`}
                            >
                              {r}
                            </span>
                          ))}
                          {allReels.length > 1 && (
                            <span className="text-[10px] bg-blue-100 text-blue-900 font-extrabold px-1.5 py-0.2 rounded border border-blue-300">
                              {allReels.length} Jumbo Reels
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5">
                        <div className="flex flex-wrap gap-1 items-center max-w-[190px]">
                          {allGsms.map((g, gIdx) => (
                            <span
                              key={gIdx}
                              className="font-bold text-[11px] bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200"
                              title={`GSM #${gIdx + 1}`}
                            >
                              {g}
                            </span>
                          ))}
                          {allGsms.length > 1 && (
                            <span className="text-[9.5px] font-extrabold bg-amber-200 text-amber-950 px-1.5 py-0.2 rounded border border-amber-300">
                              {allGsms.length} Mixed GSM
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5 font-medium text-slate-800">{j.paperBrand || 'ITC'}</td>
                      <td className="p-2.5 font-bold text-slate-700">{j.product}</td>
                      <td className="p-2.5 text-slate-500 max-w-[150px] truncate" title={j.customRemark}>
                        {j.customRemark || 'Standard'}
                      </td>
                      <td className="p-2.5 text-right font-extrabold text-emerald-700">
                        {j.availableRolls || 0} Rolls
                      </td>
                      <td className="p-2.5 text-right font-mono text-xs">
                        <div className="flex flex-col items-end">
                          <span className="text-slate-700 font-bold">In: {inKg} KG</span>
                          <span className="text-blue-700 font-medium">Out: {outKg} KG</span>
                          {scrapKg > 0 && (
                            <span className="text-rose-700 font-bold text-[11px]">
                              Scrap: {scrapKg} KG ({scrapPct}%)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {j.stage}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setGenealogyModalJob(j);
                          }}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-[11px] transition shadow-xs inline-flex items-center gap-1 cursor-pointer"
                          title="ट्रेसेबिलिटी में देखें कि यह रील कहाँ-कहाँ पहुँची"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Trace Reel</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Reel to Existing Job Modal */}
      {isAddReelModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Plus className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 m-0">Add Reel to Existing Slitting Job</h3>
                <p className="text-[11px] text-slate-500 m-0">Attach an additional jumbo reel to an open Job ID</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Select Job ID:</label>
                {currentRunningBatch && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                    🟢 Active Running Job: {currentRunningBatch.job.id}
                  </span>
                )}
              </div>
              <select
                value={addReelJobId}
                onChange={(e) => setAddReelJobId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
              >
                <option value="">-- SELECT JOB ID --</option>
                {jobs.map((j) => {
                  const isRunningNow = currentRunningBatch?.job.id === j.id;
                  return (
                    <option key={j.id} value={j.id}>
                      {isRunningNow ? '⭐ [ACTIVE RUNNING] ' : ''}
                      {j.id} - {j.product} [{j.paperBrand || 'ITC'}]{' '}
                      {getJobAllReels(j).length > 0 ? `(Reels: ${getJobAllReels(j).join(', ')})` : ''}
                    </option>
                  );
                })}
              </select>
              {currentRunningBatch && addReelJobId && addReelJobId !== currentRunningBatch.job.id && (
                <div className="mt-1.5 p-2 bg-amber-50 border border-amber-300 rounded text-[11px] text-amber-900 font-semibold">
                  ⚠️ <b>सिंगल एक्टिव जॉब सूचना:</b> मशीन Slitting-1 पर अभी जॉब <b>{currentRunningBatch.job.id}</b> रनिंग स्थिति में है। जब तक वह Hold या Complete नहीं होता, तब तक केवल उसी एक्टिव जॉब <b>{currentRunningBatch.job.id}</b> में नई रील/एंट्री ऐड-ऑन की जा सकती है।
                </div>
              )}
              {addReelJobId && (() => {
                const selectedJob = jobs.find((j) => j.id === addReelJobId);
                if (!selectedJob) return null;
                const currReels = getJobAllReels(selectedJob);
                return (
                  <div className="mt-2 p-2.5 bg-blue-50/80 border border-blue-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-blue-950 uppercase text-[10px]">
                        Existing Jumbo Reels ({currReels.length}):
                      </span>
                      <span className="text-[10px] font-mono text-blue-800 font-bold">
                        Job {selectedJob.id} ({selectedJob.product})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {currReels.map((r, idx) => (
                        <span
                          key={idx}
                          className="font-mono text-[10px] bg-white text-blue-800 font-bold px-1.5 py-0.5 rounded border border-blue-300 shadow-2xs"
                        >
                          Reel #{idx + 1}: {r}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="font-extrabold text-amber-950 uppercase text-[10px]">
                        Current Job GSM:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {getJobAllGsms(selectedJob).map((g, gIdx) => (
                          <span
                            key={gIdx}
                            className="font-bold text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-300"
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-blue-700 m-0">
                      💡 यदि आप अलग GSM (उदा. 300 GSM) की रील जोड़ रहे हैं, तो नीचे GSM फील्ड में नया GSM लिखें। जॉब कार्ड में दोनों GSM अलग-अलग सुरक्षित रहेंगे और आगे कटिंग व फॉर्मिंग में दिखेंगे!
                    </p>
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reel Number:</label>
                <input
                  type="text"
                  value={addReelNo}
                  onChange={(e) => setAddReelNo(e.target.value)}
                  placeholder="e.g. RL-ITC-2024"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Jumbo Weight (KG):</label>
                <input
                  type="number"
                  step="0.1"
                  value={addReelWeightKg}
                  onChange={(e) => setAddReelWeightKg(e.target.value)}
                  placeholder="e.g. 200 KG"
                  className="w-full px-3 py-2 border border-emerald-400 rounded-lg text-xs font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">GSM:</label>
                <input
                  type="text"
                  value={addReelGsm}
                  onChange={(e) => setAddReelGsm(e.target.value)}
                  placeholder="e.g. 280 GSM"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Operator Name:</label>
                <input
                  type="text"
                  list="slitWorkerList"
                  value={addReelWorker}
                  onChange={(e) => setAddReelWorker(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold uppercase text-slate-800 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reel Remarks:</label>
              <input
                type="text"
                value={addReelRemarks}
                onChange={(e) => setAddReelRemarks(e.target.value)}
                placeholder="e.g. Extra reel added from bay 2"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddReelModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddReelToJob}
                disabled={!addReelJobId}
                className="px-4 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Check className="w-4 h-4" /> Add Batch & Run
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Run Confirm Modal */}
      {isCancelConfirmOpen && activeBatchObj && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-rose-200 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 border-b border-rose-100 pb-3">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <div>
                <h3 className="text-sm font-extrabold text-rose-950 m-0">Cancel Slitting Run</h3>
                <p className="text-[11px] text-slate-500 m-0">Safely cancel this slitting run and delete batch</p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1.5 text-rose-900">
              <div>Are you sure you want to cancel Slitting Batch <b>#{activeBatchObj.batch.batchId}</b> for Job <b>{activeBatchObj.job.id}</b>?</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Keep Running
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelRun}
                className="px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer shadow-xs flex items-center gap-1"
              >
                <XCircle className="w-4 h-4" /> Cancel & Delete Batch
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Lot Genealogy Modal */}
      <LotGenealogyModal
        isOpen={!!genealogyModalJob}
        onClose={() => setGenealogyModalJob(null)}
        job={genealogyModalJob}
        state={state}
      />

      {/* Shift Handover Modal */}
      {activeBatchObj && (
        <ShiftHandoverModal
          isOpen={isShiftHandoverModalOpen}
          onClose={() => setIsShiftHandoverModalOpen(false)}
          batch={activeBatchObj.batch}
          job={activeBatchObj.job}
          machine="Slitting-1"
          stageName="Slitting"
          availableWorkers={slitWorkers}
          unitLabel="Rolls"
          onConfirmHandover={handleConfirmShiftHandover}
        />
      )}
    </div>
  );
};
