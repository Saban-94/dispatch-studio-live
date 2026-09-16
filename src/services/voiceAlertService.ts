/**
 * H. Saban Logistics - Browser-based Speech Synthesis Service (Noa AI Voice Engine)
 *
 * Provides automated, crystal-clear Hebrew female speech narration (lang='he-IL')
 * for urgent and high-priority order status changes using the native Web Speech API (window.speechSynthesis).
 * Operates autonomously in real time without requiring manual intervention.
 */

import type { Order, OrderStatus } from "@/types/dispatch";
import { isAudioMuted, subscribeSoundMute } from "@/utils/soundEffects";

const VOICE_ENABLED_STORAGE_KEY = "saban_voice_alerts_enabled";
const VOICE_VOLUME_STORAGE_KEY = "saban_voice_alerts_volume";

// In-memory state
let isVoiceAnnounceEnabledState = true;
let voiceVolume = 1.0;
let cachedHebrewVoice: SpeechSynthesisVoice | null = null;
let isSpeakingState = false;
const activeUtterances = new Set<SpeechSynthesisUtterance>(); // Prevents Chrome garbage collection bug

// Timestamp deduplication to prevent double-speaking within a short window
const recentlyAnnouncedMap = new Map<string, number>();

// Voice state change listeners
type VoiceListener = (enabled: boolean, isSpeaking: boolean) => void;
const voiceListeners = new Set<VoiceListener>();

function notifyVoiceListeners() {
  voiceListeners.forEach((fn) => {
    try {
      fn(isVoiceAnnounceEnabledState, isSpeakingState);
    } catch {
      /* ignore */
    }
  });
}

export function subscribeVoiceStatus(listener: VoiceListener): () => void {
  voiceListeners.add(listener);
  listener(isVoiceAnnounceEnabledState, isSpeakingState);
  return () => {
    voiceListeners.delete(listener);
  };
}

// Initialize settings from localStorage
if (typeof window !== "undefined") {
  try {
    const storedEnabled = localStorage.getItem(VOICE_ENABLED_STORAGE_KEY);
    if (storedEnabled !== null) {
      isVoiceAnnounceEnabledState = storedEnabled === "true";
    }
    const storedVol = localStorage.getItem(VOICE_VOLUME_STORAGE_KEY);
    if (storedVol !== null) {
      const v = parseFloat(storedVol);
      if (!isNaN(v) && v >= 0 && v <= 1) {
        voiceVolume = v;
      }
    }
  } catch {
    /* ignore */
  }

  // Setup auto-unlock on first user interaction to bypass browser autoplay restrictions
  const unlockAudio = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.resume();
      // Load voices early
      findBestHebrewFemaleVoice();
    }
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
  };

  window.addEventListener("pointerdown", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });

  // Listen for voice catalog loaded by browser
  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      findBestHebrewFemaleVoice();
    };
  }

  // Instantly cancel ongoing voice narration if audio is muted
  subscribeSoundMute((muted) => {
    if (muted) {
      stopSpeaking();
    }
    notifyVoiceListeners();
  });
}

/**
 * Searches for the best natural female voice in Hebrew (lang='he-IL' or 'iw-IL').
 * Prioritizes known female neural/synthetic voices:
 * - Microsoft Hila (Edge/Windows)
 * - Carmit (Apple macOS/iOS Siri Hebrew)
 * - Google עברית / Hebrew (Chrome)
 * - Any Hebrew voice with female hints or he-IL tag
 */
