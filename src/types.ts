export type ProductType = 'Spoon' | 'Fork' | 'Knife' | 'Dessert Spoon' | string;

export type CurrentView =
  | 'HUB'
  | 'DASHBOARD'
  | 'MARKETING'
  | 'DISPATCH'
  | 'SLITTING'
  | 'CUTTING'
  | 'FORMING'
  | 'QC'
  | 'PACKING'
  | 'STOCK'
  | 'ORDERS'
  | 'ANALYTICS'
  | 'SEARCH'
  | 'AUDIT'
  | 'ADMIN'
  | 'MAINTENANCE'
  | 'PURCHASE';

export type MaterialUrgency = 'CRITICAL_BREAKDOWN' | 'URGENT' | 'NORMAL' | 'LOW';

export type MaterialRequisitionStatus =
  | 'PENDING'       // Submitted by department, awaiting purchase review
  | 'PO_ISSUED'     // Purchase order issued / ordered from vendor
  | 'RECEIVED'      // Arrived at factory store / माल आ गया है
  | 'ACKNOWLEDGED'  // Requester acknowledged & received into department stock
  | 'REJECTED';     // Rejected / cancelled

export interface MaterialRequisition {
  id: string; // e.g. "MR-2026-001"
  department:
    | 'Maintenance'
    | 'Slitting'
    | 'Cutting'
    | 'Forming'
    | 'QC'
    | 'Packing'
    | 'Warehouse'
    | 'General'
    | string;
  itemCategory:
    | 'Spare Parts & Machine Tooling'
    | 'Raw Material (Paper Reels)'
    | 'Packaging & Cartons'
    | 'Electrical & Sensors'
    | 'Lubricants & Consumables'
    | 'Safety & PPE'
    | 'Workshop Tools'
    | 'General Utility'
    | string;
  itemName: string;
  itemCodeOrPartNo?: string;
  quantity: number;
  unit: 'Pcs' | 'KG' | 'Box' | 'Litre' | 'Meters' | 'Rolls' | 'Set' | string;
  urgency: MaterialUrgency;
  machineOrPurpose?: string;
  machine?: string;
  purpose?: string;
  requestedBy: string;
  requestedDate: string; // YYYY-MM-DD
  requestedTime?: string;
  createdAt?: string;
  remarks?: string;
  status: MaterialRequisitionStatus;

  // Purchase fulfillment fields
  vendorName?: string;
  poNumber?: string;
  poDate?: string;
  expectedDeliveryDate?: string;
  expectedDate?: string;
  estimatedCost?: number;
  actualCost?: number;
  purchaseNotes?: string;

  // Goods Receiving fields (जब माल आ जाए)
  receivedDate?: string; // YYYY-MM-DD
  receivedTime?: string;
  receivedQty?: number;
  grnOrBillNo?: string;
  receivedBy?: string;
  storageLocationOrBin?: string; // e.g. "Maintenance Store Rack B2"
  acknowledgedByRequester?: boolean; // When requester marks it collected
  acknowledgedDate?: string;
  acknowledgedAt?: string;
}

export interface ProductCrateCapacity {
  cuttingPcs: number; // Flat blank pieces per crate
  formingPcs: number; // 3D formed pieces per crate
}

export interface OperatorRunSlice {
  sliceId: string;
  operator: string;
  relievedByOperator?: string;
  shift: 'DAY' | 'NIGHT' | string;
  startTime?: string;
  handoverTime: string;
  startMeterReading?: number;
  endMeterReading?: number;
  strokeCount?: number;
  producedQty: number; // Crates / Rolls / Units produced during this operator's slice
  loosePieces?: number; // Loose flat blanks / pieces produced during slice
  producedPieces?: number;
  grossPieces?: number;
  scrapQty: number; // Scrap produced during this slice (kg or pcs)
  scrapKg?: number;
  scrapPcs?: number;
  pcsPerKg?: number;
  notes?: string;
  handoverConfirmed?: boolean;
  helpers?: string[];
  helperCount?: number;
}

export interface RunningBatch {
  batchId: string;
  stage: 'Slitting' | 'Cutting' | 'Forming' | 'QC' | 'Packing' | string;
  machine: string;
  shift: 'DAY' | 'NIGHT' | string;
  startTime: string;
  endTime?: string;
  status: 'Running' | 'Held' | 'Completed' | string;
  reelNo?: string;
  reelNumbers?: string[];
  reelsSummary?: string;
  gsm?: string | number;
  gsmList?: (string | number)[];
  gsmsSummary?: string;
  issuedQty?: number;
  producedQty?: number;
  pcsPerCrate?: number;
  producedPieces?: number;
  loosePieces?: number;
  inputWeightKg?: number;
  outputWeightKg?: number;
  scrapKg?: number;
  scrapPercent?: number;
  scrapPcs?: number;
  rejectedPieces?: number;
  pcsPerKg?: number;
  grossPieces?: number;
  worker: string;
  operator?: string;
  user: string;
  holdReason?: string;
  parentBatchId?: string;
  parentReelNo?: string;
  inputCrates?: number;
  inputPieces?: number;
  qcInspector?: string;
  qcAssignedCrates?: number;
  qcStatus?: 'Pending QC' | 'In Inspection' | 'Approved' | 'Rejected' | string;
  startMeterReading?: number;
  meterReading?: number;
  totalStrokes?: number;
  slices?: OperatorRunSlice[];
  helpers?: string[];
  helperCount?: number;
}

