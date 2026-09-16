import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import type { Order, OrderStatus } from "@/types/dispatch";
import {
  playNewOrderSound,
  playSuccessSound,
  playAlarmSound,
} from "@/utils/soundEffects";

export interface DispatchBoardContextType {
  published: Order[];
  orders: Order[];
  isLoading: boolean;
  isRefreshing: boolean;
  syncStatus: "idle" | "syncing" | "error";
  lastUpdated: Date | null;
  activeBranch: string;
  setActiveBranch: (branch: string) => void;
  startPicking: (orderId: string, picker?: string) => Promise<void>;
  finishPicking: (orderId: string) => Promise<void>;
  reportPickerOverrun: (orderId: string) => void;
  quickUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updateOrderStatus: (orderId: string, newStatus: string) => Promise<void>;
  syncNow: () => Promise<void>;
  toggleItemApproval: (orderId: string, sku: string) => void;
  approveAllItems: (orderId: string) => void;
  pushAlert: (text: string, type?: "info" | "success" | "warning" | "error") => void;
  broadcastCustomMessage: (text: string) => void;
  announceMorningShift: (speakerName?: string) => void;
}

const DispatchContext = createContext<DispatchBoardContextType | undefined>(undefined);

export function DispatchProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">("idle");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeBranch, setActiveBranch] = useState<string>("all");

  const prevOrdersRef = useRef<Map<string, Order>>(new Map());
  const initialLoadDoneRef = useRef(false);

  // סנכרון הזמנות מול API / גיליון
  const fetchOrdersData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    setSyncStatus("syncing");

    try {
      const res = await fetch("/api/sheets/orders", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const fetchedOrders: Order[] = Array.isArray(data) ? data : data.orders || [];
        setOrders(fetchedOrders);
        setLastUpdated(new Date());

        // ניטור שינויי סטטוס והשמעת צלילים
        if (initialLoadDoneRef.current) {
          const prevMap = prevOrdersRef.current;
          fetchedOrders.forEach((order) => {
            const prev = prevMap.get(order.orderId || order.id);
            if (!prev) {
              playNewOrderSound();
            } else if (prev.status !== order.status) {
              if (order.status === "מוכן להעמסה" || order.status === "יצא לדרך" || order.status === "סופק") {
                playSuccessSound();
              }
            }
          });
        }

        const map = new Map<string, Order>();
        fetchedOrders.forEach((o) => map.set(o.orderId || o.id, o));
        prevOrdersRef.current = map;
        initialLoadDoneRef.current = true;
        setSyncStatus("idle");
      } else {
        setSyncStatus("idle");
      }
    } catch (err) {
      console.warn("סנכרון הזמנות ברקע:", err);
      setSyncStatus("error");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // התחלת ליקוט עם חותמת זמן
  const startPicking = async (orderId: string, picker = "אורן") => {
    const now = Date.now();
    if (typeof window !== "undefined") {
      localStorage.setItem(`saban_picker_start_${orderId}`, String(now));
    }
    await quickUpdateStatus(orderId, "בהכנה" as OrderStatus);
    playNewOrderSound();
  };

  // סיום ליקוט
  const finishPicking = async (orderId: string) => {
    await quickUpdateStatus(orderId, "מוכן להעמסה" as OrderStatus);
    playSuccessSound();
  };

  // דיווח חריגת SLA (מעל 20 דק')
  const reportPickerOverrun = (orderId: string) => {
    playAlarmSound();
  };

  // עדכון סטטוס מהיר
  const quickUpdateStatus = async (orderId: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => ((o.orderId || o.id) === orderId ? { ...o, status } : o))
    );

    try {
      await fetch("/api/sheets/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
    } catch (e) {
      console.error("שגיאה בעדכון סטטוס:", e);
    }
  };

  // אישור פריט בודד בליקוט
  const toggleItemApproval = (orderId: string, sku: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if ((order.orderId || order.id) !== orderId) return order;
        const items = (order.items || []).map((item) =>
          item.sku === sku ? { ...item, isApproved: !item.isApproved } : item
        );
        return { ...order, items };
      })
    );
  };

  // אישור כל הפריטים בהזמנה
  const approveAllItems = (orderId: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if ((order.orderId || order.id) !== orderId) return order;
        const items = (order.items || []).map((item) => ({ ...item, isApproved: true }));
        return { ...order, items };
      })
    );
    playSuccessSound();
  };

  const pushAlert = (text: string) => {
    console.log("Alert:", text);
  };

  const broadcastCustomMessage = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "he-IL";
      window.speechSynthesis.speak(u);
    }
  };

  const announceMorningShift = (speakerName = "ראמי") => {
    playNewOrderSound();
    broadcastCustomMessage(`בוקר טוב לכולם, ${speakerName} התחיל משמרת בסדרן. יום מוצלח לכל הצוות.`);
  };

  useEffect(() => {
    fetchOrdersData(false);
    const interval = setInterval(() => {
      fetchOrdersData(false);
    }, 12000);
    return () => clearInterval(interval);
  }, [fetchOrdersData]);

  const value: DispatchBoardContextType = {
    published: orders,
    orders,
    isLoading,
    isRefreshing,
    syncStatus,
    lastUpdated,
    activeBranch,
    setActiveBranch,
    startPicking,
    finishPicking,
    reportPickerOverrun,
    quickUpdateStatus,
    updateOrderStatus: quickUpdateStatus,
    syncNow: () => fetchOrdersData(true),
    toggleItemApproval,
    approveAllItems,
    pushAlert,
    broadcastCustomMessage,
    announceMorningShift,
  };

  return (
    <DispatchContext.Provider value={value}>
      {children}
    </DispatchContext.Provider>
  );
}

// ייצוא השם המדויק ש-src/routes/index.tsx דורש
export function useDispatchBoard() {
  const context = useContext(DispatchContext);
  if (!context) {
    throw new Error("useDispatchBoard must be used within a DispatchProvider");
  }
  return context;
}

// תמיכה לאחור בייצוא useDispatch
export const useDispatch = useDispatchBoard;
