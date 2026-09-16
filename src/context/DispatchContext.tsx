import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AlertLevel,
  DataSourceMode,
  DispatchState,
  NoaAlert,
  Order,
  OrderEvent,
  OrderStatus,
  OrderStatusOverride,
  OrderStatusOverrides,
  StatusSyncRecord,
} from "@/types/dispatch";
import type {
  ScreensaverSettings,
  ScheduledBroadcast,
  AITrainingSettings,
} from "@/types/screensaver";
import {
  DEFAULT_SHEET_URL,
  DRIVERS,
  WAREHOUSES,
  getMockOrders,
  updateSheetOrderStatus,
  testSheetWebhookConnection,
} from "@/services/sheetsService";
import { fetchOrdersWithResilience } from "@/services/sheetsSyncService";
import { calculateLiveInventory, type LiveInventorySummary } from "@/services/inventoryService";
import {
  playNewOrderSound,
  playSuccessSound,
  playAlarmSound,
  playStatusChime,
} from "@/utils/soundEffects";
import {
  announceUrgentOrderStatusChange,
  isHighPriorityUrgentOrder,
  speakHebrew,
  isVoiceAnnounceEnabled,
  toggleVoiceAnnounce,
  setVoiceAnnounceEnabled,
  subscribeVoiceStatus,
  testVoiceAnnouncement,
} from "@/services/voiceAlertService";

const DEFAULT_SCREENSAVER_SETTINGS: ScreensaverSettings = {
  isEnabled: true,
  idleTimeoutSeconds: 90, // 90 שניות של חוסר פעילות
  minOrderGapMinutes: 45, // אם ההזמנה הקרובה רחוקה מ-45 דקות או שאין הזמנות
  activeMode: "mixed",
  autoCycle: true,
  cycleIntervalSeconds: 12,
  videoSource: "warehouse-ambient",
  videoMuted: true,
  autoVideoOnLull: true,
};

const DEFAULT_AI_TRAINING: AITrainingSettings = {
  focusMode: "safety",
  customPromptRule: "תעדוף בטיחות בהעמסת שקי בלה ומשטחי סבן, והתראה על עומסים בצירים 1 ו-40",
  temperature: 0.3,
  autoPushToTV: true,
};

const DEFAULT_SCHEDULED_MESSAGES: ScheduledBroadcast[] = [
  {
    id: "sch-1",
    time: "07:30",
    target: "all",
    title: "תדריך בוקר",
    content: "בדיקת שמן ומים במשאיות מנוף, ספירת מלאי שקי בלה במחסן 7",
    isActive: true,
  },
  {
    id: "sch-2",
    time: "11:30",
    target: "warehouse",
    title: "הכנת סבב 2",
    content: "ריכוז משטחי סבן 60060 ברציף העמסה מרכזי",
    isActive: true,
  },
  {
    id: "sch-3",
    time: "13:30",
    target: "driver",
    title: "עומסי צהריים",
    content: "הימנעות מכביש 40, עדיפות לציר 431 לכיוון רמלה וראשל״צ",
    isActive: true,
  },
  {
    id: "sch-4",
    time: "16:00",
    target: "all",
    title: "סיכום יומי",
    content: "קשירת רצועות, נעילת שער מחסן 1 ובדיקת תעודות משלוח",
    isActive: true,
  },
];

const OVERRIDES_STORAGE_KEY = "saban_order_status_overrides";
const SOURCE_CONFIG_STORAGE_KEY = "saban-dispatch-source";

function loadLocalOverrides(): OrderStatusOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as OrderStatusOverrides;
    }
  } catch (err) {
    console.warn("Could not read saban_order_status_overrides from localStorage:", err);
  }
  return {};
}

function saveLocalOverrides(overrides: OrderStatusOverrides): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  } catch (err) {
    console.warn("Could not save saban_order_status_overrides to localStorage:", err);
  }
}

/**
 * Two-Way Optimistic Sync & Delta Merge (Reconciliation):
 * Compares freshly fetched orders from Google Sheets against persistent local overrides.
 * - If the sheet has caught up and matches the override, cleans up the override.
 * - If the sheet has an explicit newer timestamp than the override, accepts the sheet's status.
 * - If the local override is newer or equal, preserves the local status.
 */
function reconcileOrdersWithOverrides(
  fetchedOrders: Order[],
  currentOverrides: OrderStatusOverrides,
): { mergedOrders: Order[]; updatedOverrides: OrderStatusOverrides; cleanedCount: number } {
  const updatedOverrides: OrderStatusOverrides = { ...currentOverrides };
  let cleanedCount = 0;

  const mergedOrders = fetchedOrders.map((fetched) => {
    const override = updatedOverrides[fetched.orderId];
    if (!override) {
      return fetched;
    }

    // Check if the sheet now reflects the local status
    if (fetched.status === override.status) {
      // Sheet has successfully synchronized! Clean up the local override.
      delete updatedOverrides[fetched.orderId];
      cleanedCount++;
      return fetched;
    }

    // Check if the sheet was updated externally after the local override was created
    const sheetTimestamp = fetched.updatedAt ? new Date(fetched.updatedAt).getTime() : 0;
    const isValidSheetTime = !Number.isNaN(sheetTimestamp) && sheetTimestamp > 0;

    if (isValidSheetTime && sheetTimestamp > override.timestamp) {
      // Sheet has a newer change made externally. Respect sheet update and clear stale override.
      delete updatedOverrides[fetched.orderId];
      cleanedCount++;
      return fetched;
    }

    // Otherwise, local manual override is newer. Preserve the local status!
    return {
      ...fetched,
      status: override.status,
      updatedAt: new Date(override.timestamp).toISOString(),
    };
  });

  return { mergedOrders, updatedOverrides, cleanedCount };
}

interface DispatchContextValue extends DispatchState {
  /* studio */
  isStudioOpen: boolean;
  openStudio: () => void;
  closeStudio: () => void;
  toggleStudio: () => void;
  selectedOrderId: string | null;
  selectOrder: (orderId: string | null) => void;

