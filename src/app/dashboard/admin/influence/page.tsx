"use client";

import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/../convex/_generated/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, HelpCircle } from 'lucide-react';

// Parameter descriptions with higher/lower effects
const parameterDescriptions: Record<string, { description: string; higher: string; lower: string }> = {
  beta: {
    description: 'Mean reversion strength - how quickly prices return to fundamental value',
    higher: 'Prices snap back faster to fundamental value, more stable',
    lower: 'Prices drift longer from fundamental value, more volatile'
  },
  lambda: {
    description: 'Demand smoothing - prevents extreme reactions to single orders',
    higher: 'Demand is more smoothed out, less extreme price jumps',
    lower: 'Demand is sharper, prices more sensitive to orders'
  },
  k: {
    description: 'Saturation strength - prevents pump-and-dump with high demand',
    higher: 'Demand impact saturates faster, harder to pump price up',
    lower: 'Demand impact is linear, easier price movement'
  },
  N0: {
    description: 'Activity threshold - baseline demand level for market scaling',
    higher: 'Market requires more demand to be "active", lower price reactivity',
    lower: 'Market reacts strongly even with low demand'
  },
  lowerBoundMultiplier: {
    description: 'Minimum price as multiple of fundamental price (e.g., 0.6 = 60% of fundamental)',
    higher: 'Floor is higher, prices can\'t drop as low',
    lower: 'Floor is lower, prices can crash further'
  },
  upperBoundMultiplier: {
    description: 'Maximum price as multiple of fundamental price (e.g., 2.2 = 220% of fundamental)',
    higher: 'Ceiling is higher, prices can shoot up further',
    lower: 'Ceiling is lower, prices capped sooner'
  },
  maxJumpPercent: {
    description: 'Maximum price change per tick (as % of current price, e.g., 0.08 = 8%)',
    higher: 'Larger price jumps allowed per tick, more volatile',
    lower: 'Smaller price jumps per tick, smoother transitions'
  },
  maxImpactPerUserPerTick: {
    description: 'Anti-manipulation: max units one user can impact per tick',
    higher: 'Users have more market power per tick',
    lower: 'Users have less power, harder to manipulate'
  },
  largeJumpThreshold: {
    description: 'Price movement % that triggers circuit breaker (e.g., 0.05 = 5%)',
    higher: 'Circuit breaker triggers at larger jumps, activated less often',
    lower: 'Circuit breaker triggers easily, reduces volatility more'
  },
  consecutiveJumpsForBreaker: {
    description: 'How many large jumps in a row before circuit breaker activates',
    higher: 'Circuit breaker harder to trigger, allows more volatility',
    lower: 'Circuit breaker triggers sooner, prevents runaway prices'
  },
  volatilityReductionDuration: {
    description: 'How long circuit breaker stays active (in seconds)',
    higher: 'Volatility reduction lasts longer',
    lower: 'Market recovers faster to normal behavior'
  },
  volatilityReductionFactor: {
    description: 'How much to reduce price reactivity during circuit breaker (0-1, e.g., 0.5 = 50%)',
    higher: 'Reduces reactivity more during crisis',
    lower: 'Less dampening effect during crisis'
  },
};

// Tooltip component
function Tooltip({ children, description, higher, lower }: any) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="ml-1 text-gray-500 hover:text-gray-300 inline-flex"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-800 border border-gray-600 rounded shadow-lg z-50 p-2 text-xs text-gray-200">
          <p className="font-semibold mb-1 text-gray-100">{description}</p>
          <p className="mb-1">
            <span className="text-green-400">Higher:</span> {higher}
          </p>
          <p>
            <span className="text-red-400">Lower:</span> {lower}
          </p>
        </div>
      )}
    </div>
  );
}

const noSpinnerStyle: React.CSSProperties = {
  WebkitAppearance: 'none',
  MozAppearance: 'textfield',
};

