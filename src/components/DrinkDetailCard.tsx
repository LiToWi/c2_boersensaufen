"use client";

import React from "react";
import { ResponsiveContainer } from "recharts";
import * as Recharts from "recharts";
import { useQuery } from "convex/react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParty } from "@/contexts/PartyContext";
import { Button } from "@/components/ui/button";
import { useSession } from 'next-auth/react'
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";

export type Snapshot = { ts: number; price: number };

type Props = {
  id?: string;
  name?: string;
  currentPrice?: number;
  regularPrice?: number;
  snapshots?: Snapshot[] | null;
  showOrderButton?: boolean;
};

export default function DrinkDetailCard({
  id,
  name,
  currentPrice,
  regularPrice,
  showOrderButton = false,
}: Props) {
  const { t } = useLanguage();
  const { currentParty, currentTable } = useParty();
  const { data: session } = useSession()
  const orderDrink = useMutation(api.drinks.orderDrink);
  const [isOrdering, setIsOrdering] = React.useState(false);
  const [quantity, setQuantity] = React.useState(1)
  const snapshots = useQuery(api.snapshots.getSnapshotsForProduct, { id: id! });

  const displayCurrent =
    typeof currentPrice === "number" ? currentPrice : undefined;
  const displayRegular =
    typeof regularPrice === "number" ? regularPrice : undefined;

  const saving =
    displayRegular !== undefined && displayCurrent !== undefined
      ? displayRegular - displayCurrent
      : undefined;

  // Calculate price range for Y-axis scaling
  const priceRange = React.useMemo(() => {
    if (!snapshots || snapshots.length === 0) {
      const prices = [displayCurrent, displayRegular].filter((p): p is number => p !== undefined);
      if (prices.length === 0) return { min: 0, max: 10 };
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return {
        min: Math.floor(min * 0.9 * 100) / 100, // 10% below min
        max: Math.ceil(max * 1.1 * 100) / 100, // 10% above max
      };
    }

    const allPrices = [...snapshots.map(s => s.price)];
    if (displayCurrent !== undefined) allPrices.push(displayCurrent);
    if (displayRegular !== undefined) allPrices.push(displayRegular);

    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    const padding = (max - min) * 0.1; // 10% padding

    return {
      min: Math.max(0, Math.floor((min - padding) * 100) / 100),
      max: Math.ceil((max + padding) * 100) / 100,
    };
  }, [snapshots, displayCurrent, displayRegular]);

  // Build chart data for Recharts
  const chartData = React.useMemo(() => {
    if (!snapshots || snapshots.length === 0) {
      // If no snapshots, show current price as a flat line
      if (displayCurrent === undefined) return [];
      const now = Date.now();
      return [
        { time: now - 60000, price: displayCurrent, label: new Date(now - 60000).toLocaleTimeString() },
        { time: now, price: displayCurrent, label: new Date(now).toLocaleTimeString() },
      ];
    }

    return snapshots
      .slice()
      .sort((a, b) => a.ts - b.ts)
      .map((s) => ({
        time: s.ts,
        price: s.price,
        label: new Date(s.ts).toLocaleTimeString(),
      }));
  }, [snapshots, displayCurrent]);

  const handleOrder = async () => {
    if (!currentParty || !id) {
      toast.error(t("please_join_party") || "Please join a party first");
      return;
    }

    if (quantity < 1) {
      toast.error(t('quantity_error') || 'Please select at least 1 item')
      return
    }

    setIsOrdering(true)
    try {
      await orderDrink({
        partyId: currentParty as Id<'parties'>,
        drinkId: id as Id<'drinks'>,
        userId: currentTable || 'unknown',
        quantity: quantity,
      })
      toast.success(t('order_added') || `${quantity}x ${name} added to basket!`)
      setQuantity(1) // Reset quantity after successful order
    } catch (error: any) {
      console.error('Order failed:', error)
      // Extract clean error message from Convex error
      let errorMessage = t('order_failed') || 'Failed to add to basket'

      if (error?.message) {
        // Check if it's a purchase limit error
        if (error.message.includes('Purchase limit exceeded')) {
          // Extract numbers from the error message
          const membersMatch = error.message.match(/\((\d+) members?\)/)
          const limitMatch = error.message.match(/max (\d+)/)
          const currentMatch = error.message.match(/Currently you have: (\d+)/)

          if (membersMatch && limitMatch && currentMatch) {
            const members = membersMatch[1]
            const limit = limitMatch[1]
            const current = currentMatch[1]

            const title = t('purchase_limit_exceeded') || 'Purchase limit exceeded'
            const message = (t('purchase_limit_message') || 'Your party ({members} members) can have max {limit} pending items in basket. Currently: {current}')
              .replace('{members}', members)
              .replace('{limit}', limit)
              .replace('{current}', current)

            errorMessage = `${title}!\n${message}`
          } else {
            // Fallback: try to extract the clean message
            const match = error.message.match(/Uncaught Error: (.+?)(?:\n|$)/)
            errorMessage = match?.[1]?.trim() || error.message
          }
        } else {
          // Extract the actual error message, stripping Convex metadata
          const match = error.message.match(/Uncaught Error: (.+?)(?:\n|$)/)
          if (match && match[1]) {
            errorMessage = match[1].trim()
          }
        }
      }

      toast.error(errorMessage)
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{name}</h3>
        </div>
        <div className="text-xl font-bold">{currentPrice?.toFixed(2)} €</div>
      </div>
      <div className="mt-3">
        <div className="bg-white dark:bg-gray-900 text-black dark:text-white rounded-md p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold">{name}</h3>
              <div className="text-sm text-muted-foreground">
                {t("current_price")}{" "}
                {displayCurrent !== undefined
                  ? `${displayCurrent.toFixed(2)} €`
                  : "-"}
              </div>
            </div>
            <div className="text-right">
              {displayRegular !== undefined && (
                <div className="text-sm text-muted-foreground">
                  {t("regular_price")} {displayRegular.toFixed(2)} €
                </div>
              )}
              {saving !== undefined && (
                <div
                  className={
                    "mt-1 font-mono font-medium " +
                    (saving > 0
                      ? "text-green-400"
                      : saving < 0
                        ? "text-red-400"
                        : "text-muted-foreground")
                  }
                >
                  {saving > 0
                    ? `${t("saving") || "Saving"} ${saving.toFixed(2)} €`
                    : saving < 0
                      ? `${t("more_expensive") || "More expensive"} ${Math.abs(saving).toFixed(2)} €`
                      : `${t("saving") || "Saving"} 0.00 €`}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <Recharts.LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
              >
                <Recharts.CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <Recharts.XAxis 
                  dataKey="label" 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <Recharts.YAxis
                  domain={[priceRange.min, priceRange.max]}
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(value) => `${value.toFixed(2)}€`}
                  width={60}
                />
                <Recharts.Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '0.375rem',
                    color: '#fff',
                  }}
                  formatter={(value: any) => [`${Number(value).toFixed(2)} €`, 'Price']}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Recharts.Line
                  type="monotone"
                  dataKey="price"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: '#f59e0b' }}
                />
                {displayRegular !== undefined && (
                  <Recharts.ReferenceLine
                    y={displayRegular}
                    stroke="#10b981"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    label={{
                      value: `Regular: ${displayRegular.toFixed(2)}€`,
                      position: 'insideTopRight',
                      fill: '#10b981',
                      fontSize: 12,
                    }}
                  />
                )}
              </Recharts.LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {showOrderButton && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <label htmlFor="quantity" className="text-sm font-medium">
                {t('quantity') || 'Quantity'}:
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  max="99"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                  className="w-16 text-center border rounded px-2 py-1 bg-gray-800 border-gray-600"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.min(99, quantity + 1))}
                  disabled={quantity >= 99}
                >
                  +
                </Button>
              </div>
            </div>
            <Button
              onClick={handleOrder}
              disabled={!currentParty || isOrdering}
              className="w-full"
              size="lg"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {isOrdering
                ? t("adding") || "Adding..."
                : t("add_to_basket") || "Add to Basket"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
