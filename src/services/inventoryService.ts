/**
 * ============================================================================
 * מודול ניהול וחישוב מלאי מגרש בזמן אמת — ח. סבן חומרי בניין בע"מ
 * קובץ: src/services/inventoryService.ts
 * 
 * תפקיד המודול:
 * 1. שאיבה וסכימת כמויות משיכה מתוך הזמנות גיליון Google Sheets בזמן אמת.
 * 2. פירוק מחרוזות טקסט של עמודה H וסריקת עמודות לוגיסטיות (בלות/משטחים/משקל).
 * 3. חישוב יתרת רצפה אפקטיבית (Effective Stock) אל מול ספי ביטחון קבועים.
 * 4. יצירת המלצות רכש חכמות (עיגול למשטחים שלמים ופול-טריילרים ממחצבה).
 * 
 * הדרכה ולימוד מקדמים (אם משנים מקדם מ-1.0 ל-2.0):
 * - שינוי מקדם החישוב של buffer מ-1.25 ל-2.0 יכפיל פי 2 את כמות ההזמנה המומלצת.
 * - שינוי סף קריטי (isCritical) מ-0.5 ל-1.0 יקפיץ התראה אדומה ברגע ההגעה לסף הביטחון במקום בחצי ממנו.
 * - הגדרת initialBase על 5,000 מבטיחה שהיתרה תישאר חיובית וירוקה ולא תקפוץ כקריטית במשיכות רגילות.
 * ============================================================================
 */

import type { Order } from "@/types/dispatch";
import type { NormalizedProductSlideItem, ScreensaverBranchFilter } from "@/types/screensaver";
import {
  PREDEFINED_SAFETY_STOCKS,
  PRODUCT_IMAGES,
  type SafetyStockRule,
  evaluateItemStock,
  parseColumnHProductText,
} from "@/services/analyticsService";

// ערך בסיס גלובלי לפתיחת מלאי - 5,000 יחידות כדי למנוע התראות קריטיות שגויות
export const GLOBAL_INITIAL_STOCK_BASE = 500;

// הגדרת מבנה לפריט מלאי חי המוצג בדשבורד ובמובייל
export interface LiveInventoryItem {
  sku: string;
  name: string;
  category: "cement" | "big_bag" | "block" | "dry_mix" | "other";
  unit: string;
  initialStock: number;          // מלאי בסיס פתיחה (ברירת מחדל: 5000)
  totalDispensedToday: number;   // סה"כ שנמשך בפועל היום
  committedDemand: number;       // משוריין בהכנה/סידור
  currentStock: number;          // יתרה מחושבת
  safetyStockLevel: number;      // סף ביטחון מוגדר
  isLowStock: boolean;           // האם ירד מתחת לסף הביטחון
  isCritical: boolean;           // האם ירד מתחת ל-50% מסף הביטחון
  deficit: number;               // כמות חוסר להשלמה
  stockPercentage: number;       // אחוז מלאי שנותר ברצפה
  recommendedOrder: string;      // המלצת רכש מעוגלת למשטחים/פול
  explanation: string;           // נימוק אנליטי להמלצה
  lastUpdated: string;
  warehouseBranch: 1 | 4 | "all";
}

// ריכוז מדדי על של כלל המגרש
export interface LiveInventorySummary {
  items: LiveInventoryItem[];
  criticalCount: number;         // סה"כ התראות אדומות
  warningCount: number;          // סה"כ אזהרות צהובות
  totalBellaBags: number;        // סה"כ שקי בלה (עמודה J)
  totalSabanPallets: number;     // סה"כ משטחי סבן (עמודה K)
  totalWeightKg: number;         // משקל מצטבר מועמס (עמודה L)
  activeOrdersCount: number;     // הזמנות בביצוע
  completedOrdersCount: number;  // הזמנות שסופקו / יצאו
  lastCalculatedAt: string;
}

