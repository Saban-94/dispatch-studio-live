import type { TrafficRouteInfo, DriverETAInfo } from "@/types/screensaver";
import type { Order } from "@/types/dispatch";
import type { TrafficAlert, LocationPreset, TruckRouteInfo } from "@/types/traffic";

// ==========================================
// 1. LOCATION PRESETS (WAZE & DISPATCH HUBS)
// ==========================================
export const LOCATION_PRESETS: LocationPreset[] = [
  {
    id: "warehouse_4",
    label: "מחסן 4 החרש (ראשי)",
    shortLabel: "מחסן 4 החרש",
    icon: "🏭",
    lat: 32.1485,
    lon: 34.8967,
    zoom: 14,
    description: "רחוב החרש 8, אזור תעשייה הוד השרון — מרכז לוגיסטי וחומרי מליטה",
    pinText: "סבן מרכז לוגיסטי 4",
  },
  {
    id: "warehouse_1",
    label: "מחסן 1 התלמיד",
    shortLabel: "מחסן 1 התלמיד",
    icon: "🏟️",
    lat: 32.1432,
    lon: 34.8912,
    zoom: 14,
    description: "רחוב התלמיד, הוד השרון — מחסן ברזל, גבס ואיטום",
    pinText: "סבן מחסן 1",
  },
  {
    id: "kfar_saba_raanana",
    label: "כפר סבא - רעננה",
    shortLabel: "כפ״ס - רעננה",
    icon: "🏙️",
    lat: 32.1844,
    lon: 34.8878,
    zoom: 13,
    description: "צירי 531, ויצמן, אחוזה ואזור התעשייה כפר סבא מזרח",
  },
  {
    id: "gush_dan",
    label: "גוש דן ותל אביב",
    shortLabel: "גוש דן ומרכז",
    icon: "🌆",
    lat: 32.0853,
    lon: 34.7818,
    zoom: 12,
    description: "איילון (כביש 20), ציר ז'בוטינסקי ומחלף מורשה",
  },
  {
    id: "triangle_north",
    label: "המשולש והשרון הצפוני",
    shortLabel: "המשולש / צפון",
    icon: "🧭",
    lat: 32.2662,
    lon: 34.9814,
    zoom: 12,
    description: "כביש 444, טייבה, טירה, קלנסווה וציר כביש 6 צפון",
  },
  {
    id: "east_shomron",
    label: "מזרח, מודיעין ושומרון",
    shortLabel: "מודיעין / שומרון",
    icon: "⛰️",
    lat: 32.0772,
    lon: 35.0555,
    zoom: 12,
    description: "כביש 5 חוצה שומרון, מודיעין, עלי זהב ואריאל",
  },
];