export interface JobReelItem {
  reelNo: string;
  rolls?: number;
  weightKg?: number;
  outputWeightKg?: number;
  scrapKg?: number;
  gsm?: string | number;
  paperBrand?: string;
  batchId?: string;
  startTime?: string;
  endTime?: string;
  worker?: string;
  customRemark?: string;
}

export interface Job {
  id: string;
  createdAt?: string;
  date?: string;
  product: ProductType;
  paperBrand?: string;
  reelNo?: string;
  reelNumbers?: string[];
  reelsList?: JobReelItem[];
  gsm?: string | number;
  gsmList?: (string | number)[];
  gsmsSummary?: string;
  customRemark?: string;
  stage: string;
  availableRolls: number;
  availableCuttingCrates: number;
  availableFormingCrates: number;
  availableQcCrates: number;
  pcsPerCrateCutting?: number;
  pcsPerCrateForming?: number;
  totalCutPieces?: number;
  totalFormedPieces?: number;
  totalQcPieces?: number;
  cuttingLoosePcs?: number;
  formingLoosePcs?: number;
  qcLoosePcs?: number;
  cuttingScrapKg?: number;
  cuttingScrapPcs?: number;
  cuttingPcsPerKg?: number;
  inputWeightKg?: number;
  outputWeightKg?: number;
  scrapKg?: number;
  scrapPercent?: number;
  tracedLots?: Record<string, string>;
  runningBatches?: RunningBatch[];
}

export interface DispatchLog {
  invoiceNo: string;
  gtNo: string;
  boxes: number;
  pcs: number;
  date: string;
  user: string;
}

export interface HistoryRun {
  runId?: string;
  machine: string;
  shift?: 'DAY' | 'NIGHT' | string;
  boxes?: number;
  boxesPacked?: number;
  pcs?: number;
  date: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  worker: string;
  usedLots?: Record<string, string>;
  issuedRawMaterial?: string;
  issuedCrates?: Record<string, number>;
}

export interface PackJob {
  id: string;
  customer: string;
  packType: 'KIT' | 'INDIVIDUAL';
  orderQty: number;
  pcsPerBox: number;
  dispatchDate: string;
  kitItems: string[];
  kitType: string;
  status: string;
  packedBoxes: number;
  dispatchedBoxes: number;
  wrapping?: string;
  labeling?: string;
  remarks?: string;
  machine?: string;
  shift?: 'DAY' | 'NIGHT' | string;
  worker?: string;
  startTime?: string;
  endTime?: string;
  holdReason?: string;
  createdBy?: string;
  historyRuns?: HistoryRun[];
  dispatchLogs?: DispatchLog[];
  tracedLots?: Record<string, string>;
  issuedCrates?: Record<string, number>;
  slices?: OperatorRunSlice[];
  helpers?: string[];
  helperCount?: number;
}

export interface LogEntry {
  jobId?: string;
  product?: string;
  stage: string;
  machine: string;
  station?: string;
  shift?: 'DAY' | 'NIGHT' | string;
  action: string;
  worker?: string;
  operator?: string;
  details?: string;
  user: string;
  startTime?: string;
  endTime?: string;
  rawDate: string;
  timestamp: string;
}

export interface ScrapSale {
  id?: string;
  partyName?: string;
  weightKg?: number;
  ratePerKg?: number;
  totalAmount?: number;
  soldKg?: number;
  buyerNote?: string;
  date: string;
  time?: string;
  user: string;
}

export interface UserAccount {
  pass: string;
  perms: string[];
  name?: string;
  role?: string;
  phone?: string;
}

export interface ShiftConfig {
  dayStart: string;
  dayEnd: string;
  nightStart: string;
  nightEnd: string;
}

export interface SeriesConfig {
  orderSeq: number;
  productSeqs: Record<string, number>;
}

export interface WhatsAppConfig {
  phone: string;
  apiKey: string;
  autoSend: boolean;
  lastSentKey?: string;
  webhookUrl?: string;
  customMessage?: string;
  dayShiftReportTime?: string;
  nightShiftReportTime?: string;
  autoSendShiftReportDay?: boolean;
  autoSendShiftReportNight?: boolean;
  lastSentDayDate?: string;
  lastSentNightDate?: string;
}

