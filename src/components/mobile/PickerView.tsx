import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  RefreshCw,
  Tv,
  CheckSquare,
  Square,
  Truck,
  MapPin,
  Flame,
  ChevronDown,
  ChevronUp,
  Send,
  Timer,
  Share2,
  Copy,
  Check,
  MessageCircle,
  X,
  TrendingUp,
  Sun,
  Moon,
  Compass,
  Boxes,
  Layers,
  Plus,
  Minus,
  Bell,
} from "lucide-react";
import { useDispatchBoard } from "@/context/DispatchContext";
import type { Order, OrderStatus } from "@/types/dispatch";
import { StatusBadge } from "@/components/ui/status-badge";
import { InventoryDemandCard } from "./InventoryDemandCard";
import {
  isAudioMuted,
  toggleAudioMute,
  subscribeSoundMute,
} from "@/utils/soundEffects";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

export type PickerProfile = "oren" | "tamir" | "all";
type MobileTab = "picking" | "ready" | "inventory" | "truck_builder";

interface PickerViewProps {
  onSwitchToTv?: () => void;
  onOpenTraffic?: () => void;
}

const BEIT_HATIT_PHONE = "972500000000";

interface TruckDraft {
  sandBags: number;
  sumsumBags: number;
  titBags: number;
  sandSmallPallets: number;
  sumsumSmallPallets: number;
}