// ==========================================
// 2. INITIAL LIVE TRAFFIC ALERTS (TICKER)
// ==========================================
export const INITIAL_TRAFFIC_ALERTS: TrafficAlert[] = [
  {
    id: "alert-531",
    timestamp: "11:05",
    timeAgo: "לפני 2 דק'",
    severity: "heavy",
    severityLabel: "פקק כבד 🔴",
    corridor: "כביש 531 מערב (מחלף סוקולוב ⟵ רעננה דרום)",
    details: "עומס כבד בעקבות תאונה קלה בנתיב המרכזי. מהירות ממוצעת 15 קמ״ש.",
    truckImpact: "משאית חכמת (615-41-002) ליעד רעננה (בר אילן 8) מתעכבת בכ-14 דק'.",
    affectedTruck: "hikmat",
    isLive: true,
  },
  {
    id: "alert-4",
    timestamp: "11:02",
    timeAgo: "לפני 5 דק'",
    severity: "moderate",
    severityLabel: "עומס בינוני 🟡",
    corridor: "כביש 40 צפון / ציר בית חולים מאיר כפר סבא",
    details: "עומסי תנועה בינוניים בצומת ויצמן וטשרניחובסקי.",
    truckImpact: "עלי איסוזו (651-51-701) בדרך לפריקה בחנין בית חולים מאיר 1 כפר סבא.",
    affectedTruck: "ali",
    isLive: true,
  },
  {
    id: "alert-local-harash",
    timestamp: "10:55",
    timeAgo: "לפני 12 דק'",
    severity: "incident",
    severityLabel: "שיבוש תנועה 🟣",
    corridor: "צומת החרש - סוקולוב (יציאה ממחסן 4 הוד השרון)",
    details: "עבודות תשתית של תאגיד המים בנתיב הימני; מעבר צר למשאיות פול-טריילר ומנוף.",
    truckImpact: "נהגי מנוף וחלוקה מתבקשים לצאת דרך ציר הנגר למניעת עיכוב.",
    affectedTruck: "both",
    isLive: true,
  },
  {
    id: "alert-6",
    timestamp: "10:48",
    timeAgo: "לפני 19 דק'",
    severity: "fluid",
    severityLabel: "זורם ותקין 🟢",
    corridor: "כביש 6 (מחלף חורשים ⟵ קסם ⟵ בן שמן ⟵ מודיעין)",
    details: "זרימת תנועה חלקה ומהירה ללא הפרעות או עבודות דרך.",
    truckImpact: "ציר מהיר ומאושר לפריקות מודיעין (מגדל הלבנון 14).",
    affectedTruck: "general",
    isLive: true,
  },
];

import {
  type GeoPoint,
  KNOWN_CITY_COORDINATES,
  resolveGeoCoordinates,
  detectCityFromAddress,
  buildWazeSearchUrl,
  buildGoogleMapsUrl,
  registerCustomCoordinates,
} from "@/constants/geo";

export {
  type GeoPoint,
  KNOWN_CITY_COORDINATES,
  resolveGeoCoordinates,
  detectCityFromAddress,
  buildWazeSearchUrl,
  buildGoogleMapsUrl,
  registerCustomCoordinates,
};

export function getCoordinatesForCity(cityOrAddress?: string): { lat: number; lon: number } {
  const resolved = resolveGeoCoordinates(cityOrAddress);
  return { lat: resolved.lat, lon: resolved.lon };
}

/**
 * Builds dynamic LocationPresets from the real orders in דשבורד_הזמנות
 * Uses exact Column D (כתובת פריקה) and Column E (עיר) with smart coordinate resolution.
 */
export function buildDeliveryPresetsFromOrders(orders?: Order[]): LocationPreset[] {
  if (!orders || !Array.isArray(orders)) return [];
  return orders
    .filter((o) => o && (o.address || o.city))
    .map((o) => {
      const city = o.city || detectCityFromAddress(o.address);
      const coords = resolveGeoCoordinates(city || o.address);
      return {
        id: `order-preset-${o.orderId}`,
        label: `#${o.orderId} - ${o.customerName || "לקוח"} (${city})`,
        shortLabel: `${city} (#${o.orderId})`,
        icon: "📍",
        lat: coords.lat,
        lon: coords.lon,
        zoom: coords.defaultZoom || 15,
        description: `כתובת פריקה: ${o.address || "ללא כתובת"}, ${city} | נהג: ${o.driver || "לא שובץ"} | סטטוס: ${o.status || ""}`,
        pinText: `${o.customerName || ""} - ${o.address || city}`,
      };
    });
}

