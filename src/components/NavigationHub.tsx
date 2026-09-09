import React, { useState } from 'react';
import {
  FileText,
  Truck,
  BarChart3,
  Scroll,
  Scissors,
  Cog,
  SearchCheck,
  Package,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  Layers,
  Wrench,
  ShoppingCart,
  ClipboardList,
  Sparkles,
  Edit3,
  Check
} from 'lucide-react';
import { CurrentView, FactoryState } from '../types';

interface NavigationHubProps {
  state?: FactoryState;
  currentUser?: { username: string; perms: string[] } | null;
  onSelectView: (view: CurrentView) => void;
  onOpenRequisitionModal?: () => void;
  onOpenManpowerModal?: () => void;
  onOpenAdmin?: () => void;
}

interface NavCardItem {
  id: CurrentView;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  perm: string;
  badge?: string;
  borderColor: string;
}

export const NavigationHub: React.FC<NavigationHubProps> = ({
  state,
  currentUser,
  onSelectView,
  onOpenRequisitionModal,
  onOpenManpowerModal,
  onOpenAdmin
}) => {
  const username = currentUser?.username || 'admin';
  const perms = currentUser?.perms || ['*'];
  const userRole = (state?.users && state.users[username.toLowerCase()]?.role) || '';
  const isMasterAdmin =
    perms.includes('*') ||
    perms.includes('Admin') ||
    username.toLowerCase() === 'admin' ||
    userRole.toLowerCase() === 'administrator' ||
    userRole.toLowerCase() === 'admin';
  const hasAdminRole = isMasterAdmin || perms.includes('Admin');

  // Compute live stats for badges if state is available
  const activeJobsCount = state?.jobs?.length || 0;
  const activeOrdersCount = state?.packJobs?.length || 0;
  const activeBatchesCount =
    state?.jobs?.reduce(
      (acc, j) => acc + (j.runningBatches?.filter((b) => b.status === 'Running').length || 0),
      0
    ) || 0;
  const activeBreakdownsCount =
    state?.maintenanceIncidents?.filter((i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length || 0;
  const pendingRequisitionsCount =
    state?.materialRequisitions?.filter((r) => r.status === 'PENDING').length || 0;
  const arrivedRequisitionsCount =
    state?.materialRequisitions?.filter((r) => r.status === 'RECEIVED' && !r.acknowledgedByRequester).length || 0;

  // Daily Factory Inspiration Poem State
  const DEFAULT_POEM = `मेहनत और लगन से हर रोल को नया रूप हम देते हैं,
सटीक माप और शुद्ध गुणवत्ता से कारखाने का मान बढ़ाते हैं।
हर चम्मच, हर कांटा, हर पैक में है विश्वास हमारा,
वंडरक्राफ की शान है हर कामगार का पसीना प्यारा।`;

  const [poem, setPoem] = useState(() => {
    return localStorage.getItem('wunderkraf_daily_poem') || DEFAULT_POEM;
  });
  const [isEditingPoem, setIsEditingPoem] = useState(false);
  const [poemInput, setPoemInput] = useState(poem);

  const handleSavePoem = () => {
    const trimmed = poemInput.trim();
    if (!trimmed) return;
    setPoem(trimmed);
    localStorage.setItem('wunderkraf_daily_poem', trimmed);
    setIsEditingPoem(false);
  };

  const handleResetPoem = () => {
    setPoem(DEFAULT_POEM);
    setPoemInput(DEFAULT_POEM);
    localStorage.setItem('wunderkraf_daily_poem', DEFAULT_POEM);
    setIsEditingPoem(false);
  };

  const navItems: NavCardItem[] = [
    {
      id: 'DASHBOARD',
      title: 'Executive Dashboard',
      subtitle: 'Live Floor Pulse & Real-time Machine Status',
      icon: <BarChart3 className="w-8 h-8 text-blue-600" />,
      perm: 'Dashboard',
      borderColor: 'border-blue-600',
      badge: activeBatchesCount > 0 ? `${activeBatchesCount} Running` : 'Live 360°'
    },
    {
      id: 'MARKETING',
      title: 'Marketing Orders',
      subtitle: 'Customer Orders, Kit Builder & Target Dates',
      icon: <FileText className="w-8 h-8 text-emerald-600" />,
      perm: 'Marketing',
      borderColor: 'border-emerald-600',
      badge: activeOrdersCount > 0 ? `${activeOrdersCount} Orders` : undefined
    },
    {
      id: 'DISPATCH',
      title: 'Multi-Item Dispatch',
      subtitle: 'Invoicing, Gatepass Challan & Vehicle Tracking',
      icon: <Truck className="w-8 h-8 text-teal-600" />,
      perm: 'Dispatch',
      borderColor: 'border-teal-600'
    },
    {
      id: 'SLITTING',
      title: '1. Slitting Desk',
      subtitle: 'Raw Paper Rolls Slitting, Output KG & Re-open',
      icon: <Scroll className="w-8 h-8 text-indigo-600" />,
      perm: 'Slitting',
      borderColor: 'border-indigo-600'
    },
    {
      id: 'CUTTING',
      title: '2. Cutting Desk',
      subtitle: 'Rolls to Cut Crates, Scrap KG & Re-routing',
      icon: <Scissors className="w-8 h-8 text-purple-600" />,
      perm: 'Cutting',
      borderColor: 'border-purple-600'
    },
    {
      id: 'FORMING',
      title: '3. Forming Desk',
      subtitle: 'Cut Pieces to Formed Products & Same-Job Top-up',
      icon: <Cog className="w-8 h-8 text-amber-600" />,
      perm: 'Forming',
      borderColor: 'border-amber-600'
    },
    {
      id: 'QC',
      title: '4. QC Desk',
      subtitle: 'Quality Inspection, Scrap Rejected & Approvals',
      icon: <SearchCheck className="w-8 h-8 text-cyan-600" />,
      perm: 'QC',
      borderColor: 'border-cyan-600'
    },
    {
      id: 'PACKING',
      title: '5. Packing Station',
      subtitle: 'Kit Packaging, Traceable QC Crates & Finished WH',
      icon: <Package className="w-8 h-8 text-rose-600" />,
      perm: 'Packing',
      borderColor: 'border-rose-600'
    },
    {
      id: 'STOCK',
      title: 'Live Stock Matrix',
      subtitle: 'Real-time Rolls, Crates, WIP, and Scrap Balance',
      icon: <Layers className="w-8 h-8 text-blue-700" />,
      perm: 'Stock',
      borderColor: 'border-blue-700',
      badge: `${activeJobsCount} Jobs`
    },
    {
      id: 'ORDERS',
      title: 'Customer Orders',
      subtitle: 'Order Fulfillment, Specs & Packing Schedules',
      icon: <Package className="w-8 h-8 text-emerald-700" />,
      perm: 'Orders',
      borderColor: 'border-emerald-700'
    },
    {
      id: 'ANALYTICS',
      title: 'Machine & Operator Performance',
      subtitle: '8-Day Machine Output, 5-Day/1-Mo/6-Mo Operator Audit & Filter Reports (मशीन व ऑपरेटर रिपोर्ट)',
      icon: <TrendingUp className="w-8 h-8 text-violet-600" />,
      perm: 'Analytics',
      borderColor: 'border-violet-600',
      badge: '8-Day & Operator Audit'
    },
    {
      id: 'SEARCH',
      title: 'Universal Search',
      subtitle: 'Search Job ID, Invoices, Customers & Operators',
      icon: <Search className="w-8 h-8 text-sky-600" />,
      perm: 'Search',
      borderColor: 'border-sky-600'
    },
    {
      id: 'AUDIT',
      title: 'Traceability & Batch Reports',
      subtitle: 'Box-to-Raw Material Trace, Customer Complaints & PDF Dossier',
      icon: <ShieldCheck className="w-8 h-8 text-blue-700" />,
      perm: 'Audit',
      borderColor: 'border-blue-700'
    },
    {
      id: 'MAINTENANCE',
      title: 'Maintenance Desk',
      subtitle: 'Machine Breakdowns, Spares, Downtime Logs & Ready Handover',
      icon: <Wrench className="w-8 h-8 text-amber-600" />,
      perm: 'Maintenance',
      borderColor: 'border-amber-600',
      badge: activeBreakdownsCount > 0 ? `${activeBreakdownsCount} Stopped` : 'Ready'
    },
    {
      id: 'PURCHASE',
      title: 'Purchase Desk',
      subtitle: 'Material Indents, Vendor POs & Incoming Goods (माल प्राप्ति)',
      icon: <ShoppingCart className="w-8 h-8 text-emerald-600" />,
      perm: 'Purchase',
      borderColor: 'border-emerald-600',
      badge:
        arrivedRequisitionsCount > 0
          ? `🎉 ${arrivedRequisitionsCount} Arrived`
          : pendingRequisitionsCount > 0
          ? `${pendingRequisitionsCount} Indents`
          : undefined
    },
    {
      id: 'ADMIN',
      title: 'Master Settings',
      subtitle: 'Admin PIN, Numbering Sequences & Shift Timings',
      icon: <Settings className="w-8 h-8 text-slate-800" />,
      perm: 'Admin',
      borderColor: 'border-slate-800'
    }
  ];

  // Exact permission matching:
  // 1. Master admin or '*' or 'Admin' role has full access to all 16 desks
  // 2. Operators have access to their explicitly granted permissions (case-insensitive)
  const visibleItems = navItems.filter((item) => {
    if (isMasterAdmin) return true;
    return perms.some(
      (p) =>
        p === '*' ||
        p.toLowerCase() === item.perm.toLowerCase() ||
        p.toLowerCase() === item.id.toLowerCase()
    );
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏠</span>
          <h2 className="text-base font-bold text-[#1a365d] uppercase tracking-wide m-0">
            Home — Select Your Workstation Module
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-[#2b6cb0]">
            Active Desk:{' '}
            <span className="uppercase text-slate-800 bg-slate-100 px-2 py-0.5 rounded font-extrabold">
              {username}
            </span>
            <span className="ml-1.5 text-[11px] text-slate-500 font-semibold">
              ({visibleItems.length} Desks Authorized)
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DAILY FACTORY INSPIRATION POEM (दैनिक प्रेरणा कविता) */}
      {/* ======================================================== */}
      <div className="mb-4 bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wide">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>दैनिक प्रेरणा कविता (Factory Floor Inspiration)</span>
          </div>
          <div className="flex items-center gap-1.5">
            {!isEditingPoem ? (
              <button
                type="button"
                onClick={() => {
                  setPoemInput(poem);
                  setIsEditingPoem(true);
                }}
                className="text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-white border border-amber-300 px-2 py-0.5 rounded cursor-pointer transition flex items-center gap-1 shadow-2xs"
              >
                <Edit3 className="w-3 h-3 text-amber-700" />
                <span>कविता अपडेट करें (Edit Poem)</span>
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleSavePoem}
                  className="text-[11px] font-extrabold text-white bg-amber-700 hover:bg-amber-800 px-2.5 py-0.5 rounded cursor-pointer transition flex items-center gap-1 shadow-2xs"
                >
                  <Check className="w-3 h-3" />
                  <span>सेव करें (Save)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingPoem(false)}
                  className="text-[11px] font-bold text-slate-600 bg-white border border-slate-300 px-2 py-0.5 rounded cursor-pointer"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={handleResetPoem}
                  className="text-[10px] font-semibold text-amber-800 underline ml-1 cursor-pointer"
                >
                  मूल कविता
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditingPoem ? (
          <div className="mt-2 space-y-2">
            <textarea
              rows={3}
              value={poemInput}
              onChange={(e) => setPoemInput(e.target.value)}
              className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-xs font-medium text-slate-800 outline-none leading-relaxed"
              placeholder="यहाँ अपनी पसंदीदा प्रेरणादायक कविता या कारखाना संदेश लिखें..."
            />
          </div>
        ) : (
          <p className="text-xs sm:text-sm font-medium text-amber-950 leading-relaxed italic m-0 whitespace-pre-line pl-1 border-l-2 border-amber-400">
            "{poem}"
          </p>
        )}
      </div>

      {/* Quick Action Banners: Material Requisition & Live Floor Manpower */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
        {onOpenRequisitionModal && (
          <button
            onClick={onOpenRequisitionModal}
            className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 hover:border-emerald-300 rounded-xl transition shadow-xs hover:shadow group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-900 uppercase tracking-wide flex items-center gap-1.5">
                  <span>Material Indent Desk (मटेरियल इंडेन्ट)</span>
                  {arrivedRequisitionsCount > 0 ? (
                    <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-extrabold animate-pulse">
                      {arrivedRequisitionsCount} Arrived!
                    </span>
                  ) : (
                    <span className="bg-emerald-200 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-bold">
                      Store Indents & POs
                    </span>
                  )}
                </div>
                <div className="text-xs text-emerald-700 mt-0.5">
                  मटेरियल / स्पेयर पार्ट डिमांड भरें और स्टेटस ट्रैक करें
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-white border border-emerald-200 px-2.5 py-1 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition">
              Open &rarr;
            </span>
          </button>
        )}

        {onOpenManpowerModal && (
          <button
            onClick={onOpenManpowerModal}
            className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-200 hover:border-amber-300 rounded-xl transition shadow-xs hover:shadow group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-600 text-white flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition text-base">
                👷‍♂️
              </div>
              <div>
                <div className="text-xs font-bold text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                  <span>Plant Floor Manpower (लाइव ऑपरेटर व हेल्पर)</span>
                  <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.5 rounded font-extrabold">
                    {state?.floorWorkers ? `${state.floorWorkers.filter((w) => w.isPresent).length} On Duty` : 'Live Roster'}
                  </span>
                </div>
                <div className="text-xs text-amber-800 mt-0.5">
                  प्लांट में कुल ऑपरेटर, हेल्पर और मशीन आवंटन लाइव देखें
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-900 bg-white border border-amber-300 px-2.5 py-1 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition">
              View Roster &rarr;
            </span>
          </button>
        )}
      </div>

      {/* Main Module Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-3.5">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectView(item.id)}
            className={`bg-white border-2 border-slate-200 border-t-4 ${item.borderColor} hover:border-[#3182ce] hover:shadow-md hover:-translate-y-1 rounded-xl p-3.5 text-center transition-all flex flex-col items-center justify-between min-h-[145px] group cursor-pointer`}
          >
            <div className="transition group-hover:scale-110 mb-1.5">{item.icon}</div>
            <div>
              <h3 className="text-xs font-bold text-[#1a365d] uppercase tracking-wide m-0">
                {item.title}
              </h3>
              <p className="text-[10.5px] text-slate-500 mt-1 line-clamp-2 leading-tight">
                {item.subtitle}
              </p>
            </div>
            <div className="mt-2 w-full flex justify-center">
              {item.badge ? (
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded uppercase">
                  {item.badge}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-semibold group-hover:text-blue-600 transition">
                  Open Desk &rarr;
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {visibleItems.length === 0 && (
        <div className="text-center py-8 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-sm font-bold text-slate-700">No workstation modules authorized for user [{username}].</p>
          <p className="text-xs text-slate-500 mt-1">Please contact Administrator to assign desk permissions.</p>
        </div>
      )}
    </div>
  );
};
