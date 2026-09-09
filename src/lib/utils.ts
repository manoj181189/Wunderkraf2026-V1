import { FactoryState, Job, JobReelItem, LogEntry, PackJob, ProductType, ShiftConfig } from '../types';
import { PRODUCTS } from './constants';

export function calculateLiveStock(jobs: Job[], packJobs: PackJob[], customProducts?: string[]) {
  const allProds = customProducts && customProducts.length > 0 ? customProducts : PRODUCTS;
  const stock: Record<string, { Rolls: number; Cutting: number; Forming: number; QC: number; Packed: number }> = {};
  allProds.forEach((p) => {
    stock[p] = { Rolls: 0, Cutting: 0, Forming: 0, QC: 0, Packed: 0 };
  });

  jobs.forEach((j) => {
    if (!stock[j.product]) {
      stock[j.product] = { Rolls: 0, Cutting: 0, Forming: 0, QC: 0, Packed: 0 };
    }
    stock[j.product].Rolls += j.availableRolls || 0;
    stock[j.product].Cutting += j.availableCuttingCrates || 0;
    stock[j.product].Forming += j.availableFormingCrates || 0;
    stock[j.product].QC += j.availableQcCrates || 0;
  });

  packJobs.forEach((pj) => {
    if (pj.issuedCrates) {
      Object.keys(pj.issuedCrates).forEach((pName) => {
        if (!stock[pName]) {
          stock[pName] = { Rolls: 0, Cutting: 0, Forming: 0, QC: 0, Packed: 0 };
        }
        stock[pName].Packed += pj.issuedCrates[pName] || 0;
      });
    }
  });

  return stock;
}

export function calculateAvailableScrapKg(logs: LogEntry[], scrapSales: any[]): number {
  let totalGeneratedKg = 0;
  logs.forEach((l) => {
    if (l.action) {
      const matchScrap = l.action.match(/Scrap:\s*(\d+)\s*KG/i) || l.action.match(/Scrap:\s*(\d+)/i);
      if (matchScrap && !l.action.includes('Pieces') && !l.action.includes('Pcs')) {
        totalGeneratedKg += parseInt(matchScrap[1], 10) || 0;
      }
    }
  });

  let totalSoldKg = 0;
  (scrapSales || []).forEach((s) => (totalSoldKg += s.soldKg || s.weightKg || 0));
  return Math.max(0, totalGeneratedKg - totalSoldKg);
}

