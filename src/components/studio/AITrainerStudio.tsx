import { useState } from "react";
import {
  Bot,
  BrainCircuit,
  Calendar,
  Clock,
  HardHat,
  Monitor,
  Play,
  Plus,
  Radio,
  Send,
  Sparkles,
  Trash2,
  Truck,
  Video,
  Folder,
  ExternalLink,
  Tv,
} from "lucide-react";
import { useDispatchBoard } from "@/context/DispatchContext";
import { ScreensaverAdminPanel } from "@/components/admin/ScreensaverAdminPanel";
import type { AlertLevel } from "@/types/dispatch";
import { cn } from "@/lib/utils";

export function AITrainerStudio() {
  const {
    aiTraining,
    updateAITraining,
    scheduledMessages,
    addScheduledMessage,
    toggleScheduledMessage,
    deleteScheduledMessage,
    targetedBriefings,
    generateAIBriefing,
    isGeneratingAI,
    pushAlert,
    screensaverSettings,
    updateScreensaverSettings,
    setScreensaverActive,
    nearestOrderMinutesRemaining,
    idleSecondsCount,
  } = useDispatchBoard();

  const [activeSubTab, setActiveSubTab] = useState<"training" | "schedule" | "screensaver">(
    "training",
  );
  const [customPrompt, setCustomPrompt] = useState("");
  const [quickLevel, setQuickLevel] = useState<AlertLevel>("info");
  const [isFlashQuick, setIsFlashQuick] = useState(false);

  // New scheduled message form state
  const [newTime, setNewTime] = useState("14:30");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTarget, setNewTarget] = useState<"all" | "warehouse" | "driver">("all");

  const handlePushImmediate = () => {
    if (!customPrompt.trim()) return;
    pushAlert(customPrompt.trim(), quickLevel, isFlashQuick);
    setCustomPrompt("");
  };

  const handleCreateScheduled = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    addScheduledMessage({
      time: newTime,
      title: newTitle.trim(),
      content: newContent.trim(),
      target: newTarget,
      isActive: true,
    });
    setNewTitle("");
    setNewContent("");
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border/80 bg-secondary/30 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-black text-foreground">נועה AI · אימון והפצה חכמה</h3>
            <p className="text-[11px] text-muted-foreground">
              אימון מודל, הודעות מתוזמנות ושומר מסך מבצעי
            </p>
          </div>
        </div>

        <button
          onClick={() => setScreensaverActive(true)}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-500"
        >
          <Monitor className="size-3.5" />
          <span>הפעל שומר מסך</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-card p-1 ring-1 ring-border">
        <button
          onClick={() => setActiveSubTab("training")}
          className={cn(
            "rounded-lg py-1.5 text-xs font-bold transition",
            activeSubTab === "training"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          אימון ודחיפה
        </button>
        <button
          onClick={() => setActiveSubTab("schedule")}
          className={cn(
            "rounded-lg py-1.5 text-xs font-bold transition",
            activeSubTab === "schedule"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          הודעות מתוזמנות ({scheduledMessages.length})
        </button>
        <button
          onClick={() => setActiveSubTab("screensaver")}
          className={cn(
            "rounded-lg py-1.5 text-xs font-bold transition",
            activeSubTab === "screensaver"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          הגדרות שומר מסך
        </button>
      </div>

      {/* TAB 1: MODEL TRAINING & INSTANT PUSH */}
      {activeSubTab === "training" && (
        <div className="space-y-4">
          {/* Training Focus Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <BrainCircuit className="size-3.5 text-primary" />
              <span>פוקוס אימון המודל (Operational Focus):</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "safety", label: "בטיחות העמסה ומשטחים" },
                { id: "speed", label: "מהירות וצמצום עיכובים" },
                { id: "loading_balance", label: "איזון סרנים ושקי בלה" },
                { id: "weather_traffic", label: "פקקים ועומסי צירים" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() =>
                    updateAITraining({ focusMode: f.id as typeof aiTraining.focusMode })
                  }
                  className={cn(
                    "rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition text-right",
                    aiTraining.focusMode === f.id
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Instruction Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">הנחיית אימון קבועה למודל:</label>
            <textarea
              rows={2}
              value={aiTraining.customPromptRule}
              onChange={(e) => updateAITraining({ customPromptRule: e.target.value })}
              className="w-full rounded-xl border border-input bg-card p-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="למשל: דגש על בדיקת תעודות משלוח, התראה על עומס בכביש 1..."
            />
          </div>

          {/* Generate & Push AI Briefing Button */}
          <button
            onClick={() => generateAIBriefing()}
            disabled={isGeneratingAI}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
          >
            <Sparkles className={cn("size-4", isGeneratingAI && "animate-spin")} />
            <span>
              {isGeneratingAI ? "נועה AI מנתחת ומפיקה תובנות..." : "אימון ודחיפת עדכון AI למסכים"}
            </span>
          </button>

          {/* Targeted Directives Preview */}
          <div className="space-y-2 rounded-xl border border-border bg-card p-3">
            <div className="text-xs font-bold text-foreground mb-1">
              תדריכים ממוקדים שמשודרים כעת:
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-300">
                <HardHat className="size-3.5 shrink-0 mt-0.5" />
                <span>
                  <strong>למחסנאי:</strong> {targetedBriefings.forWarehouse}
                </span>
              </div>
              <div className="flex items-start gap-1.5 text-blue-700 dark:text-blue-300">
                <Truck className="size-3.5 shrink-0 mt-0.5" />
                <span>
                  <strong>לנהג:</strong> {targetedBriefings.forDriver}
                </span>
              </div>
            </div>
          </div>

          {/* Instant Manual Push to TV */}
          <div className="space-y-2 border-t border-border pt-3">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Radio className="size-3.5 text-accent" />
              <span>דחיפת עדכון מיידי לטלוויזיה ולשומר המסך:</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="הקלד הודעה קצרה לשידור מיידי..."
                className="flex-1 rounded-xl border border-input bg-card px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handlePushImmediate}
                className="flex items-center gap-1 rounded-xl bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground hover:bg-accent/90"
              >
                <Send className="size-3.5" />
                <span>שדר</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-2">
                <label className="text-muted-foreground">דחיפות:</label>
                {(["info", "warning", "critical"] as AlertLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setQuickLevel(lvl)}
                    className={cn(
                      "rounded px-2 py-0.5 text-[11px] font-bold",
                      quickLevel === lvl
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {lvl === "info" ? "מידע" : lvl === "warning" ? "אזהרה" : "דחוף"}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFlashQuick}
                  onChange={(e) => setIsFlashQuick(e.target.checked)}
                  className="rounded border-border"
                />
                <span>התראה קופצת (Flash)</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SCHEDULED MESSAGES */}
      {activeSubTab === "schedule" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-xs font-bold text-foreground">הודעות מתוזמנות פעילות:</div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {scheduledMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-2.5 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary">{msg.time}</span>
                      <span className="font-bold text-foreground">{msg.title}</span>
                      <span className="rounded bg-secondary px-1.5 py-0.2 text-[10px] text-muted-foreground">
                        {msg.target === "warehouse"
                          ? "מחסנאי"
                          : msg.target === "driver"
                            ? "נהג"
                            : "לכולם"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{msg.content}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={msg.isActive}
                      onChange={(e) => toggleScheduledMessage(msg.id, e.target.checked)}
                      className="size-4 rounded border-border"
                      title="הפעל / השבת"
                    />
                    <button
                      onClick={() => deleteScheduledMessage(msg.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Scheduled Message Form */}
          <form
            onSubmit={handleCreateScheduled}
            className="space-y-2 rounded-xl border border-border bg-card p-3"
          >
            <div className="text-xs font-bold text-foreground">הוספת הודעה מתוזמנת חדשה:</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-muted-foreground">שעת שידור:</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-1.5 text-xs font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground">יעד:</label>
                <select
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value as typeof newTarget)}
                  className="w-full rounded-lg border border-input bg-background p-1.5 text-xs font-semibold"
                >
                  <option value="all">כלל הצוות</option>
                  <option value="warehouse">מחסנאים ומלגזנים</option>
                  <option value="driver">נהגי משאיות</option>
                </select>
              </div>
            </div>

            <input
              type="text"
              placeholder="כותרת (למשל: סגירת סבב 1)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-1.5 text-xs font-semibold"
              required
            />

            <textarea
              rows={2}
              placeholder="תוכן ההודעה המתוזמנת..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-1.5 text-xs font-medium"
              required
            />

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-primary py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="size-3.5" />
              <span>שמור הודעה מתוזמנת</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: SCREENSAVER SETTINGS */}
      {activeSubTab === "screensaver" && (
        <div className="space-y-4 text-xs">
          {/* Quick Launch Banner */}
          <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 p-3">
            <div className="flex items-center gap-2.5">
              <Tv className="size-5 text-primary" />
              <div>
                <div className="font-bold text-foreground">הפעלת שומר מסך מבצעי</div>
                <div className="text-[11px] text-muted-foreground">
                  פתיחה מידית של שומר המסך וסבב שקופיות המוצר על המסך
                </div>
              </div>
            </div>
            <button
              onClick={() => setScreensaverActive(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition"
            >
              <Play className="size-3.5 fill-current" />
              <span>הפעל עכשיו</span>
            </button>
          </div>

          {/* Core Screensaver Admin Panel */}
          <div className="pt-1">
            <ScreensaverAdminPanel />
          </div>

          {/* Idle Timeout setting */}
          <div className="space-y-1.5 rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">זמן חוסר שימוש להפעלה:</span>
              <span className="font-bold text-primary">
                {screensaverSettings.idleTimeoutSeconds === 0
                  ? "כבוי"
                  : `${screensaverSettings.idleTimeoutSeconds} שניות`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 pt-1">
              {[
                { s: 30, l: "30 שניות" },
                { s: 60, l: "דקה" },
                { s: 90, l: "דקה וחצי" },
                { s: 180, l: "3 דקות" },
              ].map((item) => (
                <button
                  key={item.s}
                  onClick={() => updateScreensaverSettings({ idleTimeoutSeconds: item.s })}
                  className={cn(
                    "rounded-lg py-1 text-[11px] font-semibold transition",
                    screensaverSettings.idleTimeoutSeconds === item.s
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.l}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground">
              זמן חוסר פעילות נוכחי: {idleSecondsCount} שניות
            </div>
          </div>

          {/* Nearest Order Gap threshold */}
          <div className="space-y-1.5 rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">סף מרחק הזמנה קרובה:</span>
              <span className="font-bold text-primary">
                {screensaverSettings.minOrderGapMinutes} דקות
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              אם ההזמנה הקרובה ביותר רחוקה מ-{screensaverSettings.minOrderGapMinutes} דקות, המסך
              יעבור לשומר מסך ביצועים עד להגעת חלון ההעמסה.
            </p>
            <div className="grid grid-cols-3 gap-1 pt-1">
              {[30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => updateScreensaverSettings({ minOrderGapMinutes: mins })}
                  className={cn(
                    "rounded-lg py-1 text-[11px] font-semibold transition",
                    screensaverSettings.minOrderGapMinutes === mins
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground",
                  )}
                >
                  מעל {mins} דקות
                </button>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground">
              הזמנה קרובה כרגע בעוד:{" "}
              {nearestOrderMinutesRemaining !== null && nearestOrderMinutesRemaining < 900
                ? `${nearestOrderMinutesRemaining} דקות`
                : "אין הזמנה בתור המיידי"}
            </div>
          </div>

          {/* Video on lull toggle */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <Video className="size-4 text-primary" />
              <div>
                <div className="font-bold text-foreground">סרטון וידאו בזמן הפוגה</div>
                <div className="text-[11px] text-muted-foreground">
                  שידור וידאו לוגיסטיקה אווירתי כשאין התראות דחופות
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={screensaverSettings.autoVideoOnLull}
              onChange={(e) => updateScreensaverSettings({ autoVideoOnLull: e.target.checked })}
              className="size-4 rounded border-border"
            />
          </div>

          {/* Google Drive Media Folder */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <Folder className="size-4 text-purple-400" />
              <div>
                <div className="flex items-center gap-2 font-bold text-foreground">
                  <span>מדיה ומצגות מ-Google Drive</span>
                  <span className="font-mono text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                    1SZdhFhiCx1X3FdXF7Rr4lQ3-7Tc0xSDr
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  סנכרון סרטוני הדרכה ומצגות Google Slides ישירות לשומר המסך
                </div>
              </div>
            </div>
            <a
              href="https://drive.google.com/drive/folders/1SZdhFhiCx1X3FdXF7Rr4lQ3-7Tc0xSDr"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
            >
              <span>פתח תיקייה</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