// ==========================================
// 3. ACTIVE FLEET DATA (HIKMAT & ALI) - REAL LIVE SHEET DATA
// ==========================================
export function getActiveFleetTraffic(orders?: Order[]): TruckRouteInfo[] {
  const now = new Date();
  const formatEta = (minutesFromNow: number) => {
    const d = new Date(now.getTime() + minutesFromNow * 60000);
    return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
  };

  const safeOrders = Array.isArray(orders) ? orders : [];

  // Find real orders for Hikmat
  const hikmatOrder =
    safeOrders.find(
      (o) =>
        o?.driver &&
        (o.driver.includes("חכמת") || o.driver.includes("מרצדס") || o.driver.includes("מנוף")) &&
        (o.status === "בהעמסה" ||
          o.status === "יצא לדרך" ||
          o.status === "בהכנה" ||
          o.status === "מוכן להעמסה"),
    ) ||
    safeOrders.find(
      (o) =>
        o?.driver &&
        (o.driver.includes("חכמת") || o.driver.includes("מרצדס") || o.driver.includes("מנוף")),
    );

  // Find real orders for Ali
  const aliOrder =
    safeOrders.find(
      (o) =>
        o?.driver &&
        (o.driver.includes("עלי") || o.driver.includes("איסוזו")) &&
        (o.status === "בהעמסה" ||
          o.status === "יצא לדרך" ||
          o.status === "מוכן להעמסה" ||
          o.status === "בהכנה"),
    ) ||
    safeOrders.find((o) => o?.driver && (o.driver.includes("עלי") || o.driver.includes("איסוזו")));

  // Coordinates from real cities in sheet
  const hikmatCoords = hikmatOrder
    ? getCoordinatesForCity(hikmatOrder.city)
    : { lat: 32.1844, lon: 34.8707 };
  const aliCoords = aliOrder ? getCoordinatesForCity(aliOrder.city) : { lat: 32.175, lon: 34.9069 };

  const hikmatCargoSummary = hikmatOrder?.itemsFormatted
    ? hikmatOrder.itemsFormatted
    : hikmatOrder?.logisticsMetrics
      ? `${hikmatOrder.logisticsMetrics.bellaBags || 0} בלות + ${hikmatOrder.logisticsMetrics.sabanPallets || 0} משטחי סבן`
      : "2 בלות סומסום, 3 בלות חול, 6 מלט, 10 טיח MP75";

  const aliCargoSummary = aliOrder?.itemsFormatted
    ? aliOrder.itemsFormatted
    : aliOrder?.logisticsMetrics
      ? `${aliOrder.logisticsMetrics.bellaBags || 0} בלות + ${aliOrder.logisticsMetrics.sabanPallets || 0} משטחי סבן`
      : '25 מלט אפור 25 ק"ג, 25 טיט שק, 1 פוליגג';

  const hikmatTruck: TruckRouteInfo = {
    id: "hikmat",
    driverName: "חכמת סבן",
    truckPlate: "615-41-002",
    truckModel: "מרצדס ארוקס (Arocs 3340) מנוף כבד",
    truckType: "crane",
    phone: "052-6154100",
    currentOrderNumber: hikmatOrder ? `#${hikmatOrder.orderId}` : "#6215440",
    customerName: hikmatOrder ? hikmatOrder.customerName : 'מאריו הנדסה אספקה חומרי בניין בע"מ',
    destination: hikmatOrder ? `${hikmatOrder.address}, ${hikmatOrder.city}` : "בר אילן 8, רעננה",
    destinationCity: hikmatOrder ? hikmatOrder.city : "רעננה",
    cleanTimeMinutes: 18,
    actualTimeMinutes: 32,
    delayMinutes: 14,
    primaryCorridor: "כביש 531 מערב",
    etaTime: formatEta(32),
    cargoSummary: hikmatCargoSummary,
    status:
      hikmatOrder?.status === "בהעמסה"
        ? "loading"
        : hikmatOrder?.status === "סופק"
          ? "fluid"
          : "on_route",
    severity: "heavy",
    wazeDestinationQuery: hikmatOrder
      ? `${hikmatOrder.address}, ${hikmatOrder.city}`
      : "בר אילן 8, רעננה",
    wazeLat: hikmatCoords.lat,
    wazeLon: hikmatCoords.lon,
    lastGpsUpdate: "לפני 30 שנ'",
  };

  const aliTruck: TruckRouteInfo = {
    id: "ali",
    driverName: "עלי מנסור",
    truckPlate: "651-51-701",
    truckModel: "איסוזו פורוורד (Forward) 12 טון חלוקה",
    truckType: "distribution",
    phone: "054-6515170",
    currentOrderNumber: aliOrder ? `#${aliOrder.orderId}` : "#6215463",
    customerName: aliOrder ? aliOrder.customerName : "השוקדים-כללי",
    destination: aliOrder
      ? `${aliOrder.address}, ${aliOrder.city}`
      : "חנין בית חולים מאיר 1, כפר סבא",
    destinationCity: aliOrder ? aliOrder.city : "כפר סבא",
    cleanTimeMinutes: 14,
    actualTimeMinutes: 21,
    delayMinutes: 7,
    primaryCorridor: "כביש 40 צפון / בן יהודה",
    etaTime: formatEta(21),
    cargoSummary: aliCargoSummary,
    status:
      aliOrder?.status === "בהעמסה"
        ? "loading"
        : aliOrder?.status === "סופק"
          ? "fluid"
          : "on_route",
    severity: "moderate",
    wazeDestinationQuery: aliOrder
      ? `${aliOrder.address}, ${aliOrder.city}`
      : "חנין בית חולים מאיר 1, כפר סבא",
    wazeLat: aliCoords.lat,
    wazeLon: aliCoords.lon,
    lastGpsUpdate: "לפני 45 שנ'",
  };

  return [hikmatTruck, aliTruck];
}

