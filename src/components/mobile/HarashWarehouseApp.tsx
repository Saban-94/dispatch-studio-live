import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Warehouse,
  Truck,
  Package,
  Boxes,
  AlertTriangle,
  RotateCcw,
  Plus,
  Minus,
  Layers,
  Sun,
  Moon,
  X,
  MapPin,
  Share2,
} from "lucide-react";
import type { Order } from "@/types/dispatch";
import { cn } from "@/lib/utils";

interface HarashWarehouseAppProps {
  orders: Order[];
  onUpdateOrderStatus?: (orderId: string, status: string) => Promise<void> | void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const BEIT_HATIT_PHONE = "972500000000";

interface TruckDraft {
  sandBags: number;
  sumsumBags: number;
  titBags: number;
  sandSmallPallets: number;
  sumsumSmallPallets: number;
}

interface InventoryState {
  sandBags: number;
  sumsumBags: number;
  titBags: number;
  cementBags: number;
  blocks20: number;
  blocks10: number;
}

export function HarashWarehouseApp({
  orders = [],
  onUpdateOrderStatus,
  onRefresh,
  isRefreshing = false,
}: HarashWarehouseAppProps) {
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

  const [activeTab, setActiveTab] = useState<"orders" | "truck_builder" | "stock">("orders");

  // סינון קשיח למחסן 4 החרש
  const harashOrders = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    return list.filter((o) => {
      const w = String(o?.warehouse || (o as any)?.branch || "");
      return w.includes("החרש") || w.includes("4");
    });
  }, [orders]);

  const pickingOrders = useMemo(() => {
    return harashOrders.filter((o) =>
      ["בסידור עבודה", "בהכנה", "ממתין", "בהמתנה"].some(
        (st) => o?.status?.trim() === st || (o as any)?.stage?.trim() === st
      )
    );
  }, [harashOrders]);

  const readyOrders = useMemo(() => {
    return harashOrders.filter((o) =>
      ["מוכן להעמסה", "בהעמסה", "יצא לדרך"].some(
        (st) => o?.status?.trim() === st || (o as any)?.stage?.trim() === st
      )
    );
  }, [harashOrders]);

  const [floorStock, setFloorStock] = useState<InventoryState>({
    sandBags: 18,
    sumsumBags: 14,
    titBags: 8,
    cementBags: 160,
    blocks20: 300,
    blocks10: 200,
  });

  const [truckDraft, setTruckDraft] = useState<TruckDraft>({
    sandBags: 0,
    sumsumBags: 0,
    titBags: 0,
    sandSmallPallets: 0,
    sumsumSmallPallets: 0,
  });

  // מזהי הזמנות שנסגרו עם גיבוי ב-sessionStorage למניעת הצפה חוזרת
  const [dismissedAlertOrderIds, setDismissedAlertOrderIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("saban_dismissed_alerts");
        return saved ? new Set(JSON.parse(saved)) : new Set();
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  const [activeAlert, setActiveAlert] = useState<{
    orderId: string;
    client: string;
    sumsumCount: number;
  } | null>(null);

  useEffect(() => {
    if (activeAlert) return;

    for (const order of harashOrders) {
      const orderId = String(order?.orderId || (order as any)?.id || "");
      if (!orderId || dismissedAlertOrderIds.has(orderId)) continue;

      const itemsText = Array.isArray(order?.items)
        ? order.items.map((i) => i?.name || "").join(" ")
        : "";
      const rawSummary = `${itemsText} ${(order as any)?.productsSummary || ""} ${(order as any)?.itemsFormatted || ""}`;
      const match = rawSummary.match(/([0-9]+)\s*(?:בלות|בלה|שק גדול)?\s*סומסום/);

      if (match) {
        const count = parseInt(match[1], 10);
        if (count >= 10) {
          setActiveAlert({
            orderId,
            client: order?.customerName || (order as any)?.client || "לקוח",
            sumsumCount: count,
          });
          break;
        }
      }
    }
  }, [harashOrders, dismissedAlertOrderIds, activeAlert]);

  const handleDismissAlert = (orderId: string) => {
    setDismissedAlertOrderIds((prev) => {
      const next = new Set(prev).add(orderId);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem("saban_dismissed_alerts", JSON.stringify(Array.from(next)));
        } catch {}
      }
      return next;
    });
    setActiveAlert(null);
  };

  const handleAddBalesToDraft = (orderId: string, count: number) => {
    setTruckDraft((prev) => ({
      ...prev,
      sumsumBags: prev.sumsumBags + count,
    }));
    handleDismissAlert(orderId);
    setActiveTab("truck_builder");
  };

  const totalDraftBags = truckDraft.sandBags + truckDraft.sumsumBags + truckDraft.titBags;
  const totalSmallPallets = truckDraft.sandSmallPallets + truckDraft.sumsumSmallPallets;
  const isFullTruck = totalDraftBags >= 30;

  const sendBeitHatitWhatsApp = () => {
    const text = [
      `*הזמנת אספקה — ח.סבן (מחסן 4 החרש)*`,
      `איש קשר לפריקה: אורן / תמיר`,
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
    <div dir="rtl" className="flex flex-col h-screen w-full select-none overflow-hidden bg-background text-foreground font-sans">
      <header className="sticky top-0 z-30 flex flex-col border-b border-border/80 bg-card/95 px-4 pt-3 pb-2.5 backdrop-blur-xl shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-11 place-items-center rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 shadow-inner shrink-0">
              <Warehouse className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black tracking-tight leading-tight">מחסן 4 החרש</h1>
                <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-black text-amber-500">אורן ותמיר</span>
              </div>
              <p className="text-xs font-bold text-muted-foreground flex items-center gap-1 mt-0.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                <span>מחובר ישיר לסדרן ח.סבן</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className={cn(
                "h-10 px-3 flex items-center gap-1.5 rounded-xl border font-black text-xs transition active:scale-95 shadow-sm",
                isDark ? "border-amber-400/50 bg-amber-400/15 text-amber-300" : "border-slate-300 bg-slate-100 text-slate-800"
              )}
            >
              {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-slate-700" />}
              <span>{isDark ? "יום" : "לילה"}</span>
            </button>

            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="grid size-10 place-items-center rounded-xl border border-border bg-card text-foreground transition active:scale-95 shadow-sm"
              title="רענן הזמנות"
            >
              <RotateCcw className={cn("size-4", isRefreshing && "animate-spin")} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-border/60 text-[11px] font-bold">
          <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-2.5 py-1.5 border border-border/50">
            <span className="text-muted-foreground">חכמת (מרצדס מנוף):</span>
            <span className="text-amber-500 font-black">עד 12T / 18 בלות</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-2.5 py-1.5 border border-border/50">
            <span className="text-muted-foreground">עלי (איסוזו פלטה):</span>
            <span className="text-primary font-black">עד 5.5T (ללא פקדון)</span>
          </div>
        </div>
      </header>

      {/* Popup התרעה דחופה ל-10 בלות סומסום - מודאל מרכזי צף וסגיר במגע */}
      <AnimatePresence>
        {activeAlert && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => handleDismissAlert(activeAlert.orderId)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border-2 border-rose-500 bg-rose-950 p-5 text-white shadow-2xl relative"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="size-7 text-rose-400 animate-bounce shrink-0" />
                  <div>
                    <h2 className="text-sm font-black text-rose-200 leading-snug">
                      התראת עומס משיכה — 10 בלות סומסום!
                    </h2>
                    <p className="text-xs font-semibold text-white/90 mt-1">
                      הזמנה #{activeAlert.orderId} עבור {activeAlert.client} כוללת {activeAlert.sumsumCount} בלות סומסום.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDismissAlert(activeAlert.orderId)}
                  className="grid size-8 place-items-center rounded-xl bg-white/10 text-white/80 hover:bg-white/20 active:scale-90"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-rose-500/40">
                <button
                  type="button"
                  onClick={() => handleAddBalesToDraft(activeAlert.orderId, activeAlert.sumsumCount)}
                  className="w-full h-11 rounded-xl bg-white text-slate-950 font-black text-xs shadow-lg active:scale-95 transition"
                >
                  הוסף {activeAlert.sumsumCount} בלות למשאית בית הטיט
                </button>
                <button
                  type="button"
                  onClick={() => handleDismissAlert(activeAlert.orderId)}
                  className="w-full h-10 rounded-xl bg-white/15 text-white font-bold text-xs hover:bg-white/20 active:scale-95 transition"
                >
                  התעלם וסגור
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto px-4 py-3 pb-24">
        {activeTab === "orders" && (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between text-xs font-black text-muted-foreground px-1">
              <span>הזמנות להכנה בחצר ({pickingOrders.length})</span>
              <span>מוכן להעמסה ({readyOrders.length})</span>
            </div>

            {harashOrders.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground">
                <Package className="size-12 stroke-1 opacity-40 mx-auto mb-2" />
                <p className="font-bold">אין הזמנות פעילות למחסן 4 החרש כרגע</p>
              </div>
            ) : (
              harashOrders.map((order) => {
                const oId = String(order?.orderId || (order as any)?.id || "");
                return (
                  <HarashOrderCard
                    key={oId}
                    order={order}
                    onAdvanceStatus={(status) => onUpdateOrderStatus?.(oId, status)}
                  />
                );
              })
            )}
          </div>
        )}

        {activeTab === "truck_builder" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-border/80 bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-black flex items-center gap-2">
                  <Truck className="size-5 text-primary" />
                  <span>הרכבת משאית לספק בית הטיט</span>
                </h2>
                <span className="text-xs font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                  עד 30 בלות למשאית
                </span>
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-muted-foreground">תפוסת בלות במשאית:</span>
                  <span className={cn("font-black", isFullTruck ? "text-emerald-500" : "text-amber-500")}>
                    {totalDraftBags} / 30 בלות ({Math.round((totalDraftBags / 30) * 100)}%)
                  </span>
                </div>
                <div className="h-3 w-full bg-secondary rounded-full overflow-hidden p-0.5">
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

            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl border border-border bg-card p-3 text-center flex flex-col justify-between">
                <span className="text-xs font-bold text-muted-foreground">בלות חול</span>
                <span className="text-2xl font-black text-foreground my-1">{truckDraft.sandBags}</span>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTruckDraft((p) => ({ ...p, sandBags: Math.max(0, p.sandBags - 1) }))}
                    className="size-8 rounded-lg bg-secondary grid place-items-center"
                  >
                    <Minus className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTruckDraft((p) => ({ ...p, sandBags: p.sandBags + 1 }))}
                    className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-3 text-center flex flex-col justify-between">
                <span className="text-xs font-bold text-muted-foreground">בלות סומסום</span>
                <span className="text-2xl font-black text-foreground my-1">{truckDraft.sumsumBags}</span>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTruckDraft((p) => ({ ...p, sumsumBags: Math.max(0, p.sumsumBags - 1) }))}
                    className="size-8 rounded-lg bg-secondary grid place-items-center"
                  >
                    <Minus className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTruckDraft((p) => ({ ...p, sumsumBags: p.sumsumBags + 1 }))}
                    className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-3 text-center flex flex-col justify-between">
                <span className="text-xs font-bold text-muted-foreground">בלות טיט</span>
                <span className="text-2xl font-black text-foreground my-1">{truckDraft.titBags}</span>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTruckDraft((p) => ({ ...p, titBags: Math.max(0, p.titBags - 1) }))}
                    className="size-8 rounded-lg bg-secondary grid place-items-center"
                  >
                    <Minus className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTruckDraft((p) => ({ ...p, titBags: p.titBags + 1 }))}
                    className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/80 bg-card p-4 shadow-sm">
              <span className="text-xs font-black text-muted-foreground block mb-2">
                משטחי שקיות (אריזת יצרן: 70 שקיות למשטח):
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-secondary/40 border border-border/60">
                  <div>
                    <span className="text-xs font-bold block">משטח שק חול</span>
                    <span className="text-[10px] text-muted-foreground">70 שק במשטח</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTruckDraft((p) => ({ ...p, sandSmallPallets: Math.max(0, p.sandSmallPallets - 1) }))}
                      className="size-7 rounded-lg bg-secondary grid place-items-center"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="font-black text-sm">{truckDraft.sandSmallPallets}</span>
                    <button
                      type="button"
                      onClick={() => setTruckDraft((p) => ({ ...p, sandSmallPallets: p.sandSmallPallets + 1 }))}
                      className="size-7 rounded-lg bg-primary text-primary-foreground grid place-items-center"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-secondary/40 border border-border/60">
                  <div>
                    <span className="text-xs font-bold block">משטח שק סומסום</span>
                    <span className="text-[10px] text-muted-foreground">70 שק במשטח</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTruckDraft((p) => ({ ...p, sumsumSmallPallets: Math.max(0, p.sumsumSmallPallets - 1) }))}
                      className="size-7 rounded-lg bg-secondary grid place-items-center"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="font-black text-sm">{truckDraft.sumsumSmallPallets}</span>
                    <button
                      type="button"
                      onClick={() => setTruckDraft((p) => ({ ...p, sumsumSmallPallets: p.sumsumSmallPallets + 1 }))}
                      className="size-7 rounded-lg bg-primary text-primary-foreground grid place-items-center"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={sendBeitHatitWhatsApp}
              disabled={totalDraftBags === 0 && totalSmallPallets === 0}
              className="h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition disabled:opacity-50"
            >
              <Share2 className="size-5" />
              <span>סגור משאית ושלח הזמנה לוואטסאפ בית הטיט</span>
            </button>
          </div>
        )}

        {activeTab === "stock" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-2xl bg-card border border-border/80 p-3 shadow-sm">
              <span className="text-xs font-black">ספירת מלאי רצפה מחסן 4</span>
              <button
                type="button"
                onClick={() => {
                  setFloorStock((p) => ({
                    ...p,
                    sandBags: p.sandBags + 15,
                    sumsumBags: p.sumsumBags + 15,
                  }));
                }}
                className="h-8 px-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs active:scale-95"
              >
                + קליטת משאית (30 בלות)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StockCounterCard
                label="בלות חול (11501)"
                count={floorStock.sandBags}
                onIncrement={() => setFloorStock((p) => ({ ...p, sandBags: p.sandBags + 1 }))}
                onDecrement={() => setFloorStock((p) => ({ ...p, sandBags: Math.max(0, p.sandBags - 1) }))}
              />
              <StockCounterCard
                label="בלות סומסום (11511)"
                count={floorStock.sumsumBags}
                onIncrement={() => setFloorStock((p) => ({ ...p, sumsumBags: p.sumsumBags + 1 }))}
                onDecrement={() => setFloorStock((p) => ({ ...p, sumsumBags: Math.max(0, p.sumsumBags - 1) }))}
              />
              <StockCounterCard
                label="מלט אפור 25 ק''ג (10002)"
                count={floorStock.cementBags}
                unit="שק"
                step={40}
                onIncrement={() => setFloorStock((p) => ({ ...p, cementBags: p.cementBags + 40 }))}
                onDecrement={() => setFloorStock((p) => ({ ...p, cementBags: Math.max(0, p.cementBags - 40) }))}
              />
              <StockCounterCard
                label="משטחי בלוק 20 (1.5 טון)"
                count={floorStock.blocks20}
                unit="יח'"
                step={75}
                onIncrement={() => setFloorStock((p) => ({ ...p, blocks20: p.blocks20 + 75 }))}
                onDecrement={() => setFloorStock((p) => ({ ...p, blocks20: Math.max(0, p.blocks20 - 75) }))}
              />
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border/80 bg-card/95 backdrop-blur-2xl px-4 py-2 shadow-2xl">
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={cn(
              "flex flex-col items-center justify-center h-14 rounded-2xl font-black text-xs transition active:scale-95",
              activeTab === "orders" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-secondary"
            )}
          >
            <Boxes className="size-5" />
            <span className="mt-1">הזמנות מגרש</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("truck_builder")}
            className={cn(
              "flex flex-col items-center justify-center h-14 rounded-2xl font-black text-xs transition active:scale-95 relative",
              activeTab === "truck_builder" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-secondary"
            )}
          >
            <Truck className="size-5" />
            <span className="mt-1">משאית בית הטיט</span>
            {totalDraftBags > 0 && (
              <span className="absolute top-1 left-2 size-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] grid place-items-center">
                {totalDraftBags}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("stock")}
            className={cn(
              "flex flex-col items-center justify-center h-14 rounded-2xl font-black text-xs transition active:scale-95",
              activeTab === "stock" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:bg-secondary"
            )}
          >
            <Layers className="size-5" />
            <span className="mt-1">מונה מלאי</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function HarashOrderCard({
  order,
  onAdvanceStatus,
}: {
  order: Order;
  onAdvanceStatus: (status: string) => void;
}) {
  const isHikmat = String(order?.driver || "").includes("חכמת");
  const isAli = String(order?.driver || "").includes("עלי");

  const orderId = String(order?.orderId || (order as any)?.id || "");
  const clientName = order?.customerName || (order as any)?.client || "לקוח כללי";
  const orderTime = order?.targetTime || (order as any)?.time || "היום";
  const destination = order?.city || (order as any)?.destination || "איסוף עצמי";

  const productsSummary = useMemo(() => {
    if ((order as any)?.productsSummary) return (order as any).productsSummary;
    if (Array.isArray(order?.items) && order.items.length > 0) {
      return order.items.map((i) => `${i.quantity} ${i.name}`).join(", ");
    }
    return (order as any)?.itemsFormatted || "אין פירוט פריטים";
  }, [order]);

  return (
    <div className="overflow-hidden rounded-3xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              #{orderId}
            </span>
            <span className="text-xs font-bold text-muted-foreground">{orderTime}</span>
          </div>
          <h3 className="text-base font-black text-foreground mt-1">{clientName}</h3>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "h-8 flex items-center rounded-xl px-2.5 text-xs font-black border",
              isHikmat ? "bg-amber-500/15 text-amber-500 border-amber-500/30" : "bg-primary/15 text-primary border-primary/30"
            )}
          >
            {order?.driver || "טרם שובץ נהג"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold mt-2">
        <MapPin className="size-3.5 text-primary shrink-0" />
        <span>{destination}</span>
      </div>

      <div className="rounded-2xl bg-secondary/35 p-2.5 my-2.5 text-xs font-bold text-foreground leading-relaxed">
        {productsSummary}
      </div>

      <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground py-1 border-t border-border/50">
        <span>
          {isHikmat
            ? "חכמת מרצדס מנוף: עד 12T / 18 בלות | בלוק 1.5T עם פקדון"
            : isAli
              ? "עלי איסוזו פלטה: עד 5.5T | ללא פקדונות"
              : "משאית רגילה"}
        </span>
        <button
          type="button"
          onClick={() => onAdvanceStatus(order.status === "מוכן להעמסה" ? "יצא לדרך" : "מוכן להעמסה")}
          className="h-8 px-3 rounded-xl bg-primary text-primary-foreground font-black text-xs active:scale-95 shadow-sm"
        >
          {order.status === "מוכן להעמסה" ? "סמן יצא לדרך" : "מוכן להעמסה"}
        </button>
      </div>
    </div>
  );
}

function StockCounterCard({
  label,
  count,
  unit = "בלות",
  step = 1,
  onIncrement,
  onDecrement,
}: {
  label: string;
  count: number;
  unit?: string;
  step?: number;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 flex flex-col justify-between shadow-sm">
      <span className="text-xs font-bold text-muted-foreground truncate">{label}</span>
      <div className="text-2xl font-black text-foreground my-2">
        {count} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onDecrement}
          className="flex-1 h-9 rounded-xl bg-secondary font-bold text-xs grid place-items-center active:scale-95"
        >
          -{step}
        </button>
        <button
          type="button"
          onClick={onIncrement}
          className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground font-bold text-xs grid place-items-center active:scale-95"
        >
          +{step}
        </button>
      </div>
    </div>
  );
}
