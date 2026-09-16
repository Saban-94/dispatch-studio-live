import { useState, useMemo, useEffect } from "react";
import {
  PackageCheck,
  Clock,
  Warehouse,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Smartphone,
  Search,
  Filter,
  RefreshCw,
  Tv,
  CheckSquare,
  Square,
  Truck,
  MapPin,
  Flame,
  ChevronDown,
  ChevronUp,
  UserCheck,
  ArrowRight,
  ShieldCheck,
  Send,
  Timer,
  Share2,
  Copy,
  Check,
  MessageCircle,
  ExternalLink,
  X,
  TrendingUp,
  Sun,
  Moon,
  Compass,
} from "lucide-react";
import { useDispatchBoard } from "@/context/DispatchContext";
import type { Order, OrderStatus } from "@/types/dispatch";
import { StatusBadge } from "@/components/ui/status-badge";
import { InventoryDemandCard } from "./InventoryDemandCard";
import {
  isAudioMuted,
  toggleAudioMute,
  subscribeSoundMute,
  playNewOrderSound,
  playSuccessSound,
  playAlarmSound,
} from "@/utils/soundEffects";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

export type PickerProfile = "oren" | "tamir" | "all";

interface PickerViewProps {
  onSwitchToTv?: () => void;
  onOpenTraffic?: () => void;
}

function LiveKpiBanner({ orders }: { orders: Order[] }) {
  const [isOpen, setIsOpen] = useState(true);
  const bales = orders.reduce((sum, order) => sum + order.logisticsMetrics.bellaBags, 0);
  const pallets = orders.reduce((sum, order) => sum + order.logisticsMetrics.sabanPallets, 0);
  const active = orders.filter(
    (order) => order.status === "ממתין" || order.status === "בהכנה",
  ).length;
  const loadReady = orders.filter(
    (order) => order.status === "מוכן להעמסה" || order.status === "בהעמסה",
  ).length;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-sky-500/30 bg-sky-950/30 shadow-sm"
      aria-label="מדדי מחסן חיים"
    >
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        <span className="flex items-center gap-2 text-sm font-black text-sky-100">
          <TrendingUp aria-hidden="true" /> מדדי משמרת חיים
        </span>
        <span className="text-xs font-bold text-sky-300">{isOpen ? "צמצום" : "הצגה"}</span>
      </button>
      {isOpen && (
        <div className="grid grid-cols-2 gap-2 border-t border-sky-500/20 p-3 sm:grid-cols-4">
          <div className="rounded-xl bg-background/60 p-2">
            <div className="text-xl font-black tabular-nums text-foreground">{bales}</div>
            <div className="text-[11px] font-bold text-muted-foreground">בלות · 60002</div>
          </div>
          <div className="rounded-xl bg-background/60 p-2">
            <div className="text-xl font-black tabular-nums text-foreground">{pallets}</div>
            <div className="text-[11px] font-bold text-muted-foreground">משטחים · 60060</div>
          </div>
          <div
            className={cn("rounded-xl p-2", active > 0 ? "bg-amber-500/15" : "bg-background/60")}
          >
            <div className="text-xl font-black tabular-nums text-foreground">
              {active ? "20 דק׳" : "—"}
            </div>
            <div className="text-[11px] font-bold text-muted-foreground">SLA ליקוט</div>
          </div>
          <div
            className={cn("rounded-xl p-2", loadReady > 0 ? "bg-rose-500/15" : "bg-background/60")}
          >
            <div className="text-xl font-black tabular-nums text-foreground">
              {loadReady ? "15 דק׳" : "—"}
            </div>
            <div className="text-[11px] font-bold text-muted-foreground">SLA העמסה</div>
          </div>
        </div>
      )}
    </section>
  );
}

