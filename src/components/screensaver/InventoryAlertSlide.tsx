import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Flame,
  Truck,
  Layers,
  Package,
  Boxes,
  Send,
  Sparkles,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  Filter,
  ShieldAlert,
  ArrowDownRight,
  ExternalLink,
} from "lucide-react";
import type { Order } from "@/types/dispatch";
import type { ScreensaverBranchFilter } from "@/types/screensaver";
import {
  calculateDetailedInventoryEngine,
  InventoryItemCalculatedStatus,
} from "@/services/inventoryService";
import { LowStockBadge } from "@/components/inventory/LowStockBadge";
import { cn } from "@/lib/utils";

interface InventoryAlertSlideProps {
  orders: Order[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
  branchFilter?: ScreensaverBranchFilter;
}

type FilterMode = "all" | "at_risk" | "critical" | "healthy";

const containerVariants = {
  initial: { opacity: 0, scale: 0.99 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.05,
    },
  },
  exit: {
    opacity: 0,
    scale: 1.01,
    transition: { duration: 0.25 },
  },
};

const itemCardVariants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

export function InventoryAlertSlide({
  orders,
  onRefresh,
  isRefreshing = false,
  branchFilter = "all",
}: InventoryAlertSlideProps) {
  const [filter, setFilter] = useState<FilterMode>("all");
  const [showWaPreview, setShowWaPreview] = useState(false);

  // Compute full inventory engine status
  const { kpis, items, insights } = useMemo(() => {
    return calculateDetailedInventoryEngine(orders, new Date(), branchFilter);
  }, [orders, branchFilter]);

  // Filter items based on user selection
  const filteredItems = useMemo(() => {
    switch (filter) {
      case "critical":
        return items.filter((i) => i.isCritical);
      case "at_risk":
        return items.filter((i) => i.isCritical || i.isWarning);
      case "healthy":
        return items.filter((i) => !i.isCritical && !i.isWarning);
      case "all":
      default:
        return items;
    }
  }, [items, filter]);

  // Category Icon helper
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "cement":
        return <Boxes className="size-4 text-amber-500 dark:text-amber-400" />;
      case "plaster":
        return <Layers className="size-4 text-sky-500 dark:text-sky-400" />;
      case "adhesive":
        return <Sparkles className="size-4 text-purple-500 dark:text-purple-400" />;
      case "big_bag":
        return <Package className="size-4 text-cyan-500 dark:text-cyan-400" />;
      case "block":
        return <Layers className="size-4 text-indigo-500 dark:text-indigo-400" />;
      case "iron":
        return <ShieldAlert className="size-4 text-slate-500 dark:text-slate-300" />;
      case "gypsum":
        return <FileSpreadsheet className="size-4 text-emerald-500 dark:text-emerald-400" />;
      default:
        return <Boxes className="size-4 text-amber-500 dark:text-amber-400" />;
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="h-full flex flex-col justify-between gap-5 max-w-7xl mx-auto py-2 select-none"
    >
      {/* 1. Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex items-center gap-2 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 px-3.5 py-1.5 text-xs font-black text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/40 shadow-md animate-pulse">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <span>דוח משיכות מלאי וביצועים יומי — מגרש 4 החרש</span>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
              <span>בקרת מלאי רצפה וספי ביטחון</span>
              <span className="rounded-lg bg-cyan-500/15 dark:bg-cyan-500/20 px-2 py-0.5 text-[11px] font-bold text-cyan-700 dark:text-cyan-300 ring-1 ring-cyan-500/30">
                זמן אמת (עמודה H)
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              ניתוח יתרת רצפה אפקטיבית על בסיס {kpis.ordersAnalyzedCount} הזמנות פעילות ומסופקות
              היום
            </p>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Filter Buttons */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/60">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition",
                filter === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              הכל ({items.length})
            </button>
            <button
              onClick={() => setFilter("at_risk")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1",
                filter === "at_risk"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/10",
              )}
            >
              <span>בסיכון</span>
              <span className="rounded-full bg-amber-950/40 dark:bg-amber-950/80 px-1 text-[10px]">
                {kpis.itemsAtRiskCount}
              </span>
            </button>
            <button
              onClick={() => setFilter("critical")}
              className={cn(
                "px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1",
                filter === "critical"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-rose-600 dark:text-rose-400 hover:bg-rose-500/10",
              )}
            >
              <span>קריטי</span>
              <span className="rounded-full bg-rose-950/40 dark:bg-rose-950/80 px-1 text-[10px]">
                {kpis.criticalAlertsCount}
              </span>
            </button>
          </div>

          <div className="rounded-xl bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground border border-border/60 shadow-xs">
            <span>חישוב: </span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {kpis.lastCalculatedAt}
            </span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-foreground border border-border/60 transition hover:bg-secondary/80 active:scale-95"
              title="רענן מול Google Sheets"
            >
              <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin text-primary")} />
              <span>רענון</span>
            </button>
          )}

          {/* Quick WhatsApp procurement button in header */}
          <a
            href={insights.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-500 active:scale-95"
            title="שידור דרישת רכש מיידית לוואטסאפ"
          >
            <Send className="size-3.5" />
            <span>רכש בוואטסאפ</span>
          </a>
        </div>
      </div>

      {/* 2. Top KPI Tiles: Macro Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: סה"כ משיכות היום */}
        <div className="rounded-2xl border border-border/40 bg-card/85 p-4 shadow-sm backdrop-blur-md flex flex-col justify-between transition hover:border-primary/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="size-4 text-primary" />
              <span>סה"כ משיכות היום</span>
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              עמודה H
            </span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl lg:text-4xl font-black text-foreground tabular-nums tracking-tight">
              {kpis.totalDrawnCount}
            </span>
            <span className="text-xs font-bold text-muted-foreground">יחידות יצאו</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2">
            <span>
              נמשך בפועל: <b className="text-foreground">{kpis.totalDrawnCount}</b>
            </span>
            <span>
              משוריין: <b className="text-primary">{kpis.totalReservedCount}</b>
            </span>
          </div>
        </div>

        {/* KPI 2: פריטים בסכנת חוסר */}
        <div
          className={cn(
            "rounded-2xl border p-4 shadow-sm backdrop-blur-md flex flex-col justify-between transition",
            kpis.itemsAtRiskCount > 0
              ? "border-amber-500/50 bg-amber-500/5 dark:bg-amber-950/20"
              : "border-border/40 bg-card/85",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <AlertTriangle className="size-4 text-amber-500" />
              <span>פריטים בסכנת חוסר</span>
            </span>
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full">
              סף ביטחון
            </span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl lg:text-4xl font-black text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">
              {kpis.itemsAtRiskCount}
            </span>
            <span className="text-xs font-bold text-muted-foreground">
              מתוך {items.length} בקטלוג
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground border-t border-border/40 pt-2 truncate">
            {kpis.itemsAtRiskCount > 0 ? "דורש מעקב רציף והשלמת מלאי" : "כל הפריטים מעל סף האזהרה"}
          </div>
        </div>

        {/* KPI 3: התראות קריטיות */}
        <div
          className={cn(
            "rounded-2xl border p-4 shadow-sm backdrop-blur-md flex flex-col justify-between transition",
            kpis.criticalAlertsCount > 0
              ? "border-rose-500/60 bg-rose-500/10 dark:bg-rose-950/30 ring-1 ring-rose-500/40"
              : "border-border/40 bg-card/85",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
              <Flame className="size-4 text-rose-500 animate-pulse" />
              <span>התראות קריטיות</span>
            </span>
            {kpis.criticalAlertsCount > 0 && (
              <span className="text-[10px] font-black text-white bg-rose-600 px-2 py-0.5 rounded-full animate-pulse">
                חידוש מיידי!
              </span>
            )}
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl lg:text-4xl font-black text-rose-600 dark:text-rose-400 tabular-nums tracking-tight">
              {kpis.criticalAlertsCount}
            </span>
            <span className="text-xs font-bold text-muted-foreground">מתחת לסף המינימום</span>
          </div>
          <div className="text-[11px] text-muted-foreground border-t border-border/40 pt-2">
            {kpis.criticalAlertsCount > 0 ? "סכנת עצירת ליקוט ברציף!" : "אין פריטים בחוסר קריטי"}
          </div>
        </div>

        {/* KPI 4: צפי פול-טריילרים נדרשים */}
        <div
          className={cn(
            "rounded-2xl border p-4 shadow-sm backdrop-blur-md flex flex-col justify-between transition",
            kpis.fullTrailersRequired > 0
              ? "border-cyan-500/50 bg-cyan-500/5 dark:bg-cyan-950/20"
              : "border-border/40 bg-card/85",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5">
              <Truck className="size-4 text-cyan-500" />
              <span>צפי פול-טריילרים נדרשים</span>
            </span>
            <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-full">
              ~24 משטחים/רכב
            </span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl lg:text-4xl font-black text-cyan-600 dark:text-cyan-400 tabular-nums tracking-tight">
              {kpis.fullTrailersRequired}
            </span>
            <span className="text-xs font-bold text-muted-foreground">
              פול-טריילר ({kpis.totalPalletsNeeded} משטחים)
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground border-t border-border/40 pt-2 truncate">
            {kpis.fullTrailersRequired > 0
              ? `לתאם הובלה מרוכזת מספקים`
              : "קיבולת רצפה מספקת ללא שינוע חריג"}
          </div>
        </div>
      </div>

      {/* 3. Main Product Grid: Modern Glassmorphism Cards with Colorful Progress Bars */}
      <div className="flex-1 overflow-y-auto pr-1 max-h-[52vh] min-h-[320px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {filteredItems.map((item) => (
              <motion.div
                key={item.rule.id}
                variants={itemCardVariants}
                layout
                className={cn(
                  "relative rounded-2xl border p-4 shadow-sm backdrop-blur-md flex flex-col justify-between transition-all",
                  "bg-card/90 hover:shadow-md",
                  item.isCritical
                    ? "border-rose-500/60 shadow-rose-900/10 ring-1 ring-rose-500/40 bg-gradient-to-b from-card via-card to-rose-500/10"
                    : item.isWarning
                      ? "border-amber-500/50 shadow-amber-900/10 bg-gradient-to-b from-card via-card to-amber-500/5"
                      : "border-border/40 hover:border-border",
                )}
              >
                <div>
                  {/* Card Header: Product Name & Category & Urgency Badge */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl bg-muted/80 p-2 shrink-0">
                        {getCategoryIcon(item.rule.category)}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-foreground leading-tight line-clamp-1">
                          {item.rule.name}
                        </h4>
                        <div className="text-[10px] text-muted-foreground">
                          בסיס פתיחה: {item.rule.initialBase} {item.rule.unit} | סף:{" "}
                          {item.rule.safetyThreshold}
                        </div>
                      </div>
                    </div>

                    {/* Stock Alert Badge */}
                    {item.isCritical ? (
                      <LowStockBadge
                        currentStock={item.effectiveBalance}
                        safetyStockLevel={item.rule.safetyThreshold}
                        unit={item.rule.unit}
                        size="xs"
                        urgency="critical"
                        label="קריטי"
                      />
                    ) : item.isWarning ? (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/40">
                        אזהרה
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/30">
                        תקין
                      </span>
                    )}
                  </div>

                  {/* Effective Balance Display */}
                  <div className="my-2.5 flex items-baseline justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-muted-foreground">
                        יתרת רצפה אפקטיבית:
                      </div>
                      <div className="text-2xl lg:text-3xl font-black text-foreground tabular-nums tracking-tight flex items-baseline gap-1.5">
                        <span
                          className={cn(
                            item.isCritical
                              ? "text-rose-600 dark:text-rose-400 animate-pulse"
                              : item.isWarning
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-foreground",
                          )}
                        >
                          {item.effectiveBalance}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground">
                          {item.rule.unit}
                        </span>
                      </div>
                    </div>

                    <div className="text-left font-mono text-[11px] font-bold text-muted-foreground tabular-nums">
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {item.percentRemaining}%
                      </span>{" "}
                      נותר
                    </div>
                  </div>

                  {/* Dynamic Colorful Progress Bar */}
                  <div className="space-y-1 my-2">
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden p-0.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentRemaining}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className={cn(
                          "h-full rounded-full transition-all",
                          item.isCritical
                            ? "bg-gradient-to-r from-rose-600 to-red-500 shadow-sm shadow-rose-500/50"
                            : item.isWarning
                              ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                              : "bg-gradient-to-r from-emerald-500 to-teal-400",
                        )}
                      />
                    </div>
                  </div>

                  {/* Breakdown of Actual Drawn vs Reserved in preparation */}
                  <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-muted/40 border border-border/40 text-[10px] text-muted-foreground my-2">
                    <div>
                      <span>נמשך בפועל: </span>
                      <b className="text-foreground tabular-nums">
                        {item.actualDrawn} {item.rule.unit}
                      </b>
                    </div>
                    <div>
                      <span>משוריין בהכנה: </span>
                      <b className="text-primary tabular-nums">
                        {item.reserved} {item.rule.unit}
                      </b>
                    </div>
                  </div>
                </div>

                {/* Card Footer: Deficit & Pallets required */}
                <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                  {item.deficitToRefill > 0 ? (
                    <div className="flex items-center gap-1 text-amber-700 dark:text-amber-300 font-bold leading-tight">
                      <ArrowDownRight className="size-3.5 shrink-0 text-amber-500" />
                      <span>
                        חסר לבסיס:{" "}
                        <b>
                          {item.deficitToRefill} {item.rule.unit}
                        </b>{" "}
                        (~{item.palletsToRefill} משטחים)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      <span>מלאי רצפה מעל סף היעד</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* 4. Smart Logistics Insights Panel & Rapid WhatsApp Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 border-t border-border/60 pt-3">
        {/* Insight 1: Burn Rate (קצב צריכה) */}
        <div className="rounded-2xl border border-border/40 bg-card/85 p-3.5 shadow-sm backdrop-blur-md flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/30">
            <Clock className="size-5" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-black text-purple-700 dark:text-purple-300">
              קצב צריכה שעתי (Burn Rate): {kpis.burnRatePerHour} יח'/שעה
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
              {insights.burnRateSummary} הפריט הנמשך ביותר:{" "}
              <b className="text-foreground">{kpis.fastestMovingItemName}</b>.
            </p>
          </div>
        </div>

        {/* Insight 2: Transport Load Alert (התראת עומס שינוע) */}
        <div
          className={cn(
            "rounded-2xl border p-3.5 shadow-sm backdrop-blur-md flex items-center gap-3 transition",
            insights.isOverCapacityAlert
              ? "border-cyan-500/50 bg-cyan-500/10 dark:bg-cyan-950/20"
              : "border-border/40 bg-card/85",
          )}
        >
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30">
            <Truck className="size-5" />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-black text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5">
              <span>התראת עומס שינוע: {kpis.fullTrailersRequired} פול-טריילר/ים</span>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
              {insights.transportAdvice}
            </p>
          </div>
        </div>

        {/* Action 3: Rapid Procurement Dispatch via WhatsApp */}
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/20 p-3.5 shadow-sm backdrop-blur-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
              <Send className="size-5" />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-black text-emerald-700 dark:text-emerald-300 truncate">
                הפקת דרישת רכש לוואטסאפ
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {insights.priorityReplenishItems.length > 0
                  ? `${insights.priorityReplenishItems.length} פריטים דורשים חידוש מיידי`
                  : "כל הפריטים מעל סף הביטחון"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowWaPreview(!showWaPreview)}
              className="rounded-xl bg-secondary px-2.5 py-1.5 text-[11px] font-bold text-foreground hover:bg-secondary/80 transition"
              title="הצג תצוגה מקדימה של ההודעה"
            >
              {showWaPreview ? "הסתר" : "הצג"}
            </button>
            <a
              href={insights.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-500 active:scale-95"
            >
              <span>שלח</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </div>

      {/* WhatsApp Message Preview Drawer / Modal */}
      {showWaPreview && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="rounded-2xl border border-border/80 bg-card p-4 shadow-xl text-xs space-y-2 max-h-48 overflow-y-auto"
        >
          <div className="flex items-center justify-between font-bold text-muted-foreground border-b border-border/40 pb-1">
            <span>תצוגה מקדימה של נוסח דרישת הרכש הנשלח לוואטסאפ:</span>
            <button
              onClick={() => setShowWaPreview(false)}
              className="text-muted-foreground hover:text-foreground text-[11px]"
            >
              סגור
            </button>
          </div>
          <pre className="font-mono text-[11px] whitespace-pre-wrap text-foreground/90 leading-relaxed bg-muted/40 p-2.5 rounded-xl">
            {insights.whatsappProcurementText}
          </pre>
        </motion.div>
      )}
    </motion.div>
  );
}
