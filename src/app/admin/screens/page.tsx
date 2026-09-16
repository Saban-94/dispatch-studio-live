import React, { useState } from "react";
import {
  Tv,
  Plus,
  RefreshCw,
  Volume2,
  VolumeX,
  Sliders,
  ShieldAlert,
  Clock,
  Trash2,
  ExternalLink,
  Power,
  Sparkles,
  Search,
  CheckCircle,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import { useAdminControl } from "@/context/AdminControlContext";
import { toast } from "sonner";

interface ScreensPageProps {
  onNavigate?: (path: string) => void;
}

export default function ScreensPage({ onNavigate }: ScreensPageProps) {
  const {
    screens,
    pairDevice,
    unpairDevice,
    sendRemoteCommand,
    generatePairingCode,
    pendingPairingCodes,
    canManageSystem,
    canDispatch,
  } = useAdminControl();

  const [searchQuery, setSearchQuery] = useState("");
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [pairingCodeInput, setPairingCodeInput] = useState("");
  const [newScreenName, setNewScreenName] = useState("");
  const [newScreenWarehouse, setNewScreenWarehouse] = useState("מחסן 4 החרש");
  const [newScreenManager, setNewScreenManager] = useState("אורן");
  const [selectedScreenFilter, setSelectedScreenFilter] = useState<"all" | "online" | "offline">(
    "all",
  );

  const filteredScreens = screens.filter((screen) => {
    const matchesSearch =
      screen.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      screen.warehouseLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      screen.branchManager.toLowerCase().includes(searchQuery.toLowerCase()) ||
      screen.ipAddress.includes(searchQuery);

    if (selectedScreenFilter === "online") return matchesSearch && screen.status === "online";
    if (selectedScreenFilter === "offline") return matchesSearch && screen.status === "offline";
    return matchesSearch;
  });

  const handleGenerateCode = () => {
    const code = generatePairingCode(newScreenWarehouse);
    setPairingCodeInput(code);
    toast.info(`נוצר קוד צימוד חדש: ${code} (תוקף: 15 דקות)`);
  };

  const handlePairSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingCodeInput) {
      toast.error("נא להזין קוד צימוד בן 6 ספרות");
      return;
    }

    const res = pairDevice(pairingCodeInput, newScreenName, newScreenWarehouse, newScreenManager);
    if (res.success) {
      toast.success(`המכשיר "${res.screen?.name}" צומד בהצלחה למערכת!`);
      setIsPairingModalOpen(false);
      setPairingCodeInput("");
      setNewScreenName("");
    } else {
      toast.error(res.error || "הצימוד נכשל");
    }
  };

  const handleRemoteRefresh = (screenId: string, screenName: string) => {
    sendRemoteCommand(screenId, "refresh");
    toast.success(`נשלחה פקודת ריענון למסך: ${screenName}`);
  };

  const handleToggleScreensaver = (
    screenId: string,
    currentForced: boolean,
    screenName: string,
  ) => {
    sendRemoteCommand(screenId, "toggle_screensaver");
    toast.success(
      currentForced
        ? `שומר המסך הופסק במסך: ${screenName}`
        : `הופעל שומר מסך כפוי במסך: ${screenName}`,
    );
  };

  const handleVolumeChange = (screenId: string, volume: number) => {
    sendRemoteCommand(screenId, "set_volume", volume);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                ניהול מסכי שידור וצימוד התקנים
              </h2>
              <p className="text-xs text-slate-400">
                צימוד מסכי Smart TV במחסנים, שליטה מרחוק ובקרת שמע
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPairingModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 transition-all border border-sky-400/30"
          >
            <Plus className="w-4 h-4" />
            <span>צימוד מסך חדש (6 ספרות)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-80 relative">
          <Search className="w-4 h-4 text-slate-500 absolute right-3 pointer-events-none" />
          <input
            type="text"
            placeholder="חיפוש לפי שם מסך, מחסן, IP או מנהל..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-9 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 self-stretch sm:self-auto">
          <button
            onClick={() => setSelectedScreenFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedScreenFilter === "all"
                ? "bg-slate-800 text-white font-bold"
                : "text-slate-400 hover:bg-slate-800/40"
            }`}
          >
            הכל ({screens.length})
          </button>
          <button
            onClick={() => setSelectedScreenFilter("online")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              selectedScreenFilter === "online"
                ? "bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-800/50"
                : "text-slate-400 hover:bg-slate-800/40"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>מחוברים ({screens.filter((s) => s.status === "online").length})</span>
          </button>
          <button
            onClick={() => setSelectedScreenFilter("offline")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              selectedScreenFilter === "offline"
                ? "bg-rose-950/80 text-rose-300 font-bold border border-rose-800/50"
                : "text-slate-400 hover:bg-slate-800/40"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>מנותקים ({screens.filter((s) => s.status === "offline").length})</span>
          </button>
        </div>
      </div>

      {/* Screen Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredScreens.map((screen) => {
          const isOnline = screen.status === "online";
          return (
            <div
              key={screen.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header: Title + Status */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-extrabold text-white tracking-tight">
                        {screen.name}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        {screen.appVersion}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>{screen.warehouseLocation}</span>
                      <span>&bull;</span>
                      <span className="text-sky-400">אחראי: {screen.branchManager}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                        isOnline
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`}
                      />
                      {isOnline ? "Online (מחובר)" : "Offline (מנותק)"}
                    </span>
                  </div>
                </div>

                {/* Device Tech Info */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs mb-4">
                  <div>
                    <span className="text-slate-500 block text-[10px]">כתובת IP ברשת:</span>
                    <span className="font-mono text-slate-300 font-medium">{screen.ipAddress}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">טוקן צימוד (Token):</span>
                    <span className="font-mono text-slate-400 text-[11px] truncate block">
                      {screen.deviceToken.slice(0, 16)}...
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">דגם המכשיר:</span>
                    <span className="text-slate-300 truncate block">
                      {screen.modelInfo || "Smart TV"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">סבב ברירת מחדל:</span>
                    <span className="text-amber-400 font-bold">
                      {screen.defaultRound === "all"
                        ? "כל הסבבים"
                        : screen.defaultRound === "round1"
                          ? "סבב 1 בלבד"
                          : "סבב 2 בלבד"}
                    </span>
                  </div>
                </div>

                {/* Live Controls: Volume + Screensaver */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      {screen.volume === 0 ? (
                        <VolumeX className="w-4 h-4 text-slate-500" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-sky-400" />
                      )}
                      <span>עוצמת סאונד וכריזה:</span>
                    </div>
                    <span className="font-mono font-bold text-sky-400">{screen.volume}%</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={screen.volume}
                    onChange={(e) => handleVolumeChange(screen.id, parseInt(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>
              </div>

              {/* Bottom Quick Commands Bar */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRemoteRefresh(screen.id, screen.name)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
                    title="פקודת רענון דפדפן מרחוק"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                    <span>ריענון מרחוק</span>
                  </button>

                  <button
                    onClick={() =>
                      handleToggleScreensaver(screen.id, screen.forcedScreensaver, screen.name)
                    }
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      screen.forcedScreensaver
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                    }`}
                  >
                    <Power className="w-3.5 h-3.5 text-amber-400" />
                    <span>{screen.forcedScreensaver ? "בטל שומר מסך" : "כפה שומר מסך"}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigate?.(`/admin/screens/${screen.id}`)}
                    className="px-3 py-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 text-xs font-bold border border-sky-800/50 transition-colors"
                  >
                    ערוך הגדרות &larr;
                  </button>

                  {canManageSystem && (
                    <button
                      onClick={() => {
                        if (confirm(`האם אתה בטוח שברצונך לבטל את צימוד המסך "${screen.name}"?`)) {
                          unpairDevice(screen.id);
                          toast.success(`צימוד המסך בוטל`);
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 transition-colors"
                      title="ביטול צימוד (Unpair)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pairing Modal */}
      {isPairingModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    צימוד מסך חכם (Device Pairing)
                  </h3>
                  <p className="text-xs text-slate-400">הזן את קוד הצימוד שמופיע במסך הטלוויזיה</p>
                </div>
              </div>
              <button
                onClick={() => setIsPairingModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePairSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  קוד צימוד (6 ספרות):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="לדוגמה: 742891"
                    value={pairingCodeInput}
                    onChange={(e) => setPairingCodeInput(e.target.value.replace(/[^0-9]/g, ""))}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center font-mono text-xl tracking-widest text-sky-400 font-black focus:outline-none focus:border-sky-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl border border-slate-700"
                    title="חולל קוד בדיקה זמני"
                  >
                    חולל קוד
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  הקוד נוצר בעת פתיחת המסך בנתיב <span className="font-mono text-sky-400">/tv</span>{" "}
                  ותקף ל-15 דקות.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">שם המסך:</label>
                <input
                  type="text"
                  placeholder="למשל: טלוויזיה מחסן 4 רציף העמסה"
                  value={newScreenName}
                  onChange={(e) => setNewScreenName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">שיוך מחסן:</label>
                  <select
                    value={newScreenWarehouse}
                    onChange={(e) => setNewScreenWarehouse(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="מחסן 4 החרש">מחסן 4 החרש</option>
                    <option value="מחסן 1 התלמיד">מחסן 1 התלמיד</option>
                    <option value="משרד הפצה ראשי">משרד הפצה ראשי</option>
                    <option value="עמדת ליקוט דרומית">עמדת ליקוט דרומית</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">מנהל אחראי:</label>
                  <input
                    type="text"
                    value={newScreenManager}
                    onChange={(e) => setNewScreenManager(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    placeholder="למשל: אורן, תמיר"
                  />
                </div>
              </div>

              <div className="p-3 bg-sky-950/40 border border-sky-800/40 rounded-xl text-xs text-sky-300 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  לאחר הצימוד יוקצה למסך Device Token ייעודי בטוח, והוא יקבל עדכונים ופקודות בזמן
                  אמת.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPairingModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-600/30 transition-all"
                >
                  השלם צימוד מכשיר
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