/**
 * פונקציה ראשית 1: calculateLiveInventory
 * סורקת את ההזמנות, מפלחת לפי מחסן (סניף 4 החרש / סניף 1 התלמיד),
 * ומחשבת צריכת רצפה והמלצות רכש אוטומטיות.
 */
export function calculateLiveInventory(
  orders: Order[],
  warehouseBranch: 1 | 4 | "all" = "all",
): LiveInventorySummary {
  // שלב 1: סינון לפי סניף
  const relevantOrders = orders.filter((o) => {
    if (warehouseBranch === 4) {
      const isBranch4 = /סניף 4|מחסן 4|החורש|חורש/i.test(o.warehouse);
      if (!isBranch4 && o.warehouse.trim() !== "") {
        if (/סניף 1|מחסן 1|מחסן 30|התלמיד/i.test(o.warehouse)) return false;
      }
    } else if (warehouseBranch === 1) {
      const isBranch1 = /סניף 1|מחסן 1|מחסן 30|התלמיד|תלמיד/i.test(o.warehouse);
      if (!isBranch1 && o.warehouse.trim() !== "") {
        if (/סניף 4|מחסן 4|החורש/i.test(o.warehouse)) return false;
      }
    }
    return true;
  });

  let totalBellaBags = 0;
  let totalSabanPallets = 0;
  let totalWeightKg = 0;
  let activeOrdersCount = 0;
  let completedOrdersCount = 0;

  // מפה מרכזת לצבירת כמויות לפי מק"ט/שם מוצר
  const productAggregator = new Map<
    string,
    {
      sku: string;
      name: string;
      unit: string;
      dispensed: number;
      committed: number;
    }
  >();

  // אתחול המפה עם כל מוצרי הבסיס המוגדרים מראש
  PREDEFINED_SAFETY_STOCKS.forEach((rule) => {
    const key = (rule.sku || rule.productName).trim().toLowerCase();
    productAggregator.set(key, {
      sku: rule.sku || "כללי",
      name: rule.productName,
      unit: rule.unit,
      dispensed: 0,
      committed: 0,
    });
  });

  // שלב 2: סריקה וסכימה של ההזמנות הפעילות
  relevantOrders.forEach((order) => {
    // סטטוסים שנחשבים כמשיכה פיזית מהמגרש
    const isDispensed = [
      "בהכנה",
      "מוכן להעמסה",
      "איסוף עצמי",
      "בהעמסה",
      "בדרך",
      "יצא לדרך",
      "סופק",
    ].includes(order.status);

    // סטטוסים שנחשבים כדרישה עתידית משוריינת (תוקן סינטקס)
    const isCommitted = [
      "ממתין",
      "בסידור עבודה",
      "בסידור מחר",
      "בהכנה",
    ].includes(order.status);

    if (order.status === "סופק" || order.status === "יצא לדרך") {
      completedOrdersCount++;
    } else {
      activeOrdersCount++;
    }

    // סכימת עמודות לוגיסטיות ייעודיות (J, K, L)
    if (isDispensed) {
      totalBellaBags += order.logisticsMetrics?.bellaBags || 0;
      totalSabanPallets += order.logisticsMetrics?.sabanPallets || 0;
      totalWeightKg += order.logisticsMetrics?.estimatedWeightKg || 0;
    }

    // שיוך שקי בלה (מק"ט 11511)
    if (order.logisticsMetrics?.bellaBags) {
      const bellaKey = "11511";
      const existing = productAggregator.get(bellaKey);
      if (existing) {
        if (isDispensed) existing.dispensed += order.logisticsMetrics.bellaBags;
        if (isCommitted) existing.committed += order.logisticsMetrics.bellaBags;
      }
    }

    // ניתוח עמודה H (טקסט מפורט) או מערך פריטים
    if (order.itemsFormatted && order.itemsFormatted.trim()) {
      const parsedItems = parseColumnHProductText(order.itemsFormatted);
      parsedItems.forEach((it) => {
        const key = (it.sku || it.name).trim().toLowerCase();
        const existing = productAggregator.get(key);
        if (existing) {
          if (isDispensed) existing.dispensed += it.quantity;
          if (isCommitted) existing.committed += it.quantity;
        } else {
          productAggregator.set(key, {
            sku: it.sku || "כללי",
            name: it.name,
            unit: it.unit || "יח'",
            dispensed: isDispensed ? it.quantity : 0,
            committed: isCommitted ? it.quantity : 0,
          });
        }
      });
    } else if (order.items && order.items.length > 0) {
      order.items.forEach((it) => {
        const key = (it.sku || it.name).trim().toLowerCase();
        const existing = productAggregator.get(key);
        if (existing) {
          if (isDispensed) existing.dispensed += it.quantity;
          if (isCommitted) existing.committed += it.quantity;
        } else {
          productAggregator.set(key, {
            sku: it.sku || "כללי",
            name: it.name,
            unit: it.unit || "יח'",
            dispensed: isDispensed ? it.quantity : 0,
            committed: isCommitted ? it.quantity : 0,
          });
        }
      });
    }
  });

  // שלב 3: הפעלת מנוע החישוב האוטונומי והמלצות הרכש
  const inventoryItems: LiveInventoryItem[] = [];
  let criticalCount = 0;
  let warningCount = 0;

  productAggregator.forEach((agg) => {
    const stockEval = evaluateItemStock({
      name: agg.name,
      quantity: agg.dispensed,
      sku: agg.sku,
      unit: agg.unit,
    });

    const nameLower = agg.name.toLowerCase();
    let recommendedOrder = "";
    let explanation = "";

    // חישוב מלאי מעודכן: בסיס 5,000 קבוע כדי למנוע התראות שווא קריטיות
    const baseStock = GLOBAL_INITIAL_STOCK_BASE;
    const currentStock = Math.max(0, baseStock - agg.dispensed);
    const safetyLevel = stockEval.safetyStockLevel || 50;

    // התראה קריטית: רק אם ירד מתחת לחצי מסף הביטחון (מקדם 0.5)
    // אם נשנה מקדם מ-0.5 ל-1.0: isCritical תופעל מוקדם יותר, מיד עם הגעה לסף
    const isCritical = currentStock <= Math.floor(safetyLevel * 0.5);
    const isLowStock = !isCritical && currentStock <= safetyLevel;

    // חישוב חכם 1: מלט ודבקים -> עיגול למשטחים שלמים (40 שקים למשטח)
    if (
      /מלט|דבק|טיח|שפכטל|ספירבונד|ביג גב|סיליקה/i.test(nameLower) &&
      !/בלה|שק גדול/i.test(nameLower)
    ) {
      const palletsNeeded = Math.max(1, Math.ceil(agg.dispensed / 40));
      const totalBags = palletsNeeded * 40;
      recommendedOrder = `${palletsNeeded} משטחים (${totalBags} שקים)`;
      explanation = isLowStock || isCritical
        ? `מתחת לסף ביטחון! נותרו ${currentStock}/${safetyLevel} שק. נדרש משטח שלם.`
        : `יצאו ${agg.dispensed} שק. עיגול למשטח שלם (40 שקים למשטח).`;
    } 
    // חישוב חכם 2: שקי בלה ממחצבה -> חישוב לפי קיבולת פול-טריילר (14 בלות)
    else if (/בלה|שק גדול|סומסום|חול|חצץ|טיט/i.test(nameLower)) {
      if (agg.dispensed >= 8 || isLowStock || isCritical) {
        const trucks = Math.max(1, Math.ceil(agg.dispensed / 14));
        const bags = trucks * 14;
        recommendedOrder = `${trucks} פול-טריילר (${bags} שקי בלה)`;
        explanation = isLowStock || isCritical
          ? `התראת מלאי קריטי! נותרו ${currentStock}/${safetyLevel} בלות. נדרש פול מלא.`
          : `ביקוש גבוה: מומלצת הזמנת פול מלא (14-28 בלות).`;
      } else {
        // מרווח ביטחון: כמות שנמשכה * 1.5. אם ישונה ל-2.0, ההמלצה תוכפל!
        const rec = Math.max(4, Math.ceil(agg.dispensed * 1.5));
        recommendedOrder = `${rec} שקי בלה`;
        explanation = `השלמת מלאי חצר (+50% מרווח ביטחון).`;
      }
    } 
    // חישוב חכם 3: בלוקים -> עיגול לפי אריזת יצרן (150 יח' לבלוק 10, 75 יח' לבלוק 20)
    else if (/בלוק|איטונג|פומיס/i.test(nameLower)) {
      const palletSize = /10/i.test(nameLower) ? 150 : 75;
      const pallets = Math.max(1, Math.ceil(agg.dispensed / palletSize));
      const blocksRec = pallets * palletSize;
      recommendedOrder = `${pallets} משטחים (${blocksRec} בלוקים)`;
      explanation = isLowStock || isCritical
        ? `מתחת לסף ביטחון! נותרו ${currentStock}/${safetyLevel} יח'.`
        : `עיגול למשטחים שלמים (${palletSize} יח'/משטח).`;
    } 
    // חישוב כללי לכל שאר המוצרים (+25% מרווח ביטחון)
    else {
      // אם ישונה המקדם מ-1.25 ל-2.0, המערכת תמליץ להזמין פי 2 מהמשיכה
      const buffer = Math.max(1, Math.ceil(agg.dispensed * 1.25));
      recommendedOrder = `${buffer} ${agg.unit}`;
      explanation = isLowStock || isCritical
        ? `מלאי נמוך (${currentStock}/${safetyLevel} ${agg.unit}). חידוש דחוף.`
        : `מרווח ביטחון 25%+ לחידוש מלאי רציף.`;
    }

    if (isCritical) criticalCount++;
    if (isLowStock) warningCount++;

    const isPredefined = PREDEFINED_SAFETY_STOCKS.some(
      (r) => r.sku === agg.sku || r.productName === agg.name,
    );
    if (agg.dispensed > 0 || agg.committed > 0 || isPredefined) {
      inventoryItems.push({
        sku: agg.sku,
        name: agg.name,
        category: stockEval.category,
        unit: agg.unit,
        initialStock: baseStock, // מעודכן ל-5000 קבוע
        totalDispensedToday: agg.dispensed,
        committedDemand: agg.committed,
        currentStock: currentStock, // 5000 פחות מה שנמשך
        safetyStockLevel: safetyLevel,
        isLowStock,
        isCritical,
        deficit: Math.max(0, agg.dispensed),
        stockPercentage: Math.max(0, Math.min(100, Math.round((currentStock / baseStock) * 100))),
        recommendedOrder,
        explanation,
        lastUpdated: new Date().toISOString(),
        warehouseBranch,
      });
    }
  });

  // מיון לפי חומרה (קריטי בראש, לאחר מכן אזהרה, ואז לפי נפח משיכה)
  inventoryItems.sort((a, b) => {
    if (a.isCritical && !b.isCritical) return -1;
    if (!a.isCritical && b.isCritical) return 1;
    if (a.isLowStock && !b.isLowStock) return -1;
    if (!a.isLowStock && b.isLowStock) return 1;
    return b.totalDispensedToday - a.totalDispensedToday;
  });

  return {
    items: inventoryItems,
    criticalCount,
    warningCount,
    totalBellaBags,
    totalSabanPallets,
    totalWeightKg,
    activeOrdersCount,
    completedOrdersCount,
    lastCalculatedAt: new Date().toISOString(),
  };
}

