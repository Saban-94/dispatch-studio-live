import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative flex h-9 w-16 items-center rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40",
        isDark ? "bg-card border border-border/80" : "bg-slate-200 border border-slate-300",
        className
      )}
      title={isDark ? "מעבר למצב יום (בהיר)" : "מעבר למצב לילה (כהה)"}
      aria-label="החלף ערכת נושא"
    >
      {/* אייקונים ברקע של המתג */}
      <div className="flex w-full justify-between px-1 text-xs select-none pointer-events-none">
        <Sun className={cn("size-3.5 transition-opacity", isDark ? "opacity-30 text-muted-foreground" : "opacity-100 text-amber-500")} />
        <Moon className={cn("size-3.5 transition-opacity", isDark ? "opacity-100 text-primary" : "opacity-30 text-muted-foreground")} />
      </div>

      {/* העיגול הנע עם אנימציית קפיץ חלקה */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={cn(
          "absolute top-1 bottom-1 grid size-7 place-items-center rounded-full shadow-md backdrop-blur-sm",
          isDark 
            ? "right-1 bg-primary text-primary-foreground" 
            : "left-1 bg-white text-amber-500 border border-slate-200"
        )}
      >
        {isDark ? (
          <Moon className="size-3.5 stroke-[2.5]" />
        ) : (
          <Sun className="size-3.5 stroke-[2.5]" />
        )}
      </motion.div>
    </button>
  );
}
