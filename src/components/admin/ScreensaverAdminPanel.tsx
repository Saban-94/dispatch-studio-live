import React from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Layers,
  Monitor,
  Package,
  Play,
  RefreshCw,
  RotateCcw,
  Sliders,
  Sparkles,
  Truck,
  Warehouse,
} from "lucide-react";
import { useAdminControl } from "@/context/AdminControlContext";
import { useDispatchBoard } from "@/context/DispatchContext";
import type { ScreensaverBranchFilter } from "@/types/screensaver";
import { cn } from "@/lib/utils";

interface ScreensaverAdminPanelProps {
  onClose?: () => void;
}

export function ScreensaverAdminPanel({ onClose }: ScreensaverAdminPanelProps) {
  const {
    settings,
    activeSlides,
    toggleSlide,
    setSlideDuration,
    moveSlide,
    setBranchFilter,
    setPrioritizeCritical,
    setProductSlideInterval,
    setPauseOnHover,
    resetToDefaults,
  } = useAdminControl();

  const { setScreensaverActive } = useDispatchBoard();

  // Total cycle duration across enabled slides
  const totalCycleDuration = activeSlides.reduce((acc, s) => acc + s.durationSeconds, 0);

  const handleLaunchScreensaver = () => {
    onClose?.();
    setScreensaverActive(true);
  };

  return (
    <div className="flex flex-col gap-6 text-foreground p-1 md:p-2" id="screensaver-admin-panel">
      {/* Header & Quick Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sliders className="size-5" />
            </div>
            <h2 className="text-xl font-black text-foreground">ניהול שומר מסך וסבב שקופיות</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            שליטה מלאה בשקופיות הטלוויזיה, זמני שהייה, סינון לפי סניף, ותעדוף חוסרים קריטיים
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all shadow-sm"
            title="איפוס כל ההגדרות לברירת מחדל"
          >
            <RotateCcw className="size-3.5" />
            <span>איפוס</span>
          </button>

          <button
            onClick={handleLaunchScreensaver}
            className="flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 text-xs font-black shadow-md transition hover:scale-105"
            title="הפעלת שומר המסך כעת לבדיקה חיה"
            id="btn-launch-screensaver-preview"
          >
            <Play className="size-4 fill-current" />
            <span>הפעל שומר מסך כעת</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex flex-col rounded-xl border border-border/70 bg-card/60 p-3.5 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">שקופיות פעילות</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-black text-foreground tabular-nums">
              {activeSlides.length}
            </span>
            <span className="text-xs text-muted-foreground">מתוך {settings.slides.length}</span>
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-border/70 bg-card/60 p-3.5 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">משך סבב מלא</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-black text-primary tabular-nums">
              {totalCycleDuration}
            </span>
            <span className="text-xs text-muted-foreground">שניות לסבב</span>
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-border/70 bg-card/60 p-3.5 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">סניף פעיל בשומר מסך</span>
          <div className="flex items-center gap-1.5 mt-1 text-sm font-black text-accent truncate">
            <Warehouse className="size-4 shrink-0" />
            <span className="truncate">
              {settings.branchFilter === "branch_4"
                ? "מגרש 4 החרש"
                : settings.branchFilter === "branch_1"
                  ? "סניף 1 התלמיד"
                  : "כל הסניפים"}
            </span>
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-border/70 bg-card/60 p-3.5 shadow-sm">
          <span className="text-xs font-medium text-muted-foreground">תעדוף חוסר קריטי</span>
          <div className="flex items-center gap-1.5 mt-1 text-sm font-black text-emerald-500">
            {settings.prioritizeCriticalProducts ? (
              <>
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                <span>מופעל ראשון</span>
              </>
            ) : (
              <span className="text-muted-foreground">סדר רגיל</span>
            )}
          </div>
        </div>
      </div>

      {/* Global Branch Filter Selector */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Warehouse className="size-4 text-primary" />
            <h3 className="text-sm font-black text-foreground">שיוך וסינון סניף לתצוגה</h3>
          </div>
          <span className="text-xs text-muted-foreground">קובע אילו פריטי מגרש יוצגו בשקופיות</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            onClick={() => setBranchFilter("branch_4")}
            className={cn(
              "flex flex-col items-start p-3.5 rounded-xl border text-right transition-all",
              settings.branchFilter === "branch_4"
                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary shadow-sm"
                : "border-border bg-card/60 text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <div className="flex items-center gap-2 font-black text-sm text-foreground">
              <span>מגרש 4 - החרש</span>
              {settings.branchFilter === "branch_4" && (
                <span className="size-2 rounded-full bg-primary" />
              )}
            </div>
            <span className="text-xs text-muted-foreground mt-0.5">
              מומלץ למסכי המגרש והרציף (חומרי מגרש)
            </span>
          </button>

          <button
            onClick={() => setBranchFilter("branch_1")}
            className={cn(
              "flex flex-col items-start p-3.5 rounded-xl border text-right transition-all",
              settings.branchFilter === "branch_1"
                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary shadow-sm"
                : "border-border bg-card/60 text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <div className="flex items-center gap-2 font-black text-sm text-foreground">
              <span>סניף 1 - התלמיד</span>
              {settings.branchFilter === "branch_1" && (
                <span className="size-2 rounded-full bg-primary" />
              )}
            </div>
            <span className="text-xs text-muted-foreground mt-0.5">הזמנות ומשיכות סניף התלמיד</span>
          </button>

          <button
            onClick={() => setBranchFilter("all")}
            className={cn(
              "flex flex-col items-start p-3.5 rounded-xl border text-right transition-all",
              settings.branchFilter === "all"
                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary shadow-sm"
                : "border-border bg-card/60 text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <div className="flex items-center gap-2 font-black text-sm text-foreground">
              <span>כל הסניפים (מאוחד)</span>
              {settings.branchFilter === "all" && (
                <span className="size-2 rounded-full bg-primary" />
              )}
            </div>
            <span className="text-xs text-muted-foreground mt-0.5">
              חישוב משיכות מלאי רוחבי כולל
            </span>
          </button>
        </div>
      </div>

      {/* Product Carousel Specific Settings */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Package className="size-4 text-primary" />
          <h3 className="text-sm font-black text-foreground">
            הגדרות שקופיות מוצר חי (Product Carousel)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Prioritize Critical Products Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card/60">
            <div>
              <div className="text-sm font-black text-foreground">עדיפות לפריטים בחוסר קריטי</div>
              <div className="text-xs text-muted-foreground">
                הצגת חומרים מתחת לסף ביטחון בראש הסבב
              </div>
            </div>

            <button
              onClick={() => setPrioritizeCritical(!settings.prioritizeCriticalProducts)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                settings.prioritizeCriticalProducts ? "bg-primary" : "bg-secondary",
              )}
              role="switch"
              aria-checked={settings.prioritizeCriticalProducts}
            >
              <span
                className={cn(
                  "inline-block size-4 transform rounded-full bg-white transition-transform",
                  settings.prioritizeCriticalProducts ? "-translate-x-6" : "-translate-x-1",
                )}
              />
            </button>
          </div>

          {/* Pause on Hover Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card/60">
            <div>
              <div className="text-sm font-black text-foreground">
                עצירת טיימר בעת מעבר עכבר (Pause on Hover)
              </div>
              <div className="text-xs text-muted-foreground">
                מאפשר לסדרן להתעמק בנתוני הפריט ללא מעבר שקופית
              </div>
            </div>

            <button
              onClick={() => setPauseOnHover(!settings.pauseOnHover)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                settings.pauseOnHover ? "bg-primary" : "bg-secondary",
              )}
              role="switch"
              aria-checked={settings.pauseOnHover}
            >
              <span
                className={cn(
                  "inline-block size-4 transform rounded-full bg-white transition-transform",
                  settings.pauseOnHover ? "-translate-x-6" : "-translate-x-1",
                )}
              />
            </button>
          </div>

          {/* Dwell time per product slide */}
          <div className="md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/70 bg-card/60">
            <div>
              <div className="text-sm font-black text-foreground">
                זמן שהייה פר שקופית מוצר בסבב
              </div>
              <div className="text-xs text-muted-foreground">
                כמה שניות כל כרטיס מוצר מוצג לפני מעבר אוטומטי למוצר הבא
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="range"
                min="5"
                max="30"
                step="1"
                value={settings.productSlideIntervalSeconds}
                onChange={(e) => setProductSlideInterval(Number(e.target.value))}
                className="w-36 accent-primary"
              />
              <span className="w-16 rounded-lg bg-card border border-border px-2.5 py-1 text-center font-black text-primary text-sm tabular-nums shadow-sm">
                {settings.productSlideIntervalSeconds} שנ׳
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Slide Reorder & Dwell Configuration List */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <h3 className="text-sm font-black text-foreground">
              רשימת שקופיות, סדר הצגה וזמני שהייה אישיים
            </h3>
          </div>
          <span className="text-xs text-muted-foreground">
            השתמש בחיצים כדי לשנות את סדר ההצגה בטלוויזיה
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {settings.slides.map((slide, index) => {
            const isFirst = index === 0;
            const isLast = index === settings.slides.length - 1;

            return (
              <div
                key={slide.id}
                className={cn(
                  "flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-xl border p-3.5 transition-all",
                  slide.enabled
                    ? "border-border/90 bg-card shadow-sm"
                    : "border-border/40 bg-card/30 opacity-60",
                )}
              >
                {/* Left Side: Order Controls & Slide Info */}
                <div className="flex items-center gap-3">
                  {/* Order Index & Direction Buttons */}
                  <div className="flex items-center gap-1">
                    <span className="grid size-6 place-items-center rounded-lg bg-secondary text-xs font-black tabular-nums text-foreground">
                      {index + 1}
                    </span>

                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveSlide(slide.id, "up")}
                        disabled={isFirst}
                        className="grid size-5 place-items-center rounded bg-secondary/80 text-muted-foreground hover:bg-primary hover:text-primary-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        title="הזז למעלה"
                      >
                        <ArrowUp className="size-3" />
                      </button>
                      <button
                        onClick={() => moveSlide(slide.id, "down")}
                        disabled={isLast}
                        className="grid size-5 place-items-center rounded bg-secondary/80 text-muted-foreground hover:bg-primary hover:text-primary-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors"
                        title="הזז למטה"
                      >
                        <ArrowDown className="size-3" />
                      </button>
                    </div>
                  </div>

                  {/* Title, Badge & Description */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-foreground">{slide.title}</span>
                      {slide.badge && (
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {slide.badge}
                        </span>
                      )}
                      {!slide.enabled && (
                        <span className="rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold">
                          מוסתרת
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{slide.description}</p>
                  </div>
                </div>

                {/* Right Side: Dwell Time Slider & Toggle */}
                <div className="flex items-center gap-4 self-end md:self-auto w-full md:w-auto justify-between md:justify-end">
                  {/* Dwell Time Slider */}
                  <div className="flex items-center gap-2">
                    <Clock className="size-3.5 text-muted-foreground" />
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="1"
                      value={slide.durationSeconds}
                      onChange={(e) => setSlideDuration(slide.id, Number(e.target.value))}
                      disabled={!slide.enabled}
                      className="w-24 accent-primary disabled:opacity-30"
                      title="משך שהייה בשניות"
                    />
                    <span className="w-12 text-center text-xs font-black tabular-nums text-foreground">
                      {slide.durationSeconds} שנ׳
                    </span>
                  </div>

                  {/* Toggle On/Off */}
                  <button
                    onClick={() => toggleSlide(slide.id)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-all border",
                      slide.enabled
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/25"
                        : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80 hover:text-foreground",
                    )}
                    title={slide.enabled ? "הסתר שקופית" : "הפעל שקופית"}
                  >
                    {slide.enabled ? (
                      <>
                        <Eye className="size-3.5" />
                        <span>מוצגת</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="size-3.5" />
                        <span>מוסתרת</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
