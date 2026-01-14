'use client';

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

export default function BeamerOverview() {
  const { t } = useLanguage();
  const topOrdered = useQuery(api.drinks.topOrderedDrinks);
  const topExpensive = useQuery(api.drinks.topExpensiveDrinks);
  const topCheapest = useQuery(api.drinks.topCheapestDrinks);
  const topParties = useQuery(api.drinks.topPartiesBySavings);

  const loading = !topOrdered || !topExpensive || !topCheapest || !topParties;

  if (loading) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center text-white text-3xl">
        {t('loading') || 'Loading...'}
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-gray-900 p-8 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-serif font-bold mb-2 tracking-wider">Bar Overview</h1>
          <p className="text-gray-400 text-xl">Real-time Rankings & Statistics</p>
        </div>

        {/* 2x2 Grid Layout */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Top 5 Ordered Drinks */}
          <div className="bg-slate-800/60 border-2 border-blue-500/40 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Target className="h-8 w-8 text-blue-400" />
              <h2 className="text-3xl font-bold">Top Ordered</h2>
            </div>
            <div className="space-y-4">
              {(topOrdered || []).map((drink, idx) => (
                <div key={drink.drinkId} className="flex items-center justify-between p-4 bg-slate-900/60 rounded-lg hover:bg-slate-800/60 transition">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold text-blue-400 w-12 text-center">#{idx + 1}</div>
                    <div>
                      <p className="text-xl font-semibold">{drink.drinkName}</p>
                      <p className="text-gray-400 text-sm">Orders: {drink.quantity}</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-blue-300">{drink.quantity}x</div>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 Most Expensive */}
          <div className="bg-slate-800/60 border-2 border-red-500/40 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="h-8 w-8 text-red-400" />
              <h2 className="text-3xl font-bold">Most Expensive</h2>
            </div>
            <div className="space-y-4">
              {(topExpensive || []).map((drink, idx) => (
                <div key={String(drink._id)} className="flex items-center justify-between p-4 bg-slate-900/60 rounded-lg hover:bg-slate-800/60 transition">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold text-red-400 w-12 text-center">#{idx + 1}</div>
                    <div>
                      <p className="text-xl font-semibold">{drink.name}</p>
                      <p className="text-gray-400 text-sm">
                        €{drink.regularPrice.toFixed(2)} → €{drink.currentPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-300">+{drink.markupPercent.toFixed(0)}%</div>
                    <div className="text-sm text-gray-400">+€{drink.markup.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top 5 Cheapest */}
          <div className="bg-slate-800/60 border-2 border-green-500/40 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendingDown className="h-8 w-8 text-green-400" />
              <h2 className="text-3xl font-bold">Cheapest Deals</h2>
            </div>
            <div className="space-y-4">
              {(topCheapest || []).map((drink, idx) => (
                <div key={String(drink._id)} className="flex items-center justify-between p-4 bg-slate-900/60 rounded-lg hover:bg-slate-800/60 transition">
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold text-green-400 w-12 text-center">#{idx + 1}</div>
                    <div>
                      <p className="text-xl font-semibold">{drink.name}</p>
                      <p className="text-gray-400 text-sm">
                        €{drink.regularPrice.toFixed(2)} → €{drink.currentPrice.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-300">-{drink.discountPercent.toFixed(0)}%</div>
                    <div className="text-sm text-gray-400">-€{drink.discount.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top 10 Parties by Savings */}
          <div className="bg-slate-800/60 border-2 border-yellow-500/40 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Target className="h-8 w-8 text-yellow-400" />
              <h2 className="text-3xl font-bold">Top Savers</h2>
            </div>
            <div className="space-y-3">
              {(topParties || []).map((party, idx) => (
                <div key={party.partyId} className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg hover:bg-slate-800/60 transition">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-bold text-yellow-400 w-10 text-center">#{idx + 1}</div>
                    <div>
                      <p className="font-semibold text-lg">{party.partyName}</p>
                      <p className="text-gray-400 text-xs">{party.orderCount} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-yellow-300">€{party.totalSavings.toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-12">
          <p>Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
}