export function findBestHebrewFemaleVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    return cachedHebrewVoice;
  }

  // 1. Filter Hebrew voices
  const hebrewVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith("he") ||
      v.lang.toLowerCase().startsWith("iw") ||
      v.lang.toLowerCase().includes("il") ||
      v.name.includes("עברית") ||
      v.name.toLowerCase().includes("hebrew"),
  );

  if (hebrewVoices.length === 0) {
    // Fallback: system default or null
    return null;
  }

  // 2. Score Hebrew voices to favor high quality female narrators
  const scored = hebrewVoices.map((voice) => {
    const nameLower = voice.name.toLowerCase();
    let score = 10;

    // ❌ הפחתת ניקוד לקולות גבריים (כדי שלא ייבחרו בטעות):
    if (
      nameLower.includes("asaf") ||
      nameLower.includes("אסף") ||
      nameLower.includes("avri") ||
      nameLower.includes("אברי") ||
      nameLower.includes("david") ||
      nameLower.includes("דוד") ||
      nameLower.includes("male") ||
      nameLower.includes("זכר")
    ) {
      score -= 100;
    }

    // ⭐ עדיפות עליונה לקולות נשיים טבעיים מובילים:
    // Hila (הקול הנשי של מיקרוסופט/Edge) ו-Carmit (הקול הנשי של אפל/סירי)
    if (nameLower.includes("hila") || nameLower.includes("הילה")) {
      score += 80;
    }
    if (nameLower.includes("carmit") || nameLower.includes("כרמית")) {
      score += 70;
    }

    // רמזים נשיים נוספים:
    if (
      nameLower.includes("sara") ||
      nameLower.includes("שרה") ||
      nameLower.includes("noa") ||
      nameLower.includes("נועה") ||
      nameLower.includes("ayelet") ||
      nameLower.includes("איילת") ||
      nameLower.includes("eden") ||
      nameLower.includes("עדן") ||
      nameLower.includes("female") ||
      nameLower.includes("נקבה")
    ) {
      score += 50;
    }

    // קולות Natural / Online (באיכות גבוהה של מיקרוסופט)
    if (nameLower.includes("natural") || nameLower.includes("online")) {
      score += 30;
    }

    // קול Google בעברית (ב-Chrome)
    if (nameLower.includes("google")) {
      score += 20;
    }

    if (voice.lang === "he-IL" || voice.lang === "iw-IL") {
      score += 15;
    }

    return { voice, score };
  });

  scored.sort((a, b) => b.score - a.score);
  cachedHebrewVoice = scored[0].voice;
  return cachedHebrewVoice;
}

export function isVoiceAnnounceEnabled(): boolean {
  return isVoiceAnnounceEnabledState && !isAudioMuted();
}

export function setVoiceAnnounceEnabled(enabled: boolean): void {
  isVoiceAnnounceEnabledState = enabled;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(VOICE_ENABLED_STORAGE_KEY, String(enabled));
    } catch {
      /* ignore */
    }
  }
  notifyVoiceListeners();
}

export function toggleVoiceAnnounce(): boolean {
  setVoiceAnnounceEnabled(!isVoiceAnnounceEnabledState);
  return isVoiceAnnounceEnabledState;
}

export function getVoiceVolume(): number {
  return voiceVolume;
}

export function setVoiceVolume(vol: number): void {
  voiceVolume = Math.max(0, Math.min(1, vol));
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(VOICE_VOLUME_STORAGE_KEY, String(voiceVolume));
    } catch {
      /* ignore */
    }
  }
}

export function isCurrentlySpeaking(): boolean {
  return isSpeakingState;
}

/**
 * Immediately silences and cancels all browser speech synthesis utterances.
 * Cuts off the voice instantly upon pressing the speaker button or muting.
 */
export function stopSpeaking(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      console.warn("[VoiceAlertService] Cancel speech error:", err);
    }
  }
  activeUtterances.clear();
  isSpeakingState = false;
  notifyVoiceListeners();
}

/**
 * Low-level speech synthesis invoker with queue and memory management.
 */