export interface SparePartItem {
  id?: string;
  name: string;
  qty: number;
  unit?: string;
  cost?: number;
  notes?: string;
  category?: string;
}

export interface MaintenanceContact {
  id: string;
  name: string;
  phone: string;
  role: string;
  dept?: string;
}

export interface MaintenanceIncident {
  id: string; // e.g. "MNT-001"
  machine: string;
  stage: string;
  reason: string;
  issue?: string;
  description?: string;
  reportedBy: string;
  maintenancePhone?: string;
  priority?: 'Normal' | 'Urgent' | 'Critical';
  machineStatus?: 'Operational' | 'Down' | 'Critical';
  deptHeadsNotified?: boolean;
  deptHeadsNotifiedAt?: string;
  notifiedHeadsList?: string[];
  status: 'OPEN' | 'IN_PROGRESS' | 'REPAIRED_READY' | 'ACKNOWLEDGED';
  breakdownStartTime: string; // ISO string
  breakdownDate: string; // YYYY-MM-DD
  repairStartTime?: string;
  repairedAt?: string; // ISO string
  breakdownStopTime?: string; // ISO string
  acknowledgedAt?: string; // ISO string
  totalDowntimeMinutes?: number;
  technicianName?: string;
  attendedBy?: string;
  attendingStartedAt?: string;
  responseTimeMinutes?: number;
  repairDurationMinutes?: number;
  technicianRemarks?: string;
  actionTaken?: string;
  spareParts?: SparePartItem[];
  whatsAppAlertSent?: boolean;
}

export interface MachineReadyAlert {
  incidentId: string;
  machine: string;
  technician: string;
  repairedAt: string;
  actionTaken: string;
  sparePartsSummary: string;
  downtimeMinutes: number;
  active: boolean;
}

export interface CustomerComplaint {
  id: string;
  orderId?: string;
  invoiceNo?: string;
  customer: string;
  boxBarcode?: string;
  defectType: string;
  defectStage: 'Raw Material' | 'Slitting' | 'Cutting' | 'Forming' | 'QC' | 'Packing' | 'Dispatch';
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  description: string;
  rootCauseAnalysis?: string;
  capaAction?: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  reportedDate: string;
  resolvedDate?: string;
  actionTakenBy?: string;
}

export interface FactoryState {
  jobs: Job[];
  logs: LogEntry[];
  packJobs: PackJob[];
  scrapSales: ScrapSale[];
  users: Record<string, UserAccount>;
  deptWorkers?: Record<string, string[]>;
  seriesConfig: SeriesConfig;
  whatsappConfig: WhatsAppConfig;
  shiftConfig: ShiftConfig;
  adminPassword?: string;
  brandLogoBase64?: string;
  maintenanceIncidents?: MaintenanceIncident[];
  machineReadyAlerts?: MachineReadyAlert[];
  maintenanceContacts?: MaintenanceContact[];
  customerComplaints?: CustomerComplaint[];
  materialRequisitions?: MaterialRequisition[];
  products?: string[];
  paperBrands?: string[];
  productPrefixMap?: Record<string, string>;
  maintenanceTechniciansMaster?: string[];
  maintenanceSparePartsMaster?: string[];
  maxPiecesPerSlitRoll?: number;
  strictAuditRollYield?: boolean;
  maintenanceRightsMaster?: Record<string, string[]>;
  autoNotifyDeptHeadsOnCritical?: boolean;
  departmentHeads?: MaintenanceContact[];
  crateCapacityMaster?: Record<string, ProductCrateCapacity>;
  archivedJobs?: Job[];
  archivedLogs?: LogEntry[];
  lastBackupDate?: string;
  floorWorkers?: FloorWorker[];
}

export type WorkforceRole = 'OPERATOR' | 'HELPER' | 'SUPERVISOR' | 'MAINTENANCE' | 'QC_INSPECTOR';

export interface FloorWorker {
  id: string;
  name: string;
  role: WorkforceRole;
  department: 'Slitting' | 'Cutting' | 'Forming' | 'QC' | 'Packing' | 'Maintenance' | 'Admin' | string;
  assignedMachine?: string; // e.g. "Cutting-1"
  pairedWithOperator?: string; // If role is HELPER, which operator they assist
  shift: 'DAY' | 'NIGHT' | string;
  isPresent: boolean;
  inTime?: string;
  notes?: string;
}

export interface GroundingSource {
  title?: string;
  uri?: string;
}

export interface GroundingMetadata {
  webSearchQueries?: string[];
  groundingChunks?: Array<{
    web?: {
      uri: string;
      title: string;
    };
  }>;
  groundingSupports?: Array<{
    groundingChunkIndices?: number[];
    segment?: {
      startIndex?: number;
      endIndex?: number;
      text?: string;
    };
  }>;
}
