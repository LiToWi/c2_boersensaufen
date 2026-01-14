"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import LoadingAnimation from "@/components/LoadingAnimation";
import { Clock, CheckCircle2, PlayCircle, Package, Archive, Eye, EyeOff } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";

type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'archived';

type OrderItem = {
  _id: Id<'orderItems'>;
  partyId: Id<'parties'>;
  drinkName: string;
  quantity: number;
  barStatus: string;
  partyName: string;
  tableName: string;
  finalizedAt?: number;
  createdAt: number;
  barStatusUpdatedAt?: number;
};

export default function BarDashboard() {
  const { t } = useLanguage();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showArchive, setShowArchive] = useState(false);

  // Access control: only bar and admin can access this page
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/login");
      return;
    }

    const userRole = session.user?.name?.toLowerCase() || "";
    const isBar = userRole === "bar";
    const isAdmin = userRole === "admin";

    if (!isBar && !isAdmin) {
      router.push("/dashboard/user");
    }
  }, [session, status, router]);

  // Show loading while checking access
  if (status === "loading" || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingAnimation />
      </div>
    );
  }

  const userRole = session.user?.name?.toLowerCase() || "";
  const isBar = userRole === "bar";
  const isAdmin = userRole === "admin";

  // Don't render anything if user doesn't have access
  if (!isBar && !isAdmin) {
    return null;
  }
  type DragPayload =
    | { type: 'item'; item: OrderItem }
    | { type: 'group'; partyId: Id<'parties'>; items: OrderItem[] };
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  
  const updateStatus = useMutation(api.barOrders.updateOrderStatus);
  const autoArchive = useMutation(api.barOrders.autoArchiveOldOrders);
  
  const allOrders = useQuery(api.barOrders.getBarOrders, {});
  const stats = useQuery(api.barOrders.getBarStats);
  const timingStats = useQuery(api.barOrders.getBarTimingStats);

  // Auto-archive completed orders every minute
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await autoArchive();
      } catch (error) {
        console.error('Failed to auto-archive orders:', error);
      }
    }, 60000); // every minute

    return () => clearInterval(interval);
  }, [autoArchive]);

  // Group orders by status
  const ordersByStatus: Record<OrderStatus, OrderItem[]> = {
    pending: (allOrders?.filter((o) => o.barStatus === 'pending') || []) as OrderItem[],
    in_progress: (allOrders?.filter((o) => o.barStatus === 'in_progress') || []) as OrderItem[],
    completed: (allOrders?.filter((o) => o.barStatus === 'completed') || []) as OrderItem[],
    archived: (allOrders?.filter((o) => o.barStatus === 'archived') || []) as OrderItem[],
  };

  const handleDragStartItem = (e: React.DragEvent, order: OrderItem) => {
    setDragPayload({ type: 'item', item: order });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragStartGroup = (e: React.DragEvent, groupItems: OrderItem[]) => {
    if (!groupItems || groupItems.length === 0) return;
    setDragPayload({ type: 'group', partyId: groupItems[0].partyId, items: groupItems });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: OrderStatus) => {
    e.preventDefault();
    if (!dragPayload) return;

    try {
      if (dragPayload.type === 'item') {
        await updateStatus({ orderItemId: dragPayload.item._id, status: newStatus });
      } else {
        const ids = dragPayload.items.map((it) => it._id);
        await Promise.all(ids.map((id) => updateStatus({ orderItemId: id, status: newStatus })));
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
    } finally {
      setDragPayload(null);
    }
  };

  const getUrgencyColor = (order: OrderItem) => {
    const now = Date.now();
    const orderTime = order.finalizedAt || order.createdAt;
    const ageMinutes = (now - orderTime) / 60000; // milliseconds to minutes

    // Color gradient based on age:
    // 0-2 min: green
    // 2-5 min: yellow  
    // 5-10 min: orange
    // 10+ min: red
    if (ageMinutes < 2) {
      return 'border-green-500 bg-green-500/20 shadow-green-500/50';
    } else if (ageMinutes < 5) {
      return 'border-yellow-500 bg-yellow-500/20 shadow-yellow-500/50';
    } else if (ageMinutes < 10) {
      return 'border-orange-500 bg-orange-500/20 shadow-orange-500/50';
    } else {
      return 'border-red-500 bg-red-500/20 shadow-red-500/50 animate-pulse';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'in_progress':
        return 'border-blue-500 bg-blue-500/10';
      case 'completed':
        return 'border-green-500 bg-green-500/10';
      case 'archived':
        return 'border-gray-500 bg-gray-500/10';
      default:
        return 'border-gray-500 bg-gray-500/10';
    }
  };

  const getZoneTitle = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return t('new_orders') || 'New Orders';
      case 'in_progress':
        return t('in_work') || 'In Work';
      case 'completed':
        return t('finished') || 'Finished';
      case 'archived':
        return t('archive') || 'Archive';
      default:
        return status;
    }
  };

  const getZoneIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5" />;
      case 'in_progress':
        return <PlayCircle className="h-5 w-5" />;
      case 'completed':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'archived':
        return <Archive className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  // Helpers for grouping by party / order time
  type PartyGroup = {
    partyId: Id<'parties'>;
    partyName: string;
    tableName: string;
    items: OrderItem[];
    status: OrderStatus;
  };

  const groupOrders = (orders: OrderItem[], status: OrderStatus): PartyGroup[] => {
    const map = new Map<string, PartyGroup>();
    const useOrderTimeKey = status === 'completed' || status === 'archived';
    for (const o of orders) {
      const orderTs = o.finalizedAt || o.createdAt;
      const key = useOrderTimeKey ? `${String(o.partyId)}|${String(orderTs)}` : String(o.partyId);
      const existing = map.get(key);
      if (existing) {
        existing.items.push(o);
      } else {
        map.set(key, {
          partyId: o.partyId,
          partyName: o.partyName,
          tableName: o.tableName,
          items: [o],
          status,
        });
      }
    }
    // Stable order: by oldest item in group (FIFO)
    return Array.from(map.values()).sort((a, b) => {
      const oldestA = Math.min(...a.items.map(i => (i.finalizedAt || i.createdAt)));
      const oldestB = Math.min(...b.items.map(i => (i.finalizedAt || i.createdAt)));
      return oldestA - oldestB;
    });
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const getOrderAge = (order: OrderItem) => {
    const now = Date.now();
    const orderTime = order.finalizedAt || order.createdAt;
    return now - orderTime;
  };

  const renderOrderCard = (order: OrderItem) => {
    const orderAge = getOrderAge(order);
    const isFinished = order.barStatus === 'completed' || order.barStatus === 'archived';
    const urgencyColor = isFinished
      ? 'border-gray-600 bg-gray-600/10'
      : (order.barStatus === 'pending' || order.barStatus === 'in_progress'
          ? getUrgencyColor(order)
          : getStatusColor(order.barStatus));

    return (
      <div
        key={order._id}
        draggable
        onDragStart={(e) => handleDragStartItem(e, order)}
        className={`p-3 rounded-lg border-2 cursor-move hover:shadow-xl transition-all shadow-md ${
          urgencyColor
        } ${dragPayload?.type === 'item' && dragPayload.item._id === order._id ? 'opacity-50' : 'opacity-100'}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-lg font-bold text-blue-400">{order.quantity}x</span>
            <span className="font-semibold">{order.drinkName}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            <span className="font-mono">{formatTime(orderAge)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderPartyGroup = (group: PartyGroup) => {
    // Derive urgency from the oldest item in the group (only for pending/in_progress)
    const oldest = group.items.reduce((min, i) => {
      const ts = i.finalizedAt || i.createdAt;
      return ts < min ? ts : min;
    }, Infinity as number);
    const pseudoOrder: OrderItem = {
      ...group.items[0],
      createdAt: oldest,
      finalizedAt: oldest,
    };
    // Use grey for finished/archived, urgency color for pending/in_progress
    const isFinished = group.status === 'completed' || group.status === 'archived';
    const bannerColor = isFinished
      ? 'border-gray-600 bg-gray-600/10'
      : getUrgencyColor(pseudoOrder);

    // Totals for quick glance
    const totalItems = group.items.length;
    const totalDrinks = group.items.reduce((sum, i) => sum + i.quantity, 0);

    const isDraggingThisGroup =
      dragPayload?.type === 'group' && String(dragPayload.partyId) === String(group.partyId);

    return (
      <div
        key={`${String(group.partyId)}-${oldest}`}
        draggable
        onDragStart={(e) => handleDragStartGroup(e, group.items)}
        className={`rounded-xl border-2 ${bannerColor} bg-opacity-30 cursor-grab active:cursor-grabbing ${isDraggingThisGroup ? 'opacity-60' : ''}`}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold">{group.partyName}</span>
            <span className="text-sm text-gray-400">• {t('table') || 'Table'} {group.tableName}</span>
            <span className="text-xs text-gray-500">• {new Date(oldest).toLocaleTimeString()}</span>
          </div>
          <div className="text-sm text-gray-300">
            {totalItems} {t('orders') || 'Orders'} • {totalDrinks}×
          </div>
        </div>
        <div className="p-3 space-y-3">
          {group.items.map(renderOrderCard)}
        </div>
      </div>
    );
  };

  const renderZone = (status: OrderStatus, orders: OrderItem[]) => (
    <div
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, status)}
      className={`flex-1 min-h-[500px] p-4 rounded-lg border-2 border-dashed ${
        dragPayload ? 'border-blue-500 bg-blue-500/5' : 'border-gray-700 bg-gray-900/40'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {getZoneIcon(status)}
          <h3 className="text-xl font-bold">{getZoneTitle(status)}</h3>
          <Badge variant="secondary">{orders.length}</Badge>
        </div>
      </div>
      <div className="space-y-3">
        {groupOrders(orders, status).map((g) => renderPartyGroup(g))}
        {orders.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            {t('no_orders') || 'No orders'}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-4 h-screen overflow-hidden flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-blue-600" />
          <h2 className="text-4xl font-bold">{t('bar_dashboard') || 'Bar Dashboard'}</h2>
        </div>
        <Button
          onClick={() => setShowArchive(!showArchive)}
          variant="outline"
          className="gap-2"
        >
          {showArchive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showArchive ? (t('hide_archive') || 'Hide Archive') : (t('show_archive') || 'Show Archive')}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="space-y-4">
          {/* Count Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-yellow-900/40 border-yellow-500/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {t('new_orders') || 'New'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.pending}</div>
              </CardContent>
            </Card>

            <Card className="bg-blue-900/40 border-blue-500/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <PlayCircle className="h-4 w-4" />
                  {t('in_work') || 'In Work'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.inProgress}</div>
              </CardContent>
            </Card>

            <Card className="bg-green-900/40 border-green-500/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('finished') || 'Finished'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.completed}</div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/40 border-gray-500/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  {t('archive') || 'Archive'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.archived}</div>
              </CardContent>
            </Card>
          </div>

          {/* Timing Stats */}
          {timingStats && (
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-slate-800/60 border-slate-600/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-gray-400">
                    {t('avg_completion') || 'Avg. Completion Time'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">
                    {formatTime(timingStats.avgCompletionTimeMs)}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/60 border-slate-600/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-gray-400">
                    {t('finished_per_hour') || 'Finished per Hour'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">
                    {timingStats.finishedPerHour ?? 0}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Drag and Drop Zones */}
      <div className="flex-1 overflow-hidden">
        <div className={`grid gap-4 h-full ${showArchive ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {renderZone('pending', ordersByStatus.pending)}
          {renderZone('in_progress', ordersByStatus.in_progress)}
          {renderZone('completed', ordersByStatus.completed)}
          {showArchive && renderZone('archived', ordersByStatus.archived)}
        </div>
      </div>
    </div>
  );
}
