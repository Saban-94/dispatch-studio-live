import { useState, useMemo } from 'react';
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
  ArrowRight,
  Filter,
  Warehouse,
  Boxes
} from 'lucide-react';
import type { Order } from '@/types/dispatch';
import { InventoryDemandCard } from './InventoryDemandCard';

interface PickerViewProps {
  orders: Order[];
  onUpdateStatus?: (orderId: string, newStatus: string) => void;
}

export function PickerView({ orders, onUpdateStatus }: PickerViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory'>('orders');

  // Filter orders for picker (active ones that need preparation or are ready)
  const relevantOrders = useMemo(() => {
    return orders.filter(order => {
      const isRelevantStatus = ['בהמתנה', 'בסידור עבודה', 'בהכנה', 'מוכן להעמסה'].includes(order.status || '');
      const matchesSearch = 
        (order.client || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.destination || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.id || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesWarehouse = selectedWarehouse === 'all' || order.warehouse === selectedWarehouse;

      return isRelevantStatus && matchesSearch && matchesWarehouse;
    });
  }, [orders, searchTerm, selectedWarehouse]);

  // Group by status
  const waitingOrders = relevantOrders.filter(o => o.status === 'בהמתנה' || o.status === 'בסידור עבודה');
  const preparingOrders = relevantOrders.filter(o => o.status === 'בהכנה');
  const readyOrders = relevantOrders.filter(o => o.status === 'מוכן להעמסה');

  const warehouses = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => {
      if (o.warehouse) set.add(o.warehouse);
    });
    return Array.from(set);
  }, [orders]);

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 text-foreground" dir="rtl">
      {/* Mobile Top Sticky Bar */}
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">ממשק ליקוט מגרש</h1>
          </div>
          <Badge variant="outline" className="px-2.5 py-1 text-xs font-semibold bg-secondary/50">
            {relevantOrders.length} הזמנות פעילות
          </Badge>
        </div>

        {/* Global Main Switcher: Orders vs Floor Inventory */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-xl border border-border/50">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>הזמנות לביצוע ({relevantOrders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'inventory'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Boxes className="h-4 w-4" />
            <span>צריכת מלאי מגרש</span>
          </button>
        </div>

        {/* Search and Filters - only in orders tab */}
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
                className="h-10 px-3 rounded-xl border border-border bg-background text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
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

      {/* Main Content Area */}
      <div className="p-4 flex-1">
        {activeTab === 'inventory' ? (
          <div className="space-y-4">
            <InventoryDemandCard orders={orders} />
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

            {/* Waiting Orders Content */}
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
                    onUpdateStatus={onUpdateStatus}
                  />
                ))
              )}
            </TabsContent>

            {/* Preparing Orders Content */}
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
                    onUpdateStatus={onUpdateStatus}
                  />
                ))
              )}
            </TabsContent>

            {/* Ready Orders Content */}
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
                    onUpdateStatus={onUpdateStatus}
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
        {/* Logistics Information */}
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

        {/* Product Breakdown Box */}
        {order.productsSummary && (
          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs font-medium leading-relaxed text-foreground whitespace-pre-wrap">
            {order.productsSummary}
          </div>
        )}

        {/* Action Button */}
        {onUpdateStatus && (
          <Button
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