// ==========================================
// 4. WAZE URL GENERATORS & DEEP LINKS
// ==========================================

export function buildWazeEmbedUrl(preset: LocationPreset): string {
  // Official Waze embed with coordinate anchoring
  return `https://embed.waze.com/iframe?zoom=${preset.zoom}&lat=${preset.lat}&lon=${preset.lon}&pin=1`;
}

export function buildWazeNavigationUrl(lat: number, lon: number): string {
  return `https://www.waze.com/ul?ll=${lat},${lon}&navigate=yes`;
}

// ==========================================
// 5. BACKWARD-COMPATIBLE ARTERIAL ROUTES
// ==========================================
export const ARTERIAL_ROUTES: TrafficRouteInfo[] = [
  {
    id: "r-531",
    road: "כביש 531",
    segment: "מחלף סוקולוב ⟵ רעננה דרום ⟵ שפיים",
    status: "heavy",
    statusText: "עומס תנועה כבד ברמזורים ומחלפים",
    delayMinutes: 14,
    avgSpeedKmh: 24,
    alert: "עבודות תשתית ותאונה קלה בנתיב המרכזי",
    updatedAt: "לפני 2 דק'",
  },
  {
    id: "r-4",
    road: "כביש 4",
    segment: "צומת רעננה צפון ⟵ מחלף מורשה",
    status: "moderate",
    statusText: "עומס בינוני לכיוון דרום",
    delayMinutes: 8,
    avgSpeedKmh: 46,
    alert: "תנועה איטית אך מתקדמת",
    updatedAt: "לפני 3 דק'",
  },
  {
    id: "r-6",
    road: "כביש 6",
    segment: "מחלף חורשים ⟵ מחלף קסם ⟵ נחשונים",
    status: "fluid",
    statusText: "תנועה זורמת ומהירה לשני הכיוונים",
    delayMinutes: 1,
    avgSpeedKmh: 94,
    updatedAt: "לפני 1 דק'",
  },
  {
    id: "r-40",
    road: "כביש 40",
    segment: "הוד השרון ⟵ כפר סבא מזרח ⟵ צומת נווה ימין",
    status: "moderate",
    statusText: "עומס רגיל בשעות הצהריים",
    delayMinutes: 6,
    avgSpeedKmh: 52,
    updatedAt: "לפני 4 דק'",
  },
];

export interface TrafficAlert {
  id: string;
  road: string;
  type: "HEAVY" | "MODERATE" | "INCIDENT" | "FLOWING";
  message: string;
  time: string;
  truckAffected?: string;
  corridorKeywords?: string[];
}

