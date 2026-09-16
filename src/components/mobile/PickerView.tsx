
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
  AlertCircle,
  Check,
  Loader2,
  RefreshCw,
  CircleHelp,
} from "lucide-react";
import type { Order } from "@/types/dispatch";
import { InventoryDemandCard } from "./InventoryDemandCard";
import { cn } from "@/lib/utils";

interface PickerViewProps {
  orders: Order[];
  onUpdateStatus?: (
    orderId: string,
    newStatus: string
  ) => Promise<void> | void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

type TabType = "picking" | "ready" | "inventory";

interface ParsedItem {
  sku?: string;
  name: string;
  quantity: string;
}

interface StatusNotice {
  type: "success" | "error";
  message: string;
}

const IDLE_TIMEOUT = 60000;

const PICKING_STATUSES = ["בסידור עבודה", "בהכנה", "בהמתנה"];
const READY_STATUSES = ["מוכן להעמסה", "בהעמסה", "יצא לדרך"];

const BRANCHES = [
  { value: "all", label: "כל המגרשים" },
  { value: "החרש", label: "החרש" },
  { value: "התלמיד", label: "התלמיד" },
];

export function PickerView({
  orders = [],
  onUpdateStatus,
  onRefresh,
  isRefreshing = false,
}: PickerViewProps) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  const [activeTab, setActiveTab] = useState<TabType>("picking");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const [screensaverActive, setScreensaverActive] = useState(false);
  const [screensaverEnabled, setScreensaverEnabled] = useState(true);
  const [screensaverMenuOpen, setScreensaverMenuOpen] = useState(false);