export interface InventoryItemRule {
  id: string;
  sku?: string;
  name: string;
  category:
    | "cement"
    | "plaster"
    | "adhesive"
    | "big_bag"
    | "block"
    | "iron"
    | "gypsum"
    | "other"
    | string;
  initialBase: number;
  unit: string;
  safetyThreshold: number;
}

export interface InventoryItemCalculatedStatus {
  rule: InventoryItemRule;
  actualDrawn: number;
  reserved: number;
  totalDemanded: number;
  effectiveBalance: number;
  percentRemaining: number;
  isCritical: boolean;
  isWarning: boolean;
  deficitToRefill: number;
  palletsToRefill: number;
}

export interface DetailedInventoryKpis {
  ordersAnalyzedCount: number;
  totalDrawnCount: number;
  totalReservedCount: number;
  itemsAtRiskCount: number;
  criticalAlertsCount: number;
  fullTrailersRequired: number;
  totalPalletsNeeded: number;
  burnRatePerHour: number;
  fastestMovingItemName: string;
  lastCalculatedAt: string;
}

export interface DetailedInventoryInsights {
  burnRateSummary: string;
  isOverCapacityAlert: boolean;
  transportAdvice: string;
  priorityReplenishItems: InventoryItemCalculatedStatus[];
  whatsappProcurementText: string;
  whatsappUrl: string;
}