export interface WarehouseLocation {
  id: string;
  name: string;
  shortName: string;
  city: string;
  address: string;
  coordinates: { lat: number; lon: number };
}

export const WAREHOUSE_ORIGINS: WarehouseLocation[] = [
  {
    id: "w4",
    name: "מחסן 4 החרש (כפר סבא)",
    shortName: "מחסן 4 החרש",
    city: "כפר סבא",
    address: "רחוב החרש 8, כפר סבא",
    coordinates: { lat: 32.1785, lon: 34.9125 },
  },
  {
    id: "w1",
    name: "מחסן 1 התלמיד (הוד השרון)",
    shortName: "מחסן 1 התלמיד",
    city: "הוד השרון",
    address: "רחוב התלמיד, הוד השרון",
    coordinates: { lat: 32.155, lon: 34.898 },
  },
  {
    id: "w-center",
    name: 'מרלו"ג רמלה / שפלה',
    shortName: 'מרלו"ג רמלה',
    city: "רמלה",
    address: "אזור תעשייה רמלה / צומת תעבורה",
    coordinates: { lat: 31.928, lon: 34.869 },
  },
];

export const SAMPLE_TRAFFIC_ALERTS: TrafficAlert[] = [
  {
    id: "1",
    road: "כביש 531 מערב",
    type: "HEAVY",
    message: "עומס תנועה כבד ממחלף סוקולוב עד רעננה דרום. עיכוב משוער של 18 דקות.",
    time: "לפני 3 דק'",
    truckAffected: "חכמת (מנוף)",
    corridorKeywords: ["531", "רעננה", "הרצליה", "סוקולוב"],
  },
  {
    id: "2",
    road: "כביש 4 צפון",
    type: "MODERATE",
    message: "תנועה עמוסה מגשר מורשה עד צומת רעננה מרכז. מומלץ מעקף דרך כביש 40.",
    time: "לפני 7 דק'",
    truckAffected: "עלי (משאית)",
    corridorKeywords: ["כביש 4", "מורשה", "רעננה", "נתניה"],
  },
  {
    id: "3",
    road: "אזור תעשייה כפר סבא",
    type: "INCIDENT",
    message: 'עבודות תשתית ברחוב התע"ש. גישה מוגבלת למשאיות מעל 15 טון.',
    time: "לפני 12 דק'",
    corridorKeywords: ["כפר סבא", "התעש", "החרש"],
  },
  {
    id: "4",
    road: "כביש 5 מזרח",
    type: "FLOWING",
    message: "התנועה זורמת ללא עיכובים ממחלף גלילות עד קסם וראש העין.",
    time: "עכשיו",
    corridorKeywords: ["כביש 5", "קסם", "פתח תקווה", "ראש העין"],
  },
  {
    id: "5",
    road: "כביש 1 עליות ירושלים",
    type: "MODERATE",
    message: "עומס בינוני בלטרון ושער הגיא לכיוון גינות סחרוב. עיכוב כ-14 דקות.",
    time: "לפני 5 דק'",
    truckAffected: "סעיד (סמיטריילר)",
    corridorKeywords: ["כביש 1", "ירושלים", "שער הגיא", "לטרון"],
  },
  {
    id: "6",
    road: "כביש 40 עוקף רמלה",
    type: "HEAVY",
    message: "פקק מתמשך מצומת אחיסמך לצומת רמלה. עיכוב כ-22 דקות.",
    time: "לפני 9 דק'",
    truckAffected: "איציק (דבל בלה)",
    corridorKeywords: ["כביש 40", "רמלה", "לוד", "אחיסמך"],
  },
];

export interface CommonDestinationConfig {
  id: string;
  destination: string;
  region: string;
  primaryRoad: string;
  corridorKeywords: string[];
  baseDistanceKmByOrigin: Record<string, number>;
  baseMinutesByOrigin: Record<string, number>;
  recommendedAltRoute?: string;
  wazeSearchQuery: string;
}