  /* draft editing & status sync */
  updateOrder: (orderId: string, patch: Partial<Order>) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  setOrderStatus: (orderId: string, status: OrderStatus) => void;
  quickUpdateStatus: (orderId: string, status: OrderStatus) => void;
  clearOrderStatusOverride: (orderId: string) => void;
  clearAllOrderStatusOverrides: () => void;
  toggleItemApproval: (orderId: string, sku: string) => void;
  approveAllItems: (orderId: string, approved: boolean) => void;
  updateItemQuantity: (orderId: string, sku: string, quantity: number) => void;

  /* broadcast */
  publish: () => void;
  discardDraft: () => void;

  /* alerts */
  pushAlert: (message: string, level?: AlertLevel, isFlash?: boolean) => void;
  dismissFlash: () => void;
  removeAlert: (id: string) => void;

  /* data source & sheets write-back */
  setSourceMode: (mode: DataSourceMode) => void;
  setSheetUrl: (url: string) => void;
  setWebhookUrl: (url: string) => void;
  setPollingSeconds: (seconds: number) => void;
  syncNow: () => Promise<void>;
  syncStatusToSheet: (orderId: string, status: OrderStatus) => Promise<boolean>;
  syncAllStatusesToSheet: () => Promise<void>;
  testSheetWriteConnection: () => Promise<{ success: boolean; message: string }>;

  /* screensaver */
  isScreensaverActive: boolean;
  setScreensaverActive: (active: boolean) => void;
  screensaverSettings: ScreensaverSettings;
  updateScreensaverSettings: (patch: Partial<ScreensaverSettings>) => void;
  nearestOrderMinutesRemaining: number | null;
  idleSecondsCount: number;

  /* AI model training & dispatching */
  aiTraining: AITrainingSettings;
  updateAITraining: (patch: Partial<AITrainingSettings>) => void;
  scheduledMessages: ScheduledBroadcast[];
  addScheduledMessage: (msg: Omit<ScheduledBroadcast, "id">) => void;
  toggleScheduledMessage: (id: string, active: boolean) => void;
  deleteScheduledMessage: (id: string) => void;
  targetedBriefings: {
    forWarehouse: string;
    forDriver: string;
    scheduledNotice: string;
    trafficAdvice: string;
    updatedAt: string;
  };
  generateAIBriefing: (customPrompt?: string) => Promise<void>;
  isGeneratingAI: boolean;

  /* derived */
  focusOrder: Order | null;
  counts: Record<OrderStatus, number>;
  currentTime: Date;
  recentlyChangedOrderIds: Record<string, number>;
  recordOrderChange: (orderId: string) => void;

  /* automated real-time inventory */
  liveInventory: LiveInventorySummary;
  activeWarehouseFilter: 1 | 4 | "all";
  setActiveWarehouseFilter: (wh: 1 | 4 | "all") => void;

  /* picker workflow */
  startPicking: (orderId: string, pickerName?: string) => void;
  finishPicking: (orderId: string) => void;
  reportPickerOverrun: (orderId: string) => void;

  /* voice synthesis alerts */
  isVoiceAnnounceEnabled: boolean;
  toggleVoiceAnnounce: () => boolean;
  setVoiceAnnounceEnabled: (enabled: boolean) => void;
  isVoiceSpeaking: boolean;
  triggerVoiceTest: () => Promise<void>;
  speakUrgentAlert: (text: string) => Promise<void>;
}

const DispatchContext = createContext<DispatchContextValue | null>(null);

const clone = (orders: Order[]): Order[] => JSON.parse(JSON.stringify(orders)) as Order[];

const uid = () => Math.random().toString(36).slice(2, 10);

function minutesUntil(targetTime: string, now: Date): number {
  const [h, m] = targetTime.split(":").map((n) => Number(n));
  if (!Number.isFinite(h)) return Number.POSITIVE_INFINITY;
  const target = new Date(now);
  target.setHours(h ?? 0, m ?? 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 60000);
}

