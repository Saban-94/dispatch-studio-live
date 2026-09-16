import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useAnimation, PanInfo } from "framer-motion";
import {
  PackageCheck,
  Truck,
  CheckCircle2,
  Clock,
  Warehouse,
  Search,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  Boxes,
  Sun,
  Moon,
  Volume2,
  Bell,
  MapPin,
  User,
} from "lucide-react";
import type { Order } from "@/types/dispatch";
import { useTheme } from "@/hooks/useTheme";
import { InventoryDemandCard } from "./InventoryDemandCard";
import { cn } from "@/lib/utils";

interface PickerViewProps {
  orders: Order[];
  onUpdateStatus?: (orderId: string, newStatus: string) => Promise<void> | void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

type TabType = "picking" | "ready" | "inventory";

export function PickerView({
  orders,
  onUpdateStatus,
  onRefresh,
  isRefreshing = false,
}: PickerViewProps) {
  const { isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("picking");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  // סיווג הזמנות פעילות לפי שלבי רצפת מגרש
  const pickingOrders = useMemo(() => {
    return orders.filter((o) =>
      ["בסידור עבודה", "בהכנה", "בהמתנה"].some(
        (st) => o.status?.trim() === st || o.stage?.trim() === st
      )
    );
  }, [orders]);

  const readyOrders = useMemo(() => {
    return orders.filter((o) =>
      ["מוכן להעמסה", "בהעמסה", "יצא לדרך"].some(
        (st) => o.status?.trim() === st || o.stage?.trim() === st
      )
    );
  }, [orders]);

  // סינון מהיר לפי מחסן ושורת חיפוש
  const filteredOrders = useMemo(() => {
    const list = activeTab === "picking" ? pickingOrders : readyOrders;
    return list.filter((order) => {
      const matchBranch =
        selectedBranch === "all" ||
        (order.warehouse && order.warehouse.includes(selectedBranch)) ||
        (order.branch && order.branch.includes(selectedBranch));

      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchBranch;

      const matchText =
        (order.client && order.client.toLowerCase().includes(query)) ||
        (order.destination && order.destination.toLowerCase().includes(query)) ||
        (order.id && order.id.toLowerCase().includes(query)) ||
        (order.productsSummary && order.productsSummary.toLowerCase().includes(query));

      return matchBranch && matchText;
    });
  }, [activeTab, pickingOrders, readyOrders, selectedBranch, searchQuery]);

  // הודעות נעות דינמיות לשורת הטיקר במובייל
  const tickerMessages = useMemo(() => {
    const msgs: string[] = [];
    const craneCount = orders.filter((o) => o.deliveryType === "מנוף").length;
    if (craneCount > 0) msgs.push(`⚠️ ${craneCount} פריקות מנוף מתוזמנות להיום`);

    const inPrep = pickingOrders.length;
    msgs.push(`📦 ${inPrep} הזמנות ממתינות להשלמת ליקוט במגרש`);

    msgs.push("🔔 שימו לב: הקפידו על אימות שקי בלה ומשטחי סבן לפני שחרור נהג");
    return msgs;
  }, [orders, pickingOrders.length]);

  const handleStatusAdvance = async (order: Order, targetStatus?: string) => {
    if (!onUpdateStatus) return;

    if (targetStatus) {
      await onUpdateStatus(order.id, targetStatus);
      return;
    }

    if (activeTab === "picking") {
      await onUpdateStatus(order.id, "מוכן להעמסה");
    } else if (activeTab === "ready") {
      await onUpdateStatus(order.id, "יצא לדרך");
    }
  };

  return (
    <div
      dir="rtl"
      className="flex flex-col h-screen w-full select-none overflow-hidden bg-background text-foreground"
    >
      {/* Top App Bar - Fixed Mobile Header */}
      <header className="sticky top-0 z-30 flex flex-col border-b border-border/80 bg-card/95 px-3.5 pt-3 pb-2.5 backdrop-blur-xl shadow-md">
        <div className="flex items-center justify-between gap-2.5">
          {/* Brand Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary border border-primary/30 shadow-inner shrink-0">
              <PackageCheck className="size-6" />
            </div>
            <div className="truncate">
              <h1 className="text-base font-black tracking-tight leading-tight truncate">
                מסוף מלקט מגרש
              </h1>
              <p className="text-xs font-bold text-muted-foreground flex items-center gap-1 mt-0.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                <span>ח. סבן · סנכרון חי</span>
              </p>
            </div>
          </div>

          {/* Action Controls: Branch, Theme Toggle, Refresh */}
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
            >
              <option value="all">כל המגרשים</option>
              <option value="החרש">סניף 4 החרש</option>
              <option value="התלמיד">סניף 1 התלמיד</option>
            </select>

            <button
              onClick={toggleTheme}
              className="grid size-10 place-items-center rounded-xl border border-border bg-card text-foreground transition active:scale-95 shadow-sm hover:bg-secondary"
              title="החלף ערכת נושא"
              aria-label="החלף ערכת נושא"
            >
              {isDark ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-slate-700" />
              )}
            </button>

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={cn(
                "grid size-10 place-items-center rounded-xl border border-border bg-card text-foreground transition active:scale-95 shadow-sm hover:bg-secondary",
                isRefreshing && "text-primary"
              )}
              title="רענן נתונים"
            >
              <RotateCcw className={cn("size-4", isRefreshing && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Dynamic Mobile Running Marquee Ticker */}
        <div className="mt-2.5 flex items-center gap-2 overflow-hidden rounded-xl border border-primary/20 bg-primary/10 px-3 py-1.5 shadow-inner">
          <div className="flex items-center gap-1 text-[11px] font-black text-primary shrink-0 border-l border-primary/20 pl-2">
            <Bell className="size-3.5 animate-bounce text-primary" />
            <span>עדכון</span>
          </div>

          <div className="relative flex-1 overflow-hidden h-4">
            <motion.div
              className="absolute whitespace-nowrap text-[11px] font-bold text-foreground flex gap-8"
              animate={{ x: [300, -600] }}
              transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
            >
              {tickerMessages.map((msg, i) => (
                <span key={i}>{msg}</span>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Search bar inside header (Only for Picking & Ready tabs) */}
        {activeTab !== "inventory" && (
          <div className="relative mt-2.5">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש מהיר לפי לקוח, יעד, חומר או מספר הזמנה..."
              className="w-full h-11 rounded-xl border border-border/80 bg-background/90 py-2 pr-10 pl-4 text-xs font-medium placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition shadow-inner"
            />
          </div>
        )}
      </header>

      {/* Main Scrollable View Area with Smooth Touch Momentum */}
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
                <span className="text-[11px] font-bold text-muted-foreground">
                  ניטור שטח חי
                </span>
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
                  <p className="text-xs text-muted-foreground mt-0.5">
                    הזמנות חדשות יופיעו כאן בזמן אמת מתוך הגיליון
                  </p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <SwipeableOrderCard
                    key={order.id}
                    order={order}
                    activeTab={activeTab}
                    onSwipe={(dir) => {
                      if (activeTab === "picking") {
                        handleStatusAdvance(order, "מוכן להעמסה");
                      } else {
                        handleStatusAdvance(order, dir === "left" ? "בהעמסה" : "יצא לדרך");
                      }
                    }}
                    onDirectAction={(status) => handleStatusAdvance(order, status)}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modern Floating Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/80 bg-card/95 backdrop-blur-2xl px-3.5 py-2 shadow-2xl">
        <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto">
          {/* Tab 1: Picking Queue */}
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
                    activeTab === "picking"
                      ? "bg-card text-foreground"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {pickingOrders.length}
                </span>
              )}
            </div>
            <span className="text-xs font-black mt-1">לליקוט ({pickingOrders.length})</span>
          </button>

          {/* Tab 2: Ready / Loaded */}
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
                    activeTab === "ready"
                      ? "bg-card text-foreground"
                      : "bg-emerald-500 text-white"
                  )}
                >
                  {readyOrders.length}
                </span>
              )}
            </div>
            <span className="text-xs font-black mt-1">בהעמסה ({readyOrders.length})</span>
          </button>

          {/* Tab 3: Live Floor Inventory Demands */}
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