export const COMMON_DESTINATIONS: CommonDestinationConfig[] = [
  {
    id: "raanana",
    destination: "רעננה — אזור תעשייה ומסחר",
    region: "שרון",
    primaryRoad: "כביש 531 מערב",
    corridorKeywords: ["531", "רעננה", "סוקולוב"],
    baseDistanceKmByOrigin: { w4: 8, w1: 6, "w-center": 34 },
    baseMinutesByOrigin: { w4: 12, w1: 10, "w-center": 38 },
    recommendedAltRoute: "מעקף דרך כביש 541 (רח' ויצמן) או כביש 4",
    wazeSearchQuery: "רעננה אזור תעשייה",
  },
  {
    id: "herzliya",
    destination: "הרצליה פיתוח ואזור החוף",
    region: "שרון / מרכז",
    primaryRoad: "כביש 531 מערב ⟵ כביש 20",
    corridorKeywords: ["531", "הרצליה", "20", "איילון"],
    baseDistanceKmByOrigin: { w4: 15, w1: 13, "w-center": 32 },
    baseMinutesByOrigin: { w4: 18, w1: 16, "w-center": 36 },
    recommendedAltRoute: "מעקף דרך כביש 2 (מחלף הסירה) או כביש 5",
    wazeSearchQuery: "הרצליה פיתוח",
  },
  {
    id: "petah-tikva",
    destination: "פתח תקווה — פארק אפק / קסם",
    region: "מרכז",
    primaryRoad: "כביש 40 ⟵ כביש 5 מזרח",
    corridorKeywords: ["כביש 5", "קסם", "פתח תקווה", "ראש העין"],
    baseDistanceKmByOrigin: { w4: 14, w1: 12, "w-center": 22 },
    baseMinutesByOrigin: { w4: 18, w1: 15, "w-center": 26 },
    recommendedAltRoute: "דרך כביש 471 או ציר 444",
    wazeSearchQuery: "פארק אפק ראש העין פתח תקווה",
  },
  {
    id: "tel-aviv",
    destination: "תל אביב מרכז / אתרי בנייה",
    region: "גוש דן",
    primaryRoad: "כביש 4 דרום ⟵ מחלף גהה",
    corridorKeywords: ["כביש 4", "גהה", "מורשה", "תל אביב"],
    baseDistanceKmByOrigin: { w4: 22, w1: 20, "w-center": 24 },
    baseMinutesByOrigin: { w4: 25, w1: 22, "w-center": 28 },
    recommendedAltRoute: "דרך ציר נמיר או כביש 5 לגלילות",
    wazeSearchQuery: "תל אביב מרכז",
  },
  {
    id: "netanya",
    destination: "נתניה — אזור תעשייה פולג",
    region: "שרון צפון",
    primaryRoad: "כביש 4 צפון ⟵ כביש 553",
    corridorKeywords: ["כביש 4", "נתניה", "פולג", "מורשה"],
    baseDistanceKmByOrigin: { w4: 19, w1: 21, "w-center": 46 },
    baseMinutesByOrigin: { w4: 21, w1: 23, "w-center": 48 },
    recommendedAltRoute: "דרך כביש 2 (חוף) ממחלף נתניה דרום",
    wazeSearchQuery: "אזור תעשייה פולג נתניה",
  },
  {
    id: "rishon-holon",
    destination: "ראשון לציון / חולון",
    region: "מרכז / שפלה",
    primaryRoad: "כביש 4 דרום ⟵ כביש 431",
    corridorKeywords: ["כביש 4", "431", "ראשון", "חולון"],
    baseDistanceKmByOrigin: { w4: 32, w1: 30, "w-center": 14 },
    baseMinutesByOrigin: { w4: 32, w1: 30, "w-center": 16 },
    recommendedAltRoute: "מעקף דרך כביש 20 (איילון דרום)",
    wazeSearchQuery: "ראשון לציון אזור תעשייה",
  },
  {
    id: "ramla-modiin",
    destination: "מודיעין / רמלה / לוד",
    region: "שפלה",
    primaryRoad: "כביש 6 דרום ⟵ כביש 40",
    corridorKeywords: ["כביש 6", "כביש 40", "רמלה", "לוד", "מודיעין"],
    baseDistanceKmByOrigin: { w4: 38, w1: 36, "w-center": 8 },
    baseMinutesByOrigin: { w4: 35, w1: 33, "w-center": 12 },
    recommendedAltRoute: "עוקף דרך כביש 443 או כביש 431",
    wazeSearchQuery: "רמלה אזור תעשייה",
  },
  {
    id: "jerusalem",
    destination: "ירושלים — כניסה לעיר (שער הגיא)",
    region: "ירושלים",
    primaryRoad: "כביש 6 דרום ⟵ כביש 1 מזרח",
    corridorKeywords: ["כביש 1", "שער הגיא", "לטרון", "ירושלים"],
    baseDistanceKmByOrigin: { w4: 76, w1: 74, "w-center": 48 },
    baseMinutesByOrigin: { w4: 58, w1: 56, "w-center": 40 },
    recommendedAltRoute: "דרך כביש 443 (מודיעין-גבעת זאב)",
    wazeSearchQuery: "כניסה לירושלים גינות סחרוב",
  },
];

