import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import type { Order } from "@/types/dispatch";
import { sheetsService } from "@/services/sheetsService";
import { voiceAlertService } from "@/services/voiceAlertService";
import { playSound } from "@/utils/soundEffects";
import { calculateInventoryBalances } from "@/services/inventoryService";

export interface DispatchContextType {
  orders: Order[];
  isLoading: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  activeBranch: string;
  setActiveBranch: (branch: string) => void;
  updateOrderStatus: (orderId: string, newStatus: string) => Promise<void>;
  refreshOrders: () => Promise<void>;
  broadcastCustomMessage: (text: string) => void;
  announceMorningShift: (speakerName?: string) => void;
  announceDriverDeparture: (driverName: string, destination: string) => void;
  announcePickingComplete: (pickerName: string, orderId: string) => void;
}

const DispatchContext = createContext<DispatchContextType | undefined>(undefined);

export function DispatchProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeBranch, setActiveBranch] = useState<string>("all");

  const prevOrdersRef = useRef<Map<string, Order>>(new Map());
  const initialLoadDoneRef = useRef(false);
  const alertedCriticalSkusRef = useRef<Set<string>>(new Set());

  // פונקציית רענון וסנכרון נתונים
  const fetchOrdersData = useCallback(async (showRefreshingSpinner = false) => {
    if (showRefreshingSpinner) setIsRefreshing(true);
    try {
      const fetchedOrders = await sheetsService.fetchOrders();
      setOrders(fetchedOrders || []);
      setLastUpdated(new Date());

      // בדיקת שינויי סטטוס ומלאי רק לאחר הטעינה הראשונית
      if (initialLoadDoneRef.current && fetchedOrders) {
        checkOrderChangesAndAnnounce(fetchedOrders);
        checkInventoryDeficitsAndAnnounce(fetchedOrders);
      } else {
        // בטעינה ראשונה בונים את המפה בלי להכריז
        const map = new Map<string, Order>();
        (fetchedOrders || []).forEach((o) => map.set(o.id, o));
        prevOrdersRef.current = map;
        initialLoadDoneRef.current = true;
      }
    } catch (err) {
      console.error("שגיאה בסנכרון נתוני הזמנות:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // ניטור שינויי סטטוס והזמנות חדשות - שפת ח. סבן
  const checkOrderChangesAndAnnounce = (currentOrders: Order[]) => {
    const prevMap = prevOrdersRef.current;
    const newMap = new Map<string, Order>();

    currentOrders.forEach((order) => {
      newMap.set(order.id, order);
      const prev = prevMap.get(order.id);

      if (!prev) {
        // הזמנה חדשה נוספה למערכת
        playSound("new_order");
        if (order.deliveryType === "מנוף") {
          voiceAlertService.announce(
            `תמיר, יש הזמנת מנוף חדשה עבור ${order.client || "לקוח"}.`
          );
        } else {
          voiceAlertService.announce(
            `תמיר, יש הזמנה חדשה לליקוט עבור ${order.client || "לקוח"}.`
          );
        }
      } else if (prev.status !== order.status) {
        // זיהוי שינוי סטטוס
        const status = (order.status || "").trim();

        if (status === "מוכן להעמסה") {
          playSound("success");
          voiceAlertService.announce(
            `אורן סיים ליקוט להזמנה ${order.id}, משטח מוכן להעמסה.`
          );
        } else if (status === "בהעמסה") {
          const driver = order.driver || "הנהג";
          voiceAlertService.announce(
            `שימו לב במגרש, משאית של ${driver} נכנסת לרמפה להעמסה.`
          );
        } else if (status === "יצא לדרך" || status === "סופק") {
          playSound("success");
          const driver = order.driver || "הנהג";
          const dest = order.destination || "האתר";
          voiceAlertService.announce(
            `משאית של ${driver} הועמסה ויצאה לדרך ל${dest}.`
          );
        }
      }
    });

    prevOrdersRef.current = newMap;
  };

  // ניטור מלאי רצפה והכרזות קצרות וקלילות
  const checkInventoryDeficitsAndAnnounce = (currentOrders: Order[]) => {
    try {
      const inventory = calculateInventoryBalances(currentOrders, activeBranch);
      if (!inventory || !inventory.items) return;

      inventory.items.forEach((item: any) => {
        const skuKey = item.sku || item.cleanName;

        if (item.isCritical && !alertedCriticalSkusRef.current.has(skuKey)) {
          alertedCriticalSkusRef.current.add(skuKey);
          playSound("annoying_buzzer");

          if (item.cleanName.includes("מלט")) {
            voiceAlertService.announce("חברים, מלט אפור מתקרב לסוף ברצפה, לשים לב.");
          } else if (item.cleanName.includes("חול") || item.cleanName.includes("בלה")) {
            voiceAlertService.announce("ראמי, נשארו פחות מעשר בלות חול במגרש, צריך לתאם פול.");
          } else if (item.cleanName.includes("דבק")) {
            voiceAlertService.announce("שימו לב במחסן: דבק קרמיקה ירד מתחת לסף הביטחון.");
          } else if (item.cleanName.includes("טיט")) {
            voiceAlertService.announce("אורן, נגמר המקום במשטחי טיט, נא לרכז ספקים.");
          } else {
            voiceAlertService.announce(`שימו לב במגרש: מלאי ${item.cleanName} נמוך.`);
          }
        } else if (!item.isCritical && alertedCriticalSkusRef.current.has(skuKey)) {
          // איפוס התראה כשהמלאי עלה חזרה
          alertedCriticalSkusRef.current.delete(skuKey);
        }
      });
    } catch (e) {
      console.error("שגיאה בחישוב התראות מלאי קוליות:", e);
    }
  };

  // עדכון סטטוס הזמנה
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    // עדכון אופטימי מיידי לכל המסכים
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    try {
      await sheetsService.updateOrderStatus(orderId, newStatus);
      // סנכרון חוזר מוודא
      fetchOrdersData(false);
    } catch (err) {
      console.error("שגיאה בעדכון סטטוס להזמנה:", err);
      // החזרה למצב קודם אם נכשל
      fetchOrdersData(false);
    }
  };

  // הכרזת בוקר טוב ופתיחת משמרת
  const announceMorningShift = useCallback((speakerName = "ראמי") => {
    playSound("new_order");
    voiceAlertService.announce(
      `בוקר טוב לכולם, ${speakerName} התחיל משמרת בסדרן. יום מוצלח לכל הצוות.`
    );
  }, []);

  // הכרזת שחרור נהג לדרך
  const announceDriverDeparture = useCallback((driverName: string, destination: string) => {
    playSound("success");
    voiceAlertService.announce(
      `משאית של ${driverName} הועמסה ויצאה לדרך ל${destination}. סע בזהירות!`
    );
  }, []);

  // הכרזת סיום ליקוט
  const announcePickingComplete = useCallback((pickerName: string, orderId: string) => {
    playSound("success");
    voiceAlertService.announce(
      `${pickerName} סיים ליקוט להזמנה ${orderId}, משטח מוכן להעמסה.`
    );
  }, []);

  // שידור הודעה חופשית
  const broadcastCustomMessage = useCallback((text: string) => {
    if (!text.trim()) return;
    voiceAlertService.announce(text.trim());
  }, []);

  // Polling רציף כל 12 שניות
  useEffect(() => {
    fetchOrdersData(false);
    const interval = setInterval(() => {
      fetchOrdersData(false);
    }, 12000);

    return () => clearInterval(interval);
  }, [fetchOrdersData]);

  const value = {
    orders,
    isLoading,
    isRefreshing,
    lastUpdated,
    activeBranch,
    setActiveBranch,
    updateOrderStatus,
    refreshOrders: () => fetchOrdersData(true),
    broadcastCustomMessage,
    announceMorningShift,
    announceDriverDeparture,
    announcePickingComplete,
  };

  return (
    <DispatchContext.Provider value={value}>
      {children}
    </DispatchContext.Provider>
  );
}

export function useDispatch() {
  const context = useContext(DispatchContext);
  if (!context) {
    throw new Error("useDispatch must be used within a DispatchProvider");
  }
  return context;
}