// קומפוננטת כרטיסייה נפרדת הנתמכת ב-Swipe Gesture מלא וכפתורי שטח מובלטים
interface SwipeableOrderCardProps {
  order: Order;
  activeTab: TabType;
  onSwipe: (direction: "left" | "right") => void;
  onDirectAction: (status: string) => void;
}

function SwipeableOrderCard({
  order,
  activeTab,
  onSwipe,
  onDirectAction,
}: SwipeableOrderCardProps) {
  const controls = useAnimation();
  const [isDone, setIsDone] = useState(false);

  const handleDragEnd = async (_: any, info: PanInfo) => {
    const threshold = 110;
    if (info.offset.x < -threshold) {
      setIsDone(true);
      await controls.start({ x: -400, opacity: 0, transition: { duration: 0.25 } });
      onSwipe("left");
    } else if (info.offset.x > threshold) {
      setIsDone(true);
      await controls.start({ x: 400, opacity: 0, transition: { duration: 0.25 } });
      onSwipe("right");
    } else {
      controls.start({
        x: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 450, damping: 28 },
      });
    }
  };

  if (isDone) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-sm border border-border/80 bg-card">
      {/* Background Swipe Actions Indicators */}
      <div className="absolute inset-0 flex items-center justify-between px-6 text-white font-black text-xs z-0 pointer-events-none">
        <div className="flex items-center gap-1.5 text-emerald-500">
          <CheckCircle2 className="size-5" />
          <span>{activeTab === "picking" ? "מוכן להעמסה" : "יצא לדרך"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-primary">
          <span>{activeTab === "picking" ? "סיים ליקוט" : "הועמס"}</span>
          <ChevronLeft className="size-5" />
        </div>
      </div>

      {/* Front Touch Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.4}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="relative z-10 flex flex-col gap-3 rounded-2xl bg-card p-4 transition-colors active:bg-accent/5 cursor-grab active:cursor-grabbing border-b border-border/50 shadow-sm"
      >
        {/* Header: ID, Client, Delivery Badge */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md shrink-0">
                #{order.id}
              </span>
              <span className="text-xs font-bold text-muted-foreground truncate">
                {order.time || "היום"}
              </span>
            </div>
            <h2 className="text-base font-black text-foreground mt-1 leading-tight truncate">
              {order.client || "לקוח כללי"}
            </h2>
          </div>

          <span
            className={cn(
              "h-8 flex items-center rounded-xl px-3 text-xs font-black border shrink-0 shadow-sm",
              order.deliveryType === "מנוף"
                ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                : "bg-primary/15 text-primary border-primary/30"
            )}
          >
            {order.deliveryType || "פריקה רגילה"}
          </span>
        </div>

        {/* Destination & Warehouse */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-semibold">
          <div className="flex items-center gap-1">
            <MapPin className="size-3.5 text-primary shrink-0" />
            <span className="text-foreground/90">{order.destination || "איסוף עצמי"}</span>
          </div>

          {order.warehouse && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Warehouse className="size-3.5 text-accent shrink-0" />
                <span className="font-bold text-foreground">{order.warehouse}</span>
              </div>
            </>
          )}
        </div>

        {/* Products Details Box */}
        <div className="rounded-xl border border-border/70 bg-secondary/35 p-3">
          <p className="text-xs font-bold text-foreground leading-relaxed whitespace-pre-wrap">
            {order.productsSummary || "אין פירוט פריטים זמין להזמנה זו"}
          </p>
        </div>

        {/* Touch Button Bar for Direct Floor Operation (ללא תלות רק ב-Swipe) */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
          {activeTab === "picking" ? (
            <>
              <button
                type="button"
                onClick={() => onDirectAction("בהכנה")}
                className="h-11 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/70 text-xs font-black text-foreground active:scale-95 transition"
              >
                <Clock className="size-4 text-amber-500" />
                <span>סמן בהכנה</span>
              </button>

              <button
                type="button"
                onClick={() => onDirectAction("מוכן להעמסה")}
                className="h-11 flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-black active:scale-95 transition shadow-sm"
              >
                <CheckCircle2 className="size-4" />
                <span>מוכן להעמסה</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onDirectAction("בהעמסה")}
                className="h-11 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary/70 text-xs font-black text-foreground active:scale-95 transition"
              >
                <PackageCheck className="size-4 text-primary" />
                <span>בהעמסה</span>
              </button>

              <button
                type="button"
                onClick={() => onDirectAction("יצא לדרך")}
                className="h-11 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black active:scale-95 transition shadow-sm"
              >
                <Truck className="size-4" />
                <span>יצא לדרך</span>
              </button>
            </>
          )}
        </div>

        {/* Bottom Driver / Swipe Hint */}
        <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground pt-0.5">
          <span className="flex items-center gap-1 text-primary">
            <ChevronRight className="size-3.5" />
            <span>החלק ימינה/שמאלה לאישור מהיר</span>
            <ChevronLeft className="size-3.5" />
          </span>

          <span className="flex items-center gap-1 text-foreground/80">
            <User className="size-3.5 text-muted-foreground" />
            <span>{order.driver || "טרם שובץ"}</span>
          </span>
        </div>
      </motion.div>
    </div>
  );
}
