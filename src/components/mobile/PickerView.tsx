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
  const bales = orders.reduce((sum, order) => sum + (order.logisticsMetrics?.bellaBags || 0), 0);
  const pallets = orders.reduce((sum, order) => sum + (order.logisticsMetrics?.sabanPallets || 0), 0);
  const active = orders.filter(
    (order) => order.status === "ממתין" || order.status === "בהכנה",
  ).length;
  const loadReady = orders.filter(
    (order) => order.status === "מוכן להעמסה" || order.status === "בהעמסה",
  ).length;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-sky-500/30 bg-sky-950/20 shadow-sm"
      aria-label="מדדי מחסן חיים"
    >
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-3.5 py-2.5 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        <span className="flex items-center gap-2 text-sm font-black text-sky-400">
          <TrendingUp className="size-4" aria-hidden="true" /> מדדי משמרת חיים
        </span>
        <span className="text-xs font-bold text-sky-400/80">{isOpen ? "צמצום" : "הצגה"}</span>
      </button>
      {isOpen && (
        <div className="grid grid-cols-2 gap-2 border-t border-sky-500/20 p-3 sm:grid-cols-4 bg-card/40">
          <div className="rounded-xl bg-background/80 p-2.5 border border-border/50 text-center">
            <div className="text-xl font-black tabular-nums text-foreground">{bales}</div>
            <div className="text-[11px] font-bold text-muted-foreground">בלות · 60002</div>
          </div>
          <div className="rounded-xl bg-background/80 p-2.5 border border-border/50 text-center">
            <div className="text-xl font-black tabular-nums text-foreground">{pallets}</div>
            <div className="text-[11px] font-bold text-muted-foreground">משטחים · 60060</div>
          </div>
          <div
            className={cn(
              "rounded-xl p-2.5 border border-border/50 text-center",
              active > 0 ? "bg-amber-500/15 border-amber-500/30" : "bg-background/80"
            )}
          >
            <div className="text-xl font-black tabular-nums text-foreground">
              {active ? "20 דק׳" : "—"}
            </div>
            <div className="text-[11px] font-bold text-muted-foreground">SLA ליקוט</div>
          </div>
          <div
            className={cn(
              "rounded-xl p-2.5 border border-border/50 text-center",
              loadReady > 0 ? "bg-rose-500/15 border-rose-500/30" : "bg-background/80"
            )}
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
    published = [],
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
  
  // סנכרון שמע בטוח
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return isAudioMuted();
    } catch {
      return false;
    }
  });

  const { isInstallable, promptInstall, isIOS } = usePwaInstall();
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      return subscribeSoundMute((muted) => setIsMuted(muted));
    } catch {
      return () => {};
    }
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
    const value = (warehouse || "").trim().toLowerCase();
    if (!value) return false;
    if (profile === "oren") return /סניף\s*4|מחסן\s*4|החורש|החרש/.test(value);
    if (profile === "tamir") return /סניף\s*1|מחסן\s*1|התלמיד/.test(value);
    return true;
  };

  const safePublished = useMemo(() => (Array.isArray(published) ? published : []), [published]);

  const filteredOrders = useMemo(() => {
    return safePublished.filter((order) => {
      if (!order) return false;
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
        const matchCust = (order.customerName || "").toLowerCase().includes(q);
        const matchId = String(order.orderId || "").includes(q);
        const matchCity = (order.city || "").toLowerCase().includes(q);
        const matchItem = (order.items || []).some((it) => (it?.name || "").toLowerCase().includes(q));
        if (!matchCust && !matchId && !matchCity && !matchItem) return false;
      }

      return true;
    });
  }, [safePublished, selectedProfile, statusFilter, searchQuery]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    let active = 0;
    let ready = 0;
    let completed = 0;

    safePublished.forEach((o) => {
      if (!o) return;
      if (selectedProfile !== "all" && !warehouseMatchesProfile(o.warehouse, selectedProfile))
        return;

      if (o.status === "ממתין" || o.status === "בהכנה") active++;
      else if (o.status === "מוכן להעמסה" || o.status === "בהעמסה") ready++;
      else if (o.status === "יצא לדרך" || o.status === "סופק") completed++;
    });

    return { active, ready, completed, all: active + ready + completed };
  }, [safePublished, selectedProfile]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground font-sans pb-24 selection:bg-amber-500 selection:text-slate-950">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border px-3.5 py-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-10 rounded-xl bg-gradient-to-tr from-sky-600 to-amber-500 p-0.5 shadow-sm shrink-0">
              <div className="w-full h-full bg-card rounded-[10px] flex items-center justify-center">
                <PackageCheck className="size-5 text-amber-500" />
              </div>
            </div>
            <div className="truncate">
              <h1 className="text-base font-black tracking-tight text-foreground leading-tight truncate">
                ח. סבן · מסוף ליקוט
              </h1>
              <p className="text-[11px] text-muted-foreground font-medium">מערכת מחסנאים PWA בזמן אמת</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Theme Toggle - כפתור מעוצב ומגיב */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "עבור למצב בהיר" : "עבור למצב כהה"}
              title={theme === "dark" ? "מצב בהיר" : "מצב כהה"}
              className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition active:scale-95 shadow-sm hover:bg-secondary"
            >
              {theme === "dark" ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-700" />}
            </button>

            {/* Audio Mute Toggle */}
            <button
              type="button"
              onClick={() => {
                try {
                  toggleAudioMute();
                } catch {}
              }}
              title={isMuted ? "בטל השתקת צלילים" : "השתק צלילים"}
              className={cn(
                "size-10 rounded-xl border transition-all flex items-center justify-center active:scale-95 shadow-sm",
                isMuted
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20",
              )}
            >
              {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>

            {/* Share Links Dialog Button */}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              title="קישורים ישירים למחסנאים ולוואטסאפ"
              className="size-10 rounded-xl bg-sky-600/15 border border-sky-500/30 text-sky-500 hover:bg-sky-600/25 transition-all flex items-center justify-center active:scale-95 shadow-sm"
            >
              <Share2 className="size-4" />
            </button>

            {/* Sync Refresh */}
            <button
              type="button"
              onClick={() => syncNow()}
              disabled={syncStatus === "syncing"}
              title="רענן הזמנות מגיליון"
              className="size-10 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition-all flex items-center justify-center active:scale-95 shadow-sm"
            >
              <RefreshCw
                className={cn("size-4", syncStatus === "syncing" && "animate-spin text-sky-500")}
              />
            </button>

            {/* Traffic & Waze Live Map */}
            {onOpenTraffic && (
              <button
                type="button"
                onClick={onOpenTraffic}
                title="מפת פקקים חיה ו-Waze למשאיות סבן"
                className="size-10 rounded-xl bg-card border border-sky-500/40 text-sky-500 hover:bg-sky-500/10 transition-all flex items-center justify-center relative active:scale-95 shadow-sm"
              >
                <Compass className="size-4 text-sky-500" />
                <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 animate-ping" />
              </button>
            )}

            {/* Switch to TV Dashboard */}
            {onSwitchToTv && (
              <button
                type="button"
                onClick={onSwitchToTv}
                className="h-10 px-2.5 rounded-xl bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
              >
                <Tv className="size-4" />
                <span className="hidden sm:inline">לוח שידור</span> TV
              </button>
            )}
          </div>
        </div>

        {/* Picker Persona Selector */}
        <div className="max-w-2xl mx-auto mt-2.5">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/60 rounded-2xl border border-border text-xs font-bold">
            <button
              type="button"
              onClick={() => handleProfileChange("oren")}
              className={cn(
                "py-2 px-2 rounded-xl transition-all flex flex-col items-center gap-0.5",
                selectedProfile === "oren"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/60",
              )}
            >
              <span>👷 אורן</span>
              <span className="text-[10px] opacity-90">סניף 4 החורש</span>
            </button>

            <button
              type="button"
              onClick={() => handleProfileChange("tamir")}
              className={cn(
                "py-2 px-2 rounded-xl transition-all flex flex-col items-center gap-0.5",
                selectedProfile === "tamir"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/60",
              )}
            >
              <span>👷 תמיר</span>
              <span className="text-[10px] opacity-90">סניף 1 התלמיד</span>
            </button>

            <button
              type="button"
              onClick={() => handleProfileChange("all")}
              className={cn(
                "py-2 px-2 rounded-xl transition-all flex flex-col items-center gap-0.5",
                selectedProfile === "all"
                  ? "bg-primary text-primary-foreground font-black shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/60",
              )}
            >
              <span>🌐 כל המחסנים</span>
              <span className="text-[10px] opacity-90">מנהל / סדרן</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-2xl mx-auto px-3.5 pt-3.5 space-y-3.5">
        {/* PWA Install Banner */}
        {isInstallable && showInstallBanner && (
          <div className="bg-card border border-border/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                <Smartphone className="size-5" />
              </div>
              <div className="truncate">
                <h4 className="text-sm font-bold text-foreground truncate">התקן את אפליקציית הליקוט</h4>
                <p className="text-xs text-muted-foreground truncate">
                  {isIOS
                    ? "באייפון: לחץ על 'שיתוף' ובחר 'הוסף למסך הבית'"
                    : "גישה מיידית בהקשה אחת וצלילי התראה במחסן"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isIOS && (
                <button
                  type="button"
                  onClick={() => promptInstall()}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold shadow-md shadow-primary/20 transition-all active:scale-95"
                >
                  התקן
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowInstallBanner(false)}
                className="text-muted-foreground hover:text-foreground text-xs px-2 py-1"
              >
                סגור
              </button>
            </div>
          </div>
        )}

        {/* Search & Quick Filter Tabs */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="size-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="חפש לפי לקוח, עיר, מספר הזמנה או מוצר..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border rounded-xl py-2.5 pr-10 pl-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-inner"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={cn(
                "px-3 py-2 rounded-xl border transition-all flex items-center gap-1.5 shrink-0 shadow-sm",
                statusFilter === "active"
                  ? "bg-amber-500/20 border-amber-500/50 text-amber-500 font-black"
                  : "bg-card border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Clock className="size-3.5 text-amber-500" />
              <span>פעיל לליקוט</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/25 text-[10px] text-amber-600 dark:text-amber-300">
                {tabCounts.active}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("ready")}
              className={cn(
                "px-3 py-2 rounded-xl border transition-all flex items-center gap-1.5 shrink-0 shadow-sm",
                statusFilter === "ready"
                  ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-500 font-black"
                  : "bg-card border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <Truck className="size-3.5 text-indigo-500" />
              <span>מוכן ברציף / בהעמסה</span>
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/25 text-[10px] text-indigo-600 dark:text-indigo-300">
                {tabCounts.ready}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={cn(
                "px-3 py-2 rounded-xl border transition-all flex items-center gap-1.5 shrink-0 shadow-sm",
                statusFilter === "completed"
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-500 font-black"
                  : "bg-card border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <CheckCircle2 className="size-3.5 text-emerald-500" />
              <span>הושלם</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/25 text-[10px] text-emerald-600 dark:text-emerald-300">
                {tabCounts.completed}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-3 py-2 rounded-xl border transition-all flex items-center gap-1.5 shrink-0 shadow-sm",
                statusFilter === "all"
                  ? "bg-primary/20 border-primary/50 text-primary font-black"
                  : "bg-card border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <span>הכל</span>
              <span className="px-1.5 py-0.2 rounded-full bg-secondary text-[10px] text-muted-foreground">
                {tabCounts.all}
              </span>
            </button>
          </div>
        </div>

        {/* Live inventory and SLA summary */}
        <LiveKpiBanner orders={filteredOrders} />

        {/* Inventory Demand & 1-Click WhatsApp Reorder to Netanel */}
        <InventoryDemandCard
          orders={safePublished}
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
          <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3 shadow-sm">
            <div className="size-14 rounded-2xl bg-secondary/60 mx-auto flex items-center justify-center text-muted-foreground">
              <PackageCheck className="size-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">אין הזמנות התואמות את הסינון</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              כל ההזמנות לוקטו או שלא הוגדרו הזמנות חדשות עבור מחסן זה כעת.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
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
          <div className="bg-card border border-border rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-sky-500/15 text-sky-500 flex items-center justify-center">
                  <Share2 className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-foreground">קישורי גישה ישירים למסופים</h3>
                  <p className="text-xs text-muted-foreground">שלח לינק ייעודי ישירות למחסנאי בטלפון</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Oren Card */}
              <div className="p-3 bg-secondary/30 rounded-xl border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👷</span>
                    <div>
                      <h4 className="text-sm font-bold text-amber-500">אורן · סניף 4 החורש</h4>
                      <span className="text-[11px] text-muted-foreground">מסוף ליקוט ייעודי לסניף 4</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20">
                    סניף 4
                  </span>
                </div>

                <div className="bg-background px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-mono text-foreground break-all select-all">
                  {getFullPickerUrl("oren")}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(getFullPickerUrl("oren"), "oren")}
                    className="flex-1 py-2.5 bg-card hover:bg-secondary text-foreground rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-border shadow-sm active:scale-95"
                  >
                    {copiedKey === "oren" ? (
                      <>
                        <Check className="size-3.5 text-emerald-500" />
                        <span className="text-emerald-500">הועתק ללוח!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5 text-muted-foreground" />
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
                    className="py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                  >
                    <MessageCircle className="size-3.5" />
                    <span>שלח בוואטסאפ</span>
                  </a>
                </div>
              </div>

              {/* Tamir Card */}
              <div className="p-3 bg-secondary/30 rounded-xl border border-sky-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👷</span>
                    <div>
                      <h4 className="text-sm font-bold text-sky-500">תמיר · סניף 1 התלמיד</h4>
                      <span className="text-[11px] text-muted-foreground">מסוף ליקוט ייעודי לסניף 1</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-bold border border-sky-500/20">
                    סניף 1
                  </span>
                </div>

                <div className="bg-background px-2.5 py-1.5 rounded-lg border border-border text-[11px] font-mono text-foreground break-all select-all">
                  {getFullPickerUrl("tamir")}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(getFullPickerUrl("tamir"), "tamir")}
                    className="flex-1 py-2.5 bg-card hover:bg-secondary text-foreground rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-border shadow-sm active:scale-95"
                  >
                    {copiedKey === "tamir" ? (
                      <>
                        <Check className="size-3.5 text-emerald-500" />
                        <span className="text-emerald-500">הועתק ללוח!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5 text-muted-foreground" />
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
                    className="py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                  >
                    <MessageCircle className="size-3.5" />
                    <span>שלח בוואטסאפ</span>
                  </a>
                </div>
              </div>

              {/* TV Screen Link */}
              <div className="p-3 bg-card rounded-xl border border-border flex items-center justify-between gap-2 shadow-sm">
                <div className="truncate">
                  <h4 className="text-xs font-bold text-foreground">📺 לוח שידור TV מרכזי</h4>
                  <p className="text-[10px] font-mono text-muted-foreground truncate max-w-[200px]">
                    {getFullPickerUrl("tv")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(getFullPickerUrl("tv"), "tv")}
                  className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg text-xs font-bold border border-border flex items-center gap-1 shrink-0"
                >
                  {copiedKey === "tv" ? (
                    <Check className="size-3 text-emerald-500" />
                  ) : (
                    <Copy className="size-3" />
                  )}
                  <span>{copiedKey === "tv" ? "הועתק" : "העתק"}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl active:scale-95 transition-all shadow-md"
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
  const PICKING_SLA_SECONDS = 20 * 60;
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
  const [hasAlertedOverrun, setHasAlertedOverrun] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setCurrentTimeMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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

  const { remainingSeconds, isOverrun } = useMemo(() => {
    if (order.status !== "בהכנה" || !pickingStartedAt) {
      return { remainingSeconds: PICKING_SLA_SECONDS, isOverrun: false };
    }
    const elapsed = Math.floor((currentTimeMs - pickingStartedAt) / 1000);
    const remain = PICKING_SLA_SECONDS - elapsed;
    return {
      remainingSeconds: remain,
      isOverrun: remain <= 0,
    };
  }, [order.status, pickingStartedAt, currentTimeMs, PICKING_SLA_SECONDS]);

  useEffect(() => {
    if (order.status === "בהכנה" && isOverrun && !hasAlertedOverrun) {
      setHasAlertedOverrun(true);
      onReportOverrun(order.orderId);
    }
  }, [order.status, isOverrun, hasAlertedOverrun, order.orderId, onReportOverrun]);

  const approvedCount = (order.items || []).filter((i) => i?.isApproved).length;
  const totalItems = (order.items || []).length;
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
        "rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm",
        isOverrun && order.status === "בהכנה"
          ? "bg-rose-950/20 border-rose-500 animate-pulse ring-2 ring-rose-500/50"
          : order.status === "בהכנה"
            ? "bg-card border-amber-500/40 ring-1 ring-amber-500/20"
            : order.status === "מוכן להעמסה"
              ? "bg-card border-indigo-500/40 ring-1 ring-indigo-500/20"
              : order.status === "סופק"
                ? "bg-card/70 border-border opacity-85"
                : "bg-card border-border hover:border-primary/50",
      )}
    >
      {/* Overrun Warning Header */}
      {isOverrun && order.status === "בהכנה" && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs font-black flex items-center justify-between animate-bounce">
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
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-secondary text-foreground border border-border">
                #{order.orderId}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Warehouse className="size-3.5 text-amber-500" />
                {order.warehouse || "מחסן מרכזי"}
              </span>
            </div>
            <h3 className="text-base font-black text-foreground mt-1 leading-snug truncate">
              {order.customerName}
            </h3>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <StatusBadge status={order.status} size="sm" />
            <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              <Clock className="size-3.5" />
              <span>שעת יעד: {order.targetTime}</span>
            </div>
          </div>
        </div>

        {/* Destination & Driver */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="size-3.5 text-primary shrink-0" />
            <span className="truncate">{order.address ? `${order.address}, ${order.city}` : order.city}</span>
          </div>
          <div className="flex items-center gap-1.5 text-foreground font-medium shrink-0">
            <Truck className="size-3.5 text-muted-foreground" />
            <span>{order.driver || "טרם שובץ נהג"}</span>
          </div>
        </div>

        {/* Logistics Metrics Pills */}
        <div className="grid grid-cols-3 gap-2 py-1 bg-secondary/40 rounded-xl p-2.5 border border-border text-center">
          <div>
            <span className="block text-[10px] text-muted-foreground font-bold">שקי בלה</span>
            <span className="text-sm font-black text-primary">
              {order.logisticsMetrics?.bellaBags || 0}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-muted-foreground font-bold">משטחי סבן</span>
            <span className="text-sm font-black text-amber-500">
              {order.logisticsMetrics?.sabanPallets || 0}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-muted-foreground font-bold">משקל משוער</span>
            <span className="text-sm font-black text-foreground">
              {(order.logisticsMetrics?.estimatedWeightKg || 0) >= 1000
                ? `${((order.logisticsMetrics?.estimatedWeightKg || 0) / 1000).toFixed(1)} טון`
                : `${order.logisticsMetrics?.estimatedWeightKg || 0} ק״ג`}
            </span>
          </div>
        </div>

        {/* Live SLA Countdown Timer Bar */}
        {order.status === "בהכנה" && (
          <div
            className={cn(
              "rounded-xl p-3 border flex items-center justify-between gap-3 shadow-inner",
              isOverrun
                ? "bg-rose-950/30 border-rose-500/60 text-rose-300"
                : remainingSeconds <= 300
                  ? "bg-amber-950/20 border-amber-500/50 text-amber-500"
                  : "bg-sky-950/20 border-sky-500/40 text-sky-500",
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
                <span className="text-xs font-bold block text-foreground">
                  {isOverrun ? "חריגה מ-20 דקות ליקוט!" : "זמן נותר לליקוט (SLA 20 דק'):"}
                </span>
                <span className="text-[11px] text-muted-foreground">
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

            <div className="text-left font-mono font-black text-xl tracking-tight text-foreground">
              {isOverrun ? `-${formatTimer(remainingSeconds)}` : formatTimer(remainingSeconds)}
            </div>
          </div>
        )}

        {/* Ready on dock badge */}
        {order.status === "מוכן להעמסה" && (
          <div className="rounded-xl p-3 bg-indigo-950/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center">
                <CheckCircle2 className="size-4" />
              </div>
              <div>
                <span className="text-xs font-bold block text-foreground">הליקוט הושלם · מוכן להעמסה ברציף</span>
                <span className="text-[11px] text-muted-foreground">
                  המשאית והסדרן קיבלו התראה לטעינה (SLA העמסה 15 דק')
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Item Checklist Header */}
        <div className="pt-2 border-t border-border">
          <button
            type="button"
            onClick={onToggleExpand}
            className="w-full flex items-center justify-between text-xs text-foreground font-bold hover:text-primary py-1 focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <span>רשימת מק"טים לליקוט</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-[11px]",
                  allItemsChecked
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                {approvedCount} מתוך {totalItems} פריטים
              </span>
            </div>
            {isExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </button>

          {/* Interactive Checklist List */}
          {isExpanded && (
            <div className="mt-2.5 space-y-1.5 bg-secondary/30 rounded-xl p-2.5 border border-border">
              <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-border text-[11px] text-muted-foreground">
                <span>לחץ על פריט כדי לאשר ליקוט</span>
                <button
                  type="button"
                  onClick={() => onApproveAll(order.orderId)}
                  className="text-primary hover:underline font-bold"
                >
                  סמן הכל כאושר
                </button>
              </div>

              {(order.items || []).map((item) => (
                <div
                  key={item.sku}
                  onClick={() => onToggleItem(order.orderId, item.sku)}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all select-none text-xs border active:scale-[0.99]",
                    item.isApproved
                      ? "bg-emerald-500/10 border-emerald-500/30 text-muted-foreground"
                      : "bg-card border-border text-foreground shadow-sm hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.isApproved ? (
                      <CheckSquare className="size-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Square className="size-4 text-muted-foreground shrink-0" />
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
                    <span className="font-mono font-bold text-amber-500">
                      {item.quantity} {item.unit || "יח'"}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">#{item.sku}</span>
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
              type="button"
              onClick={() => onStartPicking(order.orderId, activePicker)}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm rounded-xl shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <PackageCheck className="size-5" />
              <span>קיבלתי - התחל ליקוט (SLA 20 דק')</span>
            </button>
          )}

          {order.status === "בהכנה" && (
            <button
              type="button"
              onClick={() => onFinishPicking(order.orderId)}
              className="w-full h-12 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-black text-sm rounded-xl shadow-md shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="size-5" />
              <span>סיימתי ליקוט - מוכן להעמסה ברציף</span>
            </button>
          )}

          {order.status === "מוכן להעמסה" && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateStatus(order.orderId, "בהעמסה")}
                className="h-11 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
              >
                <Truck className="size-4" />
                <span>העברה לסטטוס בהעמסה</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateStatus(order.orderId, "יצא לדרך")}
                className="h-11 bg-sky-600 hover:bg-sky-500 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
              >
                <Send className="size-4" />
                <span>יצא לדרך עם הנהג</span>
              </button>
            </div>
          )}

          {order.status === "בהעמסה" && (
            <button
              type="button"
              onClick={() => onUpdateStatus(order.orderId, "יצא לדרך")}
              className="w-full h-12 bg-sky-600 hover:bg-sky-500 text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <Truck className="size-4" />
              <span>אישור העמסה מלאה ויציאה לדרך</span>
            </button>
          )}

          {order.status === "יצא לדרך" && (
            <button
              type="button"
              onClick={() => onUpdateStatus(order.orderId, "סופק")}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
            >
              <CheckCircle2 className="size-4" />
              <span>סמן כסופק ללקוח</span>
            </button>
          )}

          {/* Direct Manual Status Selector */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-border text-[11px] text-muted-foreground">
            <span className="font-bold flex items-center gap-1 text-foreground">
              <span>שינוי סטטוס ישיר:</span>
            </span>
            <select
              value={order.status}
              onChange={(e) => onUpdateStatus(order.orderId, e.target.value as OrderStatus)}
              className="bg-card text-foreground border border-border hover:border-primary/50 rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-primary cursor-pointer shadow-sm"
            >
              <option value="ממתין">ממתין</option>
              <option value="בהכנה">בהכנה (ליקוט פעיל)</option>
              <option value="מוכן להעמסה">מוכן להעמסה</option>
              <option value="בהעמסה">בהעמסה</option>
              <option value="יצא לדרך">יצא לדרך</option>
              <option value="סופק">סופק</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
