import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  Package,
  RefreshCw,
  Route,
  ShieldCheck,
  Truck,
  X,
} from "lucide-react";
import { TrafficNewsTicker } from "./TrafficNewsTicker";
import { WazeMapEmbed } from "./WazeMapEmbed";
import { TruckTrafficCard } from "./TruckTrafficCard";
import {
  INITIAL_TRAFFIC_ALERTS,
  LOCATION_PRESETS,
  getActiveFleetTraffic,
  buildDeliveryPresetsFromOrders,
  getCoordinatesForCity,
  resolveGeoCoordinates,
  detectCityFromAddress,
  buildWazeSearchUrl,
} from "@/services/trafficService";
import type { LocationPreset, TrafficAlert, TruckRouteInfo } from "@/types/traffic";
import type { Order } from "@/types/dispatch";
import { useDispatchBoard } from "@/context/DispatchContext";
import { cn } from "@/lib/utils";

interface TrafficLiveDashboardProps {
  onClose?: () => void;
  className?: string;
  isModal?: boolean;
}

export function TrafficLiveDashboard({
  onClose,
  className,
  isModal = false,
}: TrafficLiveDashboardProps) {
  const { published, syncNow, isSyncing, lastSyncAt } = useDispatchBoard();

  const [selectedPreset, setSelectedPreset] = useState<LocationPreset>(LOCATION_PRESETS[0]!);
  const [selectedAlert, setSelectedAlert] = useState<TrafficAlert | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "in_transit" | "crane">("all");

  // Dynamic delivery presets generated from real sheet orders (Column D & E)
  const deliveryPresets = useMemo(() => {
    return buildDeliveryPresetsFromOrders(published);
  }, [published]);

  // Derive fleet traffic info combining live dispatch orders
  const trucks = useMemo(() => {
    return getActiveFleetTraffic(published);
  }, [published]);

  // When a user clicks on a truck card to focus on its destination
  const handleFocusTruckOnMap = (truck: TruckRouteInfo) => {
    const dynamicPreset: LocationPreset = {
      id: `truck-dest-${truck.id}`,
      label: `יעד ${truck.driverName} (${truck.destinationCity})`,
      shortLabel: truck.destinationCity,
      icon: "🎯",
      lat: truck.wazeLat,
      lon: truck.wazeLon,
      zoom: 15,
      description: truck.destination,
      pinText: `${truck.driverName} - ${truck.destination}`,
    };
    setSelectedPreset(dynamicPreset);
    // Scroll smoothly to map
    const mapEl = document.getElementById("waze-live-map-container");
    if (mapEl) {
      mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Focus directly on an order's unloading destination (Columns D & E)
  const handleFocusOrderOnMap = (order: Order) => {
    if (!order) return;
    const address = order.address || "";
    const city = order.city || detectCityFromAddress(address);
    const customerName = order.customerName || "לקוח";
    const driver = order.driver || "לא שובץ";
    const geo = resolveGeoCoordinates(city || address);
    const orderPreset: LocationPreset = {
      id: `order-preset-${order.orderId}`,
      label: `הזמנה #${order.orderId} - ${customerName}`,
      shortLabel: `${geo.cityName || city || "יעד"} (${order.orderId})`,
      icon: "📍",
      lat: geo.lat,
      lon: geo.lon,
      zoom: geo.defaultZoom || 15,
      description: `כתובת פריקה: ${address}, ${city} | נהג: ${driver}`,
      pinText: `${customerName} - ${address}`,
    };
    setSelectedPreset(orderPreset);
    // Scroll smoothly to map
    const mapEl = document.getElementById("waze-live-map-container");
    if (mapEl) {
      mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleSelectAlert = (alert: TrafficAlert) => {
    setSelectedAlert(alert);
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(published)) return [];
    return published.filter((o) => {
      if (!o) return false;
      if (activeTab === "in_transit") {
        return o.status === "יצא לדרך" || o.status === "בהעמסה";
      }
      if (activeTab === "crane") {
        const d = o.driver || "";
        return d.includes("מנוף") || d.includes("חכמת");
      }
      return true;
    });
  }, [published, activeTab]);

  return (
    <div
      dir="rtl"
      id="traffic-live-dashboard"
      className={cn(
        "flex flex-col gap-4 p-3 md:p-5 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl overflow-y-auto max-h-[92vh]",
        className,
      )}
    >
      {/* 1. Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-12 rounded-2xl bg-gradient-to-tr from-sky-600 via-blue-700 to-indigo-800 text-white shadow-lg border border-sky-400/30">
            <Compass className="size-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                מפת פקקים חיה ומבזקי תנועה
              </h2>
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Waze Live Telematics</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              ח. סבן חומרי בניין בע״מ · מעקב צי משאיות, ניווט יעדי פריקה וסנכרון חי מגיליון
              דשבורד_הזמנות
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Sync live sheet button */}
          <button
            type="button"
            onClick={() => syncNow()}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-sky-400 hover:text-sky-300 border border-slate-800 text-xs font-bold transition disabled:opacity-50"
            title="סנכרן נתוני הזמנות חיים מטאב דשבורד_הזמנות"
          >
            <RefreshCw className={cn("size-3.5", isSyncing && "animate-spin text-amber-400")} />
            <span>סנכרן נתונים חיים</span>
          </button>

          {/* Quick link to external Waze Map */}
          <a
            href="https://www.waze.com/live-map"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition"
            title="פתח פורטל Waze מלא בחלון חדש"
          >
            <span>פורטל Waze</span>
            <ExternalLink className="size-3" />
          </a>

          {/* Close button if presented as modal or drawer */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
              aria-label="סגור תצוגת מפת תנועה"
            >
              <X className="size-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Rotating Traffic News Ticker */}
      <TrafficNewsTicker
        alerts={INITIAL_TRAFFIC_ALERTS}
        onSelectAlert={handleSelectAlert}
        className="w-full"
      />

      {/* 3. Main Operational Content Grid: Waze Live Map + Fleet Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Waze Map Embed Section (Left / Center) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <WazeMapEmbed
            selectedPreset={selectedPreset}
            onSelectPreset={setSelectedPreset}
            customPresets={deliveryPresets}
            heightClass="h-[460px] xl:h-[520px]"
          />

          {/* Fast Route Advice Ticker */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-bold">
              <Route className="size-4 text-sky-400 shrink-0" />
              <span>הנחיית ניתוב למשאית מנוף:</span>
              <span className="text-amber-300 font-medium">
                עקב עומס בכביש 531 מערב — משאית מנוף חכמת לפריקה ברעננה (בר אילן 8) מופנית דרך ציר
                רחוב התלמיד/מגדיאל.
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono" dir="ltr">
              SabanOS Route Engine
            </span>
          </div>
        </div>

        {/* Active Fleet Traffic Cards (Right) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Truck className="size-4 text-amber-400" />
              <h3 className="text-sm font-black text-white">מעקב משאיות סבן בפועל</h3>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">
              {trucks.length} משאיות פעילות
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {trucks.map((truck) => (
              <TruckTrafficCard key={truck.id} truck={truck} onFocusOnMap={handleFocusTruckOnMap} />
            ))}
          </div>

          {/* Logistics Branch Note */}
          <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-900/50 text-[11px] text-sky-200/90 leading-relaxed">
            💡 <strong className="text-sky-300 font-bold">סדרן עבודה:</strong> זמני הנסיעה נמדדים
            בזמן אמת לפי מהירות המשאית הממוצעת ומגבלות משקל (פול-טריילר 32 טון).
          </div>
        </div>
      </div>

      {/* 4. REAL ORDERS FROM "דשבורד_הזמנות" WITH EXACT COLUMN D (כתובת פריקה) & COLUMN E (עיר) */}
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Package className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">
                  הזמנות ויעדי פריקה חיים מטאב דשבורד_הזמנות
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold font-mono">
                  גיליון 1VA9J6n9IYcooO_s2xOpnkvyDQWWQD3pfhh0cnenCkoA
                </span>
              </div>
              <p className="text-xs text-slate-400">
                נתוני עמודה D (כתובת פריקה) ועמודה E (עיר) מקושרים ישירות לניווט Waze ומיקוד במפה
              </p>
            </div>
          </div>

          {/* Filters & Count */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={cn(
                  "px-3 py-1 rounded-lg transition",
                  activeTab === "all"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white",
                )}
              >
                כל ההזמנות ({published.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("in_transit")}
                className={cn(
                  "px-3 py-1 rounded-lg transition",
                  activeTab === "in_transit"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white",
                )}
              >
                בדרך / בהעמסה
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("crane")}
                className={cn(
                  "px-3 py-1 rounded-lg transition",
                  activeTab === "crane"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-white",
                )}
              >
                משאיות מנוף
              </button>
            </div>
          </div>
        </div>

        {/* Orders Grid / Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredOrders.map((order) => {
            const wazeDirectUrl =
              order.wazeUrl || buildWazeSearchUrl(`${order.address}, ${order.city}`);

            return (
              <div
                key={order.orderId}
                id={`traffic-order-${order.orderId}`}
                className="flex flex-col justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-md group relative overflow-hidden"
              >
                <div className="space-y-3">
                  {/* Top Order Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-mono font-black text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/60"
                          dir="ltr"
                        >
                          #{order.orderId}
                        </span>
                        {order.customerNumber && (
                          <span className="text-[11px] font-mono text-slate-400" dir="ltr">
                            לקוח {order.customerNumber}
                          </span>
                        )}
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-[11px] font-bold border",
                            order.status === "סופק"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : order.status === "בהעמסה"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                : order.status === "יצא לדרך"
                                  ? "bg-sky-500/20 text-sky-300 border-sky-500/30"
                                  : "bg-slate-800 text-slate-300 border-slate-700",
                          )}
                        >
                          {order.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-white mt-1 line-clamp-1">
                        {order.customerName}
                      </h4>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1 justify-end">
                        <Clock className="size-3" />
                        <span>{order.targetTime || "11:00"}</span>
                      </span>
                      <span className="text-[10px] text-slate-400">סבב {order.round}</span>
                    </div>
                  </div>

                  {/* HIGHLIGHTED UNLOADING DESTINATION: COLUMN D (כתובת) & COLUMN E (עיר) */}
                  <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-rose-400 shrink-0 animate-bounce" />
                        <span>כתובת פריקה מדויקת (עמודה D):</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 font-bold text-xs">
                        עמודה E: {order.city || "לא צוין"}
                      </span>
                    </div>

                    <div className="text-sm font-black text-white pr-5">
                      {order.address || "משיכה עצמית / לא צוין"}
                    </div>
                  </div>

                  {/* Driver & Warehouse */}
                  <div className="flex items-center justify-between text-xs text-slate-300 px-1">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Truck className="size-3.5 text-amber-400 shrink-0" />
                      <strong className="text-slate-200">{order.driver || "לא שובץ"}</strong>
                    </span>
                    <span className="text-slate-400">{order.warehouse}</span>
                  </div>

                  {/* Cargo summary */}
                  {order.itemsFormatted && (
                    <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-850 line-clamp-2">
                      📦 {order.itemsFormatted}
                    </div>
                  )}
                </div>

                {/* Bottom Actions: Center on Map + Direct Waze Deep Link */}
                <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleFocusOrderOnMap(order)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 hover:text-sky-200 border border-sky-500/40 text-xs font-bold transition shadow-xs"
                    title={`מרכז את מפת Waze על ${order.address}, ${order.city}`}
                  >
                    <Compass className="size-3.5" />
                    <span>הצג יעד במפה</span>
                  </button>

                  <a
                    href={wazeDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-black transition shadow-md border border-sky-400/30"
                    title={`פתח ניווט Waze ישיר ל-${order.address}, ${order.city}`}
                  >
                    <Navigation className="size-3.5" />
                    <span>ניווט Waze</span>
                    <ExternalLink className="size-3 opacity-75" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TrafficLiveDashboard;