export interface DestinationETAEstimate {
  id: string;
  destination: string;
  region: string;
  primaryRoad: string;
  baseDistanceKm: number;
  baseMinutes: number;
  trafficDelayMinutes: number;
  totalEstimatedMinutes: number;
  etaClockTime: string;
  trafficStatus: "FLOWING" | "MODERATE" | "HEAVY" | "INCIDENT";
  trafficReason?: string;
  relevantAlert?: TrafficAlert;
  recommendedAltRoute?: string;
  wazeUrl: string;
}

/**
 * Calculates and returns real-time ETA estimates from a specified warehouse origin
 * to key distribution destinations based on active traffic alerts.
 */
export function calculateWarehouseDestinationETAs(
  warehouseId: string = "w4",
  alerts: TrafficAlert[] = SAMPLE_TRAFFIC_ALERTS,
  referenceDate: Date = new Date(),
): DestinationETAEstimate[] {
  const originWarehouse =
    WAREHOUSE_ORIGINS.find((w) => w.id === warehouseId) || WAREHOUSE_ORIGINS[0];

  return COMMON_DESTINATIONS.map((dest) => {
    const baseDistanceKm =
      dest.baseDistanceKmByOrigin[warehouseId] ?? dest.baseDistanceKmByOrigin.w4 ?? 20;
    const baseMinutes = dest.baseMinutesByOrigin[warehouseId] ?? dest.baseMinutesByOrigin.w4 ?? 25;

    // Search for traffic alerts impacting this destination's corridors
    let matchingAlert: TrafficAlert | undefined;
    let trafficDelayMinutes = 0;
    let trafficStatus: DestinationETAEstimate["trafficStatus"] = "FLOWING";
    let trafficReason: string | undefined;

    for (const alert of alerts) {
      const roadMatches = dest.corridorKeywords.some(
        (kw) =>
          alert.road.toLowerCase().includes(kw.toLowerCase()) ||
          alert.message.toLowerCase().includes(kw.toLowerCase()),
      );

      if (roadMatches) {
        matchingAlert = alert;

        // Try extracting numeric delay from alert message (e.g., "עיכוב משוער של 18 דקות")
        const delayMatch = alert.message.match(/(\d+)\s*דק/);
        const extractedDelay = delayMatch ? parseInt(delayMatch[1], 10) : 0;

        if (alert.type === "HEAVY") {
          trafficStatus = "HEAVY";
          trafficDelayMinutes = Math.max(extractedDelay || 18, trafficDelayMinutes);
          trafficReason = alert.message;
          break; // Heavy is highest priority
        } else if (alert.type === "INCIDENT") {
          if (trafficStatus !== "HEAVY") {
            trafficStatus = "INCIDENT";
            trafficDelayMinutes = Math.max(extractedDelay || 14, trafficDelayMinutes);
            trafficReason = alert.message;
          }
        } else if (alert.type === "MODERATE") {
          if (trafficStatus !== "HEAVY" && trafficStatus !== "INCIDENT") {
            trafficStatus = "MODERATE";
            trafficDelayMinutes = Math.max(extractedDelay || 8, trafficDelayMinutes);
            trafficReason = alert.message;
          }
        } else if (alert.type === "FLOWING") {
          if (trafficStatus === "FLOWING") {
            trafficDelayMinutes = 0;
            trafficReason = "תנועה זורמת ללא עיכובים";
          }
        }
      }
    }

    const totalEstimatedMinutes = Math.max(5, baseMinutes + trafficDelayMinutes);
    const etaDate = new Date(referenceDate.getTime() + totalEstimatedMinutes * 60000);
    const etaClockTime = etaDate.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const wazeUrl = `https://www.waze.com/ul?q=${encodeURIComponent(
      dest.wazeSearchQuery,
    )}&from=${originWarehouse.coordinates.lat},${originWarehouse.coordinates.lon}&navigate=yes`;

    return {
      id: dest.id,
      destination: dest.destination,
      region: dest.region,
      primaryRoad: dest.primaryRoad,
      baseDistanceKm,
      baseMinutes,
      trafficDelayMinutes,
      totalEstimatedMinutes,
      etaClockTime,
      trafficStatus,
      trafficReason,
      relevantAlert: matchingAlert,
      recommendedAltRoute: trafficDelayMinutes >= 8 ? dest.recommendedAltRoute : undefined,
      wazeUrl,
    };
  });
}

