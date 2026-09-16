export type ScreensaverMode =
  | "analytics"
  | "traffic"
  | "video"
  | "mixed"
  | "STOCK_ALERT"
  | "INVENTORY_ALERT"
  | "drive_media"
  | "product_slide";

export type ScreensaverBranchFilter = "all" | "branch_4" | "branch_1";

export interface ScreensaverSlideConfig {
  id: ScreensaverMode;
  title: string;
  description: string;
  enabled: boolean;
  durationSeconds: number; // custom dwell time per slide
  order: number;
  badge?: string;
  category: "product" | "alert" | "media" | "ops";
}

export interface ScreensaverAdminSettings {
  slides: ScreensaverSlideConfig[];
  branchFilter: ScreensaverBranchFilter;
  prioritizeCriticalProducts: boolean;
  productSlideIntervalSeconds: number; // dwell time per product slide in carousel
  pauseOnHover: boolean;
}

export interface NormalizedProductSlideItem {
  sku: string;
  cleanName: string;
  originalName: string;
  category: string;
  unit: string;
  unitsPerPallet: number;
  warehouseBranch: string; // e.g. "מגרש 4 - החרש" | "סניף 1 - התלמיד"
  branchNumber: 1 | 4 | "all";
  actualDrawn: number; // בהעמסה / יצא לדרך / סופק
  reserved: number; // בסידור עבודה / בהכנה / מוכן להעמסה
  totalDemanded: number; // סה"כ נמשך/פעיל היום
  initialBase: number;
  effectiveBalance: number; // Max(0, initialBase - totalDemanded)
  safetyThreshold: number;
  percentRemaining: number;
  isCritical: boolean;
  isWarning: boolean;
  deficitToRefill: number;
  palletsToRefill: number;
  procurementAdvice: string; // "דרוש פול-טריילר (24 משטחים)" או "להזמין X משטחים"
  requiresFullTrailer: boolean;
  imageUrl: string;
  ordersCount: number;
}

export interface ParsedProductItem {
  raw: string;
  name: string;
  quantity: number;
  unit: string;
  category: "cement" | "big_bag" | "block" | "dry_mix" | "other";
  sku?: string;
}

export interface ItemStockStatus {
  sku: string;
  name: string;
  unit: string;
  category: "cement" | "big_bag" | "block" | "dry_mix" | "other";
  initialStock: number;
  dispensedToday: number;
  currentStock: number;
  safetyStockLevel: number;
  isLowStock: boolean;
  deficit: number;
  stockPercentage: number;
  urgency: "critical" | "warning" | "normal";
  reorderAdvice: string;
}

export interface InventoryAggregationSummary {
  totalCementBags: number;
  cementPallets: number;
  isCementHighDemand: boolean;
  cementReorderRecommendation: string;
  cementInitialStock: number;
  cementSafetyStock: number;
  cementCurrentStock: number;
  isCementLowStock: boolean;

  totalBigBags: number;
  bigBagsBreakdown: {
    sesame: number;
    sand: number;
    tit: number;
    other: number;
  };
  isBigBagsQuarryAlert: boolean;
  bigBagsReorderRecommendation: string;
  bigBagsInitialStock: number;
  bigBagsSafetyStock: number;
  bigBagsCurrentStock: number;
  isBigBagsLowStock: boolean;

  totalBlocks: number;
  blockPallets: number;
  blocksBreakdown: Record<string, number>;
  blocksInitialStock: number;
  blocksSafetyStock: number;
  blocksCurrentStock: number;
  isBlocksLowStock: boolean;

  totalDryMixBags: number;
  dryMixBreakdown: Record<string, number>;
  dryMixInitialStock: number;
  dryMixSafetyStock: number;
  dryMixCurrentStock: number;
  isDryMixLowStock: boolean;

  // Granular item-level low-stock evaluations
  itemStockStatuses: ItemStockStatus[];
  lowStockItems: ItemStockStatus[];

  ordersCount: number;
  lastCalculatedAt: string;
}

export interface DriveMediaItem {
  id: string;
  name: string;
  mimeType: string;
  type: "video" | "presentation" | "other";
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  embedUrl: string;
  downloadUrl?: string;
  durationSeconds?: number;
  sizeBytes?: number;
  createdTime?: string;
}

export interface DailyInventoryInsight {
  sku: string;
  productName: string;
  todayDispensedQty: number;
  unit: string;
  recommendedReorderQty: number;
  recommendedUnitsText: string;
  explanation: string;
  imageUrl: string;
  alertLevel: "HIGH" | "NORMAL";
  bannerText: string;
  warehouseName: string;
}

export interface ScheduledBroadcast {
  id: string;
  time: string; // e.g. "11:30"
  target: "all" | "warehouse" | "driver";
  title: string;
  content: string;
  isActive: boolean;
  isTriggered?: boolean;
}

export interface AITrainingSettings {
  focusMode: "safety" | "speed" | "loading_balance" | "weather_traffic" | "custom";
  customPromptRule: string;
  temperature: number;
  autoPushToTV: boolean;
}

export interface ScreensaverSettings {
  isEnabled: boolean;
  idleTimeoutSeconds: number; // 30, 60, 120, 300 (0 = disabled)
  minOrderGapMinutes: number; // e.g. 45 (triggers if nearest order > 45m away)
  activeMode: ScreensaverMode;
  autoCycle: boolean;
  cycleIntervalSeconds: number;
  videoSource: string;
  videoMuted: boolean;
  autoVideoOnLull: boolean; // switches to ambient video when no urgent warnings exist
  adminSettings?: ScreensaverAdminSettings;
  branchFilter?: ScreensaverBranchFilter;
  prioritizeCritical?: boolean;
  productSlideIntervalSeconds?: number;
}

export interface TrafficRouteInfo {
  id: string;
  road: string;
  segment: string;
  status: "fluid" | "moderate" | "heavy";
  statusText: string;
  delayMinutes: number;
  avgSpeedKmh: number;
  alert?: string;
  updatedAt: string;
}

export interface DriverETAInfo {
  orderId: string;
  driverName: string;
  vehicle: string;
  destination: string;
  city: string;
  targetTime: string;
  etaTime: string;
  remainingMinutes: number;
  trafficState: "fluid" | "moderate" | "heavy";
  routeRoad: string;
  warehouse: string;
  itemsSummary: string;
}

export interface ProductAnalyticsSummary {
  bellaBagsTotal: number;
  sabanPalletsTotal: number;
  totalWeightKg: number;
  loadingRatePalletsPerHour: number;
  onTimeRatePercent: number;
  fleetUtilizationPercent: number;
  topProducts: {
    sku: string;
    name: string;
    category: "bella" | "saban" | "bulk" | "accessories";
    quantity: number;
    unit: string;
    palletsOrBags: number;
    weightKg: number;
    stockStatus: "תקין" | "מלאי נמוך" | "עומס הזמנות";
  }[];
  hourlyThroughput: {
    hour: string;
    pallets: number;
    weightTons: number;
  }[];
}