export function DispatchProvider({ children }: { children: ReactNode }) {
  /* ---------------- Persistent Local Overrides (localStorage) ---------------- */
  const [orderStatusOverrides, setOrderStatusOverrides] = useState<OrderStatusOverrides>({});
  const overridesRef = useRef<OrderStatusOverrides>(orderStatusOverrides);
  overridesRef.current = orderStatusOverrides;

  /* Deterministic initial order list for SSR and hydration matching */
  const [published, setPublished] = useState<Order[]>(() => getMockOrders());
  const [draft, setDraft] = useState<Order[]>(() => clone(getMockOrders()));
  const [alerts, setAlerts] = useState<NoaAlert[]>([]);
  const [flash, setFlash] = useState<NoaAlert | null>(null);
  const [latestOrderEvent, setLatestOrderEvent] = useState<OrderEvent | null>(null);
  const [isStudioOpen, setStudioOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [sourceMode, setSourceModeState] = useState<DataSourceMode>("sheets");
  const [sheetUrl, setSheetUrlState] = useState(DEFAULT_SHEET_URL);
  const [webhookUrl, setWebhookUrlState] = useState<string>("");
  const webhookUrlRef = useRef(webhookUrl);
  webhookUrlRef.current = webhookUrl;

  const [pollingSeconds, setPollingSecondsState] = useState(15);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<DispatchState["syncStatus"]>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  /* ---------------- Automated Real-Time Inventory State ---------------- */
  const [activeWarehouseFilter, setActiveWarehouseFilter] = useState<1 | 4 | "all">("all");

  const liveInventory = useMemo<LiveInventorySummary>(() => {
    return calculateLiveInventory(published, activeWarehouseFilter);
  }, [published, activeWarehouseFilter]);

  /* ---------------- Browser Speech Synthesis Voice Alerts ---------------- */
  const [voiceAnnounceEnabled, setVoiceAnnounceEnabledState] = useState(() =>
    isVoiceAnnounceEnabled(),
  );
  const [voiceSpeaking, setVoiceSpeaking] = useState(false);

  useEffect(() => {
    return subscribeVoiceStatus((enabled, speaking) => {
      setVoiceAnnounceEnabledState(enabled);
      setVoiceSpeaking(speaking);
    });
  }, []);

  /* ---------------- Real-time Clock & Live Change Tracking ---------------- */
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date("2026-09-14T11:00:00.000Z"));
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [recentlyChangedOrderIds, setRecentlyChangedOrderIds] = useState<Record<string, number>>(
    {},
  );

  const recordOrderChange = useCallback((orderId: string) => {
    setRecentlyChangedOrderIds((prev) => ({
      ...prev,
      [orderId]: Date.now(),
    }));
  }, []);

  useEffect(() => {
    // Pre-seed demo highlight safely after mount
    setRecentlyChangedOrderIds({
      "6215440": Date.now() - 8000,
    });
  }, []);

  /* ---------------- Screensaver State ---------------- */
  const [isScreensaverActive, setScreensaverActive] = useState(false);
  const [screensaverSettings, setScreensaverSettings] = useState<ScreensaverSettings>(
    DEFAULT_SCREENSAVER_SETTINGS,
  );
  const [idleSecondsCount, setIdleSecondsCount] = useState(0);
  const lastInteractionTime = useRef(Date.now());

  /* ---------------- AI Model & Schedule State ---------------- */
  const [aiTraining, setAiTraining] = useState<AITrainingSettings>(DEFAULT_AI_TRAINING);
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledBroadcast[]>(
    DEFAULT_SCHEDULED_MESSAGES,
  );
  const [targetedBriefings, setTargetedBriefings] = useState({
    forWarehouse: "לתעדף העמסת שקי בלה צמוד לקבינה ולאחריהם משטחי סבן 60060.",
    forDriver: "עומס בכביש 1 לכיוון שער הגיא (14 דק' עיכוב). מומלץ שימוש בציר 431.",
    scheduledNotice: "הכנת סבב הבא: וידוא תעודות משלוח חתומות עם המנופאי.",
    trafficAdvice: "כביש 6 וכביש 4 זורמים חלק. כביש 40 פקוק מצומת אחיסמך.",
    updatedAt: "08:15",
  });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  /* Client-side hydration of localStorage persistent settings & overrides */
  useEffect(() => {
    // 1. Local overrides
    const saved = loadLocalOverrides();
    if (Object.keys(saved).length > 0) {
      setOrderStatusOverrides(saved);
      const applyOv = (orders: Order[]) =>
        orders.map((o) => {
          const ov = saved[o.orderId];
          if (ov) {
            return {
              ...o,
              status: ov.status,
              updatedAt: new Date(ov.timestamp).toISOString(),
            };
          }
          return o;
        });
      setPublished((prev) => applyOv(prev));
      setDraft((prev) => applyOv(prev));
    }

    // 2. Screensaver settings
    try {
      const raw = localStorage.getItem("saban-screensaver-cfg");
      if (raw) {
        setScreensaverSettings((prev) => ({ ...prev, ...JSON.parse(raw) }));
      }
    } catch {
      /* storage unavailable */
    }

    // 3. AI training
    try {
      const raw = localStorage.getItem("saban-ai-training-cfg");
      if (raw) {
        setAiTraining((prev) => ({ ...prev, ...JSON.parse(raw) }));
      }
    } catch {
      /* storage unavailable */
    }

    // 4. Scheduled broadcasts
    try {
      const raw = localStorage.getItem("saban-scheduled-broadcasts");
      if (raw) {
        setScheduledMessages(JSON.parse(raw));
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  const updateScreensaverSettings = useCallback((patch: Partial<ScreensaverSettings>) => {
    setScreensaverSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem("saban-screensaver-cfg", JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const updateAITraining = useCallback((patch: Partial<AITrainingSettings>) => {
    setAiTraining((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem("saban-ai-training-cfg", JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const addScheduledMessage = useCallback((msg: Omit<ScheduledBroadcast, "id">) => {
    setScheduledMessages((prev) => {
      const next = [...prev, { ...msg, id: `sch-${uid()}` }];
      try {
        localStorage.setItem("saban-scheduled-broadcasts", JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const toggleScheduledMessage = useCallback((id: string, active: boolean) => {
    setScheduledMessages((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, isActive: active } : m));
      try {
        localStorage.setItem("saban-scheduled-broadcasts", JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const deleteScheduledMessage = useCallback((id: string) => {
    setScheduledMessages((prev) => {
      const next = prev.filter((m) => m.id !== id);
      try {
        localStorage.setItem("saban-scheduled-broadcasts", JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---------------- Alerts & NoaFlashOverlay Triggers ---------------- */
  const pushAlert = useCallback((message: string, level: AlertLevel = "info", isFlash = false) => {
    const alert: NoaAlert = {
      id: uid(),
      level,
      message,
      createdAt: new Date().toISOString(),
      isFlash,
      durationMs: level === "critical" ? 11000 : 8500,
    };
    setAlerts((prev) => [alert, ...prev].slice(0, 12));
    if (isFlash) {
      setFlash(alert);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(null), alert.durationMs);
    }
  }, []);

  const dismissFlash = useCallback(() => {
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash(null);
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  /* ---------------- Status Sync Records (Derived from overrides) ---------------- */
  const statusSyncRecords = useMemo<Record<string, StatusSyncRecord>>(() => {
    const records: Record<string, StatusSyncRecord> = {};
    for (const [id, ov] of Object.entries(orderStatusOverrides)) {
      records[id] = {
        orderId: id,
        status: ov.status,
        updatedAt: new Date(ov.timestamp).toISOString(),
        syncedToSheet: ov.synced,
        lastAttemptAt: new Date(ov.timestamp).toISOString(),
        message: ov.synced ? "מסונכרן לגיליון" : "נשמר מקומית (ממתין לסנכרון)",
      };
    }
    return records;
  }, [orderStatusOverrides]);

  /* ---------------- Clear Overrides ---------------- */
  const clearOrderStatusOverride = useCallback((orderId: string) => {
    setOrderStatusOverrides((prev) => {
      const next = { ...prev };
      delete next[orderId];
      saveLocalOverrides(next);
      return next;
    });
  }, []);

  const clearAllOrderStatusOverrides = useCallback(() => {
    setOrderStatusOverrides({});
    saveLocalOverrides({});
  }, []);

  /* ---------------- Async Background Webhook Dispatch (Write-Back) ---------------- */
  const dispatchWebhookUpdate = useCallback((orderId: string, status: OrderStatus) => {
    const currentWebhook = webhookUrlRef.current;

    fetch("/api/sheets/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "updateOrderStatus",
        sheet: "דשבורד_הזמנות",
        sheetName: "דשבורד_הזמנות",
        orderId,
        status,
        webhookUrl: currentWebhook || undefined,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as { success?: boolean; syncedToSheet?: boolean };
        if (data.success && data.syncedToSheet) {
          setOrderStatusOverrides((prev) => {
            if (!prev[orderId]) return prev;
            const updated = {
              ...prev,
              [orderId]: { ...prev[orderId], synced: true },
            };
            saveLocalOverrides(updated);
            return updated;
          });
          setLatestOrderEvent({
            type: "override_synced",
            orderId,
            message: `סטטוס הזמנה #${orderId} סונכרן ישירות לעמודת סטטוס בגיליון Google Sheets`,
            timestamp: Date.now(),
          });
        }
      })
      .catch((err) => {
        console.warn(`[Dispatch] Background sync deferred for order #${orderId}:`, err);
        // Non-blocking: local override remains active and will be preserved during polling!
      });
  }, []);

  /* ---------------- Optimistic Status Update ---------------- */
  const updateOrderStatus = useCallback(
    (orderId: string, newStatus: OrderStatus) => {
      const now = Date.now();
      const nowIso = new Date(now).toISOString();

      // 1. Instantly update React state (both published board and editor draft)
      setPublished((prev) =>
        prev.map((o) =>
          o.orderId === orderId ? { ...o, status: newStatus, updatedAt: nowIso } : o,
        ),
      );
      setDraft((prev) =>
        prev.map((o) =>
          o.orderId === orderId ? { ...o, status: newStatus, updatedAt: nowIso } : o,
        ),
      );

      // Trigger visual real-time pulse on card
      recordOrderChange(orderId);

      // 2. Persist to localStorage under key `saban_order_status_overrides`
      const overrideEntry: OrderStatusOverride = {
        status: newStatus,
        timestamp: now,
        synced: false,
      };
      setOrderStatusOverrides((prev) => {
        const next = { ...prev, [orderId]: overrideEntry };
        saveLocalOverrides(next);
        return next;
      });

      // Flash overlay & event dispatch on urgency or status change
      const isUrgent = newStatus === "בהעמסה" || newStatus === "מוכן להעמסה";
      if (isUrgent) {
        setLatestOrderEvent({
          type: "status_urgent",
          orderId,
          order: published.find((o) => o.orderId === orderId),
          message: `הזמנה #${orderId} מוכנה/הועברה להעמסה כעת!`,
          timestamp: now,
        });
        pushAlert(`הזמנה #${orderId} הועברה לסטטוס: ${newStatus}`, "warning", true);
        playSuccessSound();
      } else if (newStatus === "סופק") {
        setLatestOrderEvent({
          type: "status_changed",
          orderId,
          order: published.find((o) => o.orderId === orderId),
          message: `הזמנה #${orderId} סופקה בהצלחה!`,
          timestamp: now,
        });
        pushAlert(`הזמנה #${orderId} סופקה בהצלחה!`, "success");
        playSuccessSound();
      } else {
        setLatestOrderEvent({
          type: "status_changed",
          orderId,
          order: published.find((o) => o.orderId === orderId),
          message: `הזמנה #${orderId} עודכנה לסטטוס: ${newStatus}`,
          timestamp: now,
        });
        pushAlert(`הזמנה #${orderId} עודכנה לסטטוס: ${newStatus}`, "info");
        playStatusChime();
      }

      // 3. Autonomous Browser Speech Synthesis for urgent/high-priority order status change
      const targetOrder =
        published.find((o) => o.orderId === orderId) || draft.find((o) => o.orderId === orderId);
      const previousStatus = targetOrder?.status;
      if (targetOrder && previousStatus !== newStatus) {
        announceUrgentOrderStatusChange(targetOrder, newStatus, previousStatus);
      }

      // 4. Dispatch async background request to Google Apps Script Webhook (non-blocking)
      dispatchWebhookUpdate(orderId, newStatus);
    },
    [dispatchWebhookUpdate, draft, published, pushAlert, recordOrderChange],
  );

  const setOrderStatus = useCallback(
    (orderId: string, status: OrderStatus) => {
      updateOrderStatus(orderId, status);
    },
    [updateOrderStatus],
  );

  const quickUpdateStatus = useCallback(
    (orderId: string, status: OrderStatus) => {
      updateOrderStatus(orderId, status);
    },
    [updateOrderStatus],
  );

  /* ---------------- Picker Workflow (SLA 20m / 15m) ---------------- */
  const startPicking = useCallback(
    (orderId: string, pickerName?: string) => {
      const now = Date.now();
      const nowIso = new Date(now).toISOString();

      try {
        localStorage.setItem(`saban_picker_start_${orderId}`, String(now));
      } catch {
        /* storage unavailable */
      }

      setPublished((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? {
                ...o,
                status: "בהכנה",
                pickingStartedAt: now,
                assignedPicker: pickerName || o.assignedPicker || "מחסנאי תורן",
                updatedAt: nowIso,
              }
            : o,
        ),
      );

      setDraft((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? {
                ...o,
                status: "בהכנה",
                pickingStartedAt: now,
                assignedPicker: pickerName || o.assignedPicker || "מחסנאי תורן",
                updatedAt: nowIso,
              }
            : o,
        ),
      );

      recordOrderChange(orderId);

      const overrideEntry: OrderStatusOverride = {
        status: "בהכנה",
        timestamp: now,
        synced: false,
      };
      setOrderStatusOverrides((prev) => {
        const next = { ...prev, [orderId]: overrideEntry };
        saveLocalOverrides(next);
        return next;
      });

      playStatusChime();

      pushAlert(
        `הוחל ליקוט להזמנה #${orderId} ע"י ${pickerName || "מחסנאי"} (SLA יעד 20 דק')`,
        "info",
      );
      dispatchWebhookUpdate(orderId, "בהכנה");
    },
    [dispatchWebhookUpdate, pushAlert, recordOrderChange],
  );

  const finishPicking = useCallback(
    (orderId: string) => {
      const now = Date.now();
      const nowIso = new Date(now).toISOString();

      try {
        localStorage.setItem(`saban_picker_ready_${orderId}`, String(now));
      } catch {
        /* storage unavailable */
      }

      setPublished((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? {
                ...o,
                status: "מוכן להעמסה",
                readyForLoadingAt: now,
                updatedAt: nowIso,
              }
            : o,
        ),
      );

      setDraft((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? {
                ...o,
                status: "מוכן להעמסה",
                readyForLoadingAt: now,
                updatedAt: nowIso,
              }
            : o,
        ),
      );

      recordOrderChange(orderId);

      const overrideEntry: OrderStatusOverride = {
        status: "מוכן להעמסה",
        timestamp: now,
        synced: false,
      };
      setOrderStatusOverrides((prev) => {
        const next = { ...prev, [orderId]: overrideEntry };
        saveLocalOverrides(next);
        return next;
      });

      playSuccessSound();

      pushAlert(
        `הזמנה #${orderId} לוקטה במלואה ומוכנה להעמסה ברציף! נהג וסדרן עודכנו.`,
        "success",
        true,
      );
      dispatchWebhookUpdate(orderId, "מוכן להעמסה");
    },
    [dispatchWebhookUpdate, pushAlert, recordOrderChange],
  );

  const reportPickerOverrun = useCallback(
    (orderId: string) => {
      playAlarmSound();
      pushAlert(
        `חריגת ליקוט חמורה (מעל 20 דק') בהזמנה #${orderId}! יש לתגבר את המחסן מיד.`,
        "critical",
        true,
      );
    },
    [pushAlert],
  );

  /* ---------------- Draft Editing ---------------- */
  const mutateDraft = useCallback((fn: (orders: Order[]) => Order[]) => {
    setDraft((prev) => fn(clone(prev)));
    setIsDirty(true);
  }, []);

  const updateOrder = useCallback(
    (orderId: string, patch: Partial<Order>) => {
      if (patch.status) {
        updateOrderStatus(orderId, patch.status);
      }
      mutateDraft((orders) =>
        orders.map((o) =>
          o.orderId === orderId ? { ...o, ...patch, updatedAt: new Date().toISOString() } : o,
        ),
      );
      recordOrderChange(orderId);
    },
    [mutateDraft, recordOrderChange, updateOrderStatus],
  );

  const toggleItemApproval = useCallback(
    (orderId: string, sku: string) => {
      mutateDraft((orders) =>
        orders.map((o) =>
          o.orderId === orderId
            ? {
                ...o,
                items: o.items.map((it) =>
                  it.sku === sku ? { ...it, isApproved: !it.isApproved } : it,
                ),
              }
            : o,
        ),
      );
      recordOrderChange(orderId);
    },
    [mutateDraft, recordOrderChange],
  );

  const approveAllItems = useCallback(
    (orderId: string, approved: boolean) => {
      mutateDraft((orders) =>
        orders.map((o) =>
          o.orderId === orderId
            ? { ...o, items: o.items.map((it) => ({ ...it, isApproved: approved })) }
            : o,
        ),
      );
      recordOrderChange(orderId);
    },
    [mutateDraft, recordOrderChange],
  );

  const updateItemQuantity = useCallback(
    (orderId: string, sku: string, quantity: number) => {
      mutateDraft((orders) =>
        orders.map((o) =>
          o.orderId === orderId
            ? {
                ...o,
                items: o.items.map((it) =>
                  it.sku === sku ? { ...it, quantity: Math.max(0, quantity) } : it,
                ),
              }
            : o,
        ),
      );
      recordOrderChange(orderId);
    },
    [mutateDraft, recordOrderChange],
  );

  /* ---------------- Broadcast ---------------- */
  const publish = useCallback(() => {
    setPublished(clone(draft));
    setIsDirty(false);
    draft.forEach((d) => recordOrderChange(d.orderId));
    pushAlert("עודכן שידור חי — לוח ההזמנות רוענן", "success");
  }, [draft, pushAlert, recordOrderChange]);

  const discardDraft = useCallback(() => {
    setDraft(clone(published));
    setIsDirty(false);
  }, [published]);

  /* ---------------- Data Source & Delta Merge Polling ---------------- */
  const isDirtyRef = useRef(false);
  isDirtyRef.current = isDirty;
  const failures = useRef(0);

  /** Announce changes and trigger NoaFlashOverlay on new orders or critical status */
  const announceChanges = useCallback(
    (prev: Order[], next: Order[]) => {
      const prevById = new Map(prev.map((o) => [o.orderId, o]));

      next.forEach((order) => {
        const before = prevById.get(order.orderId);

        // 1. Brand new order detected from Google Sheets!
        if (!before) {
          recordOrderChange(order.orderId);
          const msg = `הזמנה חדשה התקבלה! #${order.orderId} עבור ${order.customerName} (${order.city})`;
          setLatestOrderEvent({
            type: "new_order",
            orderId: order.orderId,
            order,
            message: msg,
            timestamp: Date.now(),
          });
          // Trigger NoaFlashOverlay for new order alert and play audio chime
          pushAlert(msg, "warning", true);
          playNewOrderSound();

          // If brand new order is urgent/high priority, announce it in Hebrew
          if (isHighPriorityUrgentOrder(order)) {
            speakHebrew(
              `התקבלה הזמנה דחופה חדשה! מספר ${order.orderId}, עבור ${order.customerName}, סבב ${order.round}.`,
            );
          }
          return;
        }

        // 2. Status change detected from sheet update
        if (before.status !== order.status) {
          recordOrderChange(order.orderId);
          const isUrgent = order.status === "בהעמסה" || order.status === "מוכן להעמסה";
          const msg = `סטטוס עודכן — הזמנה ${order.orderId} ${order.customerName}: ${order.status}`;

          // Trigger autonomous Hebrew voice narration for high priority / urgent order status changes
          announceUrgentOrderStatusChange(order, order.status, before.status);

          if (isUrgent) {
            setLatestOrderEvent({
              type: "status_urgent",
              orderId: order.orderId,
              order,
              message: msg,
              timestamp: Date.now(),
            });
            pushAlert(msg, "warning", true);
            playSuccessSound();
          } else {
            setLatestOrderEvent({
              type: "status_changed",
              orderId: order.orderId,
              order,
              message: msg,
              timestamp: Date.now(),
            });
            pushAlert(msg, order.status === "סופק" ? "success" : "info");
            if (order.status === "סופק") {
              playSuccessSound();
            } else {
              playStatusChime();
            }
          }
        }

        // 3. New SKUs added to existing order
        const beforeSkus = new Set(before.items.map((i) => i.sku));
        const added = order.items.filter((i) => !beforeSkus.has(i.sku));
        if (added.length > 0) {
          recordOrderChange(order.orderId);
          pushAlert(
            `נוספו ${added.length} מק"טים להזמנה ${order.orderId} (${added
              .map((i) => i.sku)
              .join(", ")})`,
            "info",
          );
        }

        // 4. Item approvals
        const beforeApproved = before.items.filter((i) => i.isApproved).length;
        const nowApproved = order.items.filter((i) => i.isApproved).length;
        if (nowApproved > beforeApproved) {
          recordOrderChange(order.orderId);
          pushAlert(
            `אושרו ${nowApproved - beforeApproved} מק"טים נוספים בהזמנה ${order.orderId}`,
            "success",
          );
        }
      });
    },
    [pushAlert, recordOrderChange],
  );

  /* Delta Merge Sync: fetches fresh orders and reconciles with local overrides */
  const syncNow = useCallback(
    async (force = false) => {
      setSyncStatus("syncing");
      setSyncError(null);
      try {
        const fetched =
          sourceMode === "sheets" && sheetUrl
            ? await fetchOrdersWithResilience(sheetUrl, undefined, force)
            : getMockOrders();

        // Delta merge: never bluntly overwrite orders with setOrders(fetched)
        const { mergedOrders, updatedOverrides, cleanedCount } = reconcileOrdersWithOverrides(
          fetched,
          overridesRef.current,
        );

        // If overrides were cleaned up because sheet caught up, save to localStorage
        if (cleanedCount > 0) {
          setOrderStatusOverrides(updatedOverrides);
          saveLocalOverrides(updatedOverrides);
        }

        setPublished((prev) => {
          announceChanges(prev, mergedOrders);
          return mergedOrders;
        });

        // Preserve active uncommitted draft in studio
        if (!isDirtyRef.current) {
          setDraft(clone(mergedOrders));
        }

        setLastSyncAt(new Date().toISOString());
        setSyncStatus("ok");
        failures.current = 0;
      } catch (err) {
        failures.current += 1;
        setSyncStatus("error");
        setSyncError(err instanceof Error ? err.message : "שגיאת סנכרון לא ידועה");
        if (failures.current <= 2) {
          pushAlert("הסנכרון מול גיליון דשבורד_הזמנות נכשל", "critical");
        }
      }
    },
    [sourceMode, sheetUrl, pushAlert, announceChanges],
  );

  /* Manual write-back functions */
  const syncStatusToSheet = useCallback(
    async (orderId: string, status: OrderStatus): Promise<boolean> => {
      try {
        const res = await updateSheetOrderStatus({
          orderId,
          status,
          webhookUrl: webhookUrlRef.current || undefined,
          sheetName: "דשבורד_הזמנות",
        });
        if (res.success && res.syncedToSheet) {
          setOrderStatusOverrides((prev) => {
            if (!prev[orderId]) return prev;
            const next = { ...prev, [orderId]: { ...prev[orderId], synced: true } };
            saveLocalOverrides(next);
            return next;
          });
          pushAlert(`הזמנה #${orderId} סונכרנה בהצלחה לגיליון Google Sheets`, "success");
          return true;
        }
        return false;
      } catch (err) {
        console.warn("syncStatusToSheet error:", err);
        return false;
      }
    },
    [pushAlert],
  );

  const syncAllStatusesToSheet = useCallback(async () => {
    const pending = Object.entries(overridesRef.current).filter(([, ov]) => !ov.synced);
    if (pending.length === 0) {
      pushAlert("כל הסטטוסים המקומיים כבר מסונכרנים לגיליון", "info");
      return;
    }
    pushAlert(`מתחיל סנכרון של ${pending.length} הזמנות לגיליון...`, "info");
    for (const [orderId, ov] of pending) {
      await syncStatusToSheet(orderId, ov.status);
    }
  }, [syncStatusToSheet, pushAlert]);

  const testSheetWriteConnection = useCallback(async () => {
    const current = webhookUrlRef.current;
    return await testSheetWebhookConnection(current);
  }, []);

  const setSourceMode = useCallback((mode: DataSourceMode) => {
    setSourceModeState(mode);
    setSyncStatus("idle");
    try {
      const raw = localStorage.getItem(SOURCE_CONFIG_STORAGE_KEY);
      const cfg = raw ? JSON.parse(raw) : {};
      localStorage.setItem(SOURCE_CONFIG_STORAGE_KEY, JSON.stringify({ ...cfg, sourceMode: mode }));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const setSheetUrl = useCallback((url: string) => {
    setSheetUrlState(url);
    try {
      const raw = localStorage.getItem(SOURCE_CONFIG_STORAGE_KEY);
      const cfg = raw ? JSON.parse(raw) : {};
      localStorage.setItem(SOURCE_CONFIG_STORAGE_KEY, JSON.stringify({ ...cfg, sheetUrl: url }));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const setWebhookUrl = useCallback((url: string) => {
    setWebhookUrlState(url);
    try {
      const raw = localStorage.getItem(SOURCE_CONFIG_STORAGE_KEY);
      const cfg = raw ? JSON.parse(raw) : {};
      localStorage.setItem(SOURCE_CONFIG_STORAGE_KEY, JSON.stringify({ ...cfg, webhookUrl: url }));
    } catch {
      /* storage unavailable */
    }
  }, []);

  const setPollingSeconds = useCallback((seconds: number) => {
    const safe = Math.min(600, Math.max(10, seconds || 15));
    setPollingSecondsState(safe);
    try {
      const raw = localStorage.getItem(SOURCE_CONFIG_STORAGE_KEY);
      const cfg = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        SOURCE_CONFIG_STORAGE_KEY,
        JSON.stringify({ ...cfg, pollingSeconds: safe }),
      );
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Load saved source config
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SOURCE_CONFIG_STORAGE_KEY);
      if (!raw) return;
      const cfg = JSON.parse(raw) as Partial<{
        sourceMode: DataSourceMode;
        sheetUrl: string;
        webhookUrl: string;
        pollingSeconds: number;
      }>;
      if (typeof cfg.sheetUrl === "string") setSheetUrlState(cfg.sheetUrl);
      if (typeof cfg.webhookUrl === "string") setWebhookUrlState(cfg.webhookUrl);
      if (typeof cfg.pollingSeconds === "number") setPollingSecondsState(cfg.pollingSeconds);
      if (cfg.sourceMode === "mock") setSourceModeState("mock");
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Adaptive polling: one request at a time, with an immediate refresh when visible.
  useEffect(() => {
    if (sourceMode !== "sheets" || !sheetUrl) return;
    failures.current = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    const schedule = (delay: number) => {
      if (!disposed) timer = setTimeout(run, delay);
    };
    const run = async () => {
      await syncNow();
      if (disposed) return;
      const retryDelay =
        failures.current > 0 ? Math.min(30, 5 * 2 ** (failures.current - 1)) : pollingSeconds;
      schedule(retryDelay * 1000);
    };
    void run();
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        if (timer) clearTimeout(timer);
        void run();
      }
    };
    const onOnline = () => {
      if (timer) clearTimeout(timer);
      void run();
    };
    const onFocus = () => {
      if (timer) clearTimeout(timer);
      void run();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceMode, sheetUrl, pollingSeconds]);

  /* ---------------- Noa AI Automatic Urgency Insights ---------------- */
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      published.forEach((order) => {
        if (order.status === "סופק") return;
        const mins = minutesUntil(order.targetTime, now);

        if (mins <= 0) {
          const key = `overrun-${order.orderId}`;
          setAlerts((prev) => {
            if (prev.some((a) => a.id === key)) return prev;
            const msg = `חריגה בלו״ז: הזמנה #${order.orderId} ל${order.customerName} חרגה משעת היעד (${order.targetTime})!`;
            setLatestOrderEvent({
              type: "status_urgent",
              orderId: order.orderId,
              order,
              message: msg,
              timestamp: Date.now(),
            });
            pushAlert(msg, "critical", true);
            return [
              {
                id: key,
                level: "critical",
                message: msg,
                createdAt: now.toISOString(),
                isFlash: true,
                durationMs: 11000,
              },
              ...prev,
            ].slice(0, 12);
          });
        } else if (mins > 0 && mins <= 25) {
          const key = `eta-${order.orderId}`;
          setAlerts((prev) => {
            if (prev.some((a) => a.id === key)) return prev;
            const isUrgent = mins <= 10;
            const msg = `נותרו ${mins} דקות ליעד — הזמנה ${order.orderId} ל${order.customerName} (${order.city})`;
            if (isUrgent) {
              setLatestOrderEvent({
                type: "status_urgent",
                orderId: order.orderId,
                order,
                message: msg,
                timestamp: Date.now(),
              });
              pushAlert(msg, "critical", true);
            }
            return [
              {
                id: key,
                level: (mins <= 15 ? "critical" : "warning") as AlertLevel,
                message: msg,
                createdAt: now.toISOString(),
              },
              ...prev,
            ].slice(0, 12);
          });
        }
      });
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [published, pushAlert]);

  /* ---------------- Autonomous Real-Time Inventory Deficit Monitor (No Human Touch) ---------------- */
  const alertedCriticalSkusRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    liveInventory.items.forEach((item) => {
      if (item.isCritical && !alertedCriticalSkusRef.current.has(item.sku)) {
        alertedCriticalSkusRef.current.add(item.sku);
        const msg = `🚨 התראת מלאי אוטומטית: יתרת ${item.name} ירדה ל-${item.currentStock} ${item.unit} (סף: ${item.safetyStockLevel}). ${item.recommendedOrder}`;
        pushAlert(msg, "critical", true);
        playAlarmSound();
        if (voiceAnnounceEnabled) {
          void speakHebrew(`התראת מלאי אוטומטית. יתרת ${item.name} קריטית.`);
        }
      }
    });
  }, [liveInventory, pushAlert, voiceAnnounceEnabled]);

  /* ---------------- AI Briefing Generator ---------------- */
  const generateAIBriefing = useCallback(
    async (customPrompt?: string) => {
      setIsGeneratingAI(true);
      try {
        const busiestWh = [...WAREHOUSES].sort((a, b) => b.loadRatio - a.loadRatio)[0];
        const res = await fetch("/api/ai/insights", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            prompt: customPrompt || aiTraining.customPromptRule,
            trainingFocus: aiTraining.focusMode,
            contextData: {
              activeOrdersCount: published.length,
              loadingOrdersCount: published.filter((o) => o.status === "בהעמסה").length,
              busiestWarehouse: busiestWh
                ? `${busiestWh.name} (${Math.round(busiestWh.loadRatio * 100)}%)`
                : "מחסן 7",
              trafficSummary: "עומס בכביש 1 לכיוון שער הגיא ועומס בציר 40",
              totalWeightKg: published.reduce(
                (s, o) => s + o.logisticsMetrics.estimatedWeightKg,
                0,
              ),
            },
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            message?: string;
            roleSpecificBriefing?: {
              forWarehouse?: string;
              forDriver?: string;
              scheduledNotice?: string;
            };
            trafficAdvice?: string;
            suggestedLevel?: AlertLevel;
          };

          setTargetedBriefings({
            forWarehouse:
              data.roleSpecificBriefing?.forWarehouse ||
              "לתעדף העמסת שקי בלה צמוד לקבינה ולאחריהם משטחי סבן 60060.",
            forDriver:
              data.roleSpecificBriefing?.forDriver ||
              "עומס בכביש 1 לכיוון שער הגיא (14 דק' עיכוב). מומלץ שימוש בציר 431.",
            scheduledNotice:
              data.roleSpecificBriefing?.scheduledNotice ||
              "הכנת סבב הבא: וידוא תעודות משלוח חתומות עם המנופאי.",
            trafficAdvice:
              data.trafficAdvice || "כביש 6 וכביש 4 זורמים חלק. כביש 40 פקוק מצומת אחיסמך.",
            updatedAt: new Date().toLocaleTimeString("he-IL", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          });

          if (data.message) {
            pushAlert(data.message, data.suggestedLevel || "info");
          }
        }
      } catch (err) {
        console.warn("AI generation failed, fallback remains active:", err);
      } finally {
        setIsGeneratingAI(false);
      }
    },
    [aiTraining, published, pushAlert],
  );

  /* ---------------- Scheduled Messages Ticker ---------------- */
  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      const currentClock = now.toLocaleTimeString("he-IL", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setScheduledMessages((prev) =>
        prev.map((msg) => {
          if (msg.isActive && msg.time === currentClock && !msg.isTriggered) {
            pushAlert(`[הודעה מתוזמנת - ${msg.title}]: ${msg.content}`, "info");
            return { ...msg, isTriggered: true };
          }
          return msg;
        }),
      );
    };

    const timer = setInterval(checkSchedule, 20000);
    return () => clearInterval(timer);
  }, [pushAlert]);

  /* ---------------- Nearest Order Distance & Screensaver Trigger ---------------- */
  const nearestOrderMinutesRemaining = useMemo(() => {
    const activeOrders = published.filter((o) => o.status === "ממתין" || o.status === "בהעמסה");
    if (activeOrders.length === 0) return 999;

    const now = new Date();
    let minMinutes = Number.POSITIVE_INFINITY;
    for (const o of activeOrders) {
      const diff = minutesUntil(o.targetTime, now);
      if (diff >= 0 && diff < minMinutes) {
        minMinutes = diff;
      }
    }
    return Number.isFinite(minMinutes) ? minMinutes : 999;
  }, [published]);

  useEffect(() => {
    const onUserAction = () => {
      lastInteractionTime.current = Date.now();
    };

    window.addEventListener("mousemove", onUserAction);
    window.addEventListener("mousedown", onUserAction);
    window.addEventListener("keydown", onUserAction);
    window.addEventListener("touchstart", onUserAction);
    window.addEventListener("wheel", onUserAction);

    return () => {
      window.removeEventListener("mousemove", onUserAction);
      window.removeEventListener("mousedown", onUserAction);
      window.removeEventListener("keydown", onUserAction);
      window.removeEventListener("touchstart", onUserAction);
      window.removeEventListener("wheel", onUserAction);
    };
  }, []);

  useEffect(() => {
    if (!screensaverSettings.isEnabled) return;

    const interval = setInterval(() => {
      const idleSec = Math.floor((Date.now() - lastInteractionTime.current) / 1000);
      setIdleSecondsCount(idleSec);

      const isIdleExceeded =
        screensaverSettings.idleTimeoutSeconds > 0 &&
        idleSec >= screensaverSettings.idleTimeoutSeconds;

      const isOrderGapExceeded =
        screensaverSettings.minOrderGapMinutes > 0 &&
        nearestOrderMinutesRemaining !== null &&
        nearestOrderMinutesRemaining >= screensaverSettings.minOrderGapMinutes &&
        idleSec >= 15;

      if ((isIdleExceeded || isOrderGapExceeded) && !isScreensaverActive && !isStudioOpen) {
        setScreensaverActive(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [screensaverSettings, nearestOrderMinutesRemaining, isScreensaverActive, isStudioOpen]);

  /* ---------------- Keyboard Shortcuts ---------------- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "E" || e.key === "e")) {
        e.preventDefault();
        setStudioOpen((v) => !v);
      }
      if (e.key === "Escape") {
        if (isScreensaverActive) {
          setScreensaverActive(false);
          lastInteractionTime.current = Date.now();
        } else {
          setStudioOpen(false);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isScreensaverActive]);

  /* ---------------- Derived Metrics ---------------- */
  const focusOrder = useMemo(
    () => published.find((o) => o.status === "בהעמסה") ?? null,
    [published],
  );

  const counts = useMemo(() => {
    const base: Record<OrderStatus, number> = {
      ממתין: 0,
      בהכנה: 0,
      "מוכן להעמסה": 0,
      בהעמסה: 0,
      "יצא לדרך": 0,
      סופק: 0,
    };
    published.forEach((o) => {
      if (base[o.status] !== undefined) {
        base[o.status] += 1;
      }
    });
    return base;
  }, [published]);

  const value: DispatchContextValue = {
    published,
    draft,
    alerts,
    flash,
    drivers: DRIVERS,
    warehouses: WAREHOUSES,
    sourceMode,
    sheetUrl,
    webhookUrl,
    statusSyncRecords,
    orderStatusOverrides,
    latestOrderEvent,
    pollingSeconds,
    lastSyncAt,
    syncStatus,
    syncError,
    isDirty,
    isStudioOpen,
    openStudio: () => setStudioOpen(true),
    closeStudio: () => setStudioOpen(false),
    toggleStudio: () => setStudioOpen((v) => !v),
    selectedOrderId,
    selectOrder: setSelectedOrderId,
    updateOrder,
    updateOrderStatus,
    setOrderStatus,
    quickUpdateStatus,
    clearOrderStatusOverride,
    clearAllOrderStatusOverrides,
    toggleItemApproval,
    approveAllItems,
    updateItemQuantity,
    publish,
    discardDraft,
    pushAlert,
    dismissFlash,
    removeAlert,
    setSourceMode,
    setSheetUrl,
    setWebhookUrl,
    setPollingSeconds,
    syncNow,
    syncStatusToSheet,
    syncAllStatusesToSheet,
    testSheetWriteConnection,
    focusOrder,
    counts,
    currentTime,
    recentlyChangedOrderIds,
    recordOrderChange,
    /* automated real-time inventory */
    liveInventory,
    activeWarehouseFilter,
    setActiveWarehouseFilter,
    /* picker workflow */
    startPicking,
    finishPicking,
    reportPickerOverrun,
    /* screensaver */
    isScreensaverActive,
    setScreensaverActive,
    screensaverSettings,
    updateScreensaverSettings,
    nearestOrderMinutesRemaining,
    idleSecondsCount,
    /* AI */
    aiTraining,
    updateAITraining,
    scheduledMessages,
    addScheduledMessage,
    toggleScheduledMessage,
    deleteScheduledMessage,
    targetedBriefings,
    generateAIBriefing,
    isGeneratingAI,
    /* voice synthesis alerts */
    isVoiceAnnounceEnabled: voiceAnnounceEnabled,
    toggleVoiceAnnounce,
    setVoiceAnnounceEnabled,
    isVoiceSpeaking: voiceSpeaking,
    triggerVoiceTest: testVoiceAnnouncement,
    speakUrgentAlert: speakHebrew,
  };

  return <DispatchContext.Provider value={value}>{children}</DispatchContext.Provider>;
}

export function useDispatchBoard() {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error("useDispatchBoard must be used inside DispatchProvider");
  return ctx;
}