function LiveKpiBanner({ orders = [] }: { orders: Order[] }) {
  const [isOpen, setIsOpen] = useState(true);
  const bales = orders.reduce((sum, order) => sum + (order?.logisticsMetrics?.bellaBags || 0), 0);
  const pallets = orders.reduce((sum, order) => sum + (order?.logisticsMetrics?.sabanPallets || 0), 0);
  const active = orders.filter(
    (order) => order?.status === "ממתין" || order?.status === "בהכנה",
  ).length;
  const loadReady = orders.filter(
    (order) => order?.status === "מוכן להעמסה" || order?.status === "בהעמסה",
  ).length;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-sky-500/30 bg-sky-950/20 shadow-sm transition-all"
      aria-label="מדדי מחסן חיים"
    >
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-3.5 py-2 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        <span className="flex items-center gap-2 text-xs font-black text-sky-400">
          <TrendingUp className="size-4" aria-hidden="true" /> מדדי משמרת חיים
        </span>
        <span className="text-[11px] font-bold text-sky-400/80">{isOpen ? "צמצום" : "הצגה"}</span>
      </button>
      {isOpen && (
        <div className="grid grid-cols-2 gap-2 border-t border-sky-500/20 p-2.5 sm:grid-cols-4 bg-card/40">
          <div className="rounded-xl bg-background/80 p-2 border border-border/50 text-center">
            <div className="text-lg font-black tabular-nums text-foreground">{bales}</div>
            <div className="text-[10px] font-bold text-muted-foreground">בלות · 60002</div>
          </div>
          <div className="rounded-xl bg-background/80 p-2 border border-border/50 text-center">
            <div className="text-lg font-black tabular-nums text-foreground">{pallets}</div>
            <div className="text-[10px] font-bold text-muted-foreground">משטחים · 60060</div>
          </div>
          <div
            className={cn(
              "rounded-xl p-2 border border-border/50 text-center transition-colors",
              active > 0 ? "bg-amber-500/15 border-amber-500/30" : "bg-background/80"
            )}
          >
            <div className="text-lg font-black tabular-nums text-foreground">
              {active ? "20 דק׳" : "—"}
            </div>
            <div className="text-[10px] font-bold text-muted-foreground">SLA ליקוט</div>
          </div>
          <div
            className={cn(
              "rounded-xl p-2 border border-border/50 text-center transition-colors",
              loadReady > 0 ? "bg-rose-500/15 border-rose-500/30" : "bg-background/80"
            )}
          >
            <div className="text-lg font-black tabular-nums text-foreground">
              {loadReady ? "15 דק׳" : "—"}
            </div>
            <div className="text-[10px] font-bold text-muted-foreground">SLA העמסה</div>
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
  const [activeTab, setActiveTab] = useState<MobileTab>("picking");
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
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});

  const [truckDraft, setTruckDraft] = useState<TruckDraft>({
    sandBags: 0,
    sumsumBags: 0,
    titBags: 0,
    sandSmallPallets: 0,
    sumsumSmallPallets: 0,
  });

  const [activeAlert, setActiveAlert] = useState<{
    orderId: string;
    client: string;
    sumsumCount: number;
  } | null>(null);

  const [isMuted, setIsMuted] = useState(false);

  const { isInstallable, promptInstall, isIOS } = usePwaInstall();
  const [showInstallBanner, setShowInstallBanner] = useState(true);

  useEffect(() => {
    try {
      setIsMuted(isAudioMuted());
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

  useEffect(() => {
    safePublished.forEach((order) => {
      if (!order) return;
      if (selectedProfile !== "all" && !warehouseMatchesProfile(order.warehouse, selectedProfile))
        return;

      const rawSummary = (order.items || []).map((i) => i.name).join(" ") + " " + (order.customerName || "");
      const match = rawSummary.match(/([0-9]+)\s*(?:בלות|בלה|שק גדול)?\s*סומסום/);
      if (match) {
        const count = parseInt(match[1], 10);
        if (count >= 10 && (!activeAlert || activeAlert.orderId !== order.orderId)) {
          setActiveAlert({
            orderId: order.orderId,
            client: order.customerName || "לקוח",
            sumsumCount: count,
          });
        }
      }
    });
  }, [safePublished, selectedProfile, activeAlert]);

  const filteredOrders = useMemo(() => {
    return safePublished.filter((order) => {
      if (!order) return false;
      if (selectedProfile !== "all" && !warehouseMatchesProfile(order.warehouse, selectedProfile))
        return false;

      if (activeTab === "picking") {
        if (order.status === "סופק" || order.status === "יצא לדרך" || order.status === "מוכן להעמסה" || order.status === "בהעמסה") return false;
      } else if (activeTab === "ready") {
        if (order.status !== "מוכן להעמסה" && order.status !== "בהעמסה") return false;
      }

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
  }, [safePublished, selectedProfile, activeTab, searchQuery]);

  const tabCounts = useMemo(() => {
    let active = 0;
    let ready = 0;
    safePublished.forEach((o) => {
      if (!o) return;
      if (selectedProfile !== "all" && !warehouseMatchesProfile(o.warehouse, selectedProfile))
        return;
      if (o.status === "ממתין" || o.status === "בהכנה") active++;
      else if (o.status === "מוכן להעמסה" || o.status === "בהעמסה") ready++;
    });
    return { active, ready };
  }, [safePublished, selectedProfile]);

  const totalDraftBags = truckDraft.sandBags + truckDraft.sumsumBags + truckDraft.titBags;
  const totalSmallPallets = truckDraft.sandSmallPallets + truckDraft.sumsumSmallPallets;
  const isFullTruck = totalDraftBags >= 30;

  const sendBeitHatitWhatsApp = () => {
    const text = [
      `*הזמנת אספקה — ח.סבן (מחסן 4 החרש)*`,
      `איש קשר לפריקה במגרש: אורן / תמיר`,
      ``,
      `*פירוט משאית נדרשת:*`,
      truckDraft.sandBags > 0 ? `• ${truckDraft.sandBags} בלות חול שק גדול` : null,
      truckDraft.sumsumBags > 0 ? `• ${truckDraft.sumsumBags} בלות סומסום שק גדול` : null,
      truckDraft.titBags > 0 ? `• ${truckDraft.titBags} בלות טיט שק גדול` : null,
      truckDraft.sandSmallPallets > 0 ? `• ${truckDraft.sandSmallPallets} משטחי שקיות חול (70 שקיות למשטח)` : null,
      truckDraft.sumsumSmallPallets > 0 ? `• ${truckDraft.sumsumSmallPallets} משטחי שקיות סומסום (70 שקיות למשטח)` : null,
      ``,
      `*סך הכל בלות:* ${totalDraftBags} / 30`,
      `*סך הכל משטחים:* ${totalSmallPallets}`,
      `נא לאשר מועד אספקה למגרש.`,
    ]
      .filter(Boolean)
      .join("\n");

    const url = `https://wa.me/${BEIT_HATIT_PHONE}?text=${encodeURIComponent(text)}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  };

  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden bg-background text-foreground font-sans pb-28 selection:bg-amber-500 selection:text-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border px-3.5 pt-2.5 pb-2 shadow-sm">
        <div className="flex items-center justify-between gap-2 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            <div className="size-10 rounded-xl bg-gradient-to-tr from-sky-600 to-amber-500 p-0.5 shadow-sm shrink-0">
              <div className="w-full h-full bg-card rounded-[10px] flex items-center justify-center">
                <PackageCheck className="size-5 text-amber-500" />
              </div>
            </div>
            <div className="truncate">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-foreground leading-tight truncate">
                ח. סבן · מסוף ליקוט
              </h1>
              <p className="text-[10px] text-muted-foreground font-medium">סנכרון רצפת מגרש חי</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 px-2.5 items-center gap-1.5 rounded-xl border border-border bg-card text-foreground transition active:scale-95 shadow-sm hover:bg-secondary font-black text-xs"
              title={theme === "dark" ? "עבור למצב יום" : "עבור למצב לילה"}
            >
              {theme === "dark" ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-700" />}
              <span>{theme === "dark" ? "יום" : "לילה"}</span>
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
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500",
              )}
            >
              {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>

            {/* Refresh */}
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

            {/* Waze / Traffic */}
            {onOpenTraffic && (
              <button
                type="button"
                onClick={onOpenTraffic}
                title="מפת פקקים חיה"
                className="size-10 rounded-xl bg-card border border-sky-500/40 text-sky-500 hover:bg-sky-500/10 transition-all flex items-center justify-center relative active:scale-95 shadow-sm"
              >
                <Compass className="size-4 text-sky-500" />
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 animate-ping" />
              </button>
            )}

            {/* Switch to TV Dashboard */}
            {onSwitchToTv && (
              <button
                type="button"
                onClick={onSwitchToTv}
                className="h-10 px-2 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-bold flex items-center gap-1 active:scale-95 shadow-sm"
              >
                <Tv className="size-4" />
                <span>TV</span>
              </button>
            )}
          </div>
        </div>

        {/* Ticker */}
        <div className="max-w-2xl mx-auto mt-2 flex items-center gap-2 overflow-hidden rounded-xl border border-primary/20 bg-primary/10 px-2.5 py-1 shadow-inner">
          <div className="flex items-center gap-1 text-[10px] font-black text-primary shrink-0 border-l border-primary/20 pl-2">
            <Bell className="size-3 animate-bounce" />
            <span>עדכון</span>
          </div>

          <div className="relative flex-1 overflow-hidden h-3.5">
            <motion.div
              className="absolute whitespace-nowrap text-[10px] font-bold text-foreground flex gap-8"
              animate={{ x: [250, -600] }}
              transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
            >
              <span>🚚 חכמת (מרצדס מנוף): עד 12T / 18 בלות | בלוק 1.5T עם פקדון</span>
              <span>🚛 עלי (איסוזו פלטה): עד 5.5T | ללא פקדונות משטחים</span>
              <span>📦 ספק בית הטיט: משאיות של עד 30 בלות | שקיות במשטח: 70 יח'</span>
            </motion.div>
          </div>
        </div>

        {/* Persona Selector */}
        <div className="max-w-2xl mx-auto mt-2">
          <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-2xl border border-border text-xs font-bold">
            <button
              type="button"
              onClick={() => handleProfileChange("oren")}
              className={cn(
                "py-1.5 px-2 rounded-xl transition-all flex flex-col items-center gap-0.5",
                selectedProfile === "oren"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/60",
              )}
            >
              <span>👷 אורן</span>
              <span className="text-[9px] opacity-90">סניף 4 החרש</span>
            </button>

            <button
              type="button"
              onClick={() => handleProfileChange("tamir")}
              className={cn(
                "py-1.5 px-2 rounded-xl transition-all flex flex-col items-center gap-0.5",
                selectedProfile === "tamir"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/60",
              )}
            >
              <span>👷 תמיר</span>
              <span className="text-[9px] opacity-90">סניף 1 התלמיד</span>
            </button>

            <button
              type="button"
              onClick={() => handleProfileChange("all")}
              className={cn(
                "py-1.5 px-2 rounded-xl transition-all flex flex-col items-center gap-0.5",
                selectedProfile === "all"
                  ? "bg-primary text-primary-foreground font-black shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/60",
              )}
            >
              <span>🌐 כל המחסנים</span>
              <span className="text-[9px] opacity-90">מנהל / סדרן</span>
            </button>
          </div>
        </div>
      </header>

      {/* Popup 10 בלות סומסום */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-20 inset-x-4 z-50 rounded-3xl border-2 border-rose-500 bg-rose-950/95 p-4 text-white shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="size-6 text-rose-400 animate-bounce shrink-0" />
                <div>
                  <h3 className="text-sm font-black text-rose-200 leading-snug">
                    התראת עומס משיכה — 10 בלות סומסום!
                  </h3>
                  <p className="text-[11px] font-semibold text-white/90 mt-0.5">
                    הזמנה #{activeAlert.orderId} עבור {activeAlert.client} כוללת {activeAlert.sumsumCount} בלות סומסום.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveAlert(null)}
                className="grid size-7 place-items-center rounded-lg bg-white/10 text-white/80"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-rose-500/40">
              <button
                onClick={() => {
                  setTruckDraft((prev) => ({ ...prev, sumsumBags: prev.sumsumBags + activeAlert.sumsumCount }));
                  setActiveAlert(null);
                  setActiveTab("truck_builder");
                }}
                className="flex-1 h-9 rounded-xl bg-white text-slate-950 font-black text-xs shadow-md active:scale-95"
              >
                הוסף {activeAlert.sumsumCount} בלות למשאית בית הטיט
              </button>
              <button
                onClick={() => setActiveAlert(null)}
                className="h-9 px-3 rounded-xl bg-white/15 text-white font-bold text-xs"
              >
                סגור
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-3.5 pt-3 space-y-3.5">
        {isInstallable && showInstallBanner && (
          <div className="bg-card border border-border/80 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                <Smartphone className="size-4" />
              </div>
              <div className="truncate">
                <h4 className="text-xs font-bold text-foreground truncate">התקן את אפליקציית הליקוט</h4>
                <p className="text-[10px] text-muted-foreground truncate">
                  {isIOS ? "באייפון: לחץ שיתוף > 'הוסף למסך הבית'" : "גישה מהירה וצלילי התראה ישירות במסך הבית"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!isIOS && (
                <button
                  type="button"
                  onClick={() => promptInstall()}
                  className="px-3 py-1 bg-primary text-primary-foreground rounded-xl text-xs font-bold active:scale-95"
                >
                  התקן
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowInstallBanner(false)}
                className="text-muted-foreground text-xs px-1"
              >
                סגור
              </button>
            </div>
          </div>
        )}

        {activeTab === "truck_builder" ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-sm font-black flex items-center gap-1.5">
                  <Truck className="size-4 text-primary" />
                  <span>הרכבת משאית לספק בית הטיט</span>
                </h3>
                <span className="text-[11px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                  עד 30 בלות למשאית
                </span>
              </div>

              <div className="mt-2">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-muted-foreground">תפוסת בלות:</span>
                  <span className={cn("font-black", isFullTruck ? "text-emerald-500" : "text-amber-500")}>
                    {totalDraftBags} / 30 בלות ({Math.round((totalDraftBags / 30) * 100)}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden p-0.5">
                  <motion.div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isFullTruck ? "bg-emerald-500" : "bg-primary"
                    )}
                    style={{ width: `${Math.min(100, (totalDraftBags / 30) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-border bg-card p-2.5 text-center flex flex-col justify-between">
                <span className="text-xs font-bold text-muted-foreground">בלות חול</span>
                <span className="text-xl font-black text-foreground my-1">{truckDraft.sandBags}</span>
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => setTruckDraft((p) => ({ ...p, sandBags: Math.max(0, p.sandBags - 1) }))}
                    className="size-7 rounded-lg bg-secondary grid place-items-center"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setTruckDraft((p) => ({ ...p, sandBags: p.sandBags + 1 }))}
                    className="size-7 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-2.5 text-center flex flex-col justify-between">
                <span className="text-xs font-bold text-muted-foreground">בלות סומסום</span>
                <span className="text-xl font-black text-foreground my-1">{truckDraft.sumsumBags}</span>
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => setTruckDraft((p) => ({ ...p, sumsumBags: Math.max(0, p.sumsumBags - 1) }))}
                    className="size-7 rounded-lg bg-secondary grid place-items-center"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setTruckDraft((p) => ({ ...p, sumsumBags: p.sumsumBags + 1 }))}
                    className="size-7 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-2.5 text-center flex flex-col justify-between">
                <span className="text-xs font-bold text-muted-foreground">בלות טיט</span>
                <span className="text-xl font-black text-foreground my-1">{truckDraft.titBags}</span>
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => setTruckDraft((p) => ({ ...p, titBags: Math.max(0, p.titBags - 1) }))}
                    className="size-7 rounded-lg bg-secondary grid place-items-center"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <button
                    onClick={() => setTruckDraft((p) => ({ ...p, titBags: p.titBags + 1 }))}
                    className="size-7 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
              <span className="text-xs font-black text-muted-foreground block mb-2">
                משטחי שקיות (אריזת יצרן בית הטיט: 70 שקיות למשטח):
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/40 border border-border/60">
                  <div>
                    <span className="text-xs font-bold block">משטח שק חול</span>
                    <span className="text-[9px] text-muted-foreground">70 יח' במשטח</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setTruckDraft((p) => ({ ...p, sandSmallPallets: Math.max(0, p.sandSmallPallets - 1) }))}
                      className="size-6 rounded-md bg-secondary grid place-items-center"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="font-black text-xs">{truckDraft.sandSmallPallets}</span>
                    <button
                      onClick={() => setTruckDraft((p) => ({ ...p, sandSmallPallets: p.sandSmallPallets + 1 }))}
                      className="size-6 rounded-md bg-primary text-primary-foreground grid place-items-center"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/40 border border-border/60">
                  <div>
                    <span className="text-xs font-bold block">משטח שק סומסום</span>
                    <span className="text-[9px] text-muted-foreground">70 יח' במשטח</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setTruckDraft((p) => ({ ...p, sumsumSmallPallets: Math.max(0, p.sumsumSmallPallets - 1) }))}
                      className="size-6 rounded-md bg-secondary grid place-items-center"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="font-black text-xs">{truckDraft.sumsumSmallPallets}</span>
                    <button
                      onClick={() => setTruckDraft((p) => ({ ...p, sumsumSmallPallets: p.sumsumSmallPallets + 1 }))}
                      className="size-6 rounded-md bg-primary text-primary-foreground grid place-items-center"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={sendBeitHatitWhatsApp}
              disabled={totalDraftBags === 0 && totalSmallPallets === 0}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition disabled:opacity-50"
            >
              <Share2 className="size-4" />
              <span>סגור משאית ושלח לוואטסאפ בית הטיט</span>
            </button>
          </div>
        ) : activeTab === "inventory" ? (
          <div className="space-y-3">
            <LiveKpiBanner orders={safePublished} />
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
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="size-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="חפש לפי לקוח, עיר, מספר הזמנה או מוצר..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card border border-border rounded-xl py-2 pr-9 pl-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-inner"
              />
            </div>

            {filteredOrders.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-2 shadow-sm">
                <PackageCheck className="size-10 text-muted-foreground mx-auto stroke-1" />
                <h3 className="text-sm font-bold text-foreground">אין הזמנות בשלב זה</h3>
                <p className="text-xs text-muted-foreground">כל ההזמנות לוקטו או שטרם נפתחו הזמנות חדשות.</p>
              </div>
            ) : (
              <div className="space-y-3">
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
          </div>
        )}
      </main>

      {/* Floating Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/80 bg-card/95 backdrop-blur-2xl px-3 py-1.5 shadow-2xl">
        <div className="grid grid-cols-4 gap-1.5 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab("picking")}
            className={cn(
              "flex flex-col items-center justify-center h-12 rounded-xl transition-all duration-200 relative",
              activeTab === "picking"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <div className="relative">
              <Clock className="size-4" />
              {tabCounts.active > 0 && (
                <span className="absolute -top-1 -left-2 flex size-3.5 items-center justify-center rounded-full text-[8px] font-black bg-amber-500 text-slate-950">
                  {tabCounts.active}
                </span>
              )}
            </div>
            <span className="text-[10px] font-black mt-0.5">לליקוט</span>
          </button>

          <button
            onClick={() => setActiveTab("ready")}
            className={cn(
              "flex flex-col items-center justify-center h-12 rounded-xl transition-all duration-200 relative",
              activeTab === "ready"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <div className="relative">
              <Truck className="size-4" />
              {tabCounts.ready > 0 && (
                <span className="absolute -top-1 -left-2 flex size-3.5 items-center justify-center rounded-full text-[8px] font-black bg-emerald-500 text-white">
                  {tabCounts.ready}
                </span>
              )}
            </div>
            <span className="text-[10px] font-black mt-0.5">בהעמסה</span>
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            className={cn(
              "flex flex-col items-center justify-center h-12 rounded-xl transition-all duration-200 relative",
              activeTab === "inventory"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <Boxes className="size-4" />
            <span className="text-[10px] font-black mt-0.5">מלאי מגרש</span>
          </button>

          <button
            onClick={() => setActiveTab("truck_builder")}
            className={cn(
              "flex flex-col items-center justify-center h-12 rounded-xl transition-all duration-200 relative border border-amber-500/30",
              activeTab === "truck_builder"
                ? "bg-amber-500 text-slate-950 font-black shadow-md"
                : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
            )}
          >
            <div className="relative">
              <Layers className="size-4" />
              {totalDraftBags > 0 && (
                <span className="absolute -top-1 -left-2 flex size-3.5 items-center justify-center rounded-full text-[8px] font-black bg-rose-500 text-white">
                  {totalDraftBags}
                </span>
              )}
            </div>
            <span className="text-[10px] font-black mt-0.5">בית הטיט</span>
          </button>
        </div>
      </nav>
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
    if (order?.pickingStartedAt) return order.pickingStartedAt;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`saban_picker_start_${order?.orderId}`);
      if (saved) {
        const t = parseInt(saved, 10);
        if (!isNaN(t)) return t;
      }
    }
    return null;
  }, [order?.pickingStartedAt, order?.orderId]);

  const { remainingSeconds, isOverrun } = useMemo(() => {
    if (order?.status !== "בהכנה" || !pickingStartedAt) {
      return { remainingSeconds: PICKING_SLA_SECONDS, isOverrun: false };
    }
    const elapsed = Math.floor((currentTimeMs - pickingStartedAt) / 1000);
    const remain = PICKING_SLA_SECONDS - elapsed;
    return {
      remainingSeconds: remain,
      isOverrun: remain <= 0,
    };
  }, [order?.status, pickingStartedAt, currentTimeMs, PICKING_SLA_SECONDS]);

  useEffect(() => {
    if (order?.status === "בהכנה" && isOverrun && !hasAlertedOverrun) {
      setHasAlertedOverrun(true);
      onReportOverrun(order.orderId);
    }
  }, [order?.status, isOverrun, hasAlertedOverrun, order?.orderId, onReportOverrun]);

  const approvedCount = (order?.items || []).filter((i) => i?.isApproved).length;
  const totalItems = (order?.items || []).length;
  const allItemsChecked = totalItems > 0 && approvedCount === totalItems;

  const formatTimer = (secs: number) => {
    const abs = Math.abs(secs);
    const m = Math.floor(abs / 60);
    const s = abs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isHikmat = (order?.driver || "").includes("חכמת");
  const isAli = (order?.driver || "").includes("עלי");

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-300 overflow-hidden shadow-sm",
        isOverrun && order?.status === "בהכנה"
          ? "bg-rose-950/20 border-rose-500 animate-pulse ring-2 ring-rose-500/50"
          : order?.status === "בהכנה"
            ? "bg-card border-amber-500/40 ring-1 ring-amber-500/20"
            : order?.status === "מוכן להעמסה"
              ? "bg-card border-indigo-500/40 ring-1 ring-indigo-500/20"
              : order?.status === "סופק"
                ? "bg-card/70 border-border opacity-85"
                : "bg-card border-border hover:border-primary/50",
      )}
    >
      {isOverrun && order?.status === "בהכנה" && (
        <div className="bg-rose-600 text-white px-3 py-1.5 text-xs font-black flex items-center justify-between animate-bounce">
          <div className="flex items-center gap-1.5">
            <Flame className="size-4 text-amber-300 fill-amber-300" />
            <span>חריגת ליקוט חמורה! (SLA יעד 20 דק' נחצה)</span>
          </div>
          <span className="font-mono bg-rose-700 px-2 py-0.5 rounded">
            +{formatTimer(remainingSeconds)}
          </span>
        </div>
      )}

      <div className="p-3.5 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-secondary text-foreground border border-border">
                #{order?.orderId}
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Warehouse className="size-3 text-amber-500" />
                {order?.warehouse || "סניף 4 החרש"}
              </span>
            </div>
            <h3 className="text-sm font-black text-foreground mt-1 leading-snug truncate">
              {order?.customerName || "לקוח כללי"}
            </h3>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge status={order?.status} size="sm" />
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              <Clock className="size-3" />
              <span>יעד: {order?.targetTime}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
          <div className="flex items-center gap-1 truncate">
            <MapPin className="size-3 text-primary shrink-0" />
            <span className="truncate">{order?.address ? `${order.address}, ${order.city}` : order?.city}</span>
          </div>
          <div className="flex items-center gap-1 text-foreground font-bold shrink-0">
            <Truck className="size-3 text-muted-foreground" />
            <span>{order?.driver || "טרם שובץ"}</span>
          </div>
        </div>

        <div className="p-2 rounded-xl bg-secondary/40 border border-border text-[11px] font-bold flex items-center justify-between">
          <span className="text-muted-foreground">פרופיל העמסה:</span>
          <span className={cn("font-black", isHikmat ? "text-amber-500" : isAli ? "text-primary" : "text-foreground")}>
            {isHikmat
              ? "חכמת מרצדס מנוף: עד 12T / 18 בלות | בלוק 1.5T עם פקדון"
              : isAli
                ? "עלי איסוזו פלטה: עד 5.5T | ללא פקדונות"
                : "משאית חלוקה רגילה"}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 py-1 bg-secondary/30 rounded-xl p-2 border border-border text-center">
          <div>
            <span className="block text-[9px] text-muted-foreground font-bold">שקי בלה</span>
            <span className="text-xs font-black text-primary">{order?.logisticsMetrics?.bellaBags || 0}</span>
          </div>
          <div>
            <span className="block text-[9px] text-muted-foreground font-bold">משטחי סבן</span>
            <span className="text-xs font-black text-amber-500">{order?.logisticsMetrics?.sabanPallets || 0}</span>
          </div>
          <div>
            <span className="block text-[9px] text-muted-foreground font-bold">משקל משוער</span>
            <span className="text-xs font-black text-foreground">
              {(order?.logisticsMetrics?.estimatedWeightKg || 0) >= 1000
                ? `${((order?.logisticsMetrics?.estimatedWeightKg || 0) / 1000).toFixed(1)}T`
                : `${order?.logisticsMetrics?.estimatedWeightKg || 0} ק״ג`}
            </span>
          </div>
        </div>

        {order?.status === "בהכנה" && (
          <div
            className={cn(
              "rounded-xl p-2.5 border flex items-center justify-between gap-2 shadow-inner",
              isOverrun
                ? "bg-rose-950/30 border-rose-500/60 text-rose-300"
                : "bg-amber-950/20 border-amber-500/50 text-amber-500",
            )}
          >
            <div className="flex items-center gap-2">
              <Timer className="size-4" />
              <span className="text-xs font-bold">
                {isOverrun ? "חריגה מ-20 דקות!" : "זמן נותר לליקוט (SLA 20 דק'):"}
              </span>
            </div>
            <span className="font-mono font-black text-sm">
              {isOverrun ? `-${formatTimer(remainingSeconds)}` : formatTimer(remainingSeconds)}
            </span>
          </div>
        )}

        <div className="pt-1 border-t border-border">
          <button
            type="button"
            onClick={onToggleExpand}
            className="w-full flex items-center justify-between text-xs text-foreground font-bold py-1 focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <span>רשימת מק"טים לליקוט</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-secondary text-muted-foreground">
                {approvedCount} / {totalItems} פריטים
              </span>
            </div>
            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          {isExpanded && (
            <div className="mt-2 space-y-1.5 bg-secondary/30 rounded-xl p-2 border border-border">
              <div className="flex items-center justify-between pb-1 mb-1 border-b border-border text-[10px] text-muted-foreground">
                <span>לחץ על פריט כדי לאשר ליקוט</span>
                <button
                  type="button"
                  onClick={() => onApproveAll(order.orderId)}
                  className="text-primary hover:underline font-bold"
                >
                  סמן הכל כאושר
                </button>
              </div>

              {(order?.items || []).map((item) => (
                <div
                  key={item.sku}
                  onClick={() => onToggleItem(order.orderId, item.sku)}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all select-none text-xs border active:scale-[0.99]",
                    item.isApproved
                      ? "bg-emerald-500/10 border-emerald-500/30 text-muted-foreground"
                      : "bg-card border-border text-foreground shadow-sm",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {item.isApproved ? (
                      <CheckSquare className="size-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Square className="size-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={cn("font-medium leading-tight", item.isApproved && "line-through opacity-70")}>
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono font-bold text-amber-500">
                      {item.quantity} {item.unit || "יח'"}
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground">#{item.sku}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-1.5">
          {order?.status === "ממתין" && (
            <button
              type="button"
              onClick={() => onStartPicking(order.orderId, activePicker)}
              className="w-full h-11 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              <PackageCheck className="size-4" />
              <span>התחל ליקוט במגרש (SLA 20 דק')</span>
            </button>
          )}

          {order?.status === "בהכנה" && (
            <button
              type="button"
              onClick={() => onFinishPicking(order.orderId)}
              className="w-full h-11 bg-gradient-to-r from-indigo-600 to-sky-600 text-white font-black text-xs rounded-xl shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="size-4" />
              <span>הושלם ליקוט - מוכן ברציף להעמסה</span>
            </button>
          )}

          {order?.status === "מוכן להעמסה" && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateStatus(order.orderId, "בהעמסה")}
                className="h-10 bg-amber-500 text-slate-950 font-black text-xs rounded-xl active:scale-95 transition flex items-center justify-center gap-1 shadow-sm"
              >
                <Truck className="size-3.5" />
                <span>בהעמסה</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateStatus(order.orderId, "יצא לדרך")}
                className="h-10 bg-sky-600 text-white font-black text-xs rounded-xl active:scale-95 transition flex items-center justify-center gap-1 shadow-sm"
              >
                <Send className="size-3.5" />
                <span>יצא לדרך</span>
              </button>
            </div>
          )}

          {order?.status === "בהעמסה" && (
            <button
              type="button"
              onClick={() => onUpdateStatus(order.orderId, "יצא לדרך")}
              className="w-full h-11 bg-sky-600 text-white font-black text-xs rounded-xl shadow-md active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              <Truck className="size-4" />
              <span>אישור העמסה מלאה ויציאה לדרך</span>
            </button>
          )}

          {order?.status === "יצא לדרך" && (
            <button
              type="button"
              onClick={() => onUpdateStatus(order.orderId, "סופק")}
              className="w-full h-10 bg-emerald-600 text-white font-bold text-xs rounded-xl active:scale-95 transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="size-4" />
              <span>סמן כסופק</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