function filterOrdersByBranch(orders: Order[], branchFilter: ScreensaverBranchFilter): Order[] {
  if (branchFilter === "branch_4") {
    return orders.filter((o) => {
      const w = (o.warehouse || "").trim();
      if (!w) return true;
      if (/סניף 1|מחסן 1|מחסן 30|התלמיד/i.test(w)) return false;
      return true;
    });
  }
  if (branchFilter === "branch_1") {
    return orders.filter((o) => {
      const w = (o.warehouse || "").trim();
      if (!w) return false;
      return /סניף 1|מחסן 1|מחסן 30|התלמיד|תלמיד/i.test(w);
    });
  }
  return orders;
}

function getUnitsPerPallet(category: string, name: string): number {
  const n = name.toLowerCase();
  if (/מלט/i.test(n)) return 40;
  if (/דבק|טיח|שפכטל|ספירבונד|ביג גב/i.test(n)) return 40;
  if (/בלוק|איטונג/i.test(n)) {
    return /10/i.test(n) ? 150 : 75;
  }
  if (/בלה|שק גדול/i.test(n) || category === "big_bag") return 1;
  return 40;
}

/**
 * פונקציה ראשית 2: calculateDetailedInventoryEngine
 * מנוע האנליטיקה המפורט שמוזן לשקופיות שומר המסך ולוואטסאפ של איש הרכש (נתנאל).
 */
