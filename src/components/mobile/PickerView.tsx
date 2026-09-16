import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PackageCheck,
  Truck,
  CheckCircle2,
  Clock,
  Warehouse,
  Search,
  RotateCcw,
  Boxes,
  Sun,
  Moon,
  Bell,
  MapPin,
  User,
  ChevronDown,
  Monitor,
  MonitorOff,
  Menu,
  X,
  Phone,
  CheckSquare,
  Square,
  Layers,
  ArrowRight,
  Package,
} from "lucide-react";
import type { Order } from "@/types/dispatch";
import { InventoryDemandCard } from "./InventoryDemandCard";
import { cn } from "@/lib/utils";

interface PickerViewProps {
  orders: Order[];
  onUpdateStatus?: (orderId: string, newStatus: string) => Promise<void> | void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

type TabType = "picking" | "ready" | "inventory";

interface ParsedItem {
  sku?: string;
  name: string;
  quantity: string;
}

export function PickerView({
  orders = [],
  onUpdateStatus,
  onRefresh,
  isRefreshing = false,
}: PickerViewProps) {
  // ניהול מצב יום/לילה מקומי ובטוח שאינו תלוי בקונטקסט שעלול להתרסק
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return true;
  });

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        if (next) {
          document.documentElement.classList.add("dark");
          localStorage.setItem("theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          localStorage.setItem("theme", "light");
        }
      }
      return next;
    });
  }, []);

  const [activeTab, setActiveTab] = useState<TabType>("picking");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // מנגנון שומר מסך במובייל (Inactivity Idle Timer)
  const [screensaverActive, setScreensaverActive] = useState(false);
  const [screensaverEnabled, setScreensaverEnabled] = useState(true);
  const [screensaverMenuOpen, setScreensaverMenuOpen] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!screensaverEnabled || screensaverActive) return;

    // הפעלה אוטומטית אחרי 60 שניות ללא מגע
    idleTimerRef.current = setTimeout(() => {
      setScreensaverActive(true);
    }, 60000);
  }, [screensaverEnabled, screensaverActive]);

  useEffect(() => {
    const events = ["touchstart", "touchmove", "scroll", "keydown", "click"];
    events.forEach((ev) => window.addEventListener(ev, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach((ev) => window.removeEventListener(ev, resetIdleTimer));
    };
  }, [resetIdleTimer]);

  // סיווג הזמנות פעילות בצורה עמידה ל-undefined
  const pickingOrders = useMemo(() => {
    return (orders || []).filter((o) =>
      ["בסידור עבודה", "בהכנה", "בהמתנה"].some(
        (st) => o?.status?.trim() === st || o?.stage?.trim() === st
      )
    );
  }, [orders]);

  const readyOrders = useMemo(() => {
    return (orders || []).filter((o) =>
      ["מוכן להעמסה", "בהעמסה", "יצא לדרך"].some(
        (st) => o?.status?.trim() === st || o?.stage?.trim() === st
      )
    );
  }, [orders]);

  // סינון רשימה
  const filteredOrders = useMemo(() => {
    const list = activeTab === "picking" ? pickingOrders : readyOrders;
    return list.filter((order) => {
      const matchBranch =
        selectedBranch === "all" ||
        (order?.warehouse && order.warehouse.includes(selectedBranch)) ||
        (order?.branch && order.branch.includes(selectedBranch));

      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchBranch;

      const matchText =
        (order?.client && order.client.toLowerCase().includes(query)) ||
        (order?.destination && order.destination.toLowerCase().includes(query)) ||
        (order?.id && String(order.id).toLowerCase().includes(query)) ||
        (order?.productsSummary && order.productsSummary.toLowerCase().includes(query));

      return matchBranch && matchText;
    });
  }, [activeTab, pickingOrders, readyOrders, selectedBranch, searchQuery]);

  const toggleExpandOrder = (id: string) => {
    setExpandedOrderId((prev) => (prev === id ? null : id));
  };

  const handleStatusAdvance = async (order: Order, targetStatus: string) => {
    if (!onUpdateStatus) return;
    await onUpdateStatus(order.id, targetStatus);
  };

  // תצוגת שומר מסך פנימית עצמאית במובייל (ללא תלות שעלולה להקריס)
  if (screensaverActive) {
    return (
      <div dir="rtl" className="relative h-screen w-full bg-background overflow-hidden select-none flex flex-col justify-between p-5">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between z-20">
          <button
            onClick={() => setScreensaverMenuOpen(true)}
            className="grid size-12 place-items-center rounded-2xl bg-card border border-border/80 text-foreground shadow-lg active:scale-95"
            title="מידע תפעולי"
          >
            <Menu className="size-6 text-primary" />
          </button>

          <button
            onClick={() => setScreensaverActive(false)}
            className="flex items-center gap-2 h-12 px-5 rounded-2xl bg-primary text-primary-foreground font-black text-xs shadow-lg active:scale-95 transition"
          >
            <ArrowRight className="size-4" />
            <span>חזרה למסוף מלקט</span>
          </button>
        </div>

        {/* Center Live Screensaver Hub */}
        <div className="flex flex-col items-center justify-center text-center gap-4 my-auto">
          <div className="grid size-20 place-items-center rounded-3xl bg-primary/15 text-primary border border-primary/30 shadow-2xl animate-pulse">
            <Monitor className="size-10" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-foreground">שומר מסך פעיל · מגרש</h2>
            <p className="text-sm font-semibold text-muted-foreground mt-1">
              ח. סבן חומרי בניין (1994) בע"מ
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full max-w-xs mt-4">
            <div className="rounded-2xl border border-border/80 bg-card p-3.5 text-center shadow-sm">
              <span className="text-xs font-bold text-muted-foreground block">הזמנות לליקוט</span>
              <span className="text-2xl font-black text-foreground tabular-nums">
                {pickingOrders.length}
              </span>
            </div>

            <div className="rounded-2xl border border-border/80 bg-card p-3.5 text-center shadow-sm">
              <span className="text-xs font-bold text-muted-foreground block">מוכן / בהעמסה</span>
              <span className="text-2xl font-black text-emerald-500 tabular-nums">
                {readyOrders.length}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Hint */}
        <div className="text-center text-xs font-bold text-muted-foreground pb-2">
          גע במסך בכל עת כדי לחזור למסוף
        </div>

        {/* תפריט צד מובייל נקי מהגדרות מנהל */}
        <AnimatePresence>
          {screensaverMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setScreensaverMenuOpen(false)}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              />

              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="fixed inset-y-0 right-0 z-50 w-72 bg-card border-l border-border/80 p-5 shadow-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-border/70">
                    <div className="flex items-center gap-2.5">
                      <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
                        <Warehouse className="size-5" />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-foreground">שומר מסך מגרש</h2>
                        <p className="text-[10px] text-muted-foreground">תצוגת מידע ללא הגדרות</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setScreensaverMenuOpen(false)}
                      className="grid size-8 place-items-center rounded-lg bg-secondary text-muted-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 mt-5">
                    <div className="rounded-xl border border-border/70 bg-secondary/40 p-3">
                      <span className="text-xs text-muted-foreground block font-medium">סניף פעיל</span>
                      <span className="text-sm font-black text-foreground mt-0.5 block">
                        {selectedBranch === "all" ? "כל המגרשים" : selectedBranch}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4 border-t border-border/70">
                  <button
                    onClick={() => {
                      setScreensaverEnabled(false);
                      setScreensaverActive(false);
                      setScreensaverMenuOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 h-11 w-full rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 font-bold text-xs"
                  >
                    <MonitorOff className="size-4" />
                    <span>בטל שומר מסך אוטומטי</span>
                  </button>

                  <button
                    onClick={() => {
                      setScreensaverActive(false);
                      setScreensaverMenuOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 h-11 w-full rounded-xl bg-primary text-primary-foreground font-black text-xs shadow-md"
                  >
                    <span>סגור תפריט</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex flex-col h-screen w-full select-none overflow-hidden bg-background text-foreground">
      {/* Top App Bar - Fixed Mobile Header */}
      <header className="sticky top-0 z-30 flex flex-col border-b border-border/80 bg-card/95 px-3.5 pt-3 pb-2.5 backdrop-blur-xl shadow-md">
        <div className="flex items-center justify-between gap-2">
          {/* Brand Info */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary border border-primary/30 shadow-inner shrink-0">
              <PackageCheck className="size-6" />
            </div>
            <div className="truncate">
              <h1 className="text-base font-black tracking-tight leading-tight truncate">מסוף מלקט</h1>
              <p className="text-xs font-bold text-muted-foreground flex items-center gap-1 mt-0.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                <span>ח. סבן · מגרש חי</span>
              </p>
            </div>
          </div>

          {/* Action Controls: Prominent Theme Toggle, Branch Selector, Screensaver & Refresh */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* כפתור עיצוב יום/לילה בולט */}
            <button
              onClick={toggleTheme}
              className={cn(
                "h-11 px-3 flex items-center gap-1.5 rounded-2xl border font-black text-xs transition active:scale-95 shadow-md",
                isDark
                  ? "border-amber-400/50 bg-amber-400/15 text-amber-300"
                  : "border-slate-300 bg-slate-100 text-slate-800 shadow-sm"
              )}
              title="החלף מצב יום/לילה"
            >
              {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-700" />}
              <span>{isDark ? "יום" : "לילה"}</span>
            </button>

            {/* בורר מחסן */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="h-11 rounded-2xl border border-border bg-background px-2.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
            >
              <option value="all">הכל</option>
              <option value="החרש">החרש</option>
              <option value="התלמיד">התלמיד</option>
            </select>

            {/* שומר מסך ידני */}
            <button
              onClick={() => setScreensaverActive(true)}
              className="grid size-11 place-items-center rounded-2xl border border-border bg-card text-foreground transition active:scale-95 shadow-sm hover:bg-secondary"
              title="הפעל שומר מסך ידנית"
            >
              <Monitor className="size-4 text-primary" />
            </button>

            {/* רענון */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={cn(
                "grid size-11 place-items-center rounded-2xl border border-border bg-card text-foreground transition active:scale-95 shadow-sm hover:bg-secondary",
                isRefreshing && "text-primary"
              )}
              title="רענן הזמנות"
            >
              <RotateCcw className={cn("size-4", isRefreshing && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* שורת הודעות זזות (Marquee Ticker) */}
        <div className="mt-2.5 flex items-center gap-2 overflow-hidden rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 shadow-inner">
          <div className="flex items-center gap-1 text-[11px] font-black text-primary shrink-0 border-l border-primary/20 pl-2">
            <Bell className="size-3.5 animate-bounce text-primary" />
            <span>התראה</span>
          </div>

          <div className="relative flex-1 overflow-hidden h-4">
            <motion.div
              className="absolute whitespace-nowrap text-[11px] font-bold text-foreground flex gap-8"
              animate={{ x: [300, -650] }}
              transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
            >
              <span>⚠️ שים לב: פריקות מנוף מקבלות עדיפות ליקוט במשטחי ההעמסה</span>
              <span>📦 וודא החתמת תעודת משלוח מול הנהג לפני יציאה מהשער</span>
              <span>🔔 דרישות רכש מעודכנות בזמן אמת בטאב 'מלאי מגרש'</span>
            </motion.div>
          </div>
        </div>

        {/* שורת חיפוש */}
        {activeTab !== "inventory" && (
          <div className="relative mt-2.5">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש לפי לקוח, יעד, חומר או מספר הזמנה..."
              className="w-full h-11 rounded-xl border border-border/80 bg-background/90 py-2 pr-10 pl-4 text-xs font-medium placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition shadow-inner"
            />
          </div>
        )}
      </header>

      {/* Main Scrollable View Area */}
      <main className="flex-1 overflow-y-auto px-3.5 py-3 pb-24 overscroll-contain">
        <AnimatePresence mode="wait">
          {activeTab === "inventory" ? (
            <motion.div
              key="inventory-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Boxes className="size-4 text-primary" />
                  <span className="text-xs font-black">דרישות רצפה וספי ביטחון</span>
                </div>
                <span className="text-[11px] font-bold text-muted-foreground">ניטור שטח חי</span>
              </div>
              <InventoryDemandCard orders={orders} />
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: activeTab === "picking" ? 25 : -25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: activeTab === "picking" ? -25 : 25 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex flex-col gap-3.5"
            >
              {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                  <Warehouse className="size-14 stroke-1 opacity-40 mb-2" />
                  <p className="text-base font-bold text-foreground">אין משימות זמינות בשלב זה</p>
                  <p className="text-xs text-muted-foreground mt-0.5">הזמנות חדשות יופיעו כאן בזמן אמת</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <CollapsibleOrderCard
                    key={order.id}
                    order={order}
                    activeTab={activeTab}
                    isExpanded={expandedOrderId === order.id}
                    onToggleExpand={() => toggleExpandOrder(order.id)}
                    onAdvanceStatus={(status) => handleStatusAdvance(order, status)}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/80 bg-card/95 backdrop-blur-2xl px-3.5 py-2 shadow-2xl">
        <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab("picking")}
            className={cn(
              "flex flex-col items-center justify-center h-14 rounded-2xl transition-all duration-200 relative",
              activeTab === "picking"
                ? "bg-primary text-primary-foreground shadow-md scale-102"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <div className="relative">
              <Clock className="size-5" />
              {pickingOrders.length > 0 && (
                <span
                  className={cn(
                    "absolute -top-1.5 -left-2.5 flex min-w-4 h-4 px-1 items-center justify-center rounded-full text-[10px] font-black",
                    activeTab === "picking" ? "bg-card text-foreground" : "bg-primary text-primary-foreground"
                  )}
                >
                  {pickingOrders.length}
                </span>
              )}
            </div>
            <span className="text-xs font-black mt-1">לליקוט ({pickingOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("ready")}
            className={cn(
              "flex flex-col items-center justify-center h-14 rounded-2xl transition-all duration-200 relative",
              activeTab === "ready"
                ? "bg-primary text-primary-foreground shadow-md scale-102"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <div className="relative">
              <Truck className="size-5" />
              {readyOrders.length > 0 && (
                <span
                  className={cn(
                    "absolute -top-1.5 -left-2.5 flex min-w-4 h-4 px-1 items-center justify-center rounded-full text-[10px] font-black",
                    activeTab === "ready" ? "bg-card text-foreground" : "bg-emerald-500 text-white"
                  )}
                >
                  {readyOrders.length}
                </span>
              )}
            </div>
            <span className="text-xs font-black mt-1">בהעמסה ({readyOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            className={cn(
              "flex flex-col items-center justify-center h-14 rounded-2xl transition-all duration-200 relative",
              activeTab === "inventory"
                ? "bg-primary text-primary-foreground shadow-md scale-102"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <Boxes className="size-5" />
            <span className="text-xs font-black mt-1">מלאי מגרש</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

interface CollapsibleOrderCardProps {
  order: Order;
  activeTab: TabType;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAdvanceStatus: (status: string) => void;
}

function CollapsibleOrderCard({
  order,
  activeTab,
  isExpanded,
  onToggleExpand,
  onAdvanceStatus,
}: CollapsibleOrderCardProps) {
  const parsedItems: ParsedItem[] = useMemo(() => {
    if (!order?.productsSummary) return [];

    return String(order.productsSummary)
      .split(/[\n,;]+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const skuMatch = line.match(/(?:מק["'״]?ט|קוד)[:\s]*([0-9]{4,6})/i);
        const sku = skuMatch ? skuMatch[1] : undefined;

        const qtyMatch = line.match(/(?:כמות[:\s]*)?([0-9]+(?:\.[0-9]+)?)\s*(?:שק|משטח|יח|בלה|ק"ג)?/);
        const quantity = qtyMatch ? qtyMatch[0] : "1";

        let clean = line
          .replace(/(?:מק["'״]?ט|קוד)[:\s]*([0-9]{4,6})/gi, "")
          .replace(/📦/g, "")
          .replace(/\|/g, "")
          .trim();

        return {
          sku,
          name: clean || line,
          quantity,
        };
      });
  }, [order?.productsSummary]);

  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const toggleItemCheck = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm transition-all">
      <div
        onClick={onToggleExpand}
        className="p-4 flex flex-col gap-3 cursor-pointer active:bg-secondary/30 transition select-none"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-lg">
                הזמנה #{order?.id}
              </span>
              <span className="text-xs font-bold text-muted-foreground">{order?.time || "היום"}</span>
            </div>
            <h3 className="text-base font-black text-foreground mt-1 leading-snug truncate">
              {order?.client || "לקוח כללי"}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={cn(
                "h-8 flex items-center rounded-xl px-3 text-xs font-black border shadow-sm",
                order?.deliveryType === "מנוף"
                  ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                  : "bg-primary/15 text-primary border-primary/30"
              )}
            >
              {order?.deliveryType || "פריקה רגילה"}
            </span>

            <div className="grid size-8 place-items-center rounded-xl bg-secondary text-muted-foreground">
              <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="size-4" />
              </motion.div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-semibold">
          <div className="flex items-center gap-1">
            <MapPin className="size-3.5 text-primary shrink-0" />
            <span className="text-foreground/90">{order?.destination || "איסוף עצמי"}</span>
          </div>

          {order?.warehouse && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Warehouse className="size-3.5 text-accent shrink-0" />
                <span className="font-bold text-foreground">{order.warehouse}</span>
              </div>
            </>
          )}
        </div>

        {!isExpanded && (
          <div className="rounded-xl bg-secondary/30 px-3 py-2 text-xs font-semibold text-muted-foreground line-clamp-1 border border-border/50">
            {order?.productsSummary || "לחץ לצפייה בפירוט פריטים ומק\"טים"}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="border-t border-border/70 bg-secondary/15 px-4 pt-3 pb-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-foreground flex items-center gap-1.5">
                <Layers className="size-3.5 text-primary" />
                <span>רשימת פריטים לליקוט מהמגרש:</span>
              </span>
              <span className="text-[11px] font-bold text-muted-foreground">
                {parsedItems.length} פריטים
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {parsedItems.map((item, idx) => {
                const isChecked = !!checkedItems[idx];
                return (
                  <div
                    key={idx}
                    onClick={(e) => toggleItemCheck(idx, e)}
                    className={cn(
                      "flex items-center justify-between gap-2.5 rounded-2xl border p-3 transition active:scale-[0.99] cursor-pointer",
                      isChecked
                        ? "border-emerald-500/40 bg-emerald-500/10 text-muted-foreground"
                        : "border-border/70 bg-card text-foreground shadow-sm"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        className="text-primary shrink-0"
                        title={isChecked ? "סומן כנאסף" : "סמן כנאסף"}
                      >
                        {isChecked ? (
                          <CheckSquare className="size-5 text-emerald-500" />
                        ) : (
                          <Square className="size-5 text-muted-foreground" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <span
                          className={cn(
                            "text-xs font-bold block leading-snug",
                            isChecked && "line-through opacity-70"
                          )}
                        >
                          {item.name}
                        </span>

                        {item.sku && (
                          <span className="inline-block mt-0.5 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-black text-primary border border-border/60">
                            מק"ט: {item.sku}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="rounded-xl bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-black text-primary shrink-0">
                      {item.quantity}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-foreground/80">
                <User className="size-3.5 text-muted-foreground" />
                <span>נהג: {order?.driver || "טרם שובץ"}</span>
              </div>

              {order?.phone && (
                <a
                  href={`tel:${order.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-xl"
                >
                  <Phone className="size-3" />
                  <span>חייג</span>
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              {activeTab === "picking" ? (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdvanceStatus("בהכנה");
                    }}
                    className="h-11 flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-card text-xs font-black text-foreground active:scale-95 transition shadow-sm"
                  >
                    <Clock className="size-4 text-amber-500" />
                    <span>סמן בהכנה</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdvanceStatus("מוכן להעמסה");
                    }}
                    className="h-11 flex items-center justify-center gap-1.5 rounded-2xl bg-primary text-primary-foreground text-xs font-black active:scale-95 transition shadow-md"
                  >
                    <CheckCircle2 className="size-4" />
                    <span>הושלם ליקוט</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdvanceStatus("בהעמסה");
                    }}
                    className="h-11 flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-card text-xs font-black text-foreground active:scale-95 transition shadow-sm"
                  >
                    <PackageCheck className="size-4 text-primary" />
                    <span>בהעמסה</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdvanceStatus("יצא לדרך");
                    }}
                    className="h-11 flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 text-white text-xs font-black active:scale-95 transition shadow-md"
                  >
                    <Truck className="size-4" />
                    <span>שחרר נהג לדרך</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
