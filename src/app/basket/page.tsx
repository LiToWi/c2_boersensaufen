"use client"

import React, { useEffect, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useLanguage } from '@/contexts/LanguageContext'
import { useParty } from '@/contexts/PartyContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Trash2, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Id } from '../../../convex/_generated/dataModel'

export default function BasketPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const { currentParty } = useParty()
  const orderItems = useQuery(
    api.drinks.getPartyOrders,
    currentParty ? { partyId: currentParty as Id<'parties'> } : "skip"
  )
  const summary = useQuery(
    api.drinks.getPartyOrderSummary,
    currentParty ? { partyId: currentParty as Id<'parties'> } : "skip"
  )
  const deleteOrderItem = useMutation(api.drinks.deleteOrderItem)
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set())

  // Check for expired items and auto-delete them
  useEffect(() => {
    if (!orderItems) return

    const now = Date.now()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expiredItems = orderItems.filter((item: any) => {
      const age = now - item.createdAt
      return age > 60000 // 60 seconds
    })

    // Auto-delete expired items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expiredItems.forEach((item: any) => {
      deleteOrderItem({ orderItemId: item._id })
    })
  }, [orderItems, deleteOrderItem])

  const handleDeleteItem = async (itemId: Id<'orderItems'>) => {
    setDeletingItems(prev => new Set(prev).add(itemId))
    try {
      await deleteOrderItem({ orderItemId: itemId })
    } catch (error) {
      console.error('Failed to delete item:', error)
    } finally {
      setDeletingItems(prev => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
    }
  }

  const getRemainingTime = (createdAt: number) => {
    const age = Date.now() - createdAt
    const remaining = Math.max(0, 60000 - age)
    return Math.ceil(remaining / 1000) // seconds
  }

  const [, forceUpdate] = useState(0)
  
  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(n => n + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!currentParty) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              {t('shopping_basket') || 'Shopping Basket'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t('please_join_party') || 'Please join a party first to view your basket.'}
            </p>
            <Button onClick={() => router.push('/')}>
              {t('go_back_home') || 'Go back home'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!orderItems) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              {t('shopping_basket') || 'Shopping Basket'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t('loading')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (orderItems.length === 0) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-6 w-6" />
              {t('shopping_basket') || 'Shopping Basket'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t('no_orders_yet') || 'No orders yet. Start ordering drinks!'}
            </p>
            <Button onClick={() => router.push('/drinks')}>
              {t('nav_drinks') || 'Browse Drinks'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <ShoppingCart className="h-6 w-6" />
            {t('shopping_basket') || 'Shopping Basket'}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {t('basket_timer_info') || 'Items will be automatically removed after 1 minute'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orderItems.map((item: any) => {
              const remainingSeconds = getRemainingTime(item.createdAt)
              const isExpiring = remainingSeconds <= 10
              const isDeleting = deletingItems.has(item._id)

              return (
                <div
                  key={item._id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    isExpiring ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-lg">{item.drinkName}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.quantity}x à {item.priceAtOrder.toFixed(2)} € = {' '}
                      <span className="font-semibold">
                        {(item.quantity * item.priceAtOrder).toFixed(2)} €
                      </span>
                    </div>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${
                      isExpiring ? 'text-red-600 font-semibold' : 'text-gray-500'
                    }`}>
                      <Clock className="h-3 w-3" />
                      {remainingSeconds}s {t('remaining') || 'remaining'}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteItem(item._id)}
                    disabled={isDeleting}
                    className="text-red-600 hover:text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              )
            })}

            <Separator className="my-4" />

            <div className="flex items-center justify-between pt-2 text-xl font-bold">
              <div>
                {t('total') || 'Total'} ({summary?.totalItems || 0} {t('items') || 'items'})
              </div>
              <div>
                {summary?.totalPrice.toFixed(2) || '0.00'} €
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-md border border-blue-200">
              <p className="text-sm text-blue-900">
                {t('basket_info') || 'Orders are tracked but not yet submitted to Ready2Order. Complete your party session to finalize orders.'}
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => router.push('/drinks')}
                className="flex-1"
              >
                {t('continue_shopping') || 'Continue Shopping'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
