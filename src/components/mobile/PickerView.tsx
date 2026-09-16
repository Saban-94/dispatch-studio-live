import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Truck, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Search, 
  Volume2,
  VolumeX,
  Warehouse,
  Boxes
} from 'lucide-react';
import type { Order } from '@/types/dispatch';
import { InventoryDemandCard } from './InventoryDemandCard';

interface PickerViewProps {
  orders?: Order[];
  onUpdateStatus?: (orderId: string, newStatus: string) => void;
}

export function PickerView({ orders = [], onUpdateStatus }: PickerViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory'>('orders');

  // שליטה בטוחה בהשתקת שמע במובייל
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('picker_sound_muted') === 'true';
      }
    } catch {
      // במקרה של חסימת storage
    }
    return false;
  });

  const toggleSound = () => {
    setIsMuted(prev => {
      const next = !prev;
      try {
        localStorage.setItem('picker_sound_muted', String(next));
      } catch {}
      return next;
    });
  };

  // השמעת צליל אישור קצר ובטוח ללא קריסת דפדפן
  const playFeedbackSound = () => {
    if (isMuted) return;
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch {
      // נכשל בשקט כדי למנוע קריסת דף
    }
  };

  // סינון בטוח של הזמנות מול ערכים חסרים
  const safeOrders = useMemo(() => Array.isArray(orders) ? orders : [], [orders]);

  const relevantOrders = useMemo(() => {
    return safeOrders.filter(order => {
      if (!order) return false;
      const isRelevantStatus = ['בהמתנה', 'בסידור עבודה', 'בהכנה', 'מוכן להעמסה'].includes(order.status || '');
      const matchesSearch = 
        (order.client || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.destination || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesWarehouse = selectedWarehouse === 'all' || order.warehouse === selectedWarehouse;

      return isRelevantStatus && matchesSearch && matchesWarehouse;
    });
  }, [safeOrders, searchTerm, selectedWarehouse]);

  const waitingOrders = relevantOrders.filter(o => o.status === 'בהמתנה' || o.status === 'בסידור עבודה');
  const preparingOrders = relevantOrders.filter(o => o.status === 'בהכנה');
  const readyOrders = relevantOrders.filter(o => o.status === 'מוכן להעמסה');

  const warehouses = useMemo(() => {
    const set = new Set<string>();
    safeOrders.forEach(o => {
      if (o?.warehouse) set.add(o.warehouse);
    });
    return Array.from(set);
  }, [safeOrders]);

  const handleStatusClick = (orderId: string, nextStatus: string) => {
    playFeedbackSound();
    if (onUpdateStatus) {
      onUpdateStatus(orderId, nextStatus);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 text-foreground" dir="rtl">
      {/* סרגל עליון מקובע למובייל */}
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border p-3.5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Package className="h-6 w-6 text-primary shrink-0" />
            <div className="truncate">
              <h1 className="text-lg font-bold tracking-tight truncate">ממשק ליקוט מגרש</h1>
              <p className="text-[11px] text-muted-foreground">ח. סבן · סנכרון חי</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* כפתור שליטה בצליל/השתקה */}
            <Button
              type="button"
              variant={isMuted ? "outline" : "secondary"}
              size="sm"
              onClick={toggleSound}
              className={`h-9 px-2.5 rounded-xl text-xs font-bold gap-1.5 border ${
                isMuted 
                  ? 'border-rose-500/40 text-rose-500 bg-rose-500/10' 
                  : 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
              }`}
              title={isMuted ? "צליל מושתק - לחץ להפעלה" : "צליל פעיל - לחץ להשתקה"}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              <span>{isMuted ? "מושתק" : "פעיל"}</span>
            </Button>

            <Badge variant="outline" className="px-2 py-1 text-xs font-semibold bg-secondary/50">
              {relevantOrders.length}
            </Badge>
          </div>
        </div>

        {/* מתג מעבר ראשי: הזמנות לביצוע מול צריכת מלאי */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-xl border border-border/50">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>הזמנות לביצוע ({relevantOrders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'inventory'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>צריכת מלאי מגרש</span>
          </button>
        </div>

        {/* חיפוש וסינון מחסן */}
        {activeTab === 'orders' && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש לקוח, יעד, מספר..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-9 h-10 bg-background text-sm rounded-xl"
              />
            </div>
            {warehouses.length > 0 && (
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="h-10 px-2.5 rounded-xl border border-border bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">כל המחסנים</option>
                {warehouses.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* גוף המסך */}
      <div className="p-4 flex-1">
        {activeTab === 'inventory' ? (
          <div className="space-y-4">
            <InventoryDemandCard orders={safeOrders} />
          </div>
        ) : (
          <Tabs defaultValue="preparing" className="w-full">
            <TabsList className="grid grid-cols-3 w-full h-11 p-1 bg-muted/80 rounded-xl mb-4">
              <TabsTrigger value="waiting" className="rounded-lg text-xs font-bold data-[state=active]:shadow-sm">
                ממתין ({waitingOrders.length})
              </TabsTrigger>
              <TabsTrigger value="preparing" className="rounded-lg text-xs font-bold data-[state=active]:shadow-sm">
                בהכנה ({preparingOrders.length})
              </TabsTrigger>
              <TabsTrigger value="ready" className="rounded-lg text-xs font-bold data-[state=active]:shadow-sm">
                מוכן ({readyOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="waiting" className="space-y-3 mt-0 focus-visible:outline-none">
              {waitingOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm font-medium">
                  אין הזמנות ממתינות
                </div>
              ) : (
                waitingOrders.map(order => (
                  <OrderPickingCard 
                    key={order.id} 
                    order={order} 
                    actionText="התחל ליקוט" 
                    nextStatus="בהכנה"
                    onUpdateStatus={handleStatusClick}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="preparing" className="space-y-3 mt-0 focus-visible:outline-none">
              {preparingOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm font-medium">
                  אין הזמנות בעבודה כרגע
                </div>
              ) : (
                preparingOrders.map(order => (
                  <OrderPickingCard 
                    key={order.id} 
                    order={order} 
                    actionText="סיום ליקוט - מוכן" 
                    nextStatus="מוכן להעמסה"
                    variant="primary"
                    onUpdateStatus={handleStatusClick}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="ready" className="space-y-3 mt-0 focus-visible:outline-none">
              {readyOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm font-medium">
                  אין הזמנות מוכנות להעמסה
                </div>
              ) : (
                readyOrders.map(order => (
                  <OrderPickingCard 
                    key={order.id} 
                    order={order} 
                    actionText="סמן כהועמס" 
                    nextStatus="בהעמסה"
                    variant="success"
                    onUpdateStatus={handleStatusClick}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

interface OrderPickingCardProps {
  order: Order;
  actionText: string;
  nextStatus: string;
  variant?: 'default' | 'primary' | 'success';
  onUpdateStatus?: (orderId: string, newStatus: string) => void;
}

function OrderPickingCard({ 
  order, 
  actionText, 
  nextStatus, 
  variant = 'default',
  onUpdateStatus 
}: OrderPickingCardProps) {
  return (
    <Card className="border border-border/80 shadow-sm rounded-2xl overflow-hidden bg-card">
      <CardHeader className="p-3.5 pb-2 border-b border-border/40 bg-muted/20">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                #{order.id}
              </span>
              {order.time && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {order.time}
                </span>
              )}
            </div>
            <CardTitle className="text-base font-bold text-foreground">
              {order.client}
            </CardTitle>
          </div>

          <Badge 
            variant="outline"
            className={`text-xs px-2.5 py-0.5 font-bold ${
              order.deliveryType === 'מנוף' 
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                : 'bg-secondary text-foreground'
            }`}
          >
            {order.deliveryType || 'רגיל'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">{order.destination || 'איסוף עצמי'}</span>
          </div>
          {order.warehouse && (
            <div className="flex items-center gap-1.5 truncate">
              <Warehouse className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="truncate">{order.warehouse}</span>
            </div>
          )}
        </div>

        {order.productsSummary && (
          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs font-medium leading-relaxed text-foreground whitespace-pre-wrap">
            {order.productsSummary}
          </div>
        )}

        {onUpdateStatus && (
          <Button
            type="button"
            onClick={() => onUpdateStatus(order.id, nextStatus)}
            className={`w-full h-11 rounded-xl text-xs font-bold gap-2 shadow-sm transition-all active:scale-[0.98] ${
              variant === 'primary' 
                ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                : variant === 'success'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{actionText}</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
