'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParty } from '@/contexts/PartyContext'
import { useSession } from 'next-auth/react'
import { Star, ChevronDown } from 'lucide-react'
import dynamic from 'next/dynamic'
const DrinkDetailCard = dynamic(() => import('@/components/DrinkDetailCard'), { ssr: false })

type Drink = {
  _id?: string;
  r2oId?: string;
  name?: string;
  currentPrice?: number;
  regularPrice?: number;
  lowBoundPrice?: number;
  priority?: number;
  categoryId?: string;
  active?: boolean;
};

type Category = {
  _id: string;
  name: string;
};

export default function DrinksList() {
  const { t } = useLanguage();
  const drinks = useQuery(api.drinks.listDrinks);
  const categories = useQuery(api.categories.listCategories);
  const [selectedCategory] = useState<string | null>(null);
  const { currentParty, currentTable } = useParty()
  const { data: session } = useSession()
  const [favorites, setFavorites] = useState<Record<string, any>>({})
  const [detail, setDetail] = useState<null | { id: string; name?: string; price?: number; regularPrice?: number }>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const toggleGroup = (g: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [g]: !prev[g] }));
  }

  const loading = !drinks || !categories;

  const categoriesById = useMemo(() => {
    const map: Record<string, string> = {};
    if (!categories) return map;
    for (const c of categories as Category[]) {
      map[c._id] = c.name;
    }
    return map;
  }, [categories]);

  const visibleDrinks = useMemo(() => {
    if (!drinks) return [] as Drink[];
    return (drinks as Drink[])
      .filter((d) => d && (d.active === undefined || d.active === true))
      .filter((d) => {
        if (!selectedCategory) return true;
        return d.categoryId === selectedCategory;
      })
      .sort((a, b) => {
        const pa = a.priority ?? 0;
        const pb = b.priority ?? 0;
        if (pb !== pa) return pb - pa;
        const na = a.name ?? '';
        const nb = b.name ?? '';
        return na.localeCompare(nb);
      });
  }, [drinks, selectedCategory]);

  // Group by category name
  const grouped = useMemo(() => {
    const g: Record<string, Drink[]> = {};
    for (const d of visibleDrinks) {
      const catName = d.categoryId ? (categoriesById[d.categoryId] ?? t('ungrouped')) : t('ungrouped');
      if (!g[catName]) g[catName] = [];
      g[catName].push(d);
    }
    return g;
  }, [visibleDrinks, categoriesById, t]);

  // Party-scoped favorites: key per currentParty or currentTable, but only if logged in
  const favoritesKey = useMemo(() => {
    if (!session) return null // Require login
    const id = currentParty ?? currentTable
    return id ? `favoriteDrinks:${id}` : null
  }, [currentParty, currentTable, session])

  // load favorites for the current party from localStorage
  useEffect(() => {
    if (!favoritesKey) {
      setFavorites({})
      return
    }
    try {
      const raw = localStorage.getItem(favoritesKey)
      if (raw) setFavorites(JSON.parse(raw))
      else setFavorites({})
    } catch (e) { setFavorites({}) }
  }, [favoritesKey])

  const toggleFavorite = (id: string, item: Drink) => {
    // Only allow toggling when logged in and a party/table is active
    if (!session || !favoritesKey) return

    const next = { ...favorites }
    if (next[id]) {
      delete next[id]
    } else {
      next[id] = { id, name: item.name, price: item.currentPrice, regularPrice: item.regularPrice, addedAt: Date.now() }
    }
    setFavorites(next)
    try { localStorage.setItem(favoritesKey, JSON.stringify(next)) } catch(e){}
  }

  const openDetail = (item: Drink) => {
    setDetail({ id: String(item._id ?? item.r2oId ?? item.name), name: item.name, price: item.currentPrice, regularPrice: item.regularPrice })
  }

  const closeDetail = () => setDetail(null)

  // Close detail modal on Escape key
  React.useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetail();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail]);

  if (loading) return <div className="text-center py-8">{t('loading')}</div>;

  if (!drinks || (Array.isArray(drinks) && drinks.length === 0)) return <div className="text-center py-8">{t('no_products')}</div>;

  return (
    <>
    <div className="w-full px-[1%] bg-gray-900 my-4 py-6 md:py-8 rounded-none md:rounded-xl shadow-lg text-white overflow-x-hidden">
      <h1 className="text-center font-serif mb-6 tracking-widest text-2xl">{t('drinks_menu')}</h1>

    {/* Masonry-like columns so tiles flow under each other without tall gaps */}
    <div className="columns-1 sm:columns-2 md:columns-3 gap-6">
        {Object.entries(grouped).map(([groupName, items]) => {
          const getTranslatedGroupName = (name: string) => {
            const n = (name ?? '').toString();
            if (/saft|säfte|schorle|schorlen/i.test(n)) return t('cat_saefte');
            if (/bier|biere|biermisch/i.test(n)) return t('cat_bier');
            if (/wein|wine/i.test(n)) return t('cat_wine');
            if (/alkoholfrei|non[- ]?alcoholic|nonalcoholic|non alcohol/i.test(n)) return t('cat_non_alc');
            if (/mocktail|mocktails|mocktails/i.test(n)) return t('cat_mocktails');
            if (/cocktail|cocktails/i.test(n)) return t('cat_cocktails');
            // Use word boundaries so substrings like "shots" don't match "hot"
            if (/\b(?:hei(?:s|ß)|hot|coffee|tee|tea|kaffee)s?\b/i.test(n)) return t('cat_heiss');
            return name || t('ungrouped');
          };
          const displayGroup = getTranslatedGroupName(groupName);

          const emoji = (() => {
            const n = (groupName ?? '').toString();
            if (/saft|säfte|schorle|schorlen/i.test(n)) return '🧃';
            if (/bier|biere|biermisch/i.test(n)) return '🍺';
            if (/wein|wine/i.test(n)) return '🍷';
            if (/alkoholfrei|non[- ]?alcoholic|nonalcoholic|non alcohol/i.test(n)) return '🥤';
            if (/mocktail|mocktails/i.test(n)) return '🧋';
            if (/cocktail|cocktails/i.test(n)) return '🍸';
            if (/\b(?:hei(?:s|ß)|hot|coffee|tee|tea|kaffee)s?\b/i.test(n)) return '☕';
            if (/shots?/i.test(n)) return '🥃';
            return '🍹';
          })();

          const isCollapsed = Boolean(collapsedGroups[groupName])

          return (
            // each card must be inline-block and avoid breaking inside columns
            <div key={groupName} className="inline-block w-full break-inside-avoid-column bg-gray-800/60 rounded-lg p-4 shadow-lg border-2 border-gray-600 mb-6">
              <div className="mb-4">
                <button
                  onClick={() => toggleGroup(groupName)}
                  aria-expanded={!isCollapsed}
                  className="w-full flex items-center justify-between gap-3 text-left py-1 px-2 cursor-pointer hover:opacity-95"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="mr-2 text-2xl align-middle">{emoji}</span>
                    <h2 className="text-3xl md:text-4xl font-semibold truncate">{displayGroup}</h2>
                  </span>
                  <ChevronDown className={"h-6 w-6 transition-transform " + (isCollapsed ? '-rotate-90' : 'rotate-0')} />
                </button>
              </div>
              {!isCollapsed && (
                <div className="flex flex-col gap-3">
                  {items.map((d) => {
                    const id = String(d._id ?? d.r2oId ?? d.name);
                    const fav = Boolean(favorites[id]);

                    const starClass = fav ? 'h-6 w-6 text-yellow-400' : 'h-6 w-6 text-gray-400';
                    const nameClass = fav ? 'text-yellow-400 text-lg md:text-xl font-medium break-words' : 'text-lg md:text-xl font-medium break-words';

                    return (
                      <div
                        key={id}
                        onClick={() => openDetail(d)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(d); } }}
                        role="button"
                        tabIndex={0}
                        className="flex items-center justify-between bg-gray-900/40 hover:bg-gray-900/60 rounded-md p-4 md:p-5 transition-colors cursor-pointer border border-gray-700 min-w-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            aria-label={'favorite-' + (d.name ?? '')}
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(id, d); }}
                            className={"p-1 rounded " + (!session || !favoritesKey ? 'opacity-40 cursor-not-allowed' : '')}
                            disabled={!session || !favoritesKey}
                            title={!session || !favoritesKey ? (t('please_join_party') || 'Join a party to favorite items') : undefined}
                          >
                            <Star className={starClass} fill={fav ? 'currentColor' : 'none'} />
                          </button>
                          <button onClick={() => openDetail(d)} className="text-left min-w-0 cursor-pointer">
                            <span className={nameClass}>{d.name}</span>
                          </button>
                        </div>
                        <span className="ml-4 text-lg md:text-xl font-bold">{typeof d.currentPrice === 'number' ? d.currentPrice.toFixed(2) : d.currentPrice} €</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    {detail && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60" onClick={closeDetail} />
        <div className="relative z-10 w-[min(900px,95%)] bg-white text-black rounded-lg p-6 shadow-xl">
          <div className="flex justify-between items-start">
            <button
              onClick={closeDetail}
              aria-label={t('close') ?? 'Close'}
              title={t('close') ?? 'Close'}
              className="absolute left-4 top-4 text-gray-600 text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-shadow"
            >
              ×
            </button>
          </div>
          <div className="mt-4">
            <DrinkDetailCard 
              id={detail?.id} 
              name={detail?.name} 
              currentPrice={detail?.price}
              regularPrice={detail?.regularPrice}
              showOrderButton={true}
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