export function speakHebrew(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve();
      return;
    }

    if (!isVoiceAnnounceEnabled()) {
      resolve();
      return;
    }

    try {
      // If speech synthesis is paused, resume it
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "he-IL";

      const femaleVoice = findBestHebrewFemaleVoice();
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      // Slightly elevated pitch (1.08) for a clear, resonant female dispatcher timbre
      utterance.pitch = 1.08;
      // Normal articulate pace (0.96) for crisp acoustics in warehouse and control room
      utterance.rate = 0.99;
      utterance.volume = voiceVolume;

      // Keep reference to prevent GC bug in Chromium
      activeUtterances.add(utterance);

      utterance.onstart = () => {
        isSpeakingState = true;
        notifyVoiceListeners();
      };

      utterance.onend = () => {
        activeUtterances.delete(utterance);
        isSpeakingState = activeUtterances.size > 0;
        notifyVoiceListeners();
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn("[VoiceAlertService] Speech synthesis error:", e);
        activeUtterances.delete(utterance);
        isSpeakingState = activeUtterances.size > 0;
        notifyVoiceListeners();
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("[VoiceAlertService] Failed to speak:", err);
      isSpeakingState = false;
      notifyVoiceListeners();
      resolve();
    }
  });
}

/**
 * Evaluates whether an order qualifies as urgent or high priority (הזמנה דחופה בעדיפות גבוהה)
 */
export function isHighPriorityUrgentOrder(
  order: Order,
  statusContext?: {
    newStatus?: OrderStatus;
    previousStatus?: OrderStatus;
  },
): boolean {
  if (!order) return false;

  const newStatus = statusContext?.newStatus || order.status;
  const prevStatus = statusContext?.previousStatus;

  // 1. Critical operational status progression
  const isUrgentStatus =
    newStatus === "בהעמסה" ||
    newStatus === "מוכן להעמסה" ||
    (prevStatus === "בהעמסה" && newStatus === "יצא לדרך");

  if (isUrgentStatus) return true;

  // 2. Round 1 deliveries (Morning high priority round)
  if (order.round === 1) return true;

  // 3. Notes containing urgency keywords
  const noteLower = (order.note || "").toLowerCase();
  const hasUrgentNote =
    noteLower.includes("דחוף") ||
    noteLower.includes("בהקדם") ||
    noteLower.includes("עדיפות") ||
    noteLower.includes("מיידי") ||
    noteLower.includes("קריטי") ||
    noteLower.includes("מהר") ||
    noteLower.includes("חובה");

  if (hasUrgentNote) return true;

  // 4. Time SLA check: within 30 minutes of target time or overdue
  if (order.targetTime) {
    try {
      const now = new Date();
      const [hStr, mStr] = order.targetTime.split(":");
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (!isNaN(h) && !isNaN(m)) {
        const target = new Date();
        target.setHours(h, m, 0, 0);
        const diffMinutes = Math.round((target.getTime() - now.getTime()) / 60000);
        if (diffMinutes <= 30) {
          return true;
        }
      }
    } catch {
      /* ignore time parsing */
    }
  }

  // 5. Significant logistics volume (e.g. 6+ big bags or heavy weight)
  if (
    (order.logisticsMetrics?.bellaBags && order.logisticsMetrics.bellaBags >= 6) ||
    (order.logisticsMetrics?.estimatedWeightKg && order.logisticsMetrics.estimatedWeightKg >= 12000)
  ) {
    return true;
  }

  return false;
}

/**
 * Converts a status name to an articulate Hebrew sentence for dispatch announcement
 */
function getStatusHebrewDescription(status: OrderStatus, warehouse: string): string {
  switch (status) {
    case "בהעמסה":
      return `הועברה כעת להעמסה פעילה ברציף ${warehouse || "המחסן"}. נדרש תיאום מלגזה מיידי.`;
    case "מוכן להעמסה":
      return `הליקוט הושלם במלואו. ההזמנה מוכנה כעת להעמסה ברציף ${warehouse || "המחסן"}.`;
    case "יצא לדרך":
      return "ההעמסה הושלמה. המשאית יצאה כעת לדרך אל אתר הלקוח.";
    case "סופק":
      return "המשלוח נמסר ונפרק בהצלחה ביעד.";
    case "בהכנה":
      return `נמצאת כעת בליקוט והכנה מהירה ב${warehouse || "מחסן"}.`;
    case "ממתין":
      return "עודכנה למצב ממתין לשיבוץ ברציף.";
    default:
      return `הועברה לסטטוס ${status}.`;
  }
}

