"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, BarChart3, DollarSign, Package, Scale, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const stats = useQuery(api.adminQueries.getSystemStats);
  const { useSettings } = require('@/contexts/SettingsContext')
  const settingsHook = useSettings()
  const feePctLabel = settingsHook?.tradingFeeRate !== undefined ? `${Math.round(settingsHook.tradingFeeRate * 100)}%` : '1%'
  const topDrinks = useQuery(api.adminQueries.getTopDrinks);

  if (!stats) {
    return <div className="text-center py-8">{t('loading') || 'Loading...'}</div>;
  }

  return (
    <div className="space-y-6 p-4">
      <Card className="bg-slate-900/80 border-emerald-500/40">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('house_edge') || 'House gain vs regular'}</span>
            <Badge variant={stats.orders.houseGain.value >= 0 ? "default" : "destructive"}>
              €{stats.orders.houseGain.value.toFixed(2)} ({stats.orders.houseGain.percent.toFixed(2)}%)
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-300">
            {(t('house_gain_line') || 'Comparing current revenue to regular pricing incl. 1% fee').replace('1%', feePctLabel)}
          </p>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-gray-400">{t('actual_revenue') || 'Actual revenue'}</p>
              <p className="text-lg font-semibold">€{stats.orders.totalRevenue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400">{t('regular_revenue') || 'Regular revenue'}</p>
              <p className="text-lg font-semibold">€{stats.orders.regularRevenue.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-400">{t('fees') || 'Fees'}</p>
              <p className="text-lg font-semibold">€{stats.orders.totalFees.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Status */}
      <Card className="bg-slate-900/80 border-blue-500/40">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('market_status') || 'Market Status'}</span>
            <Badge variant={stats.market.active ? "default" : "destructive"}>
              {stats.market.active ? (t('active') || 'ACTIVE') : (t('stopped') || 'STOPPED')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-400">{t('tick_count') || 'Tick Count'}</p>
              <p className="text-2xl font-bold">{stats.market.tickCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">{t('last_tick') || 'Last Tick'}</p>
              <p className="text-lg">
                {stats.market.lastTickAt 
                  ? new Date(stats.market.lastTickAt).toLocaleTimeString() 
                  : (t('never') || 'Never')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Parties */}
        <Card className="bg-slate-900/80 border-blue-500/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('parties') || 'Parties'}</CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.parties.total}</div>
            <p className="text-xs text-gray-400 mt-1">
              {stats.parties.open} {t('open') || 'open'} · {stats.parties.closed} {t('closed') || 'closed'}
            </p>
          </CardContent>
        </Card>
        {/* Orders */}
        <Card className="bg-slate-900/80 border-blue-500/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('orders') || 'Orders'}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orders.total}</div>
            <p className="text-xs text-gray-400 mt-1">
              {stats.orders.finalized} {t('finalized') || 'finalized'} · {stats.orders.pending} {t('pending') || 'pending'}
            </p>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="bg-slate-900/80 border-blue-500/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('total_revenue') || 'Total Revenue'}</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.orders.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-gray-400 mt-1">
              {t('regular_revenue') || 'Regular'}: €{stats.orders.regularRevenue.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {t('fees') || 'Fees'}: €{stats.orders.totalFees.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        {/* Drinks */}
        <Card className="bg-slate-900/80 border-blue-500/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('drinks') || 'Drinks'}</CardTitle>
            <Package className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.drinks.total}</div>
            <p className="text-xs text-gray-400 mt-1">
              {stats.drinks.active} {t('active') || 'active'} · {stats.drinks.inactive} {t('inactive') || 'inactive'}
            </p>
          </CardContent>
        </Card>

        {/* R2O Orders */}
        <Card className="bg-slate-900/80 border-blue-500/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('r2o_orders') || 'R2O Orders'}</CardTitle>
            <Activity className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.r2o.totalOrders}</div>
            <p className="text-xs text-gray-400 mt-1">
              {stats.r2o.submitted} {t('submitted') || 'submitted'} · {stats.r2o.failed} {t('failed') || 'failed'}
            </p>
          </CardContent>
        </Card>

        {/* Active Members */}
        <Card className="bg-slate-900/80 border-blue-500/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('active_members') || 'Active Members'}</CardTitle>
            <Users className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.members.active}</div>
            <p className="text-xs text-gray-400 mt-1">
              {stats.members.total} {t('total_members') || 'total members'}
            </p>
          </CardContent>
        </Card>

        {/* House Gain */}
        <Card className="bg-slate-900/80 border-emerald-500/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('house_edge') || 'House Gain'}</CardTitle>
            <Scale className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.orders.houseGain.value.toFixed(2)}</div>
            <p className="text-xs text-gray-400 mt-1">{stats.orders.houseGain.percent.toFixed(2)}%</p>
          </CardContent>
        </Card>

        {/* Average Order Value */}
        <Card className="bg-slate-900/80 border-blue-500/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('avg_order_value') || 'Avg Order Value'}</CardTitle>
            <BarChart3 className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.orders.avgOrderValue.toFixed(2)}</div>
            <p className="text-xs text-gray-400 mt-1">{t('finalized') || 'finalized'}: {stats.orders.finalized}</p>
          </CardContent>
        </Card>

        {/* Orders per Party */}
        <Card className="bg-slate-900/80 border-blue-500/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('orders_per_party') || 'Orders per party'}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-pink-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.orders.avgOrdersPerParty.toFixed(2)}</div>
            <p className="text-xs text-gray-400 mt-1">{t('parties') || 'Parties'}: {stats.parties.total}</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Drinks */}
      {topDrinks && topDrinks.length > 0 && (
        <Card className="bg-slate-900/80 border-blue-500/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('top_drinks') || 'Top 10 Drinks'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topDrinks.map((drink, index) => (
                <div key={drink.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                      {index + 1}
                    </Badge>
                    <span className="font-medium">{drink.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{drink.quantity} {t('sold') || 'sold'}</div>
                    <div className="text-sm text-gray-400">€{drink.revenue.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