// Sortable drink row component
function SortableDrinkRow({ 
  drink, 
  edit, 
  extraEdit, 
  onEditDrink, 
  onEditExtra, 
  onSave,
  t,
  isValidFloat,
  isValidInteger,
  noSpinnerStyle
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: drink._id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-t border-gray-700/40 hover:bg-gray-800/30">
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300">
            <GripVertical className="h-4 w-4" />
          </button>
          <span>{drink.name}</span>
        </div>
      </td>
      <td className="py-2 px-3 text-right">
        <Input className="text-right" type="text" inputMode="decimal" style={noSpinnerStyle} value={(edit.currentPrice ?? drink.currentPrice) ?? ''}
          onChange={e => { if (isValidFloat(e.target.value)) onEditDrink(drink._id, 'currentPrice', Number(e.target.value) || 0); }} onFocus={(e: any) => e.currentTarget.select()} />
      </td>
      <td className="py-2 px-3 text-right">
        <Input className="text-right" type="text" inputMode="decimal" style={noSpinnerStyle} value={(edit.regularPrice ?? drink.regularPrice) ?? ''}
          onChange={e => { if (isValidFloat(e.target.value)) onEditDrink(drink._id, 'regularPrice', Number(e.target.value) || 0); }} onFocus={(e: any) => e.currentTarget.select()} />
      </td>
      <td className="py-2 px-3 text-right">
        <Input className="text-right" type="text" inputMode="numeric" style={noSpinnerStyle} value={(extraEdit.capacity ?? drink.capacity ?? '')}
          onChange={e => { if (isValidInteger(e.target.value)) onEditExtra(drink._id, 'capacity', Number(e.target.value) || 0); }} onFocus={(e: any) => e.currentTarget.select()} />
      </td>
      <td className="py-2 px-3 text-right">
        <Button variant="secondary" onClick={() => onSave(drink._id)}>{t('save') || 'Save'}</Button>
      </td>
    </tr>
  );
}

// Validation helpers
const isValidInteger = (val: string): boolean => {
  if (val === '') return true;
  return /^-?\d+$/.test(val);
};

const isValidFloat = (val: string): boolean => {
  if (val === '') return true;
  // Only prevent multiple decimal points
  return (val.match(/\./g) || []).length <= 1;
};

// Integer fields: capacity, priority, tickIntervalSeconds, maxImpactPerUserPerTick, consecutiveJumpsForBreaker, volatilityReductionDuration
// Float fields: beta, lambda, k, N0, lowerBoundMultiplier, upperBoundMultiplier, maxJumpPercent, largeJumpThreshold, volatilityReductionFactor
const integerFields = new Set(['capacity', 'priority', 'tickIntervalSeconds', 'maxImpactPerUserPerTick', 'consecutiveJumpsForBreaker', 'volatilityReductionDuration']);

