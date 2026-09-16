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
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Send,
  Boxes,
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
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>("picking");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [swipingId, setSwipingId] = useState<string | null>(null);

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

  // פעולת Swipe מהירה לקידום סטטוס הזמנה
  const handleSwipeComplete = async (order: Order, direction: "left" | "right") => {
    if (!onUpdateStatus) return;

    if (activeTab === "picking") {
      // גרירה שמאלה או ימינה מקדמת מ-הכנה ל-מוכן להעמסה
      await onUpdateStatus(order.id, "מוכן להעמסה");
    } else if (activeTab === "ready") {
      if (direction === "left") {
        await onUpdateStatus(order.id, "בהעמסה");
      } else {
        await onUpdateStatus(order.id, "יצא לדרך");
      }
    }
  };

  return (
    <div
      dir="rtl"
      className="flex flex-col h-screen w-full select-none overflow-hidden bg-background text-foreground"
    >
      {/* Top App Bar - Fixed Mobile Header */}
      <header className="sticky top-0 z-30 flex flex-col border-b border-border/70 bg-card/95 px-4 pt-3 pb-2.5 backdrop-blur-lg shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-10 place-items-center rounded-2xl bg-primary/15 text-primary border border-primary/30 shadow-inner">
              <PackageCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-tight">
                מסוף מלקט מגרש
              </h1>
              <p className="text-[11px] font-semibold text-muted-foreground">
                ח. סבן · סנכרון חי
              </p>
            </div>
          </div>

          {/* Branch Selector & Refresh */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
            >
              <option value="all">כל המגרשים</option>
              <option value="החרש">סניף 4 החרש</option>
              <option value="התלמיד">סניף 1 התלמיד</option>
            </select>

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={cn(
                "grid size-9 place-items-center rounded-xl border border-border bg-card text-foreground transition active:scale-95 shadow-sm",
                isRefreshing && "animate-spin text-primary"
              )}
              title="רענן נתונים"
            >
              <RotateCcw className="size-4" />
            </button>
          </div>
        </div>

        {/* Search bar inside header (Only for Picking & Ready tabs) */}
        {activeTab !== "inventory" && (
          <div className="relative mt-2.5">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש לפי לקוח, יעד או חומר..."
              className="w-full rounded-xl border border-border/80 bg-background/80 py-2 pr-9 pl-3 text-xs font-medium placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition shadow-inner"
            />
          </div>
        )}
      </header>

      {/* Main Scrollable View Area with Smooth Touch Momentum */}
      <main className="flex-1 overflow-y-auto px-4 py-3 pb-24 overscroll-contain">
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
              <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/60 p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Boxes className="size-4 text-primary" />
                  <span className="text-xs font-black">דרישות רצפה וספי ביטחון</span>
                </div>
                <span className="text-[11px] font-bold text-muted-foreground">
                  עודכן הרגע
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
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <Warehouse className="size-12 stroke-1 opacity-40 mb-2" />
                  <p className="text-sm font-bold">אין משימות זמינות בשלב זה</p>
                  <p className="text-xs text-muted-foreground/80 mt-0.5">
                    הזמנות חדשות יופיעו כאן בזמן אמת
                  </p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <SwipeableOrderCard
                    key={order.id}
                    order={order}
                    activeTab={activeTab}
                    onSwipe={(dir) => handleSwipeComplete(order, dir)}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modern Floating Bottom Navigation Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/70 bg-card/95 backdrop-blur-xl px-4 py-2 shadow-2xl">
        <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
          {/* Tab 1: Picking Queue */}
          <button
            onClick={() => setActiveTab("picking")}
            className={cn(
              "flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200 relative",
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
                    "absolute -top-1.5 -left-2 flex size-4 items-center justify-center rounded-full text-[9px] font-black",
                    activeTab === "picking"
                      ? "bg-card text-foreground"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {pickingOrders.length}
                </span>
              )}
            </div>
            <span className="text-[11px] font-black mt-1">לליקוט ({pickingOrders.length})</span>
          </button>

          {/* Tab 2: Ready / Loaded */}
          <button
            onClick={() => setActiveTab("ready")}
            className={cn(
              "flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200 relative",
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
                    "absolute -top-1.5 -left-2 flex size-4 items-center justify-center rounded-full text-[9px] font-black",
                    activeTab === "ready"
                      ? "bg-card text-foreground"
                      : "bg-emerald-500 text-white"
                  )}
                >
                  {readyOrders.length}
                </span>
              )}
            </div>
            <span className="text-[11px] font-black mt-1">בהעמסה ({readyOrders.length})</span>
          </button>

          {/* Tab 3: Live Floor Inventory Demands */}
          <button
            onClick={() => setActiveTab("inventory")}
            className={cn(
              "flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200 relative",
              activeTab === "inventory"
                ? "bg-primary text-primary-foreground shadow-md scale-102"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <Boxes className="size-5" />
            <span className="text-[11px] font-black mt-1">מלאי מגרש</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

// קומפוננטת כרטיסייה נפרדת הנתמכת ב-Swipe Gesture חלק
interface SwipeableOrderCardProps {
  order: Order;
  activeTab: TabType;
  onSwipe: (direction: "left" | "right") => void;
}

function SwipeableOrderCard({ order, activeTab, onSwipe }: SwipeableOrderCardProps) {
  const controls = useAnimation();
  const [isDone, setIsDone] = useState(false);

  const handleDragEnd = async (_: any, info: PanInfo) => {
    const threshold = 110;
    if (info.offset.x < -threshold) {
      // גרר חזק שמאלה
      setIsDone(true);
      await controls.start({ x: -400, opacity: 0, transition: { duration: 0.25 } });
      onSwipe("left");
    } else if (info.offset.x > threshold) {
      // גרר חזק ימינה
      setIsDone(true);
      await controls.start({ x: 400, opacity: 0, transition: { duration: 0.25 } });
      onSwipe("right");
    } else {
      // חזרה למרכז אם לא עבר את הרף
      controls.start({ x: 0, opacity: 1, transition: { type: "spring", stiffness: 450, damping: 28 } });
    }
  };

  if (isDone) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-sm border border-border/70 bg-card">
      {/* Background Swipe Actions Indicators */}
      <div className="absolute inset-0 flex items-center justify-between px-5 text-white font-black text-xs z-0 pointer-events-none">
        <div className="flex items-center gap-1.5 text-emerald-500">
          <CheckCircle2 className="size-5" />
          <span>{activeTab === "picking" ? "מוכן להעמסה" : "יצא לדרך"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-primary">
          <span>{activeTab === "picking" ? "הושלם ליקוט" : "הועמס"}</span>
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
        className="relative z-10 flex flex-col gap-2.5 rounded-2xl bg-card p-4 transition-colors active:bg-accent/5 cursor-grab active:cursor-grabbing border-b border-border/40"
      >
        {/* Header: Client & Delivery Type */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-[10px] font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              הזמנה #{order.id}
            </span>
            <h2 className="text-base font-black text-foreground mt-1 leading-snug">
              {order.client || "לקוח כללי"}
            </h2>
          </div>

          <span
            className={cn(
              "rounded-xl px-2.5 py-1 text-[11px] font-black border",
              order.deliveryType === "מנוף"
                ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                : "bg-primary/15 text-primary border-primary/30"
            )}
          >
            {order.deliveryType || "פריקה רגילה"}
          </span>
        </div>

        {/* Destination & Warehouse */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          <span>📍 {order.destination || "איסוף עצמי"}</span>
          {order.warehouse && (
            <>
              <span>•</span>
              <span className="font-bold text-foreground/80">{order.warehouse}</span>
            </>
          )}
        </div>

        {/* Products List Box */}
        <div className="rounded-xl border border-border/60 bg-secondary/30 p-2.5">
          <p className="text-xs font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
            {order.productsSummary || "אין פירוט פריטים זמין"}
          </p>
        </div>

        {/* Bottom Bar: Action Hint */}
        <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground pt-1 border-t border-border/40">
          <span className="flex items-center gap-1 text-primary">
            <span>החלק ימינה/שמאלה לאישור</span>
            <ChevronLeft className="size-3.5" />
          </span>
          <span className="text-foreground/70">
            נהג: {order.driver || "טרם שובץ"}
          </span>
        </div>
      </motion.div>
    </div>
  );
}