/**
 * Builds a natural, professional Hebrew dispatch announcement script
 */
export function buildUrgentOrderAnnouncementScript(
  order: Order,
  newStatus: OrderStatus,
  previousStatus?: OrderStatus,
): string {
  const driverName = order.driver ? order.driver.split("-")[0]?.trim() : "";
  const driverSegment = driverName ? `עם הנהג ${driverName}.` : "";
  const customerName = order.customerName || "לקוח";
  const locationSegment = order.city ? `ב${order.city}` : "";
  const statusSegment = getStatusHebrewDescription(newStatus, order.warehouse);

  // Status-specific announcement templates
  if (newStatus === "בהעמסה") {
    return `שימו לב, עדכון דחוף! הזמנה מספר ${order.orderId}, עבור ${customerName} ${locationSegment}, ${statusSegment} סבב ${order.round}, ${driverSegment}`;
  }

  if (newStatus === "מוכן להעמסה") {
    return `הודעת הפצה דחופה! הזמנה מספר ${order.orderId}, עבור ${customerName}, מוכנה כעת להעמסה מיידית ברציף. ${driverSegment}`;
  }

  if (newStatus === "יצא לדרך") {
    return `עדכון תנועה! הזמנה מספר ${order.orderId} עבור ${customerName} יצאה כעת לדרך ${driverSegment}`;
  }

  if (newStatus === "סופק") {
    return `הזמנה בסידור מספר ${order.orderId} עבור ${customerName} סופקה בהצלחה.`;
  }

  // General order status change in dispatch
  const fromText = previousStatus ? `מ${previousStatus} ` : "";
  return `שימו לב: עדכון סטטוס בהזמנה בסידור מספר ${order.orderId}, עבור ${customerName}. הסטטוס עודכן ${fromText}ל: ${newStatus}. ${driverSegment}`;
}

/**
 * Main autonomous trigger: called whenever an order status change occurs.
 * Evaluates urgency, prevents duplicates, and triggers the clear female Hebrew voice.
 */
export async function announceUrgentOrderStatusChange(
  order: Order,
  newStatus: OrderStatus,
  previousStatus?: OrderStatus,
): Promise<boolean> {
  if (!order || !newStatus) return false;

  // Only announce if this order is high-priority / urgent
  const isUrgent = isHighPriorityUrgentOrder(order, { newStatus, previousStatus });
  if (!isUrgent) {
    return false;
  }

  // Deduplication check: do not repeat the exact same order + status announcement within 12 seconds
  const dedupeKey = `${order.orderId}_${newStatus}`;
  const now = Date.now();
  const lastAnnounced = recentlyAnnouncedMap.get(dedupeKey);
  if (lastAnnounced && now - lastAnnounced < 12000) {
    return false;
  }
  recentlyAnnouncedMap.set(dedupeKey, now);

  // Clean old entries from dedupe map
  if (recentlyAnnouncedMap.size > 40) {
    recentlyAnnouncedMap.forEach((time, key) => {
      if (now - time > 60000) {
        recentlyAnnouncedMap.delete(key);
      }
    });
  }

  const script = buildUrgentOrderAnnouncementScript(order, newStatus, previousStatus);
  await speakHebrew(script);
  return true;
}

/**
 * Trigger a sample test voice announcement for user preview
 */
export async function testVoiceAnnouncement(): Promise<void> {
  const sampleText =
    "בדיקת מערכת התראות קוליות נועה איי איי. קריינות קולית בעברית פעילה ומוכנה לדיווח על הזמנות בסידור בזמן אמת.";
  await speakHebrew(sampleText);
}
