import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Settings,
  Users,
  ShieldAlert,
  Database,
  Smartphone,
  Sliders,
  Clock,
  KeyRound,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Trash2,
  Edit,
  Save,
  Check,
  X,
  Search,
  AlertTriangle,
  AlertCircle,
  FileSpreadsheet,
  Send,
  Layers,
  Scissors,
  Cog,
  SearchCheck,
  Package,
  Truck,
  RefreshCw,
  Eye,
  CheckCircle2,
  Tag,
  Box,
  Wrench
} from 'lucide-react';
import {
  FactoryState,
  Job,
  PackJob,
  LogEntry,
  ProductType,
  RunningBatch,
  UserAccount,
  ProductCrateCapacity
} from '../../types';
import {
  PRODUCTS,
  PAPER_BRANDS,
  DEPT_WORKERS,
  INITIAL_STATE,
  DEFAULT_USERS,
  PRODUCT_PREFIX_MAP,
  DEFAULT_CRATE_CAPACITY_MASTER
} from '../../lib/constants';
import { exportToJSON, getCurrentExpectedShift } from '../../lib/utils';
import { exportDatabaseBackup, importDatabaseBackup, getStorageHealth, pruneFactoryState } from '../../lib/storage';

interface AdminSettingsViewProps {
  state: FactoryState;
  onBackToHub: () => void;
  onSaveState: (state: FactoryState) => void;
}