export function PickerView({ onSwitchToTv, onOpenTraffic }: PickerViewProps) {
  const {
    published,
    startPicking,
    finishPicking,
    reportPickerOverrun,
    quickUpdateStatus,
    syncNow,
    syncStatus,
    toggleItemApproval,
    approveAllItems,
    pushAlert,
  } = useDispatchBoard();

  const [selectedProfile, setSelectedProfile] = useState<PickerProfile>("oren");
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const pickerParam = urlParams.get("picker");
      const warehouseParam = urlParams.get("warehouse");
      const warehousePicker =
        warehouseParam === "4" ? "oren" : warehouseParam === "1" ? "tamir" : null;
      if (warehousePicker) {
        setSelectedProfile(warehousePicker);
        return;
      }
      if (pickerParam === "oren" || pickerParam === "tamir" || pickerParam === "all") {
        setSelectedProfile(pickerParam);
        return;
      }
      const saved = localStorage.getItem("saban_active_picker_profile");
      if (saved === "oren" || saved === "tamir" || saved === "all") {
        setSelectedProfile(saved);
      }
    }
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "ready" | "completed">(
    "active",
  );
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});
  const [isMuted, setIsMuted] = useState(isAudioMuted());
  const { isInstallable, promptInstall, isIOS } = usePwaInstall();
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sync mute state
  useEffect(() => {
    return subscribeSoundMute((muted) => setIsMuted(muted));
  }, []);

  const handleProfileChange = (profile: PickerProfile) => {
    setSelectedProfile(profile);
    if (typeof window !== "undefined") {
      localStorage.setItem("saban_active_picker_profile", profile);
      const url = new URL(window.location.href);
      url.searchParams.set("mode", "picker");
      url.searchParams.set("picker", profile);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const getFullPickerUrl = (profile: "oren" | "tamir" | "tv") => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    if (profile === "tv") return `${origin}/?mode=tv`;
    return `${origin}/?mode=picker&picker=${profile}`;
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      // fallback
    }
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrderIds((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const warehouseMatchesProfile = (warehouse: string, profile: PickerProfile) => {
    const value = warehouse.trim().toLowerCase();
    if (!value) return false;
    if (profile === "oren") return /סניף\s*4|מחסן\s*4|החורש|החרש/.test(value);
    if (profile === "tamir") return /סניף\s*1|מחסן\s*1|התלמיד/.test(value);
    return true;
  };

  // Warehouse-specific views intentionally exclude blank, ambiguous, and unknown warehouses.
  const filteredOrders = useMemo(() => {
    return published.filter((order) => {
      if (selectedProfile !== "all" && !warehouseMatchesProfile(order.warehouse, selectedProfile))
        return false;

      // Status filter
      if (statusFilter === "active") {
        if (order.status === "סופק" || order.status === "יצא לדרך") return false;
      } else if (statusFilter === "ready") {
        if (order.status !== "מוכן להעמסה" && order.status !== "בהעמסה") return false;
      } else if (statusFilter === "completed") {
        if (order.status !== "סופק" && order.status !== "יצא לדרך") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCust = order.customerName.toLowerCase().includes(q);
        const matchId = order.orderId.includes(q);
        const matchCity = order.city.toLowerCase().includes(q);
        const matchItem = order.items.some((it) => it.name.toLowerCase().includes(q));
        if (!matchCust && !matchId && !matchCity && !matchItem) return false;
      }

      return true;
    });
  }, [published, selectedProfile, statusFilter, searchQuery]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    let active = 0;
    let ready = 0;
    let completed = 0;

    published.forEach((o) => {
      if (selectedProfile !== "all" && !warehouseMatchesProfile(o.warehouse, selectedProfile))
        return;

      if (o.status === "ממתין" || o.status === "בהכנה") active++;
      else if (o.status === "מוכן להעמסה" || o.status === "בהעמסה") ready++;
      else if (o.status === "יצא לדרך" || o.status === "סופק") completed++;
    });

    return { active, ready, completed, all: active + ready + completed };
  }, [published, selectedProfile]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100 font-sans pb-24 selection:bg-amber-500 selection:text-slate-950">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-sky-600 to-amber-500 p-0.5 shadow-sm">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <PackageCheck className="size-5 text-amber-400" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white leading-tight">
                ח. סבן · מסוף ליקוט
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">מערכת מחסנאים PWA בזמן אמת</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "עבור למצב בהיר" : "עבור למצב כהה"}
              title={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
              className="flex size-11 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-amber-300 transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </button>
            {/* Audio Mute Toggle */}
            <button
              onClick={() => toggleAudioMute()}
              title={isMuted ? "בטל השתקת צלילים" : "השתק צליל��ם"}
              className={cn(
                "p-2 rounded-lg border transition-colors flex items-center justify-center",
                isMuted
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20",
              )}
            >
              {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>

            {/* Share Links Dialog Button */}
            <button
              onClick={() => setShowShareModal(true)}
              title="קישורים ישירים למחסנאים ולוואטסאפ"
              className="p-2 rounded-lg bg-sky-600/20 border border-sky-500/30 text-sky-300 hover:bg-sky-600/30 transition-colors flex items-center justify-center"
            >
              <Share2 className="size-4" />
            </button>

            {/* Sync Refresh */}
            <button
              onClick={() => syncNow()}
              disabled={syncStatus === "syncing"}
              title="רענן הזמנות מגיליון"
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center"
            >
              <RefreshCw
                className={cn("size-4", syncStatus === "syncing" && "animate-spin text-sky-400")}
              />
            </button>

            {/* Traffic & Waze Live Map */}
            {onOpenTraffic && (
              <button
                type="button"
                onClick={onOpenTraffic}
                title="מפת פקקים חיה ו-Waze למשאיות סבן"
                className="p-2 rounded-lg bg-sky-950 border border-sky-600/40 text-sky-300 hover:bg-sky-900 transition-colors flex items-center justify-center relative"
              >
                <Compass className="size-4 text-sky-400" />
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 animate-ping" />
              </button>
            )}

            {/* Switch to TV Dashboard */}
            {onSwitchToTv && (
              <button
                onClick={onSwitchToTv}
                className="px-2.5 py-1.5 rounded-lg bg-sky-600/20 border border-sky-500/30 text-sky-300 hover:bg-sky-600/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Tv className="size-3.5" />
                <span className="hidden sm:inline">לוח שידור</span> TV
              </button>
            )}
          </div>
        </div>

        {/* Picker Persona Selector */}
        <div className="max-w-2xl mx-auto mt-3">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs font-bold">
            <button
              onClick={() => handleProfileChange("oren")}
              className={cn(
                "py-2 px-2 rounded-lg transition-all flex flex-col items-center gap-0.5",
                selectedProfile === "oren"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900",
              )}
            >
              <span>👷 אורן</span>
              <span className="text-[10px] opacity-85">סניף 4 החורש</span>
            </button>

            <button
              onClick={() => handleProfileChange("tamir")}
              className={cn(
                "py-2 px-2 rounded-lg transition-all flex flex-col items-center gap-0.5",
                selectedProfile === "tamir"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900",
              )}
            >
              <span>👷 תמיר</span>
              <span className="text-[10px] opacity-85">סניף 1 התלמיד</span>
            </button>

            <button
              onClick={() => handleProfileChange("all")}
              className={cn(
                "py-2 px-2 rounded-lg transition-all flex flex-col items-center gap-0.5",
                selectedProfile === "all"
                  ? "bg-sky-600 text-white font-black shadow-md shadow-sky-600/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900",
              )}
            >
              <span>🌐 כל המחסנים</span>
              <span className="text-[10px] opacity-85">מנהל / סדרן</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* PWA Install Banner */}
        {isInstallable && showInstallBanner && (
          <div className="bg-gradient-to-r from-sky-900/40 via-sky-800/30 to-amber-950/30 border border-sky-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
                <Smartphone className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">התקן את אפליקציית הליקוט למסך הבית</h4>
                <p className="text-xs text-slate-300">
                  {isIOS
                    ? "באייפון: לחץ על 'שיתוף' בתחתית ובחר 'הוסף למסך הבית'"
                    : "גישה מיידית בהקשה אחת, צלילי התראה ועבודה מהירה במחסן"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isIOS && (
                <button
                  onClick={() => promptInstall()}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold shadow-md shadow-sky-600/30 transition-colors"
                >
                  התקן
                </button>
              )}
              <button
                onClick={() => setShowInstallBanner(false)}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1"
              >
                סגור
              </button>
            </div>
          </div>
        )}

        {/* Search & Quick Filter Tabs */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="size-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="חפש לפי לקוח, עיר, מספר הזמנה או מוצר..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pr-10 pl-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
            <button
              onClick={() => setStatusFilter("active")}
              className={cn(
                "px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 shrink-0",
                statusFilter === "active"
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-300 font-black"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200",
              )}
            >
              <Clock className="size-3.5 text-amber-400" />
              <span>פעיל לליקוט</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-[10px] text-amber-200">
                {tabCounts.active}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter("ready")}
              className={cn(
                "px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 shrink-0",
                statusFilter === "ready"
                  ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300 font-black"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200",
              )}
            >
              <Truck className="size-3.5 text-indigo-400" />
              <span>מוכן ברציף / בהעמסה</span>
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-[10px] text-indigo-200">
                {tabCounts.ready}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter("completed")}
              className={cn(
                "px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 shrink-0",
                statusFilter === "completed"
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-black"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200",
              )}
            >
              <CheckCircle2 className="size-3.5 text-emerald-400" />
              <span>הושלם</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-[10px] text-emerald-200">
                {tabCounts.completed}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 shrink-0",
                statusFilter === "all"
                  ? "bg-sky-500/20 border-sky-500/50 text-sky-300 font-black"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200",
              )}
            >
              <span>הכל</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
                {tabCounts.all}
              </span>
            </button>
          </div>
        </div>

        {/* Live inventory and SLA summary */}
        <LiveKpiBanner orders={filteredOrders} />

        {/* Inventory Demand & 1-Click WhatsApp Reorder to Netanel */}
        <InventoryDemandCard
          orders={published}
          warehouseName={
            selectedProfile === "oren"
              ? "סניף 4 החורש"
              : selectedProfile === "tamir"
                ? "סניף 1 התלמיד"
                : "כל המחסנים (ח. סבן)"
          }
          warehouseBranchNumber={
            selectedProfile === "oren" ? 4 : selectedProfile === "tamir" ? 1 : "all"
          }
          pickerName={
            selectedProfile === "oren"
              ? "אורן (סניף 4)"
              : selectedProfile === "tamir"
                ? "תמיר (סניף 1)"
                : "מחסנאי ח. סבן"
          }
          onLogReplenishment={(summaryText) => {
            pushAlert(summaryText, "success");
            const callerName =
              selectedProfile === "oren" ? "אורן" : selectedProfile === "tamir" ? "תמיר" : "מחסנאי";
            const whName = selectedProfile === "oren" ? "סניף 4 החורש" : "סניף 1 התלמיד";
            // Optional sync to Google Sheets log
            fetch("/api/sheets/log-history", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "REPLENISHMENT_DISPATCHED",
                sheetName: "היסטוריית_שיחות_נועה",
                caller: callerName,
                warehouse: whName,
                summary: summaryText,
              }),
            }).catch(() => null);
          }}
        />

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <div className="size-14 rounded-2xl bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500">
              <PackageCheck className="size-7" />
            </div>
            <h3 className="text-base font-bold text-slate-300">אין הזמנות התואמות את הסינון</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              כל ההזמנות לוקטו או שלא הוגדרו הזמנות חדשות עבור מחסן זה כעת.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <PickerOrderCard
                key={order.orderId}
                order={order}
                isExpanded={!!expandedOrderIds[order.orderId]}
                onToggleExpand={() => toggleExpand(order.orderId)}
                activePicker={
                  selectedProfile === "oren"
                    ? "אורן (סניף 4)"
                    : selectedProfile === "tamir"
                      ? "תמיר (סניף 1)"
                      : undefined
                }
                onStartPicking={(orderId, picker) => startPicking(orderId, picker)}
                onFinishPicking={(orderId) => finishPicking(orderId)}
                onReportOverrun={(orderId) => reportPickerOverrun(orderId)}
                onUpdateStatus={(orderId, status) => quickUpdateStatus(orderId, status)}
                onToggleItem={(orderId, sku) => toggleItemApproval(orderId, sku)}
                onApproveAll={(orderId) => approveAllItems(orderId)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Share / Direct Links Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Share2 className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">קישורי גישה ישירים למסופים</h3>
                  <p className="text-xs text-slate-400">שלח לינק ייעודי ישירות למחסנאי בטלפון</p>
                </div>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Oren Card */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👷</span>
                    <div>
                      <h4 className="text-sm font-bold text-amber-400">אורן · סניף 4 החורש</h4>
                      <span className="text-[11px] text-slate-400">מסוף ליקוט ייעודי לסניף 4</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] font-bold border border-amber-500/20">
                    סניף 4
                  </span>
                </div>

                <div className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 break-all select-all">
                  {getFullPickerUrl("oren")}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => copyToClipboard(getFullPickerUrl("oren"), "oren")}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                  >
                    {copiedKey === "oren" ? (
                      <>
                        <Check className="size-3.5 text-emerald-400" />
                        <span className="text-emerald-300">הועתק ללוח!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5 text-slate-400" />
                        <span>העתק קישור לאורן</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `שלום אורן, הנה הקישור הישיר למסוף הליקוט שלך (סניף 4 החורש):\n${getFullPickerUrl(
                        "oren",
                      )}`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <MessageCircle className="size-3.5" />
                    <span>שלח בוואטסאפ</span>
                  </a>
                </div>
              </div>

              {/* Tamir Card */}
              <div className="p-3 bg-slate-950/80 rounded-xl border border-sky-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👷</span>
                    <div>
                      <h4 className="text-sm font-bold text-sky-400">תמיר · סניף 1 התלמיד</h4>
                      <span className="text-[11px] text-slate-400">מסוף ליקוט ייעודי לסניף 1</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 text-[10px] font-bold border border-sky-500/20">
                    סניף 1
                  </span>
                </div>

                <div className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 break-all select-all">
                  {getFullPickerUrl("tamir")}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => copyToClipboard(getFullPickerUrl("tamir"), "tamir")}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                  >
                    {copiedKey === "tamir" ? (
                      <>
                        <Check className="size-3.5 text-emerald-400" />
                        <span className="text-emerald-300">הועתק ללוח!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5 text-slate-400" />
                        <span>העתק קישור לתמיר</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `שלום תמיר, הנה הקישור הישיר למסוף הליקוט שלך (סניף 1 התלמיד):\n${getFullPickerUrl(
                        "tamir",
                      )}`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <MessageCircle className="size-3.5" />
                    <span>שלח בוואטסאפ</span>
                  </a>
                </div>
              </div>

              {/* TV Screen Link */}
              <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">📺 לוח שידור TV מרכזי</h4>
                  <p className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">
                    {getFullPickerUrl("tv")}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(getFullPickerUrl("tv"), "tv")}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center gap-1 shrink-0"
                >
                  {copiedKey === "tv" ? (
                    <Check className="size-3 text-emerald-400" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                  <span>{copiedKey === "tv" ? "הועתק" : "העתק"}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PickerOrderCardProps {
  order: Order;
  isExpanded: boolean;
  onToggleExpand: () => void;
  activePicker?: string;
  onStartPicking: (orderId: string, picker?: string) => void;
  onFinishPicking: (orderId: string) => void;
  onReportOverrun: (orderId: string) => void;
  onUpdateStatus: (orderId: string, status: OrderStatus) => void;
  onToggleItem: (orderId: string, sku: string) => void;
  onApproveAll: (orderId: string) => void;
}

function PickerOrderCard({
  order,
  isExpanded,
  onToggleExpand,
  activePicker,
  onStartPicking,
  onFinishPicking,
  onReportOverrun,
  onUpdateStatus,
  onToggleItem,
  onApproveAll,
}: PickerOrderCardProps) {
  // Compute picking SLA elapsed time
  // Default SLA: 20 minutes (1200 seconds)
  const PICKING_SLA_SECONDS = 20 * 60;
  const LOADING_SLA_SECONDS = 15 * 60;

  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
  const [hasAlertedOverrun, setHasAlertedOverrun] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Retrieve or compute picking start time
  const pickingStartedAt = useMemo(() => {
    if (order.pickingStartedAt) return order.pickingStartedAt;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`saban_picker_start_${order.orderId}`);
      if (saved) {
        const t = parseInt(saved, 10);
        if (!isNaN(t)) return t;
      }
    }
    return null;
  }, [order.pickingStartedAt, order.orderId]);

  // Compute remaining seconds
  const { remainingSeconds, isOverrun, elapsedSeconds } = useMemo(() => {
    if (order.status !== "בהכנה" || !pickingStartedAt) {
      return { remainingSeconds: PICKING_SLA_SECONDS, isOverrun: false, elapsedSeconds: 0 };
    }
    const elapsed = Math.floor((currentTimeMs - pickingStartedAt) / 1000);
    const remain = PICKING_SLA_SECONDS - elapsed;
    return {
      remainingSeconds: remain,
      isOverrun: remain <= 0,
      elapsedSeconds: elapsed,
    };
  }, [order.status, pickingStartedAt, currentTimeMs, PICKING_SLA_SECONDS]);

  // Trigger overrun alarm once when hitting 0
  useEffect(() => {
    if (order.status === "בהכנה" && isOverrun && !hasAlertedOverrun) {
      setHasAlertedOverrun(true);
      onReportOverrun(order.orderId);
    }
  }, [order.status, isOverrun, hasAlertedOverrun, order.orderId, onReportOverrun]);

  const approvedCount = order.items.filter((i) => i.isApproved).length;
  const totalItems = order.items.length;
  const allItemsChecked = totalItems > 0 && approvedCount === totalItems;

  const formatTimer = (secs: number) => {
    const abs = Math.abs(secs);
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-300 overflow-hidden shadow-md",
        isOverrun && order.status === "בהכנה"
          ? "bg-rose-950/30 border-rose-500 animate-pulse ring-2 ring-rose-500/50"
          : order.status === "בהכנה"
            ? "bg-slate-900 border-amber-500/40 ring-1 ring-amber-500/20"
            : order.status === "מוכן להעמסה"
              ? "bg-slate-900 border-indigo-500/40 ring-1 ring-indigo-500/20"
              : order.status === "סופק"
                ? "bg-slate-900/60 border-slate-800 opacity-80"
                : "bg-slate-900 border-slate-800 hover:border-slate-700",
      )}
    >
      {/* Overrun Warning Header if breached */}
      {isOverrun && order.status === "בהכנה" && (
        <div className="bg-rose-600 text-white px-4 py-1.5 text-xs font-black flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-1.5">
            <Flame className="size-4 text-amber-300 fill-amber-300" />
            <span>חריגת ליקוט חמורה! (SLA יעד 20 דק' נחצה)</span>
          </div>
          <span className="font-mono bg-rose-700 px-2 py-0.5 rounded">
            +{formatTimer(remainingSeconds)} חריגה
          </span>
        </div>
      )}

      {/* Card Body */}
      <div className="p-4 space-y-3">
        {/* Top Meta Line: Order ID, Target Time, Status Badge */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                #{order.orderId}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Warehouse className="size-3.5 text-amber-400" />
                {order.warehouse || "מחסן מרכזי"}
              </span>
            </div>
            <h3 className="text-lg font-black text-white mt-1 leading-snug">
              {order.customerName}
            </h3>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge status={order.status} size="sm" />
            <div className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              <Clock className="size-3.5" />
              <span>שעת יעד: {order.targetTime}</span>
            </div>
          </div>
        </div>

        {/* Destination & Driver */}
        <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-slate-400">
            <MapPin className="size-3.5 text-sky-400 shrink-0" />
            <span>{order.address ? `${order.address}, ${order.city}` : order.city}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <Truck className="size-3.5 text-slate-400" />
            <span>{order.driver || "טרם שובץ נהג"}</span>
          </div>
        </div>

        {/* Logistics Metrics Pills */}
        <div className="grid grid-cols-3 gap-2 py-1 bg-slate-950/60 rounded-xl p-2 border border-slate-800/60 text-center">
          <div>
            <span className="block text-[10px] text-slate-400">שקי בלה</span>
            <span className="text-sm font-black text-sky-400">
              {order.logisticsMetrics.bellaBags}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400">משטחי סבן</span>
            <span className="text-sm font-black text-amber-400">
              {order.logisticsMetrics.sabanPallets}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400">משקל משוער</span>
            <span className="text-sm font-black text-slate-200">
              {order.logisticsMetrics.estimatedWeightKg >= 1000
                ? `${(order.logisticsMetrics.estimatedWeightKg / 1000).toFixed(1)} טון`
                : `${order.logisticsMetrics.estimatedWeightKg} ק״ג`}
            </span>
          </div>
        </div>

        {/* Live SLA Countdown Timer Bar (When in preparation) */}
        {order.status === "בהכנה" && (
          <div
            className={cn(
              "rounded-xl p-3 border flex items-center justify-between gap-3",
              isOverrun
                ? "bg-rose-950/40 border-rose-500/60 text-rose-200"
                : remainingSeconds <= 300
                  ? "bg-amber-950/30 border-amber-500/50 text-amber-200"
                  : "bg-sky-950/30 border-sky-500/40 text-sky-200",
            )}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "size-8 rounded-lg flex items-center justify-center font-mono font-black text-xs",
                  isOverrun
                    ? "bg-rose-600 text-white animate-pulse"
                    : remainingSeconds <= 300
                      ? "bg-amber-500 text-slate-950"
                      : "bg-sky-500 text-slate-950",
                )}
              >
                <Timer className="size-4" />
              </div>
              <div>
                <span className="text-xs font-bold block">
                  {isOverrun ? "חריגה מ-20 דקות ליקוט!" : "זמן נותר לליקוט (SLA 20 דק'):"}
                </span>
                <span className="text-[11px] text-slate-400">
                  התחיל ב-
                  {pickingStartedAt
                    ? new Date(pickingStartedAt).toLocaleTimeString("he-IL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--:--"}
                </span>
              </div>
            </div>

            <div className="text-left font-mono font-black text-xl tracking-tight">
              {isOverrun ? `-${formatTimer(remainingSeconds)}` : formatTimer(remainingSeconds)}
            </div>
          </div>
        )}

        {/* Stage 3: Ready on dock */}
        {order.status === "מוכן להעמסה" && (
          <div className="rounded-xl p-3 bg-indigo-950/30 border border-indigo-500/40 text-indigo-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center">
                <CheckCircle2 className="size-4" />
              </div>
              <div>
                <span className="text-xs font-bold block">הליקוט הושלם · מוכן להעמסה ברציף</span>
                <span className="text-[11px] text-indigo-300/80">
                  המשאית והסדרן קיבלו התראה לטעינה (SLA העמסה 15 דק')
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Item Checklist Header */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={onToggleExpand}
            className="w-full flex items-center justify-between text-xs text-slate-300 font-bold hover:text-white py-1"
          >
            <div className="flex items-center gap-2">
              <span>רשימת מק"טים לליקוט</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[11px]",
                  allItemsChecked
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-slate-800 text-slate-300",
                )}
              >
                {approvedCount} מתוך {totalItems} פריטים
              </span>
            </div>
            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          {/* Interactive Checklist List */}
          {isExpanded && (
            <div className="mt-2.5 space-y-1.5 bg-slate-950/80 rounded-xl p-2.5 border border-slate-800">
              <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-800 text-[11px] text-slate-400">
                <span>לחץ על פריט כדי לאשר ליקוט</span>
                <button
                  onClick={() => onApproveAll(order.orderId)}
                  className="text-sky-400 hover:text-sky-300 font-bold"
                >
                  סמן הכל כאושר
                </button>
              </div>

              {order.items.map((item) => (
                <div
                  key={item.sku}
                  onClick={() => onToggleItem(order.orderId, item.sku)}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors select-none text-xs",
                    item.isApproved
                      ? "bg-emerald-950/30 border border-emerald-500/30 text-emerald-200"
                      : "bg-slate-900 border border-slate-800/80 hover:bg-slate-850 text-slate-200",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {item.isApproved ? (
                      <CheckSquare className="size-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Square className="size-4 text-slate-500 shrink-0" />
                    )}
                    <span
                      className={cn(
                        "font-medium leading-tight",
                        item.isApproved && "line-through opacity-70",
                      )}
                    >
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono font-bold text-amber-400">
                      {item.quantity} {item.unit || "יח'"}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">#{item.sku}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Primary Action Buttons Bar */}
        <div className="pt-2">
          {order.status === "ממתין" && (
            <button
              onClick={() => onStartPicking(order.orderId, activePicker)}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <PackageCheck className="size-5" />
              <span>קיבלתי - התחל ליקוט (SLA 20 דק')</span>
            </button>
          )}

          {order.status === "בהכנה" && (
            <button
              onClick={() => onFinishPicking(order.orderId)}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-black text-sm rounded-xl shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="size-5" />
              <span>סיימתי ליקוט - מוכן להעמסה ברציף</span>
            </button>
          )}

          {order.status === "מוכן להעמסה" && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateStatus(order.orderId, "בהעמסה")}
                className="py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <Truck className="size-4" />
                <span>העברה לסטטוס בהעמסה</span>
              </button>
              <button
                onClick={() => onUpdateStatus(order.orderId, "יצא לדרך")}
                className="py-3 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                <Send className="size-4" />
                <span>יצא לדרך עם הנהג</span>
              </button>
            </div>
          )}

          {order.status === "בהעמסה" && (
            <button
              onClick={() => onUpdateStatus(order.orderId, "יצא לדרך")}
              className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Truck className="size-4" />
              <span>אישור העמסה מלאה ויציאה לדרך</span>
            </button>
          )}

          {order.status === "יצא לדרך" && (
            <button
              onClick={() => onUpdateStatus(order.orderId, "סופק")}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="size-4" />
              <span>סמן כסופק ללקוח</span>
            </button>
          )}

          {/* Direct Manual Status Selector */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span className="font-bold flex items-center gap-1 text-slate-300">
              <span>שינוי סטטוס ישיר:</span>
            </span>
            <select
              value={order.status}
              onChange={(e) => onUpdateStatus(order.orderId, e.target.value as OrderStatus)}
              className="bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-600 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              <option value="ממתין">ממתין</option>
              <option value="בהכנה">בהכנה (ליקוט פעיל)</option>
              <option value="מוכן להעמסה">מוכן להעמסה</option>
              <option value="בהעמסה">בהעמסה</option>
              <option value="יצא לדר��">יצא לדרך</option>
              <option value="סופק">סופק</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