export default function InfluencePage() {
  const { t } = useLanguage();
  const settings = useQuery(api.settings.getSettings);
  const drinks = useQuery(api.drinks.listDrinks);
  const categories = useQuery(api.categories.listCategories);

  const setFee = useMutation(api.settings.setTradingFeeRate);
  const setConfig = useMutation(api.settings.setPricingConfig);
  const updateDrink = useMutation(api.drinks.updateDrink);

  const [feeRate, setFeeRate] = React.useState<string | undefined>(undefined);
  const [configDraft, setConfigDraft] = React.useState<Record<string, string | number | undefined>>({}); // Store as strings while editing
  const [drinkEdits, setDrinkEdits] = React.useState<Record<string, {currentPrice?: number; regularPrice?: number}>>({});
  const [extraEdits, setExtraEdits] = React.useState<Record<string, {capacity?: number; priority?: number}>>({});
  const [drinkOrder, setDrinkOrder] = React.useState<Record<string, string[]>>({}); // categoryName -> ordered drink IDs

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const settingsCtx = useSettings();
  const feePctLabel = settingsCtx?.tradingFeeRate !== undefined 
    ? `${(settingsCtx.tradingFeeRate * 100).toFixed(2).replace(/\.?0+$/, '')}%`
    : '1%';

  React.useEffect(() => {
    if (settings && feeRate === undefined) setFeeRate(String(settings.tradingFeeRate));
    if (settings && Object.keys(configDraft).length === 0) setConfigDraft(Object.fromEntries(
      Object.entries(settings.pricingConfig).map(([k, v]) => [k, String(v)])
    ));
  }, [settings]);

  // Initialize drink order from drinks' priority field
  React.useEffect(() => {
    if (!drinks || !categories || Object.keys(drinkOrder).length > 0) return;
    
    const catsById: Record<string, any> = {};
    (categories || []).forEach((c: any) => { catsById[String(c._id)] = c; });
    const groups: Record<string, any[]> = {};
    (drinks || []).forEach((d: any) => {
      const key = d.categoryId ? (catsById[String(d.categoryId)]?.name || 'Ungrouped') : 'Ungrouped';
      groups[key] = groups[key] || [];
      groups[key].push(d);
    });
    
    const initialOrder: Record<string, string[]> = {};
    Object.keys(groups).forEach(catName => {
      // Sort by priority field in descending order (higher number = higher priority, shows at top)
      const sorted = groups[catName].sort((a, b) => (b.priority || 0) - (a.priority || 0));
      initialOrder[catName] = sorted.map(d => String(d._id));
    });
    
    setDrinkOrder(initialOrder);
  }, [drinks, categories, drinkOrder]);

  const handleSaveFee = async () => {
    if (feeRate === undefined) return;
    const num = Number(feeRate);
    if (!Number.isNaN(num)) await setFee({ rate: num });
  };

  const handleSaveConfig = async () => {
    const partial: any = {};
    const keys = [
      'beta','lambda','k','N0','lowerBoundMultiplier','upperBoundMultiplier','maxJumpPercent','maxImpactPerUserPerTick','largeJumpThreshold','consecutiveJumpsForBreaker','volatilityReductionDuration','volatilityReductionFactor'
    ];
    keys.forEach(k => {
      const v = configDraft?.[k];
      if (v !== undefined && v !== '') {
        const num = Number(v);
        if (!Number.isNaN(num)) partial[k] = num;
      }
    });
    if (Object.keys(partial).length > 0) await setConfig({ partial });
  };

  const editDrink = (id: string, field: 'currentPrice' | 'regularPrice', value: number) => {
    setDrinkEdits(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value }
    }));
  }

  const editExtra = (id: string, field: 'capacity' | 'priority', value: number) => {
    setExtraEdits(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value }
    }));
  }

  const saveDrink = async (id: string) => {
    const edit = drinkEdits[id] || {};
    const extra = extraEdits[id] || {};
    if (Object.keys(edit).length === 0 && Object.keys(extra).length === 0) return;
    await updateDrink({ drinkId: id as any, ...edit, ...extra });
    setDrinkEdits(prev => { const p = { ...prev }; delete p[id]; return p; });
    setExtraEdits(prev => { const p = { ...prev }; delete p[id]; return p; });
  }

  const handleDragEnd = (event: DragEndEvent, catName: string) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    setDrinkOrder(prev => {
      const oldOrder = prev[catName] || [];
      const oldIndex = oldOrder.indexOf(String(active.id));
      const newIndex = oldOrder.indexOf(String(over.id));
      
      const newOrder = arrayMove(oldOrder, oldIndex, newIndex);
      return { ...prev, [catName]: newOrder };
    });
  };

  const saveCategoryOrder = async (catName: string) => {
    const order = drinkOrder[catName];
    if (!order) return;
    
    // Update priority for each drink - first item (top) gets highest number
    const maxPriority = order.length;
    for (let i = 0; i < order.length; i++) {
      const drinkId = order[i];
      const priority = maxPriority - i; // First item gets maxPriority, last gets 1
      await updateDrink({ drinkId: drinkId as any, priority });
    }
  };

  return (
    <div className="space-y-6 p-2">
      <style>{`
        input[type="number"] {
          -webkit-appearance: none !important;
          -moz-appearance: textfield !important;
          appearance: textfield !important;
        }
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none !important;
          display: none !important;
          margin: 0 !important;
        }
      `}</style>
      <Card className="bg-slate-900/80 border-blue-500/40">
        <CardHeader>
          <CardTitle>{t('influence') || 'Einflussnahme'} — {t('market_fee') || 'Market Fee'}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-sm text-gray-400 mb-1">{(t('trading_fee') || 'Trading Fee (1%)').replace('1%', feePctLabel)}</label>
            <Input type="text" style={noSpinnerStyle} value={feeRate ?? ''} onChange={e => setFeeRate(e.target.value)} onFocus={(e) => e.currentTarget.select()} />
            <p className="text-xs text-gray-500 mt-1">{(t('hint_fee_decimal') || 'Example: 0.01 = 1%')}</p>
          </div>
          <Button onClick={handleSaveFee}>{t('save') || 'Save'}</Button>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/80 border-emerald-500/40">
        <CardHeader>
          <CardTitle>{t('pricing_config') || 'Pricing Configuration'}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {settings && (
            <>
              {['beta','lambda','k','N0','lowerBoundMultiplier','upperBoundMultiplier','maxJumpPercent','maxImpactPerUserPerTick','largeJumpThreshold','consecutiveJumpsForBreaker','volatilityReductionDuration','volatilityReductionFactor'].map((key) => (
                <div key={key}>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="block text-sm text-gray-400">{key}</label>
                    <Tooltip {...parameterDescriptions[key]} />
                  </div>
                  <Input type="text" style={noSpinnerStyle} value={configDraft?.[key] ?? ''} onChange={(e) => setConfigDraft((d: any) => ({...d, [key]: e.target.value}))} onFocus={(e) => e.currentTarget.select()} />
                </div>
              ))}
              <div className="md:col-span-3">
                <Button onClick={handleSaveConfig}>{t('save') || 'Save'}</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900/80 border-yellow-500/40">
        <CardHeader>
          <CardTitle>{t('drinks') || 'Drinks'} — {t('adjust_prices') || 'Adjust Prices'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {(() => {
              const catsById: Record<string, any> = {};
              (categories || []).forEach((c: any) => { catsById[String(c._id)] = c; });
              const groups: Record<string, any[]> = {};
              (drinks || []).forEach((d: any) => {
                const cat = d.categoryId ? catsById[String(d.categoryId)] : undefined;
                const key = cat?.name || 'Ungrouped';
                groups[key] = groups[key] || [];
                groups[key].push(d);
              });
              const orderedCatNames = Object.keys(groups).sort((a,b) => {
                const ca = Object.values(catsById).find((c: any) => c.name === a);
                const cb = Object.values(catsById).find((c: any) => c.name === b);
                const pa = ca?.priority ?? 0;
                const pb = cb?.priority ?? 0;
                if (pa !== pb) return pb - pa; // higher priority first
                return a.localeCompare(b);
              });
              
              return orderedCatNames.map((catName) => {
                // Get ordered drink IDs or fallback to priority-sorted (descending: higher number = higher priority)
                const orderedIds = drinkOrder[catName] || groups[catName].sort((a, b) => (b.priority || 0) - (a.priority || 0)).map(d => String(d._id));
                const drinksById = Object.fromEntries(groups[catName].map(d => [String(d._id), d]));
                const orderedDrinks = orderedIds.map(id => drinksById[id]).filter(Boolean);
                
                return (
                  <div key={catName}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-200">{catName}</h3>
                      <Button variant="outline" size="sm" onClick={() => saveCategoryOrder(catName)}>
                        {t('save_order') || 'Save Order'}
                      </Button>
                    </div>
                    <div className="overflow-x-auto border border-gray-800 rounded">
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => handleDragEnd(event, catName)}
                      >
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-400">
                              <th className="py-2 px-3">{t('drink') || 'Drink'}</th>
                              <th className="py-2 px-3 text-right">{t('current_price') || 'Current'}</th>
                              <th className="py-2 px-3 text-right">{t('regular_price') || 'Regular'}</th>
                              <th className="py-2 px-3 text-right">{t('capacity') || 'Capacity'}</th>
                              <th className="py-2 px-3"></th>
                            </tr>
                          </thead>
                          <tbody>
                            <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                              {orderedDrinks.map((d: any) => {
                                const edit = drinkEdits[d._id] || {};
                                const x = extraEdits[d._id] || {};
                                return (
                                  <SortableDrinkRow
                                    key={d._id}
                                    drink={d}
                                    edit={edit}
                                    extraEdit={x}
                                    onEditDrink={editDrink}
                                    onEditExtra={editExtra}
                                    onSave={saveDrink}
                                    t={t}
                                    isValidFloat={isValidFloat}
                                    isValidInteger={isValidInteger}
                                    noSpinnerStyle={noSpinnerStyle}
                                  />
                                );
                              })}
                            </SortableContext>
                          </tbody>
                        </table>
                      </DndContext>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