export function calculateTimeDifference(startStr?: string, endStr?: string): string {
  if (!startStr || !endStr || endStr === 'RUNNING' || endStr === 'HELD' || endStr === '') return 'In-Progress';
  try {
    const s = new Date('1970/01/01 ' + startStr);
    const e = new Date('1970/01/01 ' + endStr);
    let diffMs = e.getTime() - s.getTime();
    if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
    const diffMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs > 0 ? hrs + 'h ' : ''}${mins}m`;
  } catch (err) {
    return 'N/A';
  }
}

export function getCurrentExpectedShift(shiftConfig: ShiftConfig): 'DAY' | 'NIGHT' {
  const now = new Date();
  const curTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const ds = shiftConfig?.dayStart || '08:00';
  const de = shiftConfig?.dayEnd || '20:00';
  if (ds < de) {
    return curTime >= ds && curTime < de ? 'DAY' : 'NIGHT';
  } else {
    return curTime >= ds || curTime < de ? 'DAY' : 'NIGHT';
  }
}

export function generateDailySummaryCSV(state: FactoryState, sDate?: string, eDate?: string): string {
  const { logs, scrapSales } = state;
  const totals = {
    Spoon_Crates: 0,
    Fork_Crates: 0,
    Knife_Crates: 0,
    DessertSpoon_Crates: 0,
    Packed_Boxes: 0,
    Dispatched_Boxes: 0,
    Slit_Paper_KG: 0,
    Scrap_KG: 0
  };

  logs.forEach((l) => {
    if (!l.rawDate || (sDate && l.rawDate < sDate) || (eDate && l.rawDate > eDate)) return;
    if (!l.machine || ['ADMIN', 'MKT-ENTRY'].includes(l.machine)) return;

    if (
      l.action &&
      (l.action.includes('Finished') ||
        l.action.includes('Completed') ||
        l.action.includes('Approved') ||
        l.action.includes('Packed'))
    ) {
      if (l.stage === 'QC' || l.stage === 'Forming') {
        const matchCrate = l.action.match(/(\d+)\s*Crates/i);
        if (matchCrate) {
          const q = parseInt(matchCrate[1], 10) || 0;
          if (l.product === 'Spoon') totals.Spoon_Crates += q;
          else if (l.product === 'Fork') totals.Fork_Crates += q;
          else if (l.product === 'Knife') totals.Knife_Crates += q;
          else if (l.product === 'Dessert Spoon') totals.DessertSpoon_Crates += q;
        }
      } else if (l.stage === 'Packing') {
        const matchBox = l.action.match(/(\d+)\s*Boxes/i);
        if (matchBox) totals.Packed_Boxes += parseInt(matchBox[1], 10) || 0;
      }
      const matchKg = l.action.match(/(\d+)\s*KG/i);
      if (matchKg && l.stage === 'Slitting') totals.Slit_Paper_KG += parseInt(matchKg[1], 10) || 0;

      const matchScrap = l.action.match(/Scrap:\s*(\d+)\s*KG/i) || l.action.match(/Scrap:\s*(\d+)/i);
      if (matchScrap && !l.action.includes('Pieces') && !l.action.includes('Pcs')) {
        totals.Scrap_KG += parseInt(matchScrap[1], 10) || 0;
      }
    }
    if (l.action && l.action.includes('Dispatched')) {
      const matchDisp = l.action.match(/Dispatched\s*(\d+)\s*Boxes/);
      if (matchDisp) totals.Dispatched_Boxes += parseInt(matchDisp[1], 10) || 0;
    }
  });

  let csv = 'Category,Value,Unit\r\n';
  csv += `"Report Period","${sDate || 'All'} to ${eDate || 'Today'}","Date Range"\r\n`;
  csv += `"Total Paper Slit","${totals.Slit_Paper_KG}","KG"\r\n`;
  csv += `"Spoon QC Approved Output","${totals.Spoon_Crates}","Crates"\r\n`;
  csv += `"Fork QC Approved Output","${totals.Fork_Crates}","Crates"\r\n`;
  csv += `"Knife QC Approved Output","${totals.Knife_Crates}","Crates"\r\n`;
  csv += `"Dessert Spoon QC Approved Output","${totals.DessertSpoon_Crates}","Crates"\r\n`;
  csv += `"Total Packed Finished Goods","${totals.Packed_Boxes}","Boxes"\r\n`;
  csv += `"Total Dispatched Goods","${totals.Dispatched_Boxes}","Boxes"\r\n`;
  csv += `"Total Scrap Generated","${totals.Scrap_KG}","KG"\r\n`;
  csv += `"Current Available Scrap Stock","${calculateAvailableScrapKg(logs, scrapSales)}","KG"\r\n`;

  return csv;
}

export function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function exportToCSV(filename: string, data: any[]) {
  if (!data || data.length === 0) {
    downloadCSV('', filename);
    return;
  }
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify(row[h] !== undefined ? row[h] : '')).join(',')
  );
  const csvContent = [headers.join(','), ...rows].join('\r\n');
  downloadCSV(csvContent, filename);
}

export function downloadJSON(data: any, filename: string) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function exportToJSON(filename: string, data: any) {
  downloadJSON(data, filename);
}

/**
 * Extracts all unique mother jumbo reel numbers used in a Job.
 * Inspects job.reelNumbers, job.reelsList, slitting runningBatches, and comma/slash separated job.reelNo.
 */
export function getJobAllReels(job?: Job): string[] {
  if (!job) return [];
  const reels = new Set<string>();

  // 1. From job.reelNumbers array
  if (job.reelNumbers && Array.isArray(job.reelNumbers)) {
    job.reelNumbers.forEach((r) => {
      if (r && typeof r === 'string' && r.trim()) {
        reels.add(r.trim());
      }
    });
  }

  // 2. From job.reelsList
  if (job.reelsList && Array.isArray(job.reelsList)) {
    job.reelsList.forEach((item) => {
      if (item.reelNo && typeof item.reelNo === 'string' && item.reelNo.trim()) {
        reels.add(item.reelNo.trim());
      }
    });
  }

  // 3. From runningBatches in stage 'Slitting'
  if (job.runningBatches && Array.isArray(job.runningBatches)) {
    job.runningBatches.forEach((b) => {
      if (b.stage === 'Slitting' && b.reelNo && typeof b.reelNo === 'string' && b.reelNo.trim()) {
        reels.add(b.reelNo.trim());
      }
      if (b.reelNumbers && Array.isArray(b.reelNumbers)) {
        b.reelNumbers.forEach((r) => {
          if (r && typeof r === 'string' && r.trim()) reels.add(r.trim());
        });
      }
    });
  }

  // 4. From job.reelNo (which could be comma-separated or single)
  if (job.reelNo && typeof job.reelNo === 'string' && job.reelNo.trim()) {
    const parts = job.reelNo.split(/[,+;/|]+/).map((s) => s.trim()).filter(Boolean);
    parts.forEach((p) => reels.add(p));
  }

  return Array.from(reels);
}

/**
 * Formats a clean summary of mother jumbo reels.
 * e.g. "Reel: 100" or "Reels: 100, 101, 111 (3 Jumbo Reels)"
 */
export function getJobReelsSummary(job?: Job): string {
  if (!job) return 'N/A';
  const allReels = getJobAllReels(job);
  if (allReels.length === 0) {
    return `RL-${(job.paperBrand || 'ITC').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase()}-${job.id.replace(/[^0-9]/g, '').padStart(4, '0')}`;
  }
  if (allReels.length === 1) {
    return allReels[0];
  }
  return `${allReels.join(', ')} (${allReels.length} Jumbo Reels)`;
}

/**
 * Generates an itemized breakdown of each jumbo reel loaded in Slitting
 * including rolls output and weights for 100% complete traceability.
 */
export function getJobReelItemsBreakdown(job?: Job): JobReelItem[] {
  if (!job) return [];

  // If reelsList is already populated with items, return it
  if (job.reelsList && job.reelsList.length > 0) {
    return job.reelsList;
  }

  const items: JobReelItem[] = [];
  const seenReels = new Set<string>();

  // Extract from slitting running batches
  if (job.runningBatches && job.runningBatches.length > 0) {
    const slittingBatches = job.runningBatches.filter((b) => b.stage === 'Slitting');
    slittingBatches.forEach((b) => {
      const rNo = b.reelNo?.trim() || `RL-${(job.paperBrand || 'ITC').slice(0, 3).toUpperCase()}-001`;
      if (!seenReels.has(rNo)) {
        seenReels.add(rNo);
        items.push({
          reelNo: rNo,
          rolls: b.producedQty || (slittingBatches.length === 1 ? job.availableRolls : 0),
          weightKg: b.inputWeightKg || (job.inputWeightKg ? Math.round(job.inputWeightKg / slittingBatches.length) : 200),
          outputWeightKg: b.outputWeightKg,
          scrapKg: b.scrapKg,
          gsm: b.gsm || job.gsm,
          paperBrand: job.paperBrand,
          batchId: b.batchId,
          startTime: b.startTime,
          endTime: b.endTime,
          worker: b.worker
        });
      }
    });
  }

  // If still empty or some reels missing from getJobAllReels
  const allReels = getJobAllReels(job);
  allReels.forEach((rNo) => {
    if (!seenReels.has(rNo)) {
      seenReels.add(rNo);
      const shareRolls = allReels.length > 0 ? Math.floor((job.availableRolls || 0) / allReels.length) : (job.availableRolls || 0);
      const shareKg = allReels.length > 0 ? Math.round((job.inputWeightKg || 200) / allReels.length) : (job.inputWeightKg || 200);
      items.push({
        reelNo: rNo,
        rolls: shareRolls,
        weightKg: shareKg,
        gsm: job.gsm,
        paperBrand: job.paperBrand
      });
    }
  });

  if (items.length === 0) {
    const fallbackReel = `RL-${(job.paperBrand || 'ITC').replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase()}-${job.id.replace(/[^0-9]/g, '').padStart(4, '0')}`;
    items.push({
      reelNo: fallbackReel,
      rolls: job.availableRolls || 0,
      weightKg: job.inputWeightKg || 200,
      gsm: job.gsm || '280 GSM',
      paperBrand: job.paperBrand || 'ITC'
    });
  }

  return items;
}

/**
 * Normalizes GSM string (e.g. "280" -> "280 GSM", "280 gsm" -> "280 GSM").
 */
export function formatGsmString(rawGsm?: string | number): string {
  if (!rawGsm) return '280 GSM';
  const s = String(rawGsm).trim();
  if (!s) return '280 GSM';
  if (/gsm$/i.test(s)) {
    return s.replace(/\s*gsm$/i, ' GSM');
  }
  return `${s} GSM`;
}

/**
 * Extracts all distinct GSMs associated with a job across its mother reels,
 * batches, and gsmList for complete transparency when multiple GSMs are combined.
 */
export function getJobAllGsms(job?: Job): string[] {
  if (!job) return ['280 GSM'];
  const gsms = new Set<string>();

  // 1. From job.gsmList
  if (job.gsmList && Array.isArray(job.gsmList)) {
    job.gsmList.forEach((g) => {
      if (g) gsms.add(formatGsmString(g));
    });
  }

  // 2. From job.reelsList
  if (job.reelsList && Array.isArray(job.reelsList)) {
    job.reelsList.forEach((item) => {
      if (item.gsm) gsms.add(formatGsmString(item.gsm));
    });
  }

  // 3. From runningBatches in stage 'Slitting'
  if (job.runningBatches && Array.isArray(job.runningBatches)) {
    job.runningBatches.forEach((b) => {
      if (b.gsm) gsms.add(formatGsmString(b.gsm));
      if (b.gsmList && Array.isArray(b.gsmList)) {
        b.gsmList.forEach((g) => {
          if (g) gsms.add(formatGsmString(g));
        });
      }
    });
  }

  // 4. From job.gsm (may be "280 GSM + 300 GSM" or "280, 300")
  if (job.gsm) {
    const raw = String(job.gsm).trim();
    if (raw) {
      const parts = raw.split(/[,+;/|]+/).map((s) => s.trim()).filter(Boolean);
      parts.forEach((p) => {
        gsms.add(formatGsmString(p));
      });
    }
  }

  if (gsms.size === 0) {
    gsms.add('280 GSM');
  }

  return Array.from(gsms);
}

/**
 * Formats a clean summary of GSMs used in a job.
 * e.g. "280 GSM" or "280 GSM + 300 GSM (Mixed GSM)"
 */
export function getJobGsmsSummary(job?: Job): string {
  if (!job) return '280 GSM';
  const allGsms = getJobAllGsms(job);
  if (allGsms.length === 0) return '280 GSM';
  if (allGsms.length === 1) return allGsms[0];
  return `${allGsms.join(' + ')} (Mixed GSM)`;
}

