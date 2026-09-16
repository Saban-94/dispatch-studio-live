import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Package,
  Pause,
  Play,
  Share2,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  Truck,
  Warehouse,
} from "lucide-react";
import type { Order } from "@/types/dispatch";
import type { NormalizedProductSlideItem, ScreensaverBranchFilter } from "@/types/screensaver";
import { getNormalizedProductSlideItems } from "@/services/inventoryService";
import { cn } from "@/lib/utils";

interface ProductSlideProps {
  orders: Order[];
  intervalSeconds?: number;
  branchFilter?: ScreensaverBranchFilter;
  prioritizeCritical?: boolean;
  pauseOnHover?: boolean;
  onCyclePauseChange?: (paused: boolean) => void;
}

export function ProductSlide({
  orders,
  intervalSeconds = 10,
  branchFilter = "all",
  prioritizeCritical = true,
  pauseOnHover = true,
  onCyclePauseChange,
}: ProductSlideProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  // Derive normalized product items
  const items: NormalizedProductSlideItem[] = useMemo(() => {
    return getNormalizedProductSlideItems(orders, branchFilter, prioritizeCritical);
  }, [orders, branchFilter, prioritizeCritical]);

  // Safe current item
  const currentItem = items[currentIndex] || items[0];

  const handleNext = useCallback(() => {
    if (items.length <= 1) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setProgress(0);
  }, [items.length]);

  const handlePrev = useCallback(() => {
    if (items.length <= 1) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setProgress(0);
  }, [items.length]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      onCyclePauseChange?.(next);
      return next;
    });
  }, [onCyclePauseChange]);

  // Dwell timer effect
  useEffect(() => {
    if (isPaused || items.length <= 1) return;

    const tickMs = 100;
    const totalMs = Math.max(3000, intervalSeconds * 1000);
    const step = (tickMs / totalMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev + step >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, tickMs);

    return () => clearInterval(timer);
  }, [isPaused, intervalSeconds, items.length, handleNext]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        handlePrev(); // RTL: right goes backward
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleNext(); // RTL: left goes forward
      } else if (e.key === " ") {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, togglePause]);

  if (!currentItem) {
    return (
      <div className="flex h-full w-full items-center justify-center p-12 text-center text-muted-foreground">
        <Package className="size-16 stroke-1 opacity-40 mb-4" />
        <p className="text-xl font-bold">לא אותרו פריטי מלאי פעילים לתצוגה כרגע</p>
      </div>
    );
  }

  // Stock status styles
  const isCritical = currentItem.isCritical;
  const isWarning = currentItem.isWarning;
  const isHealthy = !isCritical && !isWarning;

  const statusBadgeColor = isCritical
    ? "bg-rose-500/20 text-rose-300 border-rose-500/50"
    : isWarning
      ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/50";

  const progressFillColor = isCritical
    ? "bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400"
    : isWarning
      ? "bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400"
      : "bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400";

  // Build WhatsApp share URL for this single product
  const waMessage = [
    `*📋 עדכון משיכת מלאי יומי — ח. סבן*`,
    `*מוצר:* ${currentItem.cleanName} (מק"ט: ${currentItem.sku})`,
    `*מחסן:* ${currentItem.warehouseBranch}`,
    `*נמשך בפועל היום:* ${currentItem.actualDrawn} ${currentItem.unit}`,
    `*משוריין בהכנה:* ${currentItem.reserved} ${currentItem.unit}`,
    `*יתרת רצפה אפקטיבית:* ${currentItem.effectiveBalance} ${currentItem.unit} (סף ביטחון: ${currentItem.safetyThreshold} ${currentItem.unit})`,
    currentItem.isCritical || currentItem.isWarning
      ? `*👈 דרישת רכש להשלמה:* ${currentItem.deficitToRefill} ${currentItem.unit} (~${currentItem.palletsToRefill} משטחים)\n${currentItem.procurementAdvice}`
      : `✅ יתרת רצפה תקינה ומעל סף הביטחון.`,
  ].join("\n");

  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waMessage)}`;

  return (
    <div
      className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-b from-card/95 via-card/85 to-background/95 p-6 md:p-10 shadow-2xl backdrop-blur-xl"
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
      id="product-screensaver-slide-container"
    >
      {/* Top Banner: Progress Bar & Slide Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-black text-primary">
              <Sparkles className="size-3.5" />
              <span>שומר מסך · שקופיות מוצר חי</span>
            </span>

            <span className="flex items-center gap-1.5 rounded-xl border border-border bg-card/60 px-3 py-1.5 text-xs font-bold text-muted-foreground">
              <Warehouse className="size-3.5 text-accent" />
              <span>{currentItem.warehouseBranch}</span>
            </span>

            {isCritical && (
              <span className="flex items-center gap-1.5 rounded-xl border border-rose-500/50 bg-rose-500/20 px-3 py-1.5 text-xs font-black text-rose-400 animate-pulse">
                <ShieldAlert className="size-3.5" />
                <span>חוסר קריטי ברצפה</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Slide Index Indicator */}
            <div className="rounded-xl border border-border bg-card/70 px-3 py-1 text-xs font-black tabular-nums text-foreground">
              {currentIndex + 1} / {items.length}
            </div>

            {/* Play/Pause Button */}
            <button
              onClick={togglePause}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card/70 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary hover:text-primary transition-all shadow-sm"
              title={isPaused ? "המשך סבב" : "עצור סבב שקופיות"}
              id="btn-toggle-carousel-pause"
            >
              {isPaused ? (
                <>
                  <Play className="size-3.5 text-emerald-400" />
                  <span>המשך</span>
                </>
              ) : (
                <>
                  <Pause className="size-3.5 text-amber-400" />
                  <span>השהה</span>
                </>
              )}
            </button>

            {/* Manual Navigation Arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                className="grid size-8 place-items-center rounded-xl border border-border bg-card/80 text-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
                title="מוצר קודם"
                aria-label="מוצר קודם"
              >
                <ChevronRight className="size-4" />
              </button>
              <button
                onClick={handleNext}
                className="grid size-8 place-items-center rounded-xl border border-border bg-card/80 text-foreground hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
                title="מוצר הבא"
                aria-label="מוצר הבא"
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Dwell Progress Bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/50">
          <motion.div
            className={cn(
              "h-full rounded-full transition-all duration-100",
              isPaused ? "bg-amber-500/50" : "bg-primary",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Main Slide Content with Animated Presence */}
      <div className="relative my-auto py-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentItem.sku + currentItem.cleanName}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
          >
            {/* Right Column: Hero Visual & Specs (5 Cols in RTL) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="group relative overflow-hidden rounded-3xl border border-border/80 bg-card/50 shadow-xl aspect-video lg:aspect-[4/3] flex items-center justify-center">
                <img
                  src={currentItem.imageUrl}
                  alt={currentItem.cleanName}
                  className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                {/* SKU Badge Floating */}
                <div className="absolute top-4 right-4 flex items-center gap-2 rounded-2xl border border-white/20 bg-black/60 px-4 py-2 text-sm font-black text-white backdrop-blur-md shadow-lg">
                  <Package className="size-4 text-primary" />
                  <span>מק״ט: {currentItem.sku}</span>
                </div>

                {/* Units per Pallet Info Floating */}
                <div className="absolute bottom-4 right-4 left-4 flex items-center justify-between text-white/90 text-xs font-bold">
                  <span className="flex items-center gap-1.5 rounded-xl bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                    <Layers className="size-3.5 text-accent" />
                    <span>
                      {currentItem.unitsPerPallet} {currentItem.unit} במשטח מלא
                    </span>
                  </span>

                  <span
                    className={cn(
                      "rounded-xl px-3 py-1.5 font-black border backdrop-blur-sm",
                      statusBadgeColor,
                    )}
                  >
                    {isCritical ? "רצפה קריטית" : isWarning ? "אזהרת מלאי" : "מלאי תקין"}
                  </span>
                </div>
              </div>

              {/* Baseline & Safety Stock Mini Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card/60 p-3 text-center">
                  <span className="text-xs font-medium text-muted-foreground">בסיס פתיחת יום</span>
                  <span className="text-xl font-black text-foreground tabular-nums">
                    {currentItem.initialBase}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{currentItem.unit}</span>
                </div>

                <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card/60 p-3 text-center">
                  <span className="text-xs font-medium text-muted-foreground">סף ביטחון רצפה</span>
                  <span className="text-xl font-black text-amber-500 tabular-nums">
                    {currentItem.safetyThreshold}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {currentItem.unit} מינימום
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card/60 p-3 text-center">
                  <span className="text-xs font-medium text-muted-foreground">הזמנות יומיות</span>
                  <span className="text-xl font-black text-primary tabular-nums">
                    {currentItem.ordersCount}
                  </span>
                  <span className="text-[10px] text-muted-foreground">הזמנות שמשכו פריט</span>
                </div>
              </div>
            </div>

            {/* Left Column: Live Metrics, Progress Bar, Procurement Advice (7 Cols in RTL) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Product Title & Brand */}
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-xs font-bold text-muted-foreground">
                    חומרי בניין ח. סבן · מגרש הפצה חי
                  </span>
                  <span className="text-xs font-black text-accent bg-accent/15 px-2.5 py-0.5 rounded-md">
                    {currentItem.warehouseBranch}
                  </span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
                  {currentItem.cleanName}
                </h2>
              </div>

              {/* Primary Live Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Metric 1: Actual Drawn */}
                <div className="flex flex-col rounded-2xl border border-border/80 bg-card/70 p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
                    <span>נמשך בפועל היום</span>
                    <Truck className="size-4 text-emerald-500" />
                  </div>
                  <div className="text-3xl md:text-4xl font-black text-emerald-500 tabular-nums">
                    {currentItem.actualDrawn}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {currentItem.unit} (הועמס / יצא / סופק)
                  </span>
                </div>

                {/* Metric 2: Reserved in Preparation */}
                <div className="flex flex-col rounded-2xl border border-border/80 bg-card/70 p-4 shadow-sm">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
                    <span>משוריין בהכנה</span>
                    <Package className="size-4 text-amber-500" />
                  </div>
                  <div className="text-3xl md:text-4xl font-black text-amber-500 tabular-nums">
                    {currentItem.reserved}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {currentItem.unit} (בסידור וליקוט פעיל)
                  </span>
                </div>

                {/* Metric 3: Effective Floor Balance */}
                <div
                  className={cn(
                    "col-span-2 md:col-span-1 flex flex-col rounded-2xl border p-4 shadow-md",
                    isCritical
                      ? "border-rose-500/50 bg-rose-500/10"
                      : isWarning
                        ? "border-amber-500/50 bg-amber-500/10"
                        : "border-emerald-500/50 bg-emerald-500/10",
                  )}
                >
                  <div className="flex items-center justify-between text-xs font-bold text-foreground mb-1">
                    <span>יתרת רצפה נוכחית</span>
                    {isCritical ? (
                      <AlertTriangle className="size-4 text-rose-500 animate-bounce" />
                    ) : (
                      <CheckCircle2 className="size-4 text-emerald-500" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "text-3xl md:text-4xl font-black tabular-nums",
                      isCritical
                        ? "text-rose-400"
                        : isWarning
                          ? "text-amber-400"
                          : "text-emerald-400",
                    )}
                  >
                    {currentItem.effectiveBalance}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {currentItem.unit} נותרו במגרש ({currentItem.percentRemaining}%)
                  </span>
                </div>
              </div>

              {/* Graphical Progress Bar: Remaining Floor Stock */}
              <div className="flex flex-col gap-2 rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="text-muted-foreground">רמת מלאי רצפה נוכחית:</span>
                  <span
                    className={cn(
                      "font-black tabular-nums text-base",
                      isCritical
                        ? "text-rose-400"
                        : isWarning
                          ? "text-amber-400"
                          : "text-emerald-400",
                    )}
                  >
                    {currentItem.percentRemaining}% נותרו
                  </span>
                </div>

                <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary/80 p-0.5">
                  <motion.div
                    className={cn("h-full rounded-full shadow-inner", progressFillColor)}
                    initial={{ width: 0 }}
                    animate={{ width: `${currentItem.percentRemaining}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                  {/* Safety Stock Marker on progress bar */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-foreground/70 z-10"
                    style={{
                      left: `${Math.round((currentItem.safetyThreshold / currentItem.initialBase) * 100)}%`,
                    }}
                    title={`סף ביטחון: ${currentItem.safetyThreshold} ${currentItem.unit}`}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>0 יח׳ (אזל)</span>
                  <span className="font-bold text-amber-500">
                    קו סף ביטחון: {currentItem.safetyThreshold} {currentItem.unit}
                  </span>
                  <span>
                    בסיס מלא: {currentItem.initialBase} {currentItem.unit}
                  </span>
                </div>
              </div>

              {/* Automated Procurement Insight Card (תובנת רכש אוטומטית) */}
              <div
                className={cn(
                  "flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl border p-5 shadow-lg",
                  isCritical
                    ? "border-rose-500/60 bg-gradient-to-r from-rose-950/40 via-rose-900/20 to-card"
                    : isWarning
                      ? "border-amber-500/60 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-card"
                      : "border-emerald-500/50 bg-gradient-to-r from-emerald-950/30 via-emerald-900/10 to-card",
                )}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={cn(
                      "grid size-12 place-items-center rounded-2xl shrink-0 shadow-md",
                      isCritical
                        ? "bg-rose-500 text-white"
                        : isWarning
                          ? "bg-amber-500 text-slate-950"
                          : "bg-emerald-500 text-white",
                    )}
                  >
                    {currentItem.requiresFullTrailer ? (
                      <Truck className="size-6 animate-pulse" />
                    ) : isCritical ? (
                      <AlertTriangle className="size-6" />
                    ) : (
                      <CheckCircle2 className="size-6" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-foreground">
                      {currentItem.requiresFullTrailer
                        ? "🚨 דרוש פול-טריילר מיידי (24 משטחים)"
                        : isCritical
                          ? "⚠️ דרישת רכש דחופה להשלמת בסיס רצפה"
                          : isWarning
                            ? "⚡ התראת רכש: מלאי מתקרב לסף הביטחון"
                            : "✅ מצב מלאי רצפה תקין ומאוזן"}
                    </h3>
                    <p className="text-sm font-medium text-muted-foreground mt-0.5">
                      {currentItem.procurementAdvice}
                      {currentItem.deficitToRefill > 0 && (
                        <span className="font-bold text-foreground mr-1">
                          (חוסר של {currentItem.deficitToRefill} {currentItem.unit} /{" "}
                          {currentItem.palletsToRefill} משטחים)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Direct WhatsApp Action Button */}
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs font-black shadow-md transition hover:scale-105 shrink-0"
                  title="שליחת דרישת רכש עבור פריט זה לוואטסאפ"
                >
                  <Share2 className="size-4" />
                  <span>שליחת רכש בוואטסאפ</span>
                </a>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Thumbnail Strip / Dots for Rapid Navigation */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/60">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-2xl">
          {items.map((item, idx) => {
            const isSel = idx === currentIndex;
            return (
              <button
                key={item.sku}
                onClick={() => {
                  setDirection(idx > currentIndex ? 1 : -1);
                  setCurrentIndex(idx);
                  setProgress(0);
                }}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shrink-0 border",
                  isSel
                    ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                    : item.isCritical
                      ? "bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25"
                      : "bg-card/70 text-muted-foreground border-border hover:bg-secondary hover:text-foreground",
                )}
                title={`${item.cleanName} (${item.sku})`}
              >
                <span>{item.cleanName.slice(0, 16)}</span>
                {item.isCritical && (
                  <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Status Hint */}
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span>מקשים: ◄ ► למעבר · רווח להשהיה</span>
          {isPaused && (
            <span className="rounded-lg bg-amber-500/20 px-2 py-0.5 text-amber-400 font-bold">
              מושהה
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