  const [statusNotice, setStatusNotice] = useState<StatusNotice | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((notice: StatusNotice) => {
    setStatusNotice(notice);

    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }

    noticeTimerRef.current = setTimeout(() => {
      setStatusNotice(null);
    }, 5000);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((previous) => {
      const next = !previous;

      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", next);
      }

      if (typeof localStorage !== "undefined") {
        localStorage.setItem("theme", next ? "dark" : "light");
      }

      return next;
    });
  }, []);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    if (!screensaverEnabled || screensaverActive) return;

    idleTimerRef.current = setTimeout(() => {
      setScreensaverActive(true);
    }, IDLE_TIMEOUT);
  }, [screensaverEnabled, screensaverActive]);

  useEffect(() => {
    const events = ["touchstart", "touchmove", "scroll", "keydown", "click"];

    events.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, {
        passive: true,
      });
    });

    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);

      events.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
    };
  }, [resetIdleTimer]);

  const pickingOrders = useMemo(() => {
    return orders.filter((order) =>
      PICKING_STATUSES.some(
        (status) =>
          order?.status?.trim() === status ||
          order?.stage?.trim() === status
      )
    );
  }, [orders]);

  const readyOrders = useMemo(() => {
    return orders.filter((order) =>
      READY_STATUSES.some(
        (status) =>
          order?.status?.trim() === status ||
          order?.stage?.trim() === status
      )
    );
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const source = activeTab === "picking" ? pickingOrders : readyOrders;
    const query = searchQuery.trim().toLowerCase();

    return source.filter((order) => {
      const matchesBranch =
        selectedBranch === "all" ||
        Boolean(
          order?.warehouse?.includes(selectedBranch) ||
            order?.branch?.includes(selectedBranch)
        );

      if (!query) return matchesBranch;

      const searchableText = [
        order?.client,
        order?.destination,
        order?.id,
        order?.productsSummary,
        order?.driver,
        order?.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesBranch && searchableText.includes(query);
    });
  }, [
    activeTab,
    pickingOrders,
    readyOrders,
    selectedBranch,
    searchQuery,
  ]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setExpandedOrderId(null);
    setSearchQuery("");
  };

  const handleStatusAdvance = async (
    order: Order,
    targetStatus: string
  ) => {
    if (!onUpdateStatus || updatingOrderId) return;

    setUpdatingOrderId(order.id);
    setStatusNotice(null);

    try {
      await onUpdateStatus(order.id, targetStatus);

      showNotice({
        type: "success",
        message: `הזמנה #${order.id} עודכנה לסטטוס: ${targetStatus}`,
      });

      setExpandedOrderId(null);
    } catch (error) {
      console.error("Failed to update order status:", error);

      showNotice({
        type: "error",
        message: "עדכון הסטטוס נכשל. נסה שוב.",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (screensaverActive) {
    return (
      <Screensaver
        pickingCount={pickingOrders.length}
        readyCount={readyOrders.length}
        selectedBranch={selectedBranch}
        menuOpen={screensaverMenuOpen}
        setMenuOpen={setScreensaverMenuOpen}
        onExit={() => setScreensaverActive(false)}
        onDisable={() => {
          setScreensaverEnabled(false);
          setScreensaverActive(false);
          setScreensaverMenuOpen(false);
        }}
      />
    );
  }

  return (
    <div
      dir="rtl"
      className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-background text-foreground"
    >
      <header className="z-30 shrink-0 border-b border-border/70 bg-card/95 px-3 pb-2.5 pt-3 shadow-sm backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <PackageCheck className="size-6" aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-base font-black leading-tight">
                מסוף מלקט
              </h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                <span
                  className="size-2 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                ח. סבן · מגרש חי
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={isDark ? "הפעל מצב יום" : "הפעל מצב לילה"}
              title={isDark ? "מצב יום" : "מצב לילה"}
              className="grid size-10 place-items-center rounded-xl border border-border bg-background transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {isDark ? (
                <Sun className="size-4 text-amber-400" aria-hidden="true" />
              ) : (
                <Moon className="size-4" aria-hidden="true" />
              )}
            </button>

            <select
              aria-label="בחירת מגרש"
              value={selectedBranch}
              onChange={(event) => setSelectedBranch(event.target.value)}
              className="h-10 max-w-[100px] rounded-xl border border-border bg-background px-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {BRANCHES.map((branch) => (
                <option key={branch.value} value={branch.value}>
                  {branch.value === "all" ? "כל המגרשים" : branch.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setScreensaverActive(true)}
              aria-label="הפעל שומר מסך"
              title="שומר מסך"
              className="grid size-10 place-items-center rounded-xl border border-border bg-background transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Monitor className="size-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onRefresh}
              disabled={!onRefresh || isRefreshing}
              aria-label="רענן הזמנות"
              title="רענן הזמנות"
              className="grid size-10 place-items-center rounded-xl border border-border bg-background transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RotateCcw
                className={cn("size-4", isRefreshing && "animate-spin")}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        <div className="mx-auto mt-2.5 flex w-full max-w-5xl items-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
          <Bell className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-[11px] font-bold leading-relaxed">
            וודא החתמת תעודת משלוח מול הנהג לפני יציאה מהשער.
          </p>
        </div>

        {activeTab !== "inventory" && (
          <div className="relative mx-auto mt-2.5 w-full max-w-5xl">
            <Search
              className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="חיפוש לקוח, יעד, חומר או הזמנה..."
              aria-label="חיפוש הזמנות"
              className="h-11 w-full rounded-xl border border-border bg-background py-2 pl-10 pr-10 text-sm font-medium outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/25"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="נקה חיפוש"
                className="absolute left-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-28 pt-3 sm:px-5">
        <div className="mx-auto w-full max-w-5xl">
          <AnimatePresence mode="wait" initial={false}>
            {activeTab === "inventory" ? (
              <motion.div
                key="inventory"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card p-3">
                  <div className="flex items-center gap-2">
                    <Boxes className="size-4 text-primary" aria-hidden="true" />
                    <h2 className="text-sm font-black">
                      דרישות רצפה וספי ביטחון
                    </h2>
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground">
                    ניטור שטח
                  </span>
                </div>

                <InventoryDemandCard orders={orders} />
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-black">
                    {activeTab === "picking"
                      ? "משימות ליקוט"
                      : "הזמנות להעמסה"}
                  </h2>
                  <span className="text-xs font-bold text-muted-foreground">
                    {filteredOrders.length} הזמנות
                  </span>
                </div>

                {filteredOrders.length === 0 ? (
                  <EmptyState
                    hasSearch={Boolean(searchQuery || selectedBranch !== "all")}
                    onClear={() => {
                      setSearchQuery("");
                      setSelectedBranch("all");
                    }}
                  />
                ) : (
                  filteredOrders.map((order) => (
                    <CollapsibleOrderCard
                      key={order.id}
                      order={order}
                      activeTab={activeTab}
                      isExpanded={expandedOrderId === order.id}
                      isUpdating={updatingOrderId === order.id}
                      onToggleExpand={() =>
                        setExpandedOrderId((previous) =>
                          previous === order.id ? null : order.id
                        )
                      }
                      onAdvanceStatus={(status) =>
                        handleStatusAdvance(order, status)
                      }
                    />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {statusNotice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            role="status"
            aria-live="polite"
            className="fixed bottom-[88px] left-3 right-3 z-50 mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-border bg-card p-3 shadow-xl"
          >
            {statusNotice.type === "success" ? (
              <CheckCircle2
                className="mt-0.5 size-5 shrink-0 text-emerald-500"
                aria-hidden="true"
              />
            ) : (
              <AlertCircle
                className="mt-0.5 size-5 shrink-0 text-destructive"
                aria-hidden="true"
              />
            )}
            <p className="flex-1 text-sm font-bold leading-relaxed">
              {statusNotice.message}
            </p>
            <button
              type="button"
              onClick={() => setStatusNotice(null)}
              aria-label="סגור הודעה"
              className="grid size-7 shrink-0 place-items-center rounded-lg hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        aria-label="ניווט ראשי"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 shadow-2xl backdrop-blur-2xl"
      >
        <div className="mx-auto grid max-w-lg grid-cols-3 gap-1.5">
          <BottomNavButton
            active={activeTab === "picking"}
            label={`ליקוט (${pickingOrders.length})`}
            icon={<Clock className="size-5" aria-hidden="true" />}
            count={pickingOrders.length}
            onClick={() => handleTabChange("picking")}
          />
          <BottomNavButton
            active={activeTab === "ready"}
            label={`העמסה (${readyOrders.length})`}
            icon={<Truck className="size-5" aria-hidden="true" />}
            count={readyOrders.length}
            onClick={() => handleTabChange("ready")}
          />
          <BottomNavButton
            active={activeTab === "inventory"}
            label="מלאי מגרש"
            icon={<Boxes className="size-5" aria-hidden="true" />}
            onClick={() => handleTabChange("inventory")}
          />
        </div>
      </nav>
    </div>
  );
}

function BottomNavButton({
  active,
  label,
  icon,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-2xl text-xs font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]",
        active
          ? "bg-primary text-primary-foreground shadow-md"
          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
      )}
    >
      <span className="relative">
        {icon}
        {count !== undefined && count > 0 && (
          <span
            className={cn(
              "absolute -left-3 -top-2 flex min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black",
              active
                ? "bg-card text-foreground"
                : "bg-primary text-primary-foreground"
            )}
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      <span>{label}</span>
    </button>
  );
}

function EmptyState({
  hasSearch,
  onClear,
}: {
  hasSearch: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border px-5 py-16 text-center">
      <div className="mb-3 grid size-16 place-items-center rounded-2xl bg-secondary text-muted-foreground">
        <Warehouse className="size-8" aria-hidden="true" />
      </div>
      <h3 className="text-base font-black">
        {hasSearch ? "לא נמצאו הזמנות" : "אין משימות זמינות"}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasSearch
          ? "נסה לשנות את החיפוש או את בחירת המגרש."
          : "הזמנות חדשות יופיעו כאן בזמן אמת."}
      </p>
      {hasSearch && (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-black text-primary-foreground transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          נקה סינון
        </button>
      )}
    </div>
  );
}

interface CollapsibleOrderCardProps {
  order: Order;
  activeTab: TabType;
  isExpanded: boolean;
  isUpdating: boolean;
  onToggleExpand: () => void;
  onAdvanceStatus: (status: string) => void;
}

function CollapsibleOrderCard({
  order,
  activeTab,
  isExpanded,
  isUpdating,
  onToggleExpand,
  onAdvanceStatus,
}: CollapsibleOrderCardProps) {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>(
    {}
  );

  const parsedItems: ParsedItem[] = useMemo(() => {
    if (!order?.productsSummary) return [];

    return String(order.productsSummary)
      .split(/[\n,;]+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const skuMatch = line.match(
          /(?:מק["'״]?ט|קוד)[:\s]*([0-9]{4,6})/i
        );
        const qtyMatch = line.match(
          /(?:כמות[:\s]*)?([0-9]+(?:\.[0-9]+)?)\s*(?:שק|משטח|יח|בלה|ק"ג)?/
        );

        const sku = skuMatch?.[1];
        const quantity = qtyMatch?.[0] || "1";

        const name = line
          .replace(/(?:מק["'״]?ט|קוד)[:\s]*([0-9]{4,6})/gi, "")
          .replace(/📦/g, "")
          .replace(/\|/g, "")
          .trim();

        return {
          sku,
          name: name || line,
          quantity,
        };
      });
  }, [order?.productsSummary]);

  const checkedCount = parsedItems.filter(
    (_, index) => checkedItems[index]
  ).length;

  const toggleItemCheck = (index: number) => {
    setCheckedItems((previous) => ({
      ...previous,
      [index]: !previous[index],
    }));
  };

  return (
    <article className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm transition-shadow">
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        aria-controls={`order-details-${order.id}`}
        className="block w-full p-4 text-right transition hover:bg-secondary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary active:bg-secondary/30"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-[11px] font-black text-primary">
                הזמנה #{order?.id}
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                {order?.time || "היום"}
              </span>
            </div>

            <h3 className="mt-1.5 truncate text-base font-black leading-snug">
              {order?.client || "לקוח כללי"}
            </h3>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={cn(
                "rounded-xl border px-2.5 py-2 text-[11px] font-black",
                order?.deliveryType === "מנוף"
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
                  : "border-primary/20 bg-primary/10 text-primary"
              )}
            >
              {order?.deliveryType || "פריקה רגילה"}
            </span>
            <span
              className="grid size-9 place-items-center rounded-xl bg-secondary text-muted-foreground"
              aria-hidden="true"
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-semibold text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate text-foreground/90">
              {order?.destination || "איסוף עצמי"}
            </span>
          </span>

          {order?.warehouse && (
            <span className="flex items-center gap-1.5">
              <Warehouse className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span className="font-bold text-foreground">
                {order.warehouse}
              </span>
            </span>
          )}
        </div>

        {!isExpanded && (
          <div className="mt-3 rounded-xl border border-border/50 bg-secondary/30 px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
            <span className="line-clamp-2">
              {order?.productsSummary || "פתח לצפייה בפריטי ההזמנה"}
            </span>
          </div>
        )}
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={`order-details-${order.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/70 bg-secondary/10"
          >
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="flex items-center gap-1.5 text-sm font-black">
                  <Layers className="size-4 text-primary" aria-hidden="true" />
                  פריטים לליקוט
                </h4>
                <span className="text-xs font-bold text-muted-foreground">
                  {checkedCount}/{parsedItems.length} נאספו
                </span>
              </div>

              {parsedItems.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {parsedItems.map((item, index) => {
                    const isChecked = Boolean(checkedItems[index]);

                    return (
                      <div
                        key={`${item.sku || item.name}-${index}`}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl border p-3 transition",
                          isChecked
                            ? "border-emerald-500/30 bg-emerald-500/10"
                            : "border-border/70 bg-card"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => toggleItemCheck(index)}
                          aria-pressed={isChecked}
                          aria-label={
                            isChecked
                              ? `בטל סימון: ${item.name}`
                              : `סמן כנאסף: ${item.name}`
                          }
                          className="grid size-9 shrink-0 place-items-center rounded-xl transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
                        >
                          {isChecked ? (
                            <CheckSquare
                              className="size-5 text-emerald-500"
                              aria-hidden="true"
                            />
                          ) : (
                            <Square
                              className="size-5 text-muted-foreground"
                              aria-hidden="true"
                            />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "text-sm font-bold leading-snug",
                              isChecked &&
                                "text-muted-foreground line-through"
                            )}
                          >
                            {item.name}
                          </p>

                          {item.sku && (
                            <span className="mt-1 inline-block rounded-md border border-border/60 bg-secondary px-1.5 py-0.5 text-[10px] font-black text-primary">
                              מק"ט: {item.sku}
                            </span>
                          )}
                        </div>

                        <span className="shrink-0 rounded-xl border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-xs font-black text-primary">
                          {item.quantity}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  לא נמצאו פריטים מפורטים להזמנה זו.
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                <div className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-foreground/80">
                  <User className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>נהג: {order?.driver || "טרם שובץ"}</span>
                </div>

                {order?.phone && (
                  <a
                    href={`tel:${order.phone}`}
                    onClick={(event) => event.stopPropagation()}
                    className="flex min-h-10 items-center gap-1.5 rounded-xl bg-primary/10 px-3 text-xs font-black text-primary transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Phone className="size-4" aria-hidden="true" />
                    חייג
                  </a>
                )}
              </div>

              {activeTab === "picking" ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <ActionButton
                    variant="secondary"
                    icon={<Clock className="size-4" aria-hidden="true" />}
                    disabled={isUpdating}
                    onClick={() => onAdvanceStatus("בהכנה")}
                  >
                    סמן בהכנה
                  </ActionButton>

                  <ActionButton
                    variant="primary"
                    icon={
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                    }
                    disabled={isUpdating}
                    loading={isUpdating}
                    onClick={() => onAdvanceStatus("מוכן להעמסה")}
                  >
                    הושלם ליקוט
                  </ActionButton>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <ActionButton
                    variant="secondary"
                    icon={
                      <PackageCheck className="size-4" aria-hidden="true" />
                    }
                    disabled={isUpdating}
                    onClick={() => onAdvanceStatus("בהעמסה")}
                  >
                    בהעמסה
                  </ActionButton>

                  <ActionButton
                    variant="success"
                    icon={<Truck className="size-4" aria-hidden="true" />}
                    disabled={isUpdating}
                    loading={isUpdating}
                    onClick={() => onAdvanceStatus("יצא לדרך")}
                  >
                    שחרר נהג לדרך
                  </ActionButton>
                </div>
              )}

              {isUpdating && (
                <p
                  className="flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  מעדכן את ההזמנה...
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function ActionButton({
  children,
  icon,
  variant,
  disabled,
  loading,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  variant: "primary" | "secondary" | "success";
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        variant === "primary" &&
          "bg-primary text-primary-foreground shadow-sm",
        variant === "secondary" &&
          "border border-border bg-card text-foreground hover:bg-secondary",
        variant === "success" &&
          "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
      )}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        icon
      )}
      <span>{children}</span>
    </button>
  );
}

function Screensaver({
  pickingCount,
  readyCount,
  selectedBranch,
  menuOpen,
  setMenuOpen,
  onExit,
  onDisable,
}: {
  pickingCount: number;
  readyCount: number;
  selectedBranch: string;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  onExit: () => void;
  onDisable: () => void;
}) {
  return (
    <div
      dir="rtl"
      className="relative flex min-h-[100dvh] w-full flex-col justify-between overflow-hidden bg-background p-4 text-foreground sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="פתח תפריט שומר מסך"
          className="grid size-12 place-items-center rounded-2xl border border-border bg-card shadow-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Menu className="size-5 text-primary" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onExit}
          className="flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-4 text-xs font-black text-primary-foreground shadow-sm transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowRight className="size-4" aria-hidden="true" />
          חזרה למסוף
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-col items-center justify-center gap-5 py-12 text-center">
        <div className="grid size-20 place-items-center rounded-3xl border border-primary/20 bg-primary/10 text-primary">
          <Monitor className="size-10" aria-hidden="true" />
        </div>

        <div>
          <h1 className="text-2xl font-black">שומר מסך פעיל</h1>
          <p className="mt-2 text-sm font-semibold text-muted-foreground">
            ח. סבן חומרי בניין (1994) בע"מ
          </p>
        </div>

        <div className="grid w-full grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <span className="block text-xs font-bold text-muted-foreground">
              הזמנות לליקוט
            </span>
            <span className="mt-1 block text-3xl font-black tabular-nums">
              {pickingCount}
            </span>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <span className="block text-xs font-bold text-muted-foreground">
              מוכן / בהעמסה
            </span>
            <span className="mt-1 block text-3xl font-black tabular-nums text-emerald-500">
              {readyCount}
            </span>
          </div>
        </div>

        <p className="text-xs font-bold text-muted-foreground">
          סניף: {selectedBranch === "all" ? "כל המגרשים" : selectedBranch}
        </p>
      </div>

      <p className="pb-2 text-center text-xs font-bold text-muted-foreground">
        לחץ על "חזרה למסוף" כדי להמשיך לעבוד.
      </p>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              type="button"
              aria-label="סגור תפריט"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 cursor-default bg-black/50 backdrop-blur-sm"
            />

            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="הגדרות שומר מסך"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed inset-y-0 right-0 z-50 flex w-[min(88vw,360px)] flex-col justify-between border-l border-border bg-card p-5 shadow-2xl"
            >
              <div>
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <h2 className="text-base font-black">שומר מסך מגרש</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      תצוגת מידע תפעולי
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    aria-label="סגור תפריט"
                    className="grid size-9 place-items-center rounded-xl bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-5 rounded-xl border border-border bg-secondary/30 p-3">
                  <span className="block text-xs font-medium text-muted-foreground">
                    סניף פעיל
                  </span>
                  <span className="mt-1 block text-sm font-black">
                    {selectedBranch === "all" ? "כל המגרשים" : selectedBranch}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={onDisable}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-black text-rose-500 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <MonitorOff className="size-4" aria-hidden="true" />
                  בטל שומר מסך אוטומטי
                </button>

                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="min-h-12 rounded-xl bg-primary text-xs font-black text-primary-foreground transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  סגור תפריט
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
