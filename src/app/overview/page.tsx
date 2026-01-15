'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

export default function OverviewPage() {
  const { t, lang } = useLanguage();
  const topExpensive = useQuery(api.drinks.topExpensiveDrinks);
  const topCheapest = useQuery(api.drinks.topCheapestDrinks);
  const topParties = useQuery(api.drinks.topPartiesBySavings);
  const currentEvent = useQuery(api.events.getCurrentEvent);
  const [countdown, setCountdown] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Update timestamp whenever data changes
  useEffect(() => {
    if (topExpensive && topCheapest && topParties) {
      setLastUpdate(new Date());
    }
  }, [topExpensive, topCheapest, topParties]);

  useEffect(() => {
    // Only run countdown if there's an active event
    if (!currentEvent) {
      setCountdown('');
      return;
    }

    const intervalMs = 15 * 60 * 1000;
    const format = (ms: number) => {
      const totalSec = Math.max(0, Math.floor(ms / 1000));
      const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
      const s = (totalSec % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    };
    const tick = () => {
      const now = Date.now();
      const nextIn = intervalMs - (now % intervalMs);
      setCountdown(format(nextIn));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [currentEvent]);

  const loading = !topExpensive || !topCheapest || !topParties || currentEvent === undefined;

  if (loading) {
    return (
      <div className="w-full h-screen bg-gray-900 flex items-center justify-center text-white text-3xl">
        {t('loading') || 'Loading...'}
      </div>
    );
  }

  const eventText = currentEvent ? (lang === 'de' ? currentEvent.textDe : currentEvent.textEn) : '';

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-gray-900 p-8 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-serif font-bold mb-2 tracking-wider">Bar {t('nav_overview')}</h1>
          <p className="text-gray-400 text-xl">{t('real_time_rankings_statistics')}</p>
        </div>

        {/* Current Event Banner */}
        <div className="mb-8 rounded-xl p-8 border-4 shadow-2xl">
          {currentEvent ? (
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-lg p-6 border-4 border-amber-400">
              <div className="text-center">
                <div className="text-5xl mb-2">🔥</div>
                <h2 className="text-3xl font-bold mb-1 text-white drop-shadow-lg">{currentEvent.title}</h2>
                <p className="text-4xl font-semibold text-white mb-3">{eventText}</p>
                <div className="mt-4 text-white/90 text-lg font-mono">
                  {t('next_event_in', 'Next event in')}: {countdown}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 rounded-lg p-6 border-4 border-slate-500">
              <div className="text-center">
                <div className="text-5xl mb-2">📊</div>
                <h2 className="text-3xl font-bold mb-1 text-white drop-shadow-lg">{t('market_active', 'Market Active')}</h2>
                <p className="text-2xl text-white/80">{t('no_event_active', 'No special event at the moment')}</p>
              </div>
            </div>
          )}
        </div>

        {/* 3 Column Grid Layout */}
        <div className="grid grid-cols-3 gap-8 mb-8">
          {/* Top 5 Most Expensive */}
          <div className="bg-slate-800/60 border-2 border-red-500/40 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="h-8 w-8 text-red-400" />
              <h2 className="text-3xl font-bold">{t('most_expensive', 'Most Expensive')}</h2>
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
              <h2 className="text-3xl font-bold">{t('cheapest_deals', 'Cheapest Deals')}</h2>
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
              <h2 className="text-3xl font-bold">{t('top_savers', 'Top Savers')}</h2>
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
          <p>Last updated: {lastUpdate.toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
}