export function calculateDriverETAs(orders: Order[]): DriverETAInfo[] {
  const activeOrders = orders.filter((o) => o.status === "יצא לדרך" || o.status === "בהעמסה");

  return activeOrders.map((o) => {
    let routeRoad = "כביש 531 / 4";
    let baseDelay = 5;
    let trafficState: "fluid" | "moderate" | "heavy" = "fluid";

    if (o.city.includes("רעננה") || o.city.includes("הרצליה")) {
      routeRoad = "כביש 531 מערב";
      baseDelay = 14;
      trafficState = "heavy";
    } else if (o.city.includes("כפר סבא") || o.city.includes("הוד השרון")) {
      routeRoad = "ציר בן גוריון / סוקולוב";
      baseDelay = 6;
      trafficState = "moderate";
    } else if (o.city.includes("תל אביב") || o.city.includes("פתח תקווה")) {
      routeRoad = "כביש 4 / מחלף מורשה";
      baseDelay = 9;
      trafficState = "moderate";
    }

    const now = new Date();
    const [hStr, mStr] = o.targetTime.split(":");
    const targetDate = new Date();
    targetDate.setHours(Number(hStr || 12), Number(mStr || 0), 0, 0);

    const diffMinutes = Math.round((targetDate.getTime() - now.getTime()) / 60000);
    const remainingMinutes = Math.max(5, diffMinutes > 0 ? diffMinutes : 15 + baseDelay);

    const etaDate = new Date(now.getTime() + remainingMinutes * 60000);
    const etaTime = etaDate.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

    const totalBella = o.logisticsMetrics.bellaBags;
    const totalSaban = o.logisticsMetrics.sabanPallets;
    const weightTons = (o.logisticsMetrics.estimatedWeightKg / 1000).toFixed(1);

    return {
      orderId: o.orderId,
      driverName: o.driver || "חכמת / עלי",
      vehicle: o.driver.includes("מנוף") ? "מרצדס מנוף" : "איסוזו חלוקה",
      destination: o.address,
      city: o.city,
      targetTime: o.targetTime,
      etaTime,
      remainingMinutes,
      trafficState,
      routeRoad,
      warehouse: o.warehouse,
      itemsSummary: `${totalBella} בלה · ${totalSaban} משטחים (${weightTons} טון)`,
    };
  });
}
