"use client"

import React from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useLanguage } from '@/contexts/LanguageContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ShoppingCart } from 'lucide-react'
import type { Id } from '../../convex/_generated/dataModel'

interface ShoppingBasketProps {
  partyId: Id<'parties'>
}

export default function ShoppingBasket({ partyId }: ShoppingBasketProps) {
  const { t } = useLanguage()
  const orderItems = useQuery(api.drinks.getPartyOrders, { partyId })
  const summary = useQuery(api.drinks.getPartyOrderSummary, { partyId })

  if (!orderItems) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {t('shopping_basket') || 'Shopping Basket'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        </CardContent>
      </Card>
    )
  }

  if (orderItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {t('shopping_basket') || 'Shopping Basket'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('no_orders_yet') || 'No orders yet. Start ordering drinks!'}
          </p>
        </CardContent>
      </Card>
    )
  }

  // Group items by drink name
  const groupedItems = orderItems.reduce((acc, item) => {
    const key = item.drinkName
    if (!acc[key]) {
      acc[key] = {
        drinkName: item.drinkName,
        totalQuantity: 0,
        totalPrice: 0,
        items: []
      }
    }
    acc[key].totalQuantity += item.quantity
    acc[key].totalPrice += item.quantity * item.priceAtOrder
    acc[key].items.push(item)
    return acc
  }, {} as Record<string, { drinkName: string; totalQuantity: number; totalPrice: number; items: typeof orderItems }>)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          {t('shopping_basket') || 'Shopping Basket'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.values(groupedItems).map((group) => (
            <div key={group.drinkName} className="flex items-center justify-between py-2">
              <div className="flex-1">
                <div className="font-medium">{group.drinkName}</div>
                <div className="text-sm text-muted-foreground">
                  {group.totalQuantity}x à {(group.totalPrice / group.totalQuantity).toFixed(2)} €
                </div>
              </div>
              <div className="font-semibold">
                {group.totalPrice.toFixed(2)} €
              </div>
            </div>
          ))}
          
          <Separator className="my-4" />
          
          <div className="flex items-center justify-between pt-2 text-lg font-bold">
            <div>
              {t('total') || 'Total'} ({summary?.totalItems || 0} {t('items') || 'items'})
            </div>
            <div>
              {summary?.totalPrice.toFixed(2) || '0.00'} €
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted rounded-md">
          <p className="text-xs text-muted-foreground">
            {t('basket_info') || 'Orders are tracked but not yet submitted to Ready2Order. Complete your party session to finalize orders.'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