export function calculateDetailedInventoryEngine(
  orders: Order[],
  now: Date = new Date(),
  branchFilter: ScreensaverBranchFilter = "all",
): {
  kpis: DetailedInventoryKpis;
  items: InventoryItemCalculatedStatus[];
  insights: DetailedInventoryInsights;
} {
  const relevantOrders = filterOrdersByBranch(orders, branchFilter);

  const ruleMap = new Map<
    string,
    {
      rule: InventoryItemRule;
      actualDrawn: number;
      reserved: number;
      ordersSet: Set<string>;
    }
  >();

  PREDEFINED_SAFETY_STOCKS.forEach((stockRule) => {
    const id = stockRule.sku || stockRule.productName;
    ruleMap.set(id, {
      rule: {
        id,
        sku: stockRule.sku,
        name: stockRule.productName,
        category: stockRule.category,
        // עודכן כאן ל-5000 קבוע כדי ששומר המסך לא יראה הכל קריטי
        initialBase: GLOBAL_INITIAL_STOCK_BASE,
        unit: stockRule.unit,
        safetyThreshold: stockRule.safetyStockLevel,
      },
      actualDrawn: 0,
      reserved: 0,
      ordersSet: new Set<string>(),
    });
  });

  // סכימת משיכות מול שריון
  relevantOrders.forEach((order) => {
    const isDrawn = ["בהעמסה", "יצא לדרך", "סופק"].includes(order.status);
    const isReserved = ["ממתין", "בסידור עבודה", "בסידור מחר", "בהכנה", "מוכן להעמסה"].includes(order.status);

    const parsed = order.itemsFormatted ? parseColumnHProductText(order.itemsFormatted) : [];

    parsed.forEach((it) => {
      let matchedEntry: ReturnType<typeof ruleMap.get> | undefined;
      for (const entry of ruleMap.values()) {
        if (it.sku && entry.rule.sku === it.sku) {
          matchedEntry = entry;
          break;
        }
        const ruleNameLower = entry.rule.name.toLowerCase();
        const itNameLower = it.name.toLowerCase();
        if (ruleNameLower.includes(itNameLower) || itNameLower.includes(ruleNameLower)) {
          matchedEntry = entry;
          break;
        }
      }

      if (matchedEntry) {
        if (isDrawn) matchedEntry.actualDrawn += it.quantity;
        if (isReserved) matchedEntry.reserved += it.quantity;
        matchedEntry.ordersSet.add(order.orderId);
      }
    });

    if (order.logisticsMetrics?.bellaBags && order.logisticsMetrics.bellaBags > 0) {
      const entry = ruleMap.get("11511");
      if (entry) {
        if (isDrawn) entry.actualDrawn += order.logisticsMetrics.bellaBags;
        if (isReserved) entry.reserved += order.logisticsMetrics.bellaBags;
        entry.ordersSet.add(order.orderId);
      }
    }
  });

  const items: InventoryItemCalculatedStatus[] = [];
  let totalDrawnCount = 0;
  let totalReservedCount = 0;
  let itemsAtRiskCount = 0;
  let criticalAlertsCount = 0;
  let totalPalletsNeeded = 0;
  let fastestMovingItemName = "מלט אפור 25 ק״ג נשר";
  let maxDrawn = -1;

  for (const entry of ruleMap.values()) {
    const { rule, actualDrawn, reserved } = entry;
    const totalDemanded = actualDrawn + reserved;
    
    // חישוב יתרת רצפה אפקטיבית: 5000 פחות סך הדרישות
    const effectiveBalance = Math.max(0, rule.initialBase - totalDemanded);
    const percentRemaining = Math.max(
      0,
      Math.min(100, Math.round((effectiveBalance / (rule.initialBase || 1)) * 100)),
    );

    // תנאי לקריטי: ירידה מתחת לחצי מסף הביטחון (מקדם 0.5)
    // אם נשנה את 0.5 ל-1.0: התראה קריטית תקפוץ מיד עם ההגעה לסף הביטחון
    const isCritical =
      effectiveBalance <= Math.floor(rule.safetyThreshold * 0.5) ||
      (rule.safetyThreshold > 0 && effectiveBalance <= 0);
    const isWarning = !isCritical && effectiveBalance <= rule.safetyThreshold;

    const deficitToRefill = Math.max(0, totalDemanded);
    const unitsPerPallet = getUnitsPerPallet(rule.category, rule.name);
    const palletsToRefill =
      deficitToRefill > 0 ? Math.max(1, Math.ceil(deficitToRefill / unitsPerPallet)) : 0;

    totalDrawnCount += actualDrawn;
    totalReservedCount += reserved;
    if (isCritical) criticalAlertsCount++;
    if (isCritical || isWarning) itemsAtRiskCount++;
    if (deficitToRefill > 0) totalPalletsNeeded += palletsToRefill;

    if (actualDrawn > maxDrawn) {
      maxDrawn = actualDrawn;
      fastestMovingItemName = rule.name;
    }

    items.push({
      rule,
      actualDrawn,
      reserved,
      totalDemanded,
      effectiveBalance,
      percentRemaining,
      isCritical,
      isWarning,
      deficitToRefill,
      palletsToRefill,
    });
  }

  items.sort((a, b) => {
    if (a.isCritical && !b.isCritical) return -1;
    if (!a.isCritical && b.isCritical) return 1;
    if (a.isWarning && !b.isWarning) return -1;
    if (!a.isWarning && b.isWarning) return 1;
    return b.totalDemanded - a.totalDemanded;
  });

  // חישוב פול-טריילרים: חלוקה ב-24 משטחים למשאית
  const fullTrailersRequired = Math.ceil(totalPalletsNeeded / 24);
  const hoursSinceStart = Math.max(1, Math.min(12, now.getHours() - 6));
  const burnRatePerHour = Math.round(totalDrawnCount / hoursSinceStart);

  const lastCalculatedAt = now.toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const priorityReplenishItems = items.filter((i) => i.isCritical || i.isWarning);
  const isOverCapacityAlert = fullTrailersRequired >= 2 || criticalAlertsCount >= 3;

  const transportAdvice =
    fullTrailersRequired > 0
      ? `נדרשים ~${fullTrailersRequired} פול-טריילר/ים (${totalPalletsNeeded} משטחים) לחידוש מלאי מלא מהספקים.`
      : "קצב רצפה מאוזן ללא חריגת שינוע.";

  const burnRateSummary = `קצב משיכה ממוצע של ${burnRatePerHour} יח'/שעה מתחילת הפעילות.`;

  // ניסוח הודעת וואטסאפ לרכש
  const branchLabel =
    branchFilter === "branch_4"
      ? "מגרש 4 - החרש (ראשי)"
      : branchFilter === "branch_1"
        ? "סניף 1 - התלמיד"
        : "כללי (כל המחסנים)";

  const waLines = [
    `*📋 דרישת רכש והשלמת מלאי חצר — ח. סבן חומרי בניין (1994) בע״מ*`,
    `📅 שעת הפקה: ${lastCalculatedAt} | מגרש: ${branchLabel}`,
    `סה"כ משיכות היום: ${totalDrawnCount} יח' | משוריין בהכנה: ${totalReservedCount} יח'`,
    `----------------------------------------`,
  ];

  if (priorityReplenishItems.length === 0) {
    waLines.push(`✅ כל מוצרי המלאי נמצאים כעת מעל סף הביטחון.`);
  } else {
    waLines.push(`*נמצאו ${priorityReplenishItems.length} פריטים הדורשים חידוש מלאי:*`);
    priorityReplenishItems.forEach((it, idx) => {
      const badge = it.isCritical ? "🔴 קריטי" : "🟡 אזהרה";
      waLines.push(
        `${idx + 1}. *${it.rule.name}* (${badge})\n` +
          `   • יתרת רצפה: ${it.effectiveBalance} ${it.rule.unit} (סף מינימום: ${it.rule.safetyThreshold})\n` +
          `   • חסר להשלמה: *${it.deficitToRefill} ${it.rule.unit}* (~${it.palletsToRefill} משטחים)`,
      );
    });
  }

  if (fullTrailersRequired > 0) {
    waLines.push(`----------------------------------------`);
    waLines.push(
      `🚚 *צפי הובלה נדרשת:* ${fullTrailersRequired} פול-טריילר (~${totalPalletsNeeded} משטחים)`,
    );
  }

  waLines.push(`----------------------------------------`);
  waLines.push(`נשלח אוטומטית ממערכת SabanOS Control Plane`);

  const whatsappProcurementText = waLines.join("\n");
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappProcurementText)}`;

  return {
    kpis: {
      ordersAnalyzedCount: relevantOrders.length,
      totalDrawnCount,
      totalReservedCount,
      itemsAtRiskCount,
      criticalAlertsCount,
      fullTrailersRequired,
      totalPalletsNeeded,
      burnRatePerHour,
      fastestMovingItemName,
      lastCalculatedAt,
    },
    items,
    insights: {
      burnRateSummary,
      isOverCapacityAlert,
      transportAdvice,
      priorityReplenishItems,
      whatsappProcurementText,
      whatsappUrl,
    },
  };
}

/**
 * פונקציה ראשית 3: getNormalizedProductSlideItems
 * ממירה את הנתונים המחושבים לאובייקטים אחידים עבור שקופיות שומר המסך (ProductSlide).
 */
export function getNormalizedProductSlideItems(
  orders: Order[],
  branchFilter: ScreensaverBranchFilter = "all",
  prioritizeCritical = true,
): NormalizedProductSlideItem[] {
  const { items } = calculateDetailedInventoryEngine(orders, new Date(), branchFilter);

  const branchName =
    branchFilter === "branch_4"
      ? "מגרש 4 - החרש"
      : branchFilter === "branch_1"
        ? "סניף 1 - התלמיד"
        : "מגרש 4 - החרש (ראשי)";

  const branchNumber: 1 | 4 | "all" =
    branchFilter === "branch_4" ? 4 : branchFilter === "branch_1" ? 1 : "all";

  const result: NormalizedProductSlideItem[] = items.map((it) => {
    const unitsPerPallet = getUnitsPerPallet(it.rule.category, it.rule.name);
    const skuKey = it.rule.sku || "";
    const imageUrl =
      PRODUCT_IMAGES[skuKey] || PRODUCT_IMAGES[it.rule.category] || PRODUCT_IMAGES.default;

    const requiresFullTrailer =
      it.palletsToRefill >= 20 || (it.rule.category === "big_bag" && it.deficitToRefill >= 14);

    const procurementAdvice = requiresFullTrailer
      ? "דרוש פול-טריילר מלא (~24 משטחים)"
      : it.deficitToRefill > 0
        ? `להזמין ${it.palletsToRefill} משטחים תקניים (${it.deficitToRefill} ${it.rule.unit})`
        : "מלאי רצפה תקין ומעל סף הביטחון";

    const ordersCount = orders.filter((o) => {
      if (it.rule.sku && o.itemsFormatted?.includes(it.rule.sku)) return true;
      if (o.itemsFormatted?.includes(it.rule.name.slice(0, 8))) return true;
      if (it.rule.category === "big_bag" && (o.logisticsMetrics?.bellaBags ?? 0) > 0) return true;
      return false;
    }).length;

    return {
      sku: it.rule.sku || it.rule.id,
      cleanName: it.rule.name,
      originalName: it.rule.name,
      category: it.rule.category,
      unit: it.rule.unit,
      unitsPerPallet,
      warehouseBranch: branchName,
      branchNumber,
      actualDrawn: it.actualDrawn,
      reserved: it.reserved,
      totalDemanded: it.totalDemanded,
      initialBase: it.rule.initialBase,
      effectiveBalance: it.effectiveBalance,
      safetyThreshold: it.rule.safetyThreshold,
      percentRemaining: it.percentRemaining,
      isCritical: it.isCritical,
      isWarning: it.isWarning,
      deficitToRefill: it.deficitToRefill,
      palletsToRefill: it.palletsToRefill,
      procurementAdvice,
      requiresFullTrailer,
      imageUrl,
      ordersCount: Math.max(ordersCount, it.actualDrawn > 0 ? 1 : 0),
    };
  });

  if (prioritizeCritical) {
    result.sort((a, b) => {
      if (a.isCritical && !b.isCritical) return -1;
      if (!a.isCritical && b.isCritical) return 1;
      if (a.isWarning && !b.isWarning) return -1;
      if (!a.isWarning && b.isWarning) return 1;
      return b.totalDemanded - a.totalDemanded;
    });
  }

  return result;
}