type AdminTab = 'brand_items_paper' | 'crate_master' | 'users' | 'master_data' | 'whatsapp' | 'sequences_shifts' | 'backup_restore' | 'maintenance_master';
type MasterDataSubTab = 'jobs' | 'orders' | 'logs';

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  state,
  onBackToHub,
  onSaveState
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('brand_items_paper');
  const [masterSubTab, setMasterSubTab] = useState<MasterDataSubTab>('jobs');

  // Storage Health Telemetry
  const [storageHealth, setStorageHealth] = useState<{
    usedBytes: number;
    quotaBytes: number;
    percentage: number;
    isIndexedDBSupported: boolean;
    engine: string;
  } | null>(null);

  useEffect(() => {
    if (activeTab === 'backup_restore') {
      getStorageHealth().then(setStorageHealth).catch(() => {});
    }
  }, [activeTab]);

  // ==========================================
  // BRAND ITEMS & PAPER MILL MASTER STATE
  // ==========================================
  const [paperBrandsList, setPaperBrandsList] = useState<string[]>(() => {
    return state.paperBrands && state.paperBrands.length > 0 ? state.paperBrands : PAPER_BRANDS;
  });
  const [newPaperBrandInput, setNewPaperBrandInput] = useState('');
  const [editingPaperBrandIdx, setEditingPaperBrandIdx] = useState<number | null>(null);
  const [editingPaperBrandName, setEditingPaperBrandName] = useState('');

  const [productsList, setProductsList] = useState<string[]>(() => {
    return state.products && state.products.length > 0 ? state.products : PRODUCTS;
  });
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrefix, setNewProductPrefix] = useState('');
  const [newProductSeq, setNewProductSeq] = useState('1');
  const [editingProductIdx, setEditingProductIdx] = useState<number | null>(null);
  const [editingProductName, setEditingProductName] = useState('');
  const [editingProductPrefix, setEditingProductPrefix] = useState('');
  const [editingProductSeq, setEditingProductSeq] = useState('1');

  // ==========================================
  // CRATE CAPACITY MASTER (FLAT VS 3D PIECES)
  // ==========================================
  const [crateMaster, setCrateMaster] = useState<Record<string, ProductCrateCapacity>>(() => {
    return state.crateCapacityMaster || DEFAULT_CRATE_CAPACITY_MASTER;
  });
  const [editingCrateProd, setEditingCrateProd] = useState<string | null>(null);
  const [editCutPcs, setEditCutPcs] = useState<number>(10000);
  const [editFormPcs, setEditFormPcs] = useState<number>(7000);
  const [newCrateProd, setNewCrateProd] = useState<string>('');
  const [newCrateCutPcs, setNewCrateCutPcs] = useState<string>('10000');
  const [newCrateFormPcs, setNewCrateFormPcs] = useState<string>('7000');

  const handleSaveCrateRow = (prod: string, cut: number, form: number) => {
    const updated = {
      ...crateMaster,
      [prod]: { cuttingPcs: Math.max(1, cut), formingPcs: Math.max(1, form) }
    };
    setCrateMaster(updated);
    const newLog: LogEntry = {
      stage: 'Admin Settings',
      machine: 'ADMIN_DESK',
      action: `🧺 Updated Crate Master for ${prod}: Cutting=${cut} Pcs, Forming=${form} Pcs`,
      user: 'admin',
      rawDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    };
    onSaveState({
      ...state,
      crateCapacityMaster: updated,
      logs: [...state.logs, newLog]
    });
    setEditingCrateProd(null);
    showToast(`✅ Crate Standard for ${prod} saved (${cut.toLocaleString()} Cut / ${form.toLocaleString()} Formed)!`);
  };

  const handleSaveAllCrateMaster = () => {
    const newLog: LogEntry = {
      stage: 'Admin Settings',
      machine: 'ADMIN_DESK',
      action: `🧺 Saved Master Crate Capacity Matrix (${Object.keys(crateMaster).length} Products)`,
      user: 'admin',
      rawDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    };
    onSaveState({
      ...state,
      crateCapacityMaster: crateMaster,
      logs: [...state.logs, newLog]
    });
    showToast('✅ All Crate Capacities successfully saved into Master Database!');
  };

  const handleResetCrateMaster = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Crate Capacity Master to Defaults?',
      message: 'Are you sure you want to reset all product crate capacities back to factory defaults (Spoon: 10,000/7,000, Fork: 9,000/6,500, Knife: 11,000/7,500)?',
      confirmLabel: 'Yes, Reset to Defaults',
      isDanger: true,
      onConfirm: () => {
        setCrateMaster(DEFAULT_CRATE_CAPACITY_MASTER);
        const newLog: LogEntry = {
          stage: 'Admin Settings',
          machine: 'ADMIN_DESK',
          action: '🧺 Reset Crate Capacity Master to Factory Defaults',
          user: 'admin',
          rawDate: new Date().toISOString().split('T')[0],
          timestamp: new Date().toLocaleString()
        };
        onSaveState({
          ...state,
          crateCapacityMaster: DEFAULT_CRATE_CAPACITY_MASTER,
          logs: [...state.logs, newLog]
        });
        showToast('✅ Crate Master successfully restored to factory defaults!');
      }
    });
  };

  const handleAddCustomCrateProd = () => {
    if (!newCrateProd.trim()) {
      showToast('Please select or type a product name!', 'error');
      return;
    }
    const cut = parseInt(newCrateCutPcs, 10) || 10000;
    const form = parseInt(newCrateFormPcs, 10) || 7000;
    handleSaveCrateRow(newCrateProd.trim(), cut, form);
    setNewCrateProd('');
  };

  // In-app Alert / Toast notification (replaces window.alert)
  const [adminToast, setAdminToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setAdminToast({ msg, type });
    setTimeout(() => setAdminToast(null), 4500);
  };

  // In-app Confirm Modal (replaces window.confirm which fails inside iframe)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    isDanger?: boolean;
  } | null>(null);

  // ==========================================
  // TAB 1: USERS & PERMISSIONS STATE
  // ==========================================
  const usersRecord = state.users || DEFAULT_USERS;
  const [selectedUserKey, setSelectedUserKey] = useState<string>('admin');
  const [editingUser, setEditingUser] = useState<UserAccount>(() => {
    const adminU = usersRecord['admin'] as any;
    return {
      pass: adminU?.pass || '1234',
      perms: adminU?.perms || ['*'],
      name: adminU?.name || 'Master Administrator',
      role: adminU?.role || 'Administrator',
      phone: adminU?.phone || ''
    };
  });

  const [newUserId, setNewUserId] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState('Operator');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  // Department workers state
  const [deptWorkersState, setDeptWorkersState] = useState<Record<string, string[]>>(() => {
    return state.deptWorkers || DEPT_WORKERS;
  });
  const [selectedDeptForWorker, setSelectedDeptForWorker] = useState<string>('Slitting');
  const [newWorkerNameInput, setNewWorkerNameInput] = useState('');

  // ==========================================
  // TAB 2: MASTER DATA OVERWRITE STATE
  // ==========================================
  // Job Overwrite state
  const [selectedJobIdToEdit, setSelectedJobIdToEdit] = useState<string>(state.jobs[0]?.id || '');
  const jobToEdit = state.jobs.find((j) => j.id === selectedJobIdToEdit);
  const [jobEditForm, setJobEditForm] = useState<Job | null>(jobToEdit ? JSON.parse(JSON.stringify(jobToEdit)) : null);

  // Order Overwrite state
  const [selectedOrderIdToEdit, setSelectedOrderIdToEdit] = useState<string>(state.packJobs[0]?.id || '');
  const orderToEdit = state.packJobs.find((o) => o.id === selectedOrderIdToEdit);
  const [orderEditForm, setOrderEditForm] = useState<PackJob | null>(
    orderToEdit ? JSON.parse(JSON.stringify(orderToEdit)) : null
  );

  // Audit Logs Overwrite state
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logFilterStage, setLogFilterStage] = useState('');
  const [editingLogIndex, setEditingLogIndex] = useState<number | null>(null);
  const [logEditForm, setLogEditForm] = useState<LogEntry | null>(null);

  // ==========================================
  // TAB 3: WHATSAPP CONFIG & REPORT STATE
  // ==========================================
  const [waPhone, setWaPhone] = useState(state.whatsappConfig?.phone || '');
  const [waApiKey, setWaApiKey] = useState(state.whatsappConfig?.apiKey || '');
  const [waAutoSend, setWaAutoSend] = useState(state.whatsappConfig?.autoSend || false);
  const [waDayReportTime, setWaDayReportTime] = useState(state.whatsappConfig?.dayShiftReportTime || '20:00');
  const [waNightReportTime, setWaNightReportTime] = useState(state.whatsappConfig?.nightShiftReportTime || '08:00');
  const [waAutoDay, setWaAutoDay] = useState(state.whatsappConfig?.autoSendShiftReportDay !== false);
  const [waAutoNight, setWaAutoNight] = useState(state.whatsappConfig?.autoSendShiftReportNight !== false);
  const [waPreviewShift, setWaPreviewShift] = useState<'DAY' | 'NIGHT'>('DAY');
  const [waWebhookUrl, setWaWebhookUrl] = useState(state.whatsappConfig?.webhookUrl || '');
  const [waCustomMessage, setWaCustomMessage] = useState(
    state.whatsappConfig?.customMessage || 'Wünderkraf Paperware Factory Live Shift Report'
  );

  // ==========================================
  // TAB 7: MAINTENANCE MASTER & RIGHTS STATE
  // ==========================================
  const [maintTechs, setMaintTechs] = useState<string[]>(() => {
    return state.maintenanceTechniciansMaster || [
      'Ramesh Sharma (Head Mech)',
      'Vijay Patel (Sr Electrical)',
      'Dinesh Mistry (Mould Tooling)',
      'Kiran Gohil (Hydraulic & Pneumatics)'
    ];
  });
  const [newTechName, setNewTechName] = useState('');
  const [maintSpareParts, setMaintSpareParts] = useState<string[]>(() => {
    return state.maintenanceSparePartsMaster || [
      'Upper Mould Heater Band (220V/1500W)',
      'High-Speed Cutting Blade Punch Set',
      'Thermocouple K-Type Sensor Cable',
      'Festo 5/2 Directional Solenoid Valve',
      'Hydraulic Piston Rod Oil Seal 45x60x10',
      'NSK High-Precision Deep Groove Ball Bearing',
      'PTFE Non-Stick Mould Liner Strip'
    ];
  });
  const [newPartName, setNewPartName] = useState('');
  const [maxRollPieces, setMaxRollPieces] = useState<number>(state.maxPiecesPerSlitRoll || 12000);
  const [strictRollAudit, setStrictRollAudit] = useState<boolean>(state.strictAuditRollYield || false);

  // ==========================================
  // TAB 4: SEQUENCES & SHIFTS STATE
  // ==========================================
  const [adminPass, setAdminPass] = useState(state.adminPassword || '1234');
  const [productSeqs, setProductSeqs] = useState({ ...state.seriesConfig.productSeqs });
  const [orderSeq, setOrderSeq] = useState(state.seriesConfig.orderSeq || 1);

  const [dayStart, setDayStart] = useState(state.shiftConfig?.dayStart || '08:00');
  const [dayEnd, setDayEnd] = useState(state.shiftConfig?.dayEnd || '20:00');
  const [nightStart, setNightStart] = useState(state.shiftConfig?.nightStart || '20:00');
  const [nightEnd, setNightEnd] = useState(state.shiftConfig?.nightEnd || '08:00');

  // Sync selected job/order when dropdown changes
  const handleSelectJobToEdit = (jobId: string) => {
    setSelectedJobIdToEdit(jobId);
    const j = state.jobs.find((x) => x.id === jobId);
    setJobEditForm(j ? JSON.parse(JSON.stringify(j)) : null);
  };

  const handleSelectOrderToEdit = (ordId: string) => {
    setSelectedOrderIdToEdit(ordId);
    const o = state.packJobs.find((x) => x.id === ordId);
    setOrderEditForm(o ? JSON.parse(JSON.stringify(o)) : null);
  };

  const handleSelectUser = (userKey: string) => {
    setSelectedUserKey(userKey);
    const u = usersRecord[userKey] as any;
    if (u) {
      setEditingUser({
        pass: u.pass || '',
        perms: [...(u.perms || [])],
        name: u.name || userKey,
        role: u.role || 'Operator',
        phone: u.phone || ''
      });
    }
  };

  // ==========================================
  // USER MANAGEMENT HANDLERS
  // ==========================================
  const handleSaveUserPermissions = () => {
    const updatedUsers = {
      ...usersRecord,
      [selectedUserKey]: {
        ...editingUser
      }
    };

    const newLog: LogEntry = {
      stage: 'Admin Master',
      machine: 'CONTROL-PANEL',
      shift: 'DAY',
      action: `👤 Updated User Account & Permissions for [${selectedUserKey}]`,
      worker: 'ADMIN',
      user: 'admin',
      rawDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    };

    onSaveState({
      ...state,
      users: updatedUsers,
      logs: [...state.logs, newLog]
    });

    alert(`✅ User Account [${selectedUserKey}] and Permissions Saved Successfully!`);
  };

  const handleCreateNewUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newUserId.trim().toLowerCase().replace(/\s+/g, '_');
    if (!cleanId) return alert('Enter a valid User ID!');
    if (usersRecord[cleanId]) return alert(`User ID [${cleanId}] already exists!`);
    if (!newUserPass.trim()) return alert('Enter user password / PIN!');

    const newUserObj: UserAccount = {
      pass: newUserPass.trim(),
      perms: ['Stock', 'Orders'],
      name: newUserName.trim() || cleanId,
      role: newUserRole,
      phone: ''
    };

    const updatedUsers = {
      ...usersRecord,
      [cleanId]: newUserObj
    };

    onSaveState({
      ...state,
      users: updatedUsers
    });

    setIsAddUserModalOpen(false);
    setSelectedUserKey(cleanId);
    setEditingUser(newUserObj);
    setNewUserId('');
    setNewUserName('');
    setNewUserPass('');
    alert(`✅ New User Account [${cleanId}] Created Successfully!`);
  };

  const handleDeleteUser = (userKey: string) => {
    if (userKey === 'admin') {
      showToast('⚠️ Security Protection: Master Admin account cannot be deleted!', 'error');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Delete User Account',
      message: `Are you sure you want to permanently delete user account [${userKey}]? All login access and assigned workstation permissions will be revoked immediately.`,
      confirmLabel: 'Yes, Delete Account',
      isDanger: true,
      onConfirm: () => {
        setConfirmModal(null);
        const updatedUsers = { ...usersRecord };
        delete updatedUsers[userKey];

        onSaveState({
          ...state,
          users: updatedUsers
        });

        setSelectedUserKey('admin');
        const adminU = updatedUsers['admin'] || usersRecord['admin'];
        if (adminU) {
          setEditingUser({
            pass: adminU.pass || '1234',
            perms: adminU.perms || ['*'],
            name: adminU.name || 'Master Administrator',
            role: adminU.role || 'Administrator',
            phone: adminU.phone || ''
          });
        }
        showToast(`🗑️ User account [${userKey}] deleted successfully!`);
      }
    });
  };

  const ALL_OPERATIONAL_PERMS = [
    'Admin',
    'Dashboard',
    'Marketing',
    'Dispatch',
    'Slitting',
    'Cutting',
    'Forming',
    'QC',
    'Packing',
    'Maintenance',
    'Mnt_LogIncident',
    'Mnt_AssignTech',
    'Mnt_Repair',
    'Mnt_SpareParts',
    'Mnt_Preventative',
    'Mnt_RCA',
    'Purchase',
    'Stock',
    'Orders',
    'Analytics',
    'Search',
    'Audit'
  ];

  const handleTogglePerm = (perm: string) => {
    if (perm === '*') {
      if (editingUser.perms.includes('*')) {
        setEditingUser({ ...editingUser, perms: [] });
      } else {
        setEditingUser({ ...editingUser, perms: ['*'] });
      }
      return;
    }

    let newPerms = [...editingUser.perms];
    if (newPerms.includes('*')) {
      newPerms = [...ALL_OPERATIONAL_PERMS];
    }

    if (newPerms.includes(perm)) {
      newPerms = newPerms.filter((p) => p !== perm);
    } else {
      newPerms.push(perm);
    }

    setEditingUser({ ...editingUser, perms: newPerms });
  };

  // Department worker handlers
  const handleAddWorker = () => {
    if (!newWorkerNameInput.trim()) return;
    const cleanName = newWorkerNameInput.trim().toUpperCase();
    const existing = deptWorkersState[selectedDeptForWorker] || [];
    if (existing.includes(cleanName)) return alert('Worker already exists in this department!');

    const updated = {
      ...deptWorkersState,
      [selectedDeptForWorker]: [...existing, cleanName]
    };

    setDeptWorkersState(updated);
    setNewWorkerNameInput('');
    onSaveState({
      ...state,
      deptWorkers: updated
    });
    alert(`✅ Worker [${cleanName}] added to ${selectedDeptForWorker} team!`);
  };

  const handleRemoveWorker = (dept: string, workerName: string) => {
    const existing = deptWorkersState[dept] || [];
    const updatedList = existing.filter((w) => w !== workerName);
    const updated = {
      ...deptWorkersState,
      [dept]: updatedList
    };
    setDeptWorkersState(updated);
    onSaveState({
      ...state,
      deptWorkers: updated
    });
  };

  // ==========================================
  // MASTER DATA OVERWRITE: PRODUCTION JOBS
  // ==========================================
  const handleSaveJobOverwrite = () => {
    if (!jobEditForm) return;

    const cleanId = jobEditForm.id.trim().toUpperCase();
    if (!cleanId) {
      showToast('⚠️ Job ID cannot be empty!', 'error');
      return;
    }
    const inKg = Math.max(0, Number(jobEditForm.inputWeightKg) || 0);
    const outKg = Math.max(0, Number(jobEditForm.outputWeightKg) || 0);
    const calculatedScrapKg = Math.max(0, inKg - outKg);
    const actualScrapKg = jobEditForm.scrapKg !== undefined ? Math.max(0, Number(jobEditForm.scrapKg) || 0) : calculatedScrapKg;
    const scrapPct = inKg > 0 ? Number(((actualScrapKg / inKg) * 100).toFixed(1)) : 0;

    const updatedJobs = state.jobs.map((j) => {
      if (j.id === selectedJobIdToEdit) {
        return {
          ...j,
          ...jobEditForm,
          id: cleanId,
          reelNo: String(jobEditForm.reelNo || '').trim().toUpperCase(),
          gsm: String(jobEditForm.gsm || '').trim(),
          inputWeightKg: inKg,
          outputWeightKg: outKg,
          scrapKg: actualScrapKg,
          scrapPercent: scrapPct,
          availableRolls: Number(jobEditForm.availableRolls) || 0,
          availableCuttingCrates: Number(jobEditForm.availableCuttingCrates) || 0,
          availableFormingCrates: Number(jobEditForm.availableFormingCrates) || 0,
          availableQcCrates: Number(jobEditForm.availableQcCrates) || 0,
          pcsPerCrateCutting: Number(jobEditForm.pcsPerCrateCutting) || undefined,
          pcsPerCrateForming: Number(jobEditForm.pcsPerCrateForming) || undefined,
          totalCutPieces: Number(jobEditForm.totalCutPieces) || undefined,
          totalFormedPieces: Number(jobEditForm.totalFormedPieces) || undefined,
          totalQcPieces: Number(jobEditForm.totalQcPieces) || undefined
        };
      }
      return j;
    });

    const newLog: LogEntry = {
      jobId: cleanId,
      product: jobEditForm.product,
      stage: 'Admin Master',
      machine: 'MASTER-OVERWRITE',
      shift: 'DAY',
      action: `🛠️ Master Overwrite on Job [${cleanId}]: Admin modified details (Reel: ${jobEditForm.reelNo || '-'}, GSM: ${jobEditForm.gsm || '-'}, In: ${inKg}kg, Out: ${outKg}kg, Scrap: ${actualScrapKg}kg)`,
      worker: 'ADMIN',
      user: 'admin',
      rawDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    };

    onSaveState({
      ...state,
      jobs: updatedJobs,
      logs: [...state.logs, newLog]
    });

    setSelectedJobIdToEdit(cleanId);
    showToast(`✅ Production Job [${cleanId}] Master Overwrite Saved Successfully!`);
  };

  const executeDeleteJob = (jobId: string) => {
    const updatedJobs = state.jobs.filter((j) => j.id !== jobId);
    const newLog: LogEntry = {
      jobId: jobId,
      stage: 'Admin Master',
      machine: 'MASTER-OVERWRITE',
      shift: 'DAY',
      action: `🗑️ Deleted Job [${jobId}] completely from database`,
      worker: 'ADMIN',
      user: 'admin',
      rawDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    };

    onSaveState({
      ...state,
      jobs: updatedJobs,
      logs: [...state.logs, newLog]
    });

    const nextJob = updatedJobs[0]?.id || '';
    handleSelectJobToEdit(nextJob);
    showToast(`✅ Job [${jobId}] deleted from database.`);
  };

  const handleDeleteJob = (jobId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Production Job',
      message: `Are you sure you want to permanently delete Job [${jobId}] completely from the factory database? All associated running batches will also be removed.`,
      confirmLabel: 'Yes, Delete Job',
      isDanger: true,
      onConfirm: () => {
        executeDeleteJob(jobId);
        setConfirmModal(null);
      }
    });
  };

  // ==========================================
  // MASTER DATA OVERWRITE: PACKING ORDERS
  // ==========================================
  const handleSaveOrderOverwrite = () => {
    if (!orderEditForm) return;

    const updatedPackJobs = state.packJobs.map((o) => {
      if (o.id === selectedOrderIdToEdit) {
        return {
          ...orderEditForm,
          pcsPerBox: Number(orderEditForm.pcsPerBox) || 1,
          orderQty: Number(orderEditForm.orderQty) || 1,
          packedBoxes: Number(orderEditForm.packedBoxes) || 0,
          dispatchedBoxes: Number(orderEditForm.dispatchedBoxes) || 0
        };
      }
      return o;
    });

    const newLog: LogEntry = {
      jobId: orderEditForm.id,
      product: orderEditForm.packType,
      stage: 'Admin Master',
      machine: 'MASTER-OVERWRITE',
      shift: 'DAY',
      action: `🛠️ Master Overwrite on Order [${orderEditForm.id}] (${orderEditForm.customer})`,
      worker: 'ADMIN',
      user: 'admin',
      rawDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    };

    onSaveState({
      ...state,
      packJobs: updatedPackJobs,
      logs: [...state.logs, newLog]
    });

    setSelectedOrderIdToEdit(orderEditForm.id);
    showToast(`✅ Customer Order [${orderEditForm.id}] Master Overwrite Saved Successfully!`);
  };

  const executeDeleteOrder = (ordId: string) => {
    const updatedPackJobs = state.packJobs.filter((o) => o.id !== ordId);
    const newLog: LogEntry = {
      jobId: ordId,
      stage: 'Admin Master',
      machine: 'MASTER-OVERWRITE',
      shift: 'DAY',
      action: `🗑️ Deleted Customer Order [${ordId}] completely from database`,
      worker: 'ADMIN',
      user: 'admin',
      rawDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    };

    onSaveState({
      ...state,
      packJobs: updatedPackJobs,
      logs: [...state.logs, newLog]
    });

    const nextOrd = updatedPackJobs[0]?.id || '';
    handleSelectOrderToEdit(nextOrd);
    showToast(`✅ Customer Order [${ordId}] deleted from database.`);
  };

  const handleDeleteOrder = (ordId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Customer Order',
      message: `Are you sure you want to permanently delete Customer Order [${ordId}] completely from the database?`,
      confirmLabel: 'Yes, Delete Order',
      isDanger: true,
      onConfirm: () => {
        executeDeleteOrder(ordId);
        setConfirmModal(null);
      }
    });
  };

  // ==========================================
  // BRAND ITEMS & PAPER MILL MASTER HANDLERS
  // ==========================================
  const handleAddPaperBrand = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newPaperBrandInput.trim().toUpperCase();
    if (!cleanName) {
      showToast('⚠️ Please enter a Paper Mill / Brand name!', 'error');
      return;
    }
    if (paperBrandsList.some((b) => b.toUpperCase() === cleanName)) {
      showToast(`⚠️ Brand "${cleanName}" already exists in the list!`, 'error');
      return;
    }

    const updatedBrands = [...paperBrandsList, cleanName];
    setPaperBrandsList(updatedBrands);
    setNewPaperBrandInput('');

    const newLog: LogEntry = {
      jobId: 'MASTER-BRAND',
      stage: 'Admin Master',
      machine: 'ADMIN-SETTINGS',
      shift: 'DAY',
      action: `🏷️ Added New Paper Mill Brand: ${cleanName}`,
      worker: 'ADMIN',
      user: 'admin',
      rawDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    };

    onSaveState({
      ...state,
      paperBrands: updatedBrands,
      logs: [...(state.logs || []), newLog]
    });
    showToast(`✅ Paper Mill "${cleanName}" added successfully!`);
  };

  const handleSaveEditPaperBrand = (index: number) => {
    const cleanName = editingPaperBrandName.trim().toUpperCase();
    if (!cleanName) {
      showToast('⚠️ Brand name cannot be empty!', 'error');
      return;
    }
    const updatedBrands = [...paperBrandsList];
    const oldName = updatedBrands[index];
    updatedBrands[index] = cleanName;
    setPaperBrandsList(updatedBrands);
    setEditingPaperBrandIdx(null);

    const newLog: LogEntry = {
      jobId: 'MASTER-BRAND',
      stage: 'Admin Master',
      machine: 'ADMIN-SETTINGS',
      shift: 'DAY',
      action: `✏️ Renamed Paper Mill Brand from ${oldName} to ${cleanName}`,
      worker: 'ADMIN',
      user: 'admin',
      rawDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    };

    onSaveState({
      ...state,
      paperBrands: updatedBrands,
      logs: [...(state.logs || []), newLog]
    });
    showToast(`✅ Paper Mill updated to "${cleanName}"!`);
  };

  const handleDeletePaperBrand = (brandName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Paper Mill / Brand',
      message: `Are you sure you want to remove "${brandName}" from the Paper Mill dropdown? Existing jobs with this brand will remain unchanged.`,
      confirmLabel: 'Yes, Remove Brand',
      isDanger: true,
      onConfirm: () => {
        const updatedBrands = paperBrandsList.filter((b) => b !== brandName);
        setPaperBrandsList(updatedBrands);
        const newLog: LogEntry = {
          jobId: 'MASTER-BRAND',
          stage: 'Admin Master',
          machine: 'ADMIN-SETTINGS',
          shift: 'DAY',
          action: `🗑️ Removed Paper Mill Brand: ${brandName}`,
          worker: 'ADMIN',
          user: 'admin',
          rawDate: new Date().toISOString().split('T')[0],
          timestamp: new Date().toLocaleString()
        };
        onSaveState({
          ...state,
          paperBrands: updatedBrands,
          logs: [...(state.logs || []), newLog]
        });
        setConfirmModal(null);
        showToast(`🗑️ Paper Mill "${brandName}" removed.`);
      }
    });
  };

  const handleResetBrandsToDefault = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Brands & Products to Defaults',
      message: 'Restore the standard factory paper mills and cutlery items? Any custom brands added will be overwritten with defaults.',
      confirmLabel: 'Restore Defaults',
      isDanger: false,
      onConfirm: () => {
        setPaperBrandsList(PAPER_BRANDS);
        setProductsList(PRODUCTS);
        onSaveState({
          ...state,
          paperBrands: PAPER_BRANDS,
          products: PRODUCTS
        });
        setConfirmModal(null);
        showToast('✅ Reset to factory default Paper Mills and Products.');
      }
    });
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newProductName.trim();
    if (!cleanName) {
      showToast('⚠️ Please enter a product / brand item name!', 'error');
      return;
    }
    if (productsList.some((p) => p.toLowerCase() === cleanName.toLowerCase())) {
      showToast(`⚠️ Product "${cleanName}" already exists!`, 'error');
      return;
    }

    const cleanPrefix = (newProductPrefix.trim().toUpperCase() || cleanName.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'ITM');
    const startSeq = Math.max(1, parseInt(newProductSeq, 10) || 1);

    const updatedProducts = [...productsList, cleanName];
    const updatedPrefixMap = {
      ...PRODUCT_PREFIX_MAP,
      ...(state.productPrefixMap || {}),
      [cleanName]: cleanPrefix
    };
    const updatedSeqs = {
      ...(state.seriesConfig?.productSeqs || {}),
      [cleanName]: startSeq
    };

    setProductsList(updatedProducts);
    setNewProductName('');
    setNewProductPrefix('');
    setNewProductSeq('1');

    const newLog: LogEntry = {
      jobId: 'MASTER-PROD',
      stage: 'Admin Master',
      machine: 'ADMIN-SETTINGS',
      shift: 'DAY',
      action: `🍽️ Added New Brand Item / Product: ${cleanName} (Prefix: ${cleanPrefix}, Seq: ${startSeq})`,
      worker: 'ADMIN',
      user: 'admin',
      rawDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    };

    onSaveState({
      ...state,
      products: updatedProducts,
      productPrefixMap: updatedPrefixMap,
      seriesConfig: {
        ...state.seriesConfig,
        productSeqs: updatedSeqs
      },
      logs: [...(state.logs || []), newLog]
    });
    showToast(`✅ Brand Item "${cleanName}" (${cleanPrefix}) added successfully!`);
  };

  const handleSaveEditProduct = (index: number) => {
    const oldName = productsList[index];
    const cleanName = editingProductName.trim();
    if (!cleanName) {
      showToast('⚠️ Product name cannot be empty!', 'error');
      return;
    }
    const cleanPrefix = (editingProductPrefix.trim().toUpperCase() || cleanName.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'ITM');
    const parsedSeq = Math.max(1, parseInt(editingProductSeq, 10) || 1);

    const updatedProducts = [...productsList];
    updatedProducts[index] = cleanName;

    const updatedPrefixMap = {
      ...PRODUCT_PREFIX_MAP,
      ...(state.productPrefixMap || {}),
      [cleanName]: cleanPrefix
    };

    const updatedSeqs = {
      ...(state.seriesConfig?.productSeqs || {}),
      [cleanName]: parsedSeq
    };
    if (oldName && oldName !== cleanName && updatedSeqs[oldName]) {
      delete updatedSeqs[oldName];
    }

    setProductsList(updatedProducts);
    setProductSeqs(updatedSeqs);
    setEditingProductIdx(null);

    const newLog: LogEntry = {
      stage: 'Admin Master',
      machine: 'ADMIN-CONTROL',
      shift: 'DAY',
      action: `🔢 Admin updated Item [${cleanName}] sequence counter to #${parsedSeq} (Prefix: ${cleanPrefix})`,
      worker: 'ADMIN',
      user: 'admin',
      rawDate: new Date().toISOString().split('T')[0],
      timestamp: new Date().toLocaleString()
    };

    onSaveState({
      ...state,
      products: updatedProducts,
      productPrefixMap: updatedPrefixMap,
      seriesConfig: {
        ...state.seriesConfig,
        productSeqs: updatedSeqs
      },
      logs: [...state.logs, newLog]
    });
    showToast(`✅ Product "${cleanName}" (${cleanPrefix}) next sequence set to #${parsedSeq}!`);
  };

  const handleDeleteProduct = (prodName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Brand Item / Product',
      message: `Are you sure you want to remove "${prodName}" from the product list?`,
      confirmLabel: 'Yes, Delete Item',
      isDanger: true,
      onConfirm: () => {
        const updatedProducts = productsList.filter((p) => p !== prodName);
        setProductsList(updatedProducts);
        onSaveState({
          ...state,
          products: updatedProducts
        });
        setConfirmModal(null);
        showToast(`🗑️ Product "${prodName}" removed.`);
      }
    });
  };

  const executeZeroAllData = () => {
    const zeroState: FactoryState = {
      ...state,
      jobs: [],
      packJobs: [],
      logs: [
        {
          jobId: 'SYSTEM-RESET',
          stage: 'Admin Master',
          machine: 'ADMIN-ZERO',
          shift: 'DAY',
          action: '⚡ All Factory Data Reset to 0 for Clean Testing (पूरा डेटा 0 किया गया)',
          worker: 'ADMIN',
          user: 'admin',
          rawDate: new Date().toISOString().split('T')[0],
          timestamp: new Date().toLocaleString()
        }
      ],
      scrapSales: [],
      maintenanceIncidents: [],
      customerComplaints: [],
      materialRequisitions: []
    };
    onSaveState(zeroState);
    handleSelectJobToEdit('');
    handleSelectOrderToEdit('');
    showToast('⚡ Factory Data successfully zeroed! You can now test with fresh entries.');
  };

  const promptZeroAllData = () => {
    setConfirmModal({
      isOpen: true,
      title: '⚡ Zero All Operational Data (पूरा डेटा 0 करें)',
      message: 'Are you sure you want to wipe all production jobs, customer packing orders, and logs to 0? This lets you test from a fresh beginning. User accounts, custom products, and paper mills will NOT be deleted.',
      confirmLabel: 'Yes, Reset All to 0 (डेटा 0 करें)',
      isDanger: true,
      onConfirm: () => {
        executeZeroAllData();
        setConfirmModal(null);
      }
    });
  };

  // ==========================================
  // MASTER DATA OVERWRITE: AUDIT LOGS
  // ==========================================
  const filteredLogs = state.logs
    .map((log, idx) => ({ log, originalIndex: idx }))
    .filter(({ log }) => {
      const matchesSearch =
        !logSearchQuery ||
        (log.jobId && log.jobId.toLowerCase().includes(logSearchQuery.toLowerCase())) ||
        (log.action && log.action.toLowerCase().includes(logSearchQuery.toLowerCase())) ||
        (log.worker && log.worker.toLowerCase().includes(logSearchQuery.toLowerCase())) ||
        (log.machine && log.machine.toLowerCase().includes(logSearchQuery.toLowerCase()));
      const matchesStage = !logFilterStage || log.stage === logFilterStage;
      return matchesSearch && matchesStage;
    })
    .reverse();

  const handleStartEditLog = (originalIndex: number) => {
    setEditingLogIndex(originalIndex);
    setLogEditForm(JSON.parse(JSON.stringify(state.logs[originalIndex])));
  };

  const handleSaveLogEdit = () => {
    if (editingLogIndex === null || !logEditForm) return;

    const updatedLogs = [...state.logs];
    updatedLogs[editingLogIndex] = logEditForm;

    onSaveState({
      ...state,
      logs: updatedLogs
    });

    setEditingLogIndex(null);
    setLogEditForm(null);
    alert('✅ Log Entry Updated Successfully!');
  };

  const handleDeleteLogEntry = (originalIndex: number) => {
    if (!confirm('Are you sure you want to delete this log entry?')) return;

    const updatedLogs = state.logs.filter((_, idx) => idx !== originalIndex);
    onSaveState({
      ...state,
      logs: updatedLogs
    });
    alert('✅ Log entry deleted.');
  };

  // ==========================================
  // WHATSAPP REPORT GENERATOR & DISPATCHER
  // ==========================================
  const handleSaveWhatsAppConfig = () => {
    onSaveState({
      ...state,
      whatsappConfig: {
        phone: waPhone.trim(),
        apiKey: waApiKey.trim(),
        autoSend: waAutoSend,
        webhookUrl: waWebhookUrl.trim(),
        customMessage: waCustomMessage.trim(),
        dayShiftReportTime: waDayReportTime,
        nightShiftReportTime: waNightReportTime,
        autoSendShiftReportDay: waAutoDay,
        autoSendShiftReportNight: waAutoNight
      }
    });
    showToast('✅ WhatsApp Shift Reporting & Changeover Settings Saved Successfully!');
  };

  const generateShiftChangeoverReportText = (targetShift: 'DAY' | 'NIGHT') => {
    const todayStr = new Date().toISOString().split('T')[0];
    const shiftLogs = (state.logs || []).filter((l) => {
      const matchDate = !l.rawDate || l.rawDate === todayStr;
      const matchShift = !l.shift || l.shift.toUpperCase() === targetShift;
      return matchDate && matchShift;
    });

    // 1. Slitting
    const slitLogs = shiftLogs.filter(
      (l) => l.stage?.toLowerCase().includes('slitting') || l.machine?.toLowerCase().includes('slitting')
    );
    const slitOps = Array.from(new Set(slitLogs.map((l) => l.worker).filter(Boolean))).join(', ') || 'Ramesh Patel (Slit)';
    const slitRollsProduced = slitLogs.reduce((acc, l) => {
      const m = l.action?.match(/(\d+)\s*(Rolls|रील)/i);
      return acc + (m ? parseInt(m[1], 10) : 0);
    }, 0) || state.jobs.reduce((s, j) => s + (j.availableRolls || 0), 0);

    // 2. Cutting
    const cutLogs = shiftLogs.filter(
      (l) => l.stage?.toLowerCase().includes('cutting') || l.machine?.toLowerCase().includes('cutting')
    );
    const cut1Logs = cutLogs.filter((l) => l.machine === 'Cutting-1');
    const cut1Op = Array.from(new Set(cut1Logs.map((l) => l.worker).filter(Boolean))).join(', ') || 'Kishore Parmar';
    const cut2Logs = cutLogs.filter((l) => l.machine === 'Cutting-2');
    const cut2Op = Array.from(new Set(cut2Logs.map((l) => l.worker).filter(Boolean))).join(', ') || 'Mahesh Solanki';
    const cutCratesStock = state.jobs.reduce((s, j) => s + (j.availableCuttingCrates || 0), 0);

    // 3. Forming Machines (M-01 to M-08)
    const formLogs = shiftLogs.filter(
      (l) => l.stage?.toLowerCase().includes('forming') || l.machine?.toLowerCase().includes('forming')
    );
    const formMachines = ['Forming-1', 'Forming-2', 'Forming-3', 'Forming-4', 'Forming-5', 'Forming-6', 'Forming-7', 'Forming-8'];
    const formLines = formMachines.map((m) => {
      const mLogs = formLogs.filter((l) => l.machine === m);
      const op = Array.from(new Set(mLogs.map((l) => l.worker).filter(Boolean))).join(', ') || 'Operator Assigned';
      const crates = mLogs.reduce((acc, l) => {
        const match = l.action?.match(/(\d+)\s*(Crates|crates|क्रेट)/i);
        return acc + (match ? parseInt(match[1], 10) : 0);
      }, 0);
      return `• ${m}: Op: *${op}* | Out: ${crates > 0 ? `${crates} Crates` : 'Active Run'}`;
    });

    // 4. QC Inspection
    const qcLogs = shiftLogs.filter(
      (l) => l.stage?.toLowerCase().includes('qc') || l.machine?.toLowerCase().includes('qc')
    );
    const qcInspectors = Array.from(new Set(qcLogs.map((l) => l.worker).filter(Boolean))).join(', ') || 'Kavita Ben / QC Desk';
    const qcOkCrates = state.jobs.reduce((s, j) => s + (j.availableQcCrates || 0), 0);

    // 5. Packing & Dispatch
    const packLogs = shiftLogs.filter(
      (l) => l.stage?.toLowerCase().includes('packing') || l.machine?.toLowerCase().includes('packing')
    );
    const packOps = Array.from(new Set(packLogs.map((l) => l.worker).filter(Boolean))).join(', ') || 'Suresh & Packing Staff';
    const totalPackedBoxes = state.packJobs.reduce((s, p) => s + (p.packedBoxes || 0), 0);
    const totalDispatched = state.packJobs.reduce((s, p) => s + (p.dispatchedBoxes || 0), 0);

    const shiftTimeRange = targetShift === 'DAY'
      ? `${state.shiftConfig?.dayStart || '08:00'} to ${state.shiftConfig?.dayEnd || '20:00'}`
      : `${state.shiftConfig?.nightStart || '20:00'} to ${state.shiftConfig?.nightEnd || '08:00'}`;

    return `🏭 *WÜNDERKRAF PAPERWARE ERP*
📋 *DAILY ${targetShift} SHIFT CHANGEOVER REPORT*
📅 *Date:* ${todayStr} | *Shift:* ${targetShift} (${shiftTimeRange})
⏱️ *Changeover Trigger Time:* ${new Date().toLocaleTimeString()}

━━━━━━━━━━━━━━━━━━━━━
📜 *1. SLITTING SECTION:*
• Slitting-1: Operator: *${slitOps}*
  Output: ${slitRollsProduced} Slit Rolls

✂️ *2. CUTTING SECTION:*
• Cutting-1: Operator: *${cut1Op}*
• Cutting-2: Operator: *${cut2Op}*
  Floor Cut Stock: ${cutCratesStock} Crates

⚙️ *3. FORMING MACHINES (M-01 to M-08):*
${formLines.join('\n')}

🔍 *4. QUALITY CONTROL (QC):*
• QC Inspector: *${qcInspectors}*
• Passed QC Stock: *${qcOkCrates} Crates*

📦 *5. PACKING & DISPATCH:*
• Supervisor/Packer: *${packOps}*
• Total Packed: *${totalPackedBoxes} Boxes*
• Dispatched Today: *${totalDispatched} Boxes*
━━━━━━━━━━━━━━━━━━━━━
✅ *Auto Shift Changeover Handover Complete.*`;
  };

  const handleSendShiftWhatsApp = (shift: 'DAY' | 'NIGHT') => {
    const reportMessage = generateShiftChangeoverReportText(shift);
    const encodedText = encodeURIComponent(reportMessage);
    const cleanPhone = waPhone.replace(/[^0-9]/g, '');

    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodedText}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodedText}`, '_blank');
    }
  };

  const handleSendWhatsAppShiftReport = () => {
    const currentShift = getCurrentExpectedShift(state.shiftConfig);
    handleSendShiftWhatsApp(currentShift === 'NIGHT' ? 'NIGHT' : 'DAY');
  };

  // Maintenance Master Handlers
  const handleSaveMaintenanceMaster = () => {
    onSaveState({
      ...state,
      maintenanceTechniciansMaster: maintTechs,
      maintenanceSparePartsMaster: maintSpareParts,
      maxPiecesPerSlitRoll: Number(maxRollPieces) || 12000,
      strictAuditRollYield: strictRollAudit
    });
    showToast('✅ Maintenance Master, Rights & Roll Yield Limits Saved Successfully!');
  };

  const handleAddTech = () => {
    if (!newTechName.trim()) return;
    if (maintTechs.includes(newTechName.trim())) return alert('Technician already exists!');
    setMaintTechs([...maintTechs, newTechName.trim()]);
    setNewTechName('');
  };

  const handleRemoveTech = (idx: number) => {
    setMaintTechs(maintTechs.filter((_, i) => i !== idx));
  };

  const handleAddSparePart = () => {
    if (!newPartName.trim()) return;
    if (maintSpareParts.includes(newPartName.trim())) return alert('Spare part already in catalogue!');
    setMaintSpareParts([...maintSpareParts, newPartName.trim()]);
    setNewPartName('');
  };

  const handleRemoveSparePart = (idx: number) => {
    setMaintSpareParts(maintSpareParts.filter((_, i) => i !== idx));
  };

  const handleGrantAllMaintenanceRightsToUser = (userKey: string) => {
    const u = usersRecord[userKey];
    if (!u) return;
    const mntRights = [
      'Maintenance',
      'Mnt_LogIncident',
      'Mnt_AssignTech',
      'Mnt_Repair',
      'Mnt_SpareParts',
      'Mnt_Preventative',
      'Mnt_RCA'
    ];
    const existing = u.perms || [];
    const combined = Array.from(new Set([...existing, ...mntRights]));
    const updatedUsers = {
      ...usersRecord,
      [userKey]: {
        ...u,
        perms: combined
      }
    };
    onSaveState({
      ...state,
      users: updatedUsers
    });
    if (selectedUserKey === userKey) {
      setEditingUser({ ...editingUser, perms: combined });
    }
    showToast(`✅ Granted All Maintenance Desk Rights to [${userKey}]!`);
  };

  // ==========================================
  // SEQUENCES, SHIFTS & ADMIN PIN
  // ==========================================
  const handleSaveSequencesAndShifts = (e: React.FormEvent) => {
    e.preventDefault();

    onSaveState({
      ...state,
      adminPassword: adminPass.trim() || '1234',
      seriesConfig: {
        ...state.seriesConfig,
        productSeqs: productSeqs,
        orderSeq: Number(orderSeq) || 1
      },
      shiftConfig: {
        dayStart,
        dayEnd,
        nightStart,
        nightEnd
      }
    });

    alert('✅ Numbering Sequences, Shift Timings & Master PIN Saved Successfully!');
  };

  // ==========================================
  // BACKUP, RESTORE & HARD RESET
  // ==========================================
  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const restored = await importDatabaseBackup(file);
      onSaveState(restored);
      getStorageHealth().then(setStorageHealth).catch(() => {});
      alert(`✅ Factory database state restored successfully from backup!\n• Jobs: ${restored.jobs?.length || 0}\n• Orders: ${restored.packJobs?.length || 0}\n• Logs: ${restored.logs?.length || 0}`);
    } catch (err: any) {
      alert(`❌ Restore failed: ${err.message || 'Invalid backup JSON file'}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleRunPruning = () => {
    if (
      !confirm(
        'Run database archival and pruning for completed records older than 30 days?\nThis will protect storage space by moving older logs and completed jobs into cold archival records.'
      )
    ) {
      return;
    }
    const result = pruneFactoryState(state, 30);
    onSaveState(result.prunedState);
    getStorageHealth().then(setStorageHealth).catch(() => {});
    alert(
      `✅ Pruning completed!\n• Archived ${result.archivedJobsCount} completed jobs\n• Archived ${result.archivedLogsCount} historical logs\nActive database is lean and optimized.`
    );
  };

  const handleHardReset = () => {
    if (
      !confirm(
        '⚠️ CRITICAL WARNING: This will completely wipe all current factory jobs, orders, and logs and restore clean default initial state!\nAre you sure you want to proceed?'
      )
    ) {
      return;
    }
    const pass = prompt('Enter Master Admin Password to confirm factory wipe:');
    if (pass !== (state.adminPassword || '1234')) {
      alert('❌ Incorrect Admin Password! Reset aborted.');
      return;
    }

    onSaveState(INITIAL_STATE);
    alert('✅ Factory database has been reset to clean default initial state.');
  };

  const AVAILABLE_PERMS = [
    { key: '*', label: '👑 FULL MASTER ACCESS (*)', desc: 'Full control over all modules & admin settings' },
    { key: 'Admin', label: '⚙️ Admin Settings & Overwrite', desc: 'Manage users, sequences & overwrite data' },
    { key: 'Dashboard', label: '📊 Executive Dashboard', desc: 'Live Floor Pulse & Real-time Machine Status' },
    { key: 'Marketing', label: '💼 Customer Marketing & Orders', desc: 'Create and book new packing orders' },
    { key: 'Dispatch', label: '🚚 Dispatch & Gatepass Invoicing', desc: 'Process box dispatches and bills' },
    { key: 'Slitting', label: '📜 Slitting Desk (Stage 1)', desc: 'Jumbo reel loading & slitting runs' },
    { key: 'Cutting', label: '✂️ Cutting Desk (Stage 2)', desc: 'Slit rolls to cut crates' },
    { key: 'Forming', label: '⚙️ Forming Desk (Stage 3)', desc: 'Hydraulic moulding & pressing' },
    { key: 'QC', label: '🔍 QC Inspection Desk (Stage 4)', desc: 'Formed crates quality check & scrap' },
    { key: 'Packing', label: '📦 Packing Desk (Stage 5)', desc: 'Kit assembly & box packaging' },
    { key: 'Maintenance', label: '🛠️ Maintenance Desk (Full Control)', desc: 'Machine breakdowns, spare parts, logs & ready handover' },
    { key: 'Mnt_LogIncident', label: '🚨 Log Machine Breakdown / Down', desc: 'Can report machine breakdowns and stoppage reasons' },
    { key: 'Mnt_AssignTech', label: '👨‍🔧 Assign Technician & Priority', desc: 'Can assign maintenance leads, priority, and acknowledge' },
    { key: 'Mnt_Repair', label: '🔧 Mark Repaired & Action Log', desc: 'Can mark machines repaired, ready for production handover' },
    { key: 'Mnt_SpareParts', label: '⚙️ Spare Parts Consumption & Stock', desc: 'Can record replacement parts and adjust inventory' },
    { key: 'Mnt_Preventative', label: '📋 Preventative Maintenance Schedules', desc: 'Can manage routine PM checklists and machine health' },
    { key: 'Mnt_RCA', label: '📊 Root Cause Analysis (RCA) & Audit', desc: 'Can edit failure root cause and CAPA preventive actions' },
    { key: 'Purchase', label: '🛒 Purchase & Indent Desk', desc: 'Material Indents, Vendor POs & Incoming Goods (माल प्राप्ति)' },
    { key: 'Stock', label: '📊 Raw & WIP Stock Matrix', desc: 'Real-time inventory levels' },
    { key: 'Orders', label: '📋 Orders Book & Customer Specs', desc: 'View customer orders list' },
    { key: 'Analytics', label: '📈 Scrap & Efficiency Analytics', desc: 'Output yield & machine metrics' },
    { key: 'Search', label: '🔎 Universal Search Desk', desc: 'Search Job ID, Invoices, Customers & Operators' },
    { key: 'Audit', label: '📜 Traceability & Batch Reports', desc: 'Box-to-raw trace, customer complaints & audit logs' }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs mb-6 max-w-6xl mx-auto space-y-6">
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
          <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[#1a365d] uppercase tracking-wide m-0">
              Master Admin Control Center (100% Rights Suite)
            </h3>
            <p className="text-[11px] text-slate-500 m-0">
              User Accounts, Role Permissions, 100% Master Data Overwrite, WhatsApp Backup & Configs
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('brand_items_paper')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'brand_items_paper'
              ? 'bg-[#1a365d] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>🏷️ Brand Items & Paper Mill ({productsList.length} Items / {paperBrandsList.length} Mills)</span>
        </button>

        <button
          onClick={() => setActiveTab('crate_master')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'crate_master'
              ? 'bg-[#1a365d] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>🧺 Crate Capacity Master ({Object.keys(crateMaster).length} Products Matrix)</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-[#1a365d] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>👥 User Accounts & Roles ({Object.keys(usersRecord).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('master_data')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'master_data'
              ? 'bg-[#1a365d] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Edit className="w-4 h-4" />
          <span>🛠️ Master Data Overwrite (Job / Batch / Order / Log)</span>
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'whatsapp'
              ? 'bg-[#1a365d] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>📱 WhatsApp Backup & Live Reporting</span>
        </button>

        <button
          onClick={() => setActiveTab('sequences_shifts')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'sequences_shifts'
              ? 'bg-[#1a365d] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>🔢 Sequences, Shifts & Master PIN</span>
        </button>

        <button
          onClick={() => setActiveTab('maintenance_master')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'maintenance_master'
              ? 'bg-[#1a365d] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>🔧 Maintenance Master & Desk Rights</span>
        </button>

        <button
          onClick={() => setActiveTab('backup_restore')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'backup_restore'
              ? 'bg-[#1a365d] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>💾 Database Backup & JSON Recovery</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 0: BRAND ITEMS & PAPER MILL MASTER (ब्रांड आइटम एवं पेपर मिल मास्टर) */}
      {/* ========================================================================= */}
      {activeTab === 'brand_items_paper' && (
        <div className="space-y-6">
          {/* Top Quick Actions Bar */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center font-black text-lg shadow-xs">
                ⚡
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-900 uppercase tracking-wide m-0">
                  Zero Data & Clean Setup (डेटा 0 करें)
                </h4>
                <p className="text-[11px] text-amber-800 m-0">
                  Need to start fresh testing? Wipe active jobs, batches & logs to 0 while keeping your custom brands and user logins intact.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetBrandsToDefault}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Standard Brands</span>
              </button>
              <button
                type="button"
                onClick={promptZeroAllData}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset All Data to 0 (डेटा 0 करें)</span>
              </button>
            </div>
          </div>

          {/* Section 1: Paper Mill Brands */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide m-0 flex items-center gap-2">
                  <span>📜 Paper Mill / Supplier Brands (पेपर मिल / ब्रांड लिस्ट)</span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black">
                    {paperBrandsList.length} Brands
                  </span>
                </h4>
                <p className="text-xs text-slate-500 m-0">
                  These paper brand names appear in the Slitting Reel Creation dropdown. Add your supplier mills here.
                </p>
              </div>
            </div>

            {/* Add Brand Form */}
            <form onSubmit={handleAddPaperBrand} className="flex items-center gap-2 max-w-xl">
              <input
                type="text"
                value={newPaperBrandInput}
                onChange={(e) => setNewPaperBrandInput(e.target.value)}
                placeholder="Enter Paper Mill Name (e.g., ITC, CENTURY, BILT, WEST COAST, JK PAPER)"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none uppercase placeholder:normal-case focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#2b6cb0] hover:bg-[#1a365d] text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Mill Brand</span>
              </button>
            </form>

            {/* List of Paper Brands */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
              {paperBrandsList.map((brand, idx) => (
                <div
                  key={brand}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-200 transition shadow-2xs"
                >
                  {editingPaperBrandIdx === idx ? (
                    <div className="flex items-center gap-1.5 w-full">
                      <input
                        type="text"
                        value={editingPaperBrandName}
                        onChange={(e) => setEditingPaperBrandName(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs font-bold border border-blue-400 rounded-lg uppercase outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditPaperBrand(idx)}
                        className="p-1 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingPaperBrandIdx(null)}
                        className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-black text-slate-800 tracking-wide">{brand}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPaperBrandIdx(idx);
                            setEditingPaperBrandName(brand);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition"
                          title="Rename Brand"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePaperBrand(brand)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition"
                          title="Remove Brand"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Cutlery Products / Brand Items */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide m-0 flex items-center gap-2">
                  <span>🍽️ Brand Cutlery Items & Products (कटलरी उत्पाद प्रबंधन)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                    {productsList.length} Products
                  </span>
                </h4>
                <p className="text-xs text-slate-500 m-0">
                  Configure Spoon, Fork, Knife, or custom sizes/items. Set custom prefix codes and sequence counters for automatic Job ID generation.
                </p>
              </div>
            </div>

            {/* Add Product Form */}
            <form onSubmit={handleAddProduct} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider m-0">Add New Product / Cutlery Item</h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Product Name:</label>
                  <input
                    type="text"
                    value={newProductName}
                    onChange={(e) => {
                      setNewProductName(e.target.value);
                      if (!newProductPrefix) {
                        setNewProductPrefix(e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase());
                      }
                    }}
                    placeholder="e.g. Soup Spoon, Tea Spoon, Spork"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Job ID Prefix (3-4 chars):</label>
                  <input
                    type="text"
                    value={newProductPrefix}
                    onChange={(e) => setNewProductPrefix(e.target.value.toUpperCase())}
                    placeholder="e.g. SPN, FRK, TSP, SPR"
                    maxLength={5}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-black text-slate-800 outline-none uppercase focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Starting Sequence Number:</label>
                  <input
                    type="number"
                    min="1"
                    value={newProductSeq}
                    onChange={(e) => setNewProductSeq(e.target.value)}
                    placeholder="1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-slate-500 m-0">
                  Example generated Job ID:{' '}
                  <span className="font-mono font-bold text-blue-700">
                    {(newProductPrefix || 'ITM').toUpperCase()}-{String(newProductSeq || '1').padStart(3, '0')}
                  </span>
                </p>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product Item</span>
                </button>
              </div>
            </form>

            {/* Product Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-black tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5">#</th>
                    <th className="px-4 py-2.5">Item Name</th>
                    <th className="px-4 py-2.5">Job Prefix</th>
                    <th className="px-4 py-2.5">Current Seq</th>
                    <th className="px-4 py-2.5">Next Job ID</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productsList.map((prod, idx) => {
                    const prefixMap: Record<string, string> = {
                      ...PRODUCT_PREFIX_MAP,
                      ...(state.productPrefixMap || {})
                    };
                    const prefix = prefixMap[prod] || prod.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'ITM';
                    const currentSeq = (state.seriesConfig?.productSeqs && state.seriesConfig.productSeqs[prod]) || 1;
                    const nextJobId = `${prefix}-${String(currentSeq).padStart(3, '0')}`;

                    return (
                      <tr key={prod} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-2.5 font-bold text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-black text-slate-800">
                          {editingProductIdx === idx ? (
                            <input
                              type="text"
                              value={editingProductName}
                              onChange={(e) => setEditingProductName(e.target.value)}
                              className="px-2 py-1 text-xs font-bold border border-blue-400 rounded-lg outline-none"
                              autoFocus
                            />
                          ) : (
                            prod
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-black text-blue-700">
                          {editingProductIdx === idx ? (
                            <input
                              type="text"
                              value={editingProductPrefix}
                              onChange={(e) => setEditingProductPrefix(e.target.value.toUpperCase())}
                              className="px-2 py-1 text-xs font-mono font-bold border border-blue-400 rounded-lg uppercase outline-none w-20"
                              maxLength={5}
                            />
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                              {prefix}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-600">
                          {editingProductIdx === idx ? (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400 font-bold">#</span>
                              <input
                                type="number"
                                min={1}
                                value={editingProductSeq}
                                onChange={(e) => setEditingProductSeq(e.target.value)}
                                className="px-2 py-1 text-xs font-mono font-bold border border-blue-400 rounded-lg outline-none w-20 bg-white"
                                title="Edit Next Sequence Counter (उदा. 1, 2, 3...)"
                              />
                            </div>
                          ) : (
                            <span>#{currentSeq}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono font-extrabold text-emerald-700">
                          {editingProductIdx === idx
                            ? `${editingProductPrefix || prefix}${String(Math.max(1, parseInt(editingProductSeq, 10) || 1)).padStart(3, '0')}`
                            : nextJobId}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {editingProductIdx === idx ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleSaveEditProduct(idx)}
                                className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer"
                                title="Save"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingProductIdx(null)}
                                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProductIdx(idx);
                                  setEditingProductName(prod);
                                  setEditingProductPrefix(prefix);
                                  setEditingProductSeq(String(currentSeq));
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition"
                                title="Edit Product & Sequence Number"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(prod)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition"
                                title="Delete Product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 0.5: CRATE CAPACITY MASTER (क्रेट कैपेसिटी एवं वॉल्यूम फैलाव मास्टर) */}
      {/* ========================================================================= */}
      {activeTab === 'crate_master' && (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                  <Box className="w-5 h-5" />
                </span>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide m-0">
                  Crate Capacity Master & Volume Expansion (क्रेट कैपेसिटी एवं 3D फैलाव मास्टर)
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-1 m-0">
                🔐 <strong>Admin Exclusive Control:</strong> सेट करें कि प्रत्येक क्रेट में कटिंग (Flat Blanks) और फॉर्मिंग (3D Molded) के कितने नंग आते हैं।
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetCrateMaster}
                className="px-3 py-2 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                title="Restore default factory capacities"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults (डिफ़ॉल्ट)</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAllCrateMaster}
                className="px-4 py-2 bg-[#2b6cb0] hover:bg-[#1a365d] text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Master Matrix (मास्टर सेव)</span>
              </button>
            </div>
          </div>

          {/* Technical & Production Logic Banner */}
          <div className="bg-linear-to-r from-blue-50 via-indigo-50 to-amber-50 border border-indigo-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-start gap-3">
              <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl mt-0.5 shrink-0">
                <Sliders className="w-5 h-5" />
              </span>
              <div className="space-y-2 text-xs text-slate-700">
                <h5 className="font-extrabold text-indigo-950 text-xs uppercase tracking-wide m-0">
                  Physical Manufacturing Law: Flat Blanks vs. 3D Molded Volume Expansion (वॉल्यूम विस्तार सिद्धांत)
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div className="bg-white/80 border border-blue-200 p-2.5 rounded-xl">
                    <span className="font-black text-blue-900 block mb-1">
                      ✂️ 1. कटिंग (Flat Blanks)
                    </span>
                    <p className="text-[11px] text-slate-600 m-0">
                      कागज पूरी तरह सपाट रहता है। स्टैकिंग घनी होती है, इसलिए क्रेट में अधिक नंग आते हैं (उदा. Spoon: <strong>10,000 Pcs/Crate</strong>)।
                    </p>
                  </div>
                  <div className="bg-white/80 border border-indigo-200 p-2.5 rounded-xl">
                    <span className="font-black text-indigo-900 block mb-1">
                      ⚙️ 2. फॉर्मिंग (3D Curved Shape)
                    </span>
                    <p className="text-[11px] text-slate-600 m-0">
                      मोल्डिंग से गहराई (Depth/Curve) आ जाती है जिससे प्रत्येक पीस का आयतन बढ़ जाता है। क्रेट में कम नंग आते हैं (उदा. Spoon: <strong>7,000 Pcs/Crate</strong>)।
                    </p>
                  </div>
                  <div className="bg-white/80 border border-emerald-200 p-2.5 rounded-xl">
                    <span className="font-black text-emerald-900 block mb-1">
                      🔍 3. QC लॉकिंग (Strict 1:1)
                    </span>
                    <p className="text-[11px] text-slate-600 m-0">
                      फॉर्मिंग के बाद कोई आकार नहीं बदलता। इसलिए QC में 1:1 क्रेट लॉकिंग रहती है (<strong>15 Formed Crates In = 15 QC Crates Max</strong>)।
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Master Crate Capacities Matrix Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                Standard Crate Capacity per Product (उत्पादवार क्रेट मानक तालिका)
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                Formula: Total Pieces = Full Crates × Pcs/Crate + Loose Pcs
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/75 text-slate-700 font-extrabold uppercase border-b border-slate-200 text-[11px]">
                    <th className="py-3 px-4">Product Name (उत्पाद)</th>
                    <th className="py-3 px-4 text-blue-800">
                      ✂️ Cutting Capacity (Flat Pcs/Crate)
                    </th>
                    <th className="py-3 px-4 text-indigo-800">
                      ⚙️ Forming Capacity (3D Pcs/Crate)
                    </th>
                    <th className="py-3 px-4 text-amber-800">
                      📈 Crate Expansion Ratio (वॉल्यूम फैलाव)
                    </th>
                    <th className="py-3 px-4 text-slate-700">
                      Simulation (15 Cut Crates)
                    </th>
                    <th className="py-3 px-4 text-center">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {Object.entries(crateMaster).map(([prod, cap]) => {
                    const isEditing = editingCrateProd === prod;
                    const expansionRatio = cap.formingPcs > 0 ? (cap.cuttingPcs / cap.formingPcs).toFixed(2) : '1.00';
                    const expansionPct = cap.formingPcs > 0 ? (((cap.cuttingPcs / cap.formingPcs) - 1) * 100).toFixed(1) : '0';
                    const formedSimCrates = cap.formingPcs > 0 ? ((15 * cap.cuttingPcs) / cap.formingPcs).toFixed(1) : '15.0';

                    return (
                      <tr key={prod} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-black text-slate-900 flex items-center gap-2">
                          <Tag className="w-4 h-4 text-indigo-500" />
                          <span>{prod}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={editCutPcs}
                                onChange={(e) => setEditCutPcs(Number(e.target.value))}
                                className="w-28 px-2 py-1 bg-white border border-blue-400 rounded-lg text-xs font-bold text-slate-800 outline-none"
                              />
                              <span className="text-[11px] text-slate-500">Pcs</span>
                            </div>
                          ) : (
                            <span className="font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                              {cap.cuttingPcs.toLocaleString()} Flat Pcs
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={editFormPcs}
                                onChange={(e) => setEditFormPcs(Number(e.target.value))}
                                className="w-28 px-2 py-1 bg-white border border-indigo-400 rounded-lg text-xs font-bold text-slate-800 outline-none"
                              />
                              <span className="text-[11px] text-slate-500">Pcs</span>
                            </div>
                          ) : (
                            <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                              {cap.formingPcs.toLocaleString()} 3D Pcs
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold">
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-xs">
                            {expansionRatio}x (+{expansionPct}% Crates)
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                          15 Cut Crates ➔ <strong className="text-indigo-800 font-extrabold">{formedSimCrates} Formed Crates</strong>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSaveCrateRow(prod, editCutPcs, editFormPcs)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" /> Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCrateProd(null)}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCrateProd(prod);
                                setEditCutPcs(cap.cuttingPcs);
                                setEditFormPcs(cap.formingPcs);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-300 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" /> Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add / Override Custom Product Crate Capacity */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <h5 className="text-xs font-black text-slate-800 uppercase tracking-wide m-0">
              ➕ Add / Update Crate Capacity for Another Product (नया उत्पाद क्रेट मानक जोड़ें)
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Select or Type Product:
                </label>
                <input
                  type="text"
                  list="admin-products-datalist"
                  value={newCrateProd}
                  onChange={(e) => setNewCrateProd(e.target.value)}
                  placeholder="e.g. Soup Spoon or Bowl"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                />
                <datalist id="admin-products-datalist">
                  {productsList.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-blue-800 uppercase mb-1">
                  ✂️ Cutting Capacity (Flat Pcs/Crate):
                </label>
                <input
                  type="number"
                  value={newCrateCutPcs}
                  onChange={(e) => setNewCrateCutPcs(e.target.value)}
                  placeholder="10000"
                  className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-indigo-800 uppercase mb-1">
                  ⚙️ Forming Capacity (3D Pcs/Crate):
                </label>
                <input
                  type="number"
                  value={newCrateFormPcs}
                  onChange={(e) => setNewCrateFormPcs(e.target.value)}
                  placeholder="7000"
                  className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-xl text-xs font-bold text-slate-800 outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddCustomCrateProd}
                  className="w-full py-2.5 bg-[#2b6cb0] hover:bg-[#1a365d] text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Master Matrix</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: USER ACCOUNTS & PERMISSIONS (यूज़र आईडी एवं अधिकार प्रबंधन) */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide m-0">
                User Accounts & Access Rights (यूज़र प्रबंधन व अधिकार)
              </h4>
              <p className="text-xs text-slate-500 m-0">
                Set individual passwords, module rights and permissions for each operator / department
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddUserModalOpen(true)}
              className="px-3 py-1.5 bg-[#2b6cb0] hover:bg-[#1a365d] text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add New User Account</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* User List Column */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <label className="text-xs font-extrabold text-slate-700 uppercase block mb-1">
                Select User to Configure:
              </label>
              <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                {Object.keys(usersRecord).map((userKey) => {
                  const u = usersRecord[userKey] as any;
                  const isSelected = selectedUserKey === userKey;
                  const isMaster = userKey === 'admin';
                  return (
                    <button
                      key={userKey}
                      type="button"
                      onClick={() => handleSelectUser(userKey)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 font-bold text-blue-950 shadow-xs ring-1 ring-blue-500'
                          : 'border-slate-200 bg-white hover:bg-slate-100/80 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-extrabold flex items-center gap-1.5">
                          <span>{userKey}</span>
                          {isMaster && (
                            <span className="text-[10px] bg-red-100 text-red-700 font-extrabold px-1.5 py-0.2 rounded">
                              MASTER
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {u.name || userKey} • {u.role || 'User'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {u.perms?.includes('*') ? 'ALL' : `${u.perms?.length || 0} Rights`}
                        </span>
                        {!isMaster && (
                          <span
                            role="button"
                            title={`Delete user account ${userKey}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteUser(userKey);
                            }}
                            className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Rights & Edit Column */}
            <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  <span className="font-extrabold text-sm text-slate-900">
                    Editing User: <span className="text-blue-700">[{selectedUserKey}]</span>
                  </span>
                </div>
                {selectedUserKey !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(selectedUserKey)}
                    className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete User
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name / Display:</label>
                  <input
                    type="text"
                    value={editingUser.name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Login Password / PIN:</label>
                  <input
                    type="text"
                    value={editingUser.pass}
                    onChange={(e) => setEditingUser({ ...editingUser, pass: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-bold text-blue-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Designation / Role:</label>
                  <input
                    type="text"
                    value={editingUser.role || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Permissions Checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-extrabold text-slate-800 uppercase">
                    Grant Module Access Rights (अधिकार चेकबॉक्स):
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, perms: ['*'] })}
                      className="text-[11px] text-blue-700 font-extrabold hover:underline cursor-pointer"
                    >
                      Select All (*)
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, perms: [] })}
                      className="text-[11px] text-slate-500 font-extrabold hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-slate-200">
                  {AVAILABLE_PERMS.map((perm) => {
                    const isChecked =
                      editingUser.perms.includes('*') || editingUser.perms.includes(perm.key);
                    return (
                      <label
                        key={perm.key}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition ${
                          isChecked ? 'border-blue-300 bg-blue-50/50 text-blue-950 font-bold' : 'border-slate-100 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePerm(perm.key)}
                          className="mt-0.5 rounded text-blue-600"
                        />
                        <div>
                          <div className="font-extrabold">{perm.label}</div>
                          <div className="text-[10px] text-slate-500 font-normal">{perm.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSaveUserPermissions}
                className="w-full py-2.5 bg-[#2b6cb0] hover:bg-[#1a365d] text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save User Rights & Password for [{selectedUserKey}]</span>
              </button>
            </div>
          </div>

          {/* Department Workers Master List */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide m-0">
              Department Operators & Workers Master (मशीन ऑपरेटर सूची)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Department:</label>
                <select
                  value={selectedDeptForWorker}
                  onChange={(e) => setSelectedDeptForWorker(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                >
                  <option value="Slitting">Slitting Department</option>
                  <option value="Cutting">Cutting Department</option>
                  <option value="Forming">Forming Department</option>
                  <option value="QC">QC Inspection Team</option>
                  <option value="Packing">Packing Team</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Worker Name:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newWorkerNameInput}
                    onChange={(e) => setNewWorkerNameInput(e.target.value)}
                    placeholder="e.g. SURESH_CUT"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold uppercase text-slate-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddWorker}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Active {selectedDeptForWorker} Workers:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {(deptWorkersState[selectedDeptForWorker] || []).map((workerName) => (
                    <span
                      key={workerName}
                      className="text-[11px] font-extrabold bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-800 flex items-center gap-1 shadow-2xs"
                    >
                      {workerName}
                      <X
                        onClick={() => handleRemoveWorker(selectedDeptForWorker, workerName)}
                        className="w-3 h-3 text-slate-400 hover:text-rose-600 cursor-pointer"
                      />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 100% MASTER DATA OVERWRITE (जॉब, बैच, क्वालिटी, ऑर्डर व लॉग सुधार) */}
      {/* ========================================================================= */}
      {activeTab === 'master_data' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide m-0">
                100% Master Data Correction & Overwrite (मास्टर डाटा सुधार)
              </h4>
              <p className="text-xs text-slate-500 m-0">
                Admin full authority: Correct Job IDs, Item IDs, Stock counts, Running Batches, Customer Orders & Logs
              </p>
            </div>
            {/* Sub-tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMasterSubTab('jobs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  masterSubTab === 'jobs' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Production Jobs Master
              </button>
              <button
                type="button"
                onClick={() => setMasterSubTab('orders')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  masterSubTab === 'orders' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Packing Orders Master
              </button>
              <button
                type="button"
                onClick={() => setMasterSubTab('logs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  masterSubTab === 'logs' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Audit History Logs
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SUB-TAB A: PRODUCTION JOBS OVERWRITE */}
          {/* ------------------------------------------------------------- */}
          {masterSubTab === 'jobs' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Select Production Job to Edit / Overwrite:
                  </label>
                  <select
                    value={selectedJobIdToEdit}
                    onChange={(e) => handleSelectJobToEdit(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  >
                    {state.jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.id} - {j.product} [{j.paperBrand || 'ITC'}] (Rolls: {j.availableRolls || 0}, Cut:{' '}
                        {j.availableCuttingCrates || 0}, Form: {j.availableFormingCrates || 0}, QC:{' '}
                        {j.availableQcCrates || 0})
                      </option>
                    ))}
                  </select>
                </div>
                {jobEditForm && (
                  <button
                    type="button"
                    onClick={() => handleDeleteJob(jobEditForm.id)}
                    className="mt-4 px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-extrabold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Job
                  </button>
                )}
              </div>

              {jobEditForm ? (
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-2xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-blue-900 uppercase mb-1">
                        Job ID (जॉब नंबर):
                      </label>
                      <input
                        type="text"
                        value={jobEditForm.id}
                        onChange={(e) => setJobEditForm({ ...jobEditForm, id: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-extrabold text-blue-950 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Product Item (आइटम प्रकार):
                      </label>
                      <select
                        value={jobEditForm.product}
                        onChange={(e) => setJobEditForm({ ...jobEditForm, product: e.target.value as ProductType })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                      >
                        {PRODUCTS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Paper Brand / Mill:
                      </label>
                      <select
                        value={jobEditForm.paperBrand || PAPER_BRANDS[0]}
                        onChange={(e) => setJobEditForm({ ...jobEditForm, paperBrand: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                      >
                        {PAPER_BRANDS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Reel Traceability & Weight Scrap Inputs */}
                  <div className="border border-blue-200 rounded-xl p-3 bg-blue-50/40 space-y-2">
                    <label className="text-xs font-extrabold text-blue-900 uppercase block flex items-center justify-between">
                      <span>🎯 Reel Traceability & Jumbo Weights (रील नंबर व वजन सुधारें):</span>
                      <span className="text-[11px] font-bold text-purple-700">Admin Master Edit</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-blue-800 uppercase mb-1">
                          Reel No. (रील नंबर):
                        </label>
                        <input
                          type="text"
                          value={jobEditForm.reelNo || ''}
                          onChange={(e) => setJobEditForm({ ...jobEditForm, reelNo: e.target.value.toUpperCase() })}
                          placeholder="e.g. RL-ITC-0012"
                          className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-amber-800 uppercase mb-1">
                          GSM Thickness:
                        </label>
                        <input
                          type="text"
                          value={jobEditForm.gsm || ''}
                          onChange={(e) => setJobEditForm({ ...jobEditForm, gsm: e.target.value })}
                          placeholder="e.g. 280 GSM"
                          className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-blue-700 uppercase mb-1">
                          Jumbo In Weight (KG):
                        </label>
                        <input
                          type="number"
                          value={jobEditForm.inputWeightKg || ''}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            const outVal = Number(jobEditForm.outputWeightKg) || 0;
                            const scrap = Math.max(0, val - outVal);
                            setJobEditForm({
                              ...jobEditForm,
                              inputWeightKg: val,
                              scrapKg: scrap,
                              scrapPercent: val > 0 ? Number(((scrap / val) * 100).toFixed(1)) : 0
                            });
                          }}
                          placeholder="KG"
                          className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-teal-700 uppercase mb-1">
                          Slit Out Weight (KG):
                        </label>
                        <input
                          type="number"
                          value={jobEditForm.outputWeightKg || ''}
                          onChange={(e) => {
                            const outVal = Number(e.target.value) || 0;
                            const inVal = Number(jobEditForm.inputWeightKg) || 0;
                            const scrap = Math.max(0, inVal - outVal);
                            setJobEditForm({
                              ...jobEditForm,
                              outputWeightKg: outVal,
                              scrapKg: scrap,
                              scrapPercent: inVal > 0 ? Number(((scrap / inVal) * 100).toFixed(1)) : 0
                            });
                          }}
                          placeholder="KG"
                          className="w-full px-3 py-2 bg-white border border-teal-300 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-rose-700 uppercase mb-1">
                          Scrap (KG / %):
                        </label>
                        <div className="px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-xs font-mono font-extrabold text-rose-800">
                          {jobEditForm.scrapKg || 0} KG ({jobEditForm.scrapPercent || 0}%)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stock balances editor */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                    <label className="text-xs font-extrabold text-slate-800 uppercase block">
                      Direct Stage Stock Balances Overwrite (स्टॉक बैलेंस सीधा सुधारें):
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-teal-800 uppercase mb-1">
                          📜 Slit Rolls:
                        </label>
                        <input
                          type="number"
                          value={jobEditForm.availableRolls || 0}
                          onChange={(e) =>
                            setJobEditForm({ ...jobEditForm, availableRolls: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 bg-white border border-teal-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-blue-800 uppercase mb-1">
                          ✂️ Cut Crates:
                        </label>
                        <input
                          type="number"
                          value={jobEditForm.availableCuttingCrates || 0}
                          onChange={(e) =>
                            setJobEditForm({ ...jobEditForm, availableCuttingCrates: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-indigo-800 uppercase mb-1">
                          ⚙️ Formed Crates:
                        </label>
                        <input
                          type="number"
                          value={jobEditForm.availableFormingCrates || 0}
                          onChange={(e) =>
                            setJobEditForm({ ...jobEditForm, availableFormingCrates: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-800 uppercase mb-1">
                          🔍 QC OK Crates:
                        </label>
                        <input
                          type="number"
                          value={jobEditForm.availableQcCrates || 0}
                          onChange={(e) =>
                            setJobEditForm({ ...jobEditForm, availableQcCrates: Number(e.target.value) })
                          }
                          className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                        />
                      </div>
                    </div>

                    {/* Crate Capacity & Piece Tracking Overrides for this Job */}
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold text-amber-900 uppercase flex items-center gap-1.5">
                          <Box className="w-3.5 h-3.5 text-amber-600" />
                          <span>Crate Packing & Piece Counts (नंग) Overrides:</span>
                        </label>
                        <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded">
                          Job-Specific Override
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">
                            ✂️ Cut Pcs/Crate:
                          </label>
                          <input
                            type="number"
                            value={jobEditForm.pcsPerCrateCutting ?? (crateMaster[jobEditForm.product]?.cuttingPcs || 10000)}
                            onChange={(e) =>
                              setJobEditForm({ ...jobEditForm, pcsPerCrateCutting: Number(e.target.value) })
                            }
                            className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-xs font-bold text-slate-800 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">
                            ⚙️ Form Pcs/Crate:
                          </label>
                          <input
                            type="number"
                            value={jobEditForm.pcsPerCrateForming ?? (crateMaster[jobEditForm.product]?.formingPcs || 7000)}
                            onChange={(e) =>
                              setJobEditForm({ ...jobEditForm, pcsPerCrateForming: Number(e.target.value) })
                            }
                            className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-xs font-bold text-slate-800 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-blue-800 uppercase mb-0.5">
                            Cut Total Pcs:
                          </label>
                          <input
                            type="number"
                            value={jobEditForm.totalCutPieces ?? ((jobEditForm.availableCuttingCrates || 0) * (jobEditForm.pcsPerCrateCutting || crateMaster[jobEditForm.product]?.cuttingPcs || 10000))}
                            onChange={(e) =>
                              setJobEditForm({ ...jobEditForm, totalCutPieces: Number(e.target.value) })
                            }
                            className="w-full px-2 py-1.5 bg-white border border-blue-300 rounded text-xs font-bold text-slate-800 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-indigo-800 uppercase mb-0.5">
                            Formed Total Pcs:
                          </label>
                          <input
                            type="number"
                            value={jobEditForm.totalFormedPieces ?? ((jobEditForm.availableFormingCrates || 0) * (jobEditForm.pcsPerCrateForming || crateMaster[jobEditForm.product]?.formingPcs || 7000))}
                            onChange={(e) =>
                              setJobEditForm({ ...jobEditForm, totalFormedPieces: Number(e.target.value) })
                            }
                            className="w-full px-2 py-1.5 bg-white border border-indigo-300 rounded text-xs font-bold text-slate-800 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-emerald-800 uppercase mb-0.5">
                            QC Total Pcs:
                          </label>
                          <input
                            type="number"
                            value={jobEditForm.totalQcPieces ?? ((jobEditForm.availableQcCrates || 0) * (jobEditForm.pcsPerCrateForming || crateMaster[jobEditForm.product]?.formingPcs || 7000))}
                            onChange={(e) =>
                              setJobEditForm({ ...jobEditForm, totalQcPieces: Number(e.target.value) })
                            }
                            className="w-full px-2 py-1.5 bg-white border border-emerald-300 rounded text-xs font-bold text-slate-800 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Running/Active Batches on this Job */}
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-slate-800 uppercase">
                        Running / Active Batches on Job [{jobEditForm.id}] (
                        {jobEditForm.runningBatches?.length || 0}):
                      </label>
                    </div>

                    <div className="space-y-2">
                      {(jobEditForm.runningBatches || []).map((batch, bIdx) => (
                        <div
                          key={batch.batchId || bIdx}
                          className="p-3 bg-white border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-6 gap-2 text-xs items-center"
                        >
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Batch ID:</span>
                            <input
                              type="text"
                              value={batch.batchId}
                              onChange={(e) => {
                                const updated = [...(jobEditForm.runningBatches || [])];
                                updated[bIdx] = { ...updated[bIdx], batchId: e.target.value };
                                setJobEditForm({ ...jobEditForm, runningBatches: updated });
                              }}
                              className="w-full px-2 py-1 border border-slate-300 rounded font-bold text-xs"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Machine:</span>
                            <input
                              type="text"
                              value={batch.machine}
                              onChange={(e) => {
                                const updated = [...(jobEditForm.runningBatches || [])];
                                updated[bIdx] = { ...updated[bIdx], machine: e.target.value };
                                setJobEditForm({ ...jobEditForm, runningBatches: updated });
                              }}
                              className="w-full px-2 py-1 border border-slate-300 rounded font-bold text-xs"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Operator:</span>
                            <input
                              type="text"
                              value={batch.worker}
                              onChange={(e) => {
                                const updated = [...(jobEditForm.runningBatches || [])];
                                updated[bIdx] = { ...updated[bIdx], worker: e.target.value.toUpperCase() };
                                setJobEditForm({ ...jobEditForm, runningBatches: updated });
                              }}
                              className="w-full px-2 py-1 border border-slate-300 rounded font-bold text-xs"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Status:</span>
                            <select
                              value={batch.status}
                              onChange={(e) => {
                                const updated = [...(jobEditForm.runningBatches || [])];
                                updated[bIdx] = { ...updated[bIdx], status: e.target.value as any };
                                setJobEditForm({ ...jobEditForm, runningBatches: updated });
                              }}
                              className="w-full px-2 py-1 border border-slate-300 rounded font-bold text-xs"
                            >
                              <option value="Running">Running</option>
                              <option value="Held">Held</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block uppercase font-bold">Issued Qty:</span>
                            <input
                              type="number"
                              value={batch.issuedQty || 0}
                              onChange={(e) => {
                                const updated = [...(jobEditForm.runningBatches || [])];
                                updated[bIdx] = { ...updated[bIdx], issuedQty: Number(e.target.value) };
                                setJobEditForm({ ...jobEditForm, runningBatches: updated });
                              }}
                              className="w-full px-2 py-1 border border-slate-300 rounded font-bold text-xs"
                            />
                          </div>
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (jobEditForm.runningBatches || []).filter((_, idx) => idx !== bIdx);
                                setJobEditForm({ ...jobEditForm, runningBatches: updated });
                              }}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Delete this batch"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {(!jobEditForm.runningBatches || jobEditForm.runningBatches.length === 0) && (
                        <div className="text-xs text-slate-400 text-center py-2">No active batches on this job</div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveJobOverwrite}
                    className="w-full py-3 bg-[#2b6cb0] hover:bg-[#1a365d] text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Master Overwrite for Job [{jobEditForm.id}]</span>
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-500 text-center py-6">Select a job above to edit</div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* SUB-TAB B: CUSTOMER PACKING ORDERS OVERWRITE */}
          {/* ------------------------------------------------------------- */}
          {masterSubTab === 'orders' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Select Customer Order to Edit / Overwrite:
                  </label>
                  <select
                    value={selectedOrderIdToEdit}
                    onChange={(e) => handleSelectOrderToEdit(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  >
                    {state.packJobs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.id} - {o.customer} ({o.packType}) | Status: {o.status} | Packed: {o.packedBoxes || 0}/
                        {o.orderQty}
                      </option>
                    ))}
                  </select>
                </div>
                {orderEditForm && (
                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(orderEditForm.id)}
                    className="mt-4 px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-extrabold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Order
                  </button>
                )}
              </div>

              {orderEditForm ? (
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-2xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Order ID:</label>
                      <input
                        type="text"
                        value={orderEditForm.id}
                        onChange={(e) => setOrderEditForm({ ...orderEditForm, id: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-extrabold text-slate-900 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Customer Name:</label>
                      <input
                        type="text"
                        value={orderEditForm.customer}
                        onChange={(e) => setOrderEditForm({ ...orderEditForm, customer: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Order Status:</label>
                      <select
                        value={orderEditForm.status}
                        onChange={(e) => setOrderEditForm({ ...orderEditForm, status: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Partially Packed">Partially Packed</option>
                        <option value="Completed">Completed</option>
                        <option value="Dispatched">Dispatched</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Total Target Boxes:</label>
                      <input
                        type="number"
                        value={orderEditForm.orderQty}
                        onChange={(e) =>
                          setOrderEditForm({ ...orderEditForm, orderQty: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Pcs Per Box:</label>
                      <input
                        type="number"
                        value={orderEditForm.pcsPerBox}
                        onChange={(e) =>
                          setOrderEditForm({ ...orderEditForm, pcsPerBox: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-purple-800 uppercase mb-1">Packed Boxes Count:</label>
                      <input
                        type="number"
                        value={orderEditForm.packedBoxes || 0}
                        onChange={(e) =>
                          setOrderEditForm({ ...orderEditForm, packedBoxes: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs font-bold text-purple-950 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-emerald-800 uppercase mb-1">Dispatched Boxes Count:</label>
                      <input
                        type="number"
                        value={orderEditForm.dispatchedBoxes || 0}
                        onChange={(e) =>
                          setOrderEditForm({ ...orderEditForm, dispatchedBoxes: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveOrderOverwrite}
                    className="w-full py-3 bg-[#2b6cb0] hover:bg-[#1a365d] text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Master Overwrite for Order [{orderEditForm.id}]</span>
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-500 text-center py-6">Select an order above to edit</div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* SUB-TAB C: AUDIT LOGS OVERWRITE */}
          {/* ------------------------------------------------------------- */}
          {masterSubTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    placeholder="Search logs by Job ID, Action text, Worker or Machine..."
                    className="w-full bg-white px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Stage:</span>
                  <select
                    value={logFilterStage}
                    onChange={(e) => setLogFilterStage(e.target.value)}
                    className="bg-white px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold outline-none"
                  >
                    <option value="">All Stages</option>
                    <option value="Slitting">Slitting</option>
                    <option value="Cutting">Cutting</option>
                    <option value="Forming">Forming</option>
                    <option value="QC">QC</option>
                    <option value="Packing">Packing</option>
                    <option value="Dispatch">Dispatch</option>
                    <option value="Admin Master">Admin Master</option>
                  </select>
                </div>
              </div>

              {/* Log Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[11px] sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Date / Time</th>
                      <th className="p-2.5">Job / Order</th>
                      <th className="p-2.5">Stage</th>
                      <th className="p-2.5">Machine</th>
                      <th className="p-2.5">Action Details</th>
                      <th className="p-2.5">Worker</th>
                      <th className="p-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredLogs.map(({ log, originalIndex }) => (
                      <tr key={originalIndex} className="hover:bg-slate-50 transition">
                        <td className="p-2.5 whitespace-nowrap text-slate-500 text-[11px]">
                          {log.timestamp || log.rawDate || '-'}
                        </td>
                        <td className="p-2.5 font-bold text-blue-900 whitespace-nowrap">
                          {log.jobId || '-'}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-800">
                            {log.stage}
                          </span>
                        </td>
                        <td className="p-2.5 whitespace-nowrap font-semibold">{log.machine || '-'}</td>
                        <td className="p-2.5 text-slate-800 max-w-xs truncate" title={log.action}>
                          {log.action}
                        </td>
                        <td className="p-2.5 whitespace-nowrap font-bold text-slate-900">
                          {log.worker || log.user}
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditLog(originalIndex)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                              title="Edit this log entry"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLogEntry(originalIndex)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                              title="Delete this log entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">
                          No matching logs found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: WHATSAPP BACKUP & LIVE AUTO-REPORTING (व्हाट्सएप बैकअप) */}
      {/* ========================================================================= */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide m-0">
                WhatsApp Live Shift Changeover & Machine Reports (व्हाट्सएप शिफ्ट चेंजओवर रिपोर्ट)
              </h4>
              <p className="text-xs text-slate-500 m-0">
                Daily Shift Changeover hone ke baad all machines ke short reports with Operator names WhatsApp par auto/manual bhejein.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSendShiftWhatsApp('DAY')}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>☀️ Send Day Shift Report</span>
              </button>
              <button
                type="button"
                onClick={() => handleSendShiftWhatsApp('NIGHT')}
                className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>🌙 Send Night Shift Report</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Configuration Column */}
            <div className="lg:col-span-6 space-y-4">
              {/* Recipient Number Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h5 className="text-xs font-extrabold text-slate-800 uppercase m-0 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  WhatsApp Recipient Mobile & Gateway API
                </h5>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Admin / Manager WhatsApp Mobile Number (With Country Code):
                  </label>
                  <input
                    type="text"
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    All machine shift changeover reports will be routed to this WhatsApp number.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    WhatsApp Webhook URL / Gateway API (Optional for automated server dispatch):
                  </label>
                  <input
                    type="text"
                    value={waWebhookUrl}
                    onChange={(e) => setWaWebhookUrl(e.target.value)}
                    placeholder="e.g. https://api.whatsapp-gateway.com/v1/send"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              {/* Day & Night Shift Changeover Timing Settings */}
              <div className="bg-white border-2 border-slate-200 rounded-xl p-4 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h5 className="text-xs font-black text-slate-900 uppercase m-0 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Shift Changeover Auto Timing Settings (समय कस्टमाइज़)
                  </h5>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded">
                    Day & Night Separate
                  </span>
                </div>

                {/* Day Shift Settings Card */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-950 flex items-center gap-1">
                      ☀️ DAY SHIFT CHANGEOVER SETTING
                    </span>
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={waAutoDay}
                        onChange={(e) => setWaAutoDay(e.target.checked)}
                        className="rounded text-amber-600 w-3.5 h-3.5"
                      />
                      Auto Send Enabled
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Changeover Report Time:
                      </label>
                      <input
                        type="time"
                        value={waDayReportTime}
                        onChange={(e) => setWaDayReportTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-black text-amber-950 outline-none"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => {
                          setWaPreviewShift('DAY');
                          handleSendShiftWhatsApp('DAY');
                        }}
                        className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition shadow-2xs cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Send className="w-3 h-3" /> Send Day WhatsApp
                      </button>
                    </div>
                  </div>
                </div>

                {/* Night Shift Settings Card */}
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-950 flex items-center gap-1">
                      🌙 NIGHT SHIFT CHANGEOVER SETTING
                    </span>
                    <label className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={waAutoNight}
                        onChange={(e) => setWaAutoNight(e.target.checked)}
                        className="rounded text-indigo-600 w-3.5 h-3.5"
                      />
                      Auto Send Enabled
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Changeover Report Time:
                      </label>
                      <input
                        type="time"
                        value={waNightReportTime}
                        onChange={(e) => setWaNightReportTime(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-black text-indigo-950 outline-none"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => {
                          setWaPreviewShift('NIGHT');
                          handleSendShiftWhatsApp('NIGHT');
                        }}
                        className="w-full py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-lg transition shadow-2xs cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Send className="w-3 h-3" /> Send Night WhatsApp
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveWhatsAppConfig}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save Shift Timing & WhatsApp Settings
                </button>
              </div>
            </div>

            {/* Live WhatsApp Message Preview Column */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                <span className="text-xs font-extrabold text-slate-700 px-2">Preview Shift Message:</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setWaPreviewShift('DAY')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                      waPreviewShift === 'DAY'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    ☀️ Day Shift Message
                  </button>
                  <button
                    type="button"
                    onClick={() => setWaPreviewShift('NIGHT')}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                      waPreviewShift === 'NIGHT'
                        ? 'bg-indigo-700 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    🌙 Night Shift Message
                  </button>
                </div>
              </div>

              <div className="bg-emerald-950 text-emerald-100 rounded-2xl p-4 space-y-3 font-mono text-xs shadow-md border border-emerald-800">
                <div className="flex items-center justify-between border-b border-emerald-800/80 pb-2">
                  <span className="font-extrabold text-emerald-300">
                    Live Formatted Report ({waPreviewShift} SHIFT):
                  </span>
                  <span className="text-[10px] bg-emerald-800 text-emerald-100 px-2 py-0.5 rounded font-bold">
                    All Machines + Operators
                  </span>
                </div>
                <div className="whitespace-pre-line leading-relaxed text-xs text-emerald-50 max-h-[500px] overflow-y-auto pr-1">
                  {generateShiftChangeoverReportText(waPreviewShift)}
                </div>
                <div className="border-t border-emerald-800/80 pt-2 flex items-center justify-between text-[11px] text-emerald-400">
                  <span>📱 Ready for WhatsApp one-click dispatch</span>
                  <button
                    type="button"
                    onClick={() => handleSendShiftWhatsApp(waPreviewShift)}
                    className="text-xs font-black text-emerald-200 hover:text-white underline cursor-pointer"
                  >
                    Send This {waPreviewShift} Report Now →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: MAINTENANCE DESK MASTER & RIGHTS (मेंटेनेंस डेस्क मास्टर व राइट्स) */}
      {/* ========================================================================= */}
      {activeTab === 'maintenance_master' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide m-0">
                🔧 Maintenance Desk Master & Rights Suite (मेंटेनेंस डेस्क मास्टर एवं राइट्स)
              </h4>
              <p className="text-xs text-slate-500 m-0">
                Admin controls for Maintenance Desk permissions, technician directory, spare parts catalogue, and roll yield limits.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveMaintenanceMaster}
              className="px-4 py-2 bg-[#1a365d] hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Maintenance Masters</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Maintenance Rights Assignment */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h5 className="text-xs font-black text-slate-900 uppercase m-0 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-blue-600" />
                  Maintenance Rights Quick-Grant
                </h5>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                  User Permissions
                </span>
              </div>
              <p className="text-[11px] text-slate-600 m-0">
                Select an active user to immediately grant full Maintenance Desk operational rights (Incidents, Repairs, Spare parts & RCA):
              </p>

              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {Object.keys(usersRecord).map((userKey) => {
                  const u = usersRecord[userKey];
                  const hasMnt = u.perms?.includes('*') || u.perms?.includes('Maintenance');
                  return (
                    <div
                      key={userKey}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs"
                    >
                      <div>
                        <span className="font-extrabold text-slate-900 block">{userKey}</span>
                        <span className="text-[10px] text-slate-500">{u.name || userKey} • {u.role || 'User'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasMnt ? (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded">
                            Authorized
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGrantAllMaintenanceRightsToUser(userKey)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded transition cursor-pointer"
                          >
                            + Grant Rights
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-lg text-[11px] text-blue-900">
                <strong>💡 Granular Rights:</strong> For individual checkboxes (e.g. Mnt_LogIncident, Mnt_Repair), switch to the <em>👥 User Accounts & Roles</em> tab.
              </div>
            </div>

            {/* 2. Technicians Master Directory */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h5 className="text-xs font-black text-slate-900 uppercase m-0 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Maintenance Technicians Directory ({maintTechs.length})
                </h5>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTechName}
                  onChange={(e) => setNewTechName(e.target.value)}
                  placeholder="e.g. Mukesh Kumar (Hydraulics)"
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTech}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {maintTechs.map((tech, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs"
                  >
                    <span className="font-bold text-slate-800">{tech}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTech(idx)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded transition cursor-pointer"
                      title="Remove technician"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Spare Parts Catalogue & Roll Yield Limits */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
              <div className="border-b border-slate-200 pb-2">
                <h5 className="text-xs font-black text-slate-900 uppercase m-0 flex items-center gap-1.5">
                  <Cog className="w-4 h-4 text-indigo-600" />
                  Spare Parts Catalogue ({maintSpareParts.length})
                </h5>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  placeholder="e.g. Solenoid Valve 24V"
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddSparePart}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {maintSpareParts.map((part, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200 text-xs"
                  >
                    <span className="font-bold text-slate-800 truncate">{part}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSparePart(idx)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded transition cursor-pointer"
                      title="Remove part"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Slitting Roll to Pieces Conversion Setting */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 uppercase">
                    Slitting: Roll to Pcs Setting (रील से पीस लिमिट)
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-1.5 py-0.5 rounded">
                    Admin Config
                  </span>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">
                    Max Theoretical Pieces Per Slit Roll:
                  </label>
                  <input
                    type="number"
                    value={maxRollPieces}
                    onChange={(e) => setMaxRollPieces(Number(e.target.value) || 12000)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-800 outline-none"
                  />
                  <span className="text-[10px] text-slate-500 block">
                    Adjust this setting so operators never encounter false errors during slitting or conversion.
                  </span>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={strictRollAudit}
                    onChange={(e) => setStrictRollAudit(e.target.checked)}
                    className="rounded text-blue-600 w-3.5 h-3.5"
                  />
                  <span>Strict Yield Audit (Unchecked = Warning only, never block)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: NUMBERING SEQUENCES, SHIFTS & MASTER PIN */}
      {/* ========================================================================= */}
      {activeTab === 'sequences_shifts' && (
        <form onSubmit={handleSaveSequencesAndShifts} className="space-y-6">
          <div>
            <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide m-0">
              Numbering Sequences, Shift Timings & Master PIN
            </h4>
            <p className="text-xs text-slate-500 m-0">
              Configure automatic Job ID prefixes, Next Sequence numbers, Shift Day/Night times and Admin PIN
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Numbering Sequences */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <h5 className="text-xs font-extrabold text-slate-800 uppercase m-0 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-blue-600" />
                Product Job Numbering Next Counters:
              </h5>

              <div className="grid grid-cols-2 gap-2">
                {(productsList && productsList.length > 0 ? productsList : PRODUCTS).map((prod) => {
                  const pfx = state.productPrefixMap?.[prod] || PRODUCT_PREFIX_MAP[prod as ProductType] || prod.slice(0, 3).toUpperCase();
                  return (
                    <div key={prod} className="bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase truncate">
                          {prod}
                        </label>
                        <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200">
                          {pfx}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={1}
                        value={productSeqs[prod] || 1}
                        onChange={(e) =>
                          setProductSeqs({
                            ...productSeqs,
                            [prod]: Math.max(1, Number(e.target.value) || 1)
                          })
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-800 outline-none"
                      />
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Customer Packing Order (ORD-) Next Counter:
                </label>
                <input
                  type="number"
                  value={orderSeq}
                  onChange={(e) => setOrderSeq(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            {/* Shift Timings & Master PIN */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <h5 className="text-xs font-extrabold text-slate-800 uppercase m-0 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-600" />
                Shift Timings & Master PIN
              </h5>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Day Shift Start:</label>
                  <input
                    type="time"
                    value={dayStart}
                    onChange={(e) => setDayStart(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Day Shift End:</label>
                  <input
                    type="time"
                    value={dayEnd}
                    onChange={(e) => setDayEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Night Shift Start:</label>
                  <input
                    type="time"
                    value={nightStart}
                    onChange={(e) => setNightStart(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Night Shift End:</label>
                  <input
                    type="time"
                    value={nightEnd}
                    onChange={(e) => setNightEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-red-700 uppercase mb-1">
                  Master Admin Password / PIN:
                </label>
                <input
                  type="text"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-red-300 rounded-lg text-xs font-extrabold text-red-900 outline-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#2b6cb0] hover:bg-[#1a365d] text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Configurations & Shift Schedules</span>
          </button>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: DATABASE BACKUP & JSON RESTORE */}
      {/* ========================================================================= */}
      {activeTab === 'backup_restore' && (
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide m-0">
              Database Storage Health, Archival & JSON Backup
            </h4>
            <p className="text-xs text-slate-500 m-0">
              High-capacity IndexedDB persistence with automatic localStorage quota protection and offline JSON recovery
            </p>
          </div>

          {/* Storage Health & Resilience Telemetry Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-[#1a365d] rounded-2xl p-5 text-white shadow-md border border-slate-700">
            <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-300 flex items-center justify-center font-black">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Persistence Engine</div>
                  <div className="text-base font-black text-white flex items-center gap-2">
                    <span>{storageHealth?.engine || 'IndexedDB (Enterprise High-Capacity)'}</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-bold">
                      ACTIVE & PROTECTED
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunPruning}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-blue-400/30"
                title="Archive historical records older than 30 days to free up operational memory"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Run Archival & Auto-Prune</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Current Footprint</span>
                <span className="font-extrabold text-white text-sm">
                  {storageHealth?.usedBytes ? `${(storageHealth.usedBytes / 1024).toFixed(1)} KB` : '< 1 MB'}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Quota: {storageHealth?.quotaBytes ? `${Math.round(storageHealth.quotaBytes / (1024 * 1024))} MB` : '1024 MB'}
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Operational Records</span>
                <span className="font-extrabold text-white text-sm">
                  {(state.jobs?.length || 0) + (state.packJobs?.length || 0)} Total
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {state.jobs?.length || 0} Jobs, {state.packJobs?.length || 0} Orders
                </span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Audit Logs</span>
                <span className="font-extrabold text-white text-sm">{state.logs?.length || 0} Entries</span>
                <span className="text-[10px] text-slate-400 block">Zero Data Loss Policy</span>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 block">Cold Archival Records</span>
                <span className="font-extrabold text-white text-sm">
                  {(state.archivedJobs?.length || 0) + (state.archivedLogs?.length || 0)} Archived
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {state.archivedJobs?.length || 0} Jobs, {state.archivedLogs?.length || 0} Logs
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold mb-2">
                  <Download className="w-4 h-4" />
                </div>
                <h5 className="text-xs font-extrabold text-slate-900 uppercase m-0">Export JSON Database</h5>
                <p className="text-[11px] text-slate-500 mt-1">
                  Download a complete enterprise backup containing metadata, jobs, pack orders, and audit logs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => exportDatabaseBackup(state)}
                className="mt-4 w-full py-2 bg-[#2b6cb0] hover:bg-[#1a365d] text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" /> Download JSON Backup
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-2">
                  <Upload className="w-4 h-4" />
                </div>
                <h5 className="text-xs font-extrabold text-slate-900 uppercase m-0">Restore from JSON</h5>
                <p className="text-[11px] text-slate-500 mt-1">
                  Upload an existing factory backup JSON file to restore and persist all operational records into IndexedDB.
                </p>
              </div>
              <label className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-xs">
                <Upload className="w-3.5 h-3.5" /> Select Backup JSON File
                <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
              </label>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold mb-2">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <h5 className="text-xs font-extrabold text-rose-950 uppercase m-0">Factory State Reset</h5>
                <p className="text-[11px] text-rose-700 mt-1">
                  Wipe current operational data and restore factory to default clean baseline records.
                </p>
              </div>
              <button
                type="button"
                onClick={handleHardReset}
                className="mt-4 w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Hard Reset Factory
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD NEW USER ACCOUNT */}
      {/* ======================================================== */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNewUser}
            className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in duration-150"
          >
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 m-0">Create New User Account</h3>
                <p className="text-[11px] text-slate-500 m-0">Add login credentials & initial role for an operator</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                User ID / Login Key <span className="text-rose-600">*Mandatory</span>:
              </label>
              <input
                type="text"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                placeholder="e.g. shift_supervisor_1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name:</label>
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="e.g. Ramesh Sharma"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Password / PIN:</label>
                <input
                  type="text"
                  value={newUserPass}
                  onChange={(e) => setNewUserPass(e.target.value)}
                  placeholder="e.g. 5566"
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg text-xs font-bold text-blue-900 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Role:</label>
                <input
                  type="text"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  placeholder="e.g. QC Lead"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddUserModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Check className="w-4 h-4" /> Create User
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT AUDIT LOG ENTRY */}
      {/* ======================================================== */}
      {logEditForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Edit className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 m-0">Edit Factory Audit Log Entry</h3>
                <p className="text-[11px] text-slate-500 m-0">Modify timestamp, action text or worker attribution</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Job / Order ID:</label>
                <input
                  type="text"
                  value={logEditForm.jobId || ''}
                  onChange={(e) => setLogEditForm({ ...logEditForm, jobId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Stage:</label>
                <input
                  type="text"
                  value={logEditForm.stage || ''}
                  onChange={(e) => setLogEditForm({ ...logEditForm, stage: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Action Description:</label>
              <textarea
                value={logEditForm.action}
                onChange={(e) => setLogEditForm({ ...logEditForm, action: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Worker Name:</label>
                <input
                  type="text"
                  value={logEditForm.worker || ''}
                  onChange={(e) => setLogEditForm({ ...logEditForm, worker: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Machine / Station:</label>
                <input
                  type="text"
                  value={logEditForm.machine || ''}
                  onChange={(e) => setLogEditForm({ ...logEditForm, machine: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setEditingLogIndex(null);
                  setLogEditForm(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLogEdit}
                className="px-4 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Check className="w-4 h-4" /> Save Log Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Toast Notification */}
      {adminToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-xl border text-xs font-black flex items-center gap-2 animate-bounce ${
            adminToast.type === 'error'
              ? 'bg-red-50 border-red-300 text-red-800'
              : adminToast.type === 'info'
              ? 'bg-blue-50 border-blue-300 text-blue-800'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800'
          }`}
        >
          <span>{adminToast.msg}</span>
          <button
            type="button"
            onClick={() => setAdminToast(null)}
            className="ml-2 p-1 hover:bg-black/10 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* In-App Confirmation Modal (Safe for iframes) */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                  confirmModal.isDanger
                    ? 'bg-red-100 text-red-600'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide m-0">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-500 m-0">Confirmation Required</p>
              </div>
            </div>

            <p className="text-xs font-medium text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200 m-0">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 text-xs font-black text-white rounded-xl cursor-pointer shadow-xs transition ${
                  confirmModal.isDanger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmModal.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
