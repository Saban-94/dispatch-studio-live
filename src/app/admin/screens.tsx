/**
 * Admin Screensaver Control Interface
 * Location: src/app/admin/screens.tsx
 *
 * Provides dedicated dashboard and control panel for screensaver carousel,
 * slide dwell times, warehouse branch filters, and product inventory prioritization.
 */

import { ScreensaverAdminPanel } from "@/components/admin/ScreensaverAdminPanel";
import { AdminControlProvider, useAdminControl } from "@/context/AdminControlContext";

export { ScreensaverAdminPanel, AdminControlProvider, useAdminControl };

export default function AdminScreensPage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8 text-foreground font-sans rtl" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <ScreensaverAdminPanel />
      </div>
    </div>
  );
}
