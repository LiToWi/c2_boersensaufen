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
import { ChartContainer } from "./ui/chart";

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

  const handleOrder = async () => {
    if (!currentParty || !id) {
      toast.error(t("please_join_party") || "Please join a party first");
      return;
    }

    if (quantity < 1) {
      toast.error(t('quantity_error') || 'Please select at least 1 item')
      return
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

  const maxData = React.useMemo(() => {
    if (!snapshots) return displayCurrent;
    return snapshots.reduce((a, b) => (a > b ? a : b));
  }, [snapshots, displayCurrent]);

  // Build chart data for Recharts
  const data = React.useMemo(() => {
    if (!snapshots) {
      return [
        { label: "0", price: displayCurrent },
        { label: "1", price: displayCurrent },
      ];
    }
    return snapshots
      .slice()
      .sort((a, b) => a.ts - b.ts)
      .map((s) => ({
        label: new Date(s.ts).toLocaleString(),
        price: s.price.toFixed(3),
      }));
  }, [snapshots, displayCurrent]);

  return (
    <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{name}</h3>
        </div>
        <div className="text-xl font-bold">{currentPrice?.toFixed(3)} €</div>
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

          <ResponsiveContainer width={'100%'} aspect={3.61} maxHeight={2000}>
            {/*<ChartContainer
              id={`drink-${id ?? name}`}
              config={{ price: { color: "#f59e0b" } }}
            >*/}
              <Recharts.LineChart
                layout="horizontal"
                data={data}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <Recharts.XAxis dataKey="label" hide />
                {maxData && (
                  <Recharts.YAxis
                    allowDecimals={false}
                  />
                )}
                <Recharts.Tooltip />
                <Recharts.Line
                  dot={false}
                  type="monotone"
                  dataKey="price"
                  stroke="#f59e0b"
                />
              </Recharts.LineChart>
            {/*</ChartContainer>*/}
          </ResponsiveContainer>
        </div>

        {showOrderButton && (
          <div className="mt-4">
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
