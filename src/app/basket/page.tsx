"use client"

import React, { useEffect, useState } from 'react'
import { useQuery, useMutation, useConvex } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useLanguage } from '@/contexts/LanguageContext'
import { useParty } from '@/contexts/PartyContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Trash2, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import type { Id } from '../../../convex/_generated/dataModel'
import { toast } from 'sonner'

export default function BasketPage() {
  // All hooks MUST be called unconditionally at the top
  const { t } = useLanguage()
  const router = useRouter()
  const { data: session, status } = useSession()
  const { currentParty } = useParty()
  const convex = useConvex()
  const [deletingItems, setDeletingItems] = useState<Set<string>>(new Set())
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [, forceUpdate] = useState(0)
  const [retryCount, setRetryCount] = useState(0)
  
  // Always call queries (unconditionally)
  const orderItems = useQuery(
    api.drinks.getPartyOrders,
    currentParty ? { partyId: currentParty as Id<'parties'> } : "skip"
  )
  const summary = useQuery(
    api.drinks.getPartyOrderSummary,
    currentParty ? { partyId: currentParty as Id<'parties'> } : "skip"
  )
  const party = useQuery(
    api.parties.getPartyById,
    currentParty ? { id: currentParty as Id<'parties'> } : "skip"
  )
  const deleteOrderItem = useMutation(api.drinks.deleteOrderItem)
  const finalizeOrders = useMutation(api.drinks.finalizePartyOrders)

  const cardClass = "bg-slate-900/80 border border-blue-500/40 text-white shadow-lg backdrop-blur"

  // Retry fetching party data if r2oTableId is missing
  useEffect(() => {
    if (party && !party.r2oTableId && retryCount < 10) {
      const timer = setTimeout(() => {
        setRetryCount(prev => prev + 1)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [retryCount, party?.r2oTableId])

  // Redirect to home if not logged in
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/')
    }
  }, [session, status, router])

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(n => n + 1) // Functional update doesn't depend on current value
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Check for expired items and auto-delete them (only non-finalized)
  useEffect(() => {
    if (!orderItems) return

    const now = Date.now()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expiredItems = (orderItems as any[]).filter((item: any) => {
      if (item.finalized) return false // Don't delete finalized items
      const age = now - item.createdAt
      return age > 60000 // 60 seconds
    })

    // Auto-delete expired items
    expiredItems.forEach((item: any) => {
      deleteOrderItem({ orderItemId: item._id })
    })
  }, [orderItems, deleteOrderItem])

  // Show blank page while loading
  if (status === 'loading') return null;
  if (!session) return null;

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

  const handleFinalizeOrders = async () => {
    if (!currentParty) {
      toast.error('Party not found')
      return
    }
    
    if (!party?.r2oTableId) {
      toast.error('R2O table not created yet. The table creation may still be in progress. Please wait a moment and try again.')
      return
    }
    
    setIsFinalizing(true)
    try {
      // Collect pending items BEFORE finalizing (so we have the data for R2O)
      const pendingItems = orderItems?.filter(item => !item.finalized) || []
      
      if (pendingItems.length === 0) {
        toast.error(t('no_items_to_finalize') || 'No items to submit')
        setIsFinalizing(false)
        return
      }
      
      // Prepare items for R2O submission
      const r2oItems = pendingItems.map((item) => ({
        productName: item.drinkName || `Drink ${item.drinkId}`,
        quantity: item.quantity,
        pricePerUnit: item.priceAtOrder,
      }))
      
      // First finalize the orders in Convex
      await finalizeOrders({ partyId: currentParty as Id<'parties'> })
      
      // Then submit to Ready2Order via API route (which has env var access)
      try {
        const response = await fetch('/api/ready2order/submit-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            partyId: currentParty,
            r2oTableId: party.r2oTableId,
            items: r2oItems,
          }),
        })
        
        const result = await response.json()
        
        if (!response.ok || !result.success) {
          console.error('R2O submission failed:', result.error)
          toast.error(t('r2o_submission_failed') || 'Order finalized but payment submission had an issue. Please notify staff.')
        } else {
          toast.success(t('order_finalized') || 'Order successfully submitted and ready for payment!')
        }
      } catch (r2oError) {
        console.error('R2O submission error:', r2oError)
        toast.error(t('r2o_submission_failed') || 'Order finalized but payment submission had an issue. Please notify staff.')
      }
    } catch (error) {
      console.error('Failed to finalize orders:', error)
      toast.error(t('finalize_error') || 'Error submitting order')
    } finally {
      setIsFinalizing(false)
    }
  }

  if (!currentParty) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card className={cardClass}>
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
        <Card className={cardClass}>
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
        <Card className={cardClass}>
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
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Current Basket Card - Only show pending (non-finalized) items */}
      {orderItems.some((item: any) => !item.finalized) && (
        <Card className={cardClass}>
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
              {orderItems
                .filter((item: any) => !item.finalized)
                .map((item: any) => {
                  const remainingSeconds = getRemainingTime(item.createdAt)
                  const isExpiring = remainingSeconds <= 10
                  const isDeleting = deletingItems.has(item._id)
                  const isExpired = remainingSeconds <= 0

                  // Auto-delete if expired
                  if (isExpired && !isDeleting) {
                    handleDeleteItem(item._id)
                    return null
                  }

                  if (isDeleting || isExpired) return null

                  return (
                    <div
                      key={item._id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        isExpiring ? 'bg-red-900/40 border-red-500/60' : 'bg-slate-800/60 border-slate-600'
                      } text-white`}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-lg text-white">{item.drinkName}</div>
                        <div className="text-sm text-gray-300">
                          {item.quantity}x à {item.priceAtOrder.toFixed(2)} € = {' '}
                          <span className="font-semibold text-white">
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

              <div className="space-y-2">
                <div className="flex items-center justify-between text-base">
                  <div>
                    {t('total') || 'Total'} ({orderItems.filter((i: any) => !i.finalized).reduce((sum: number, item: any) => sum + item.quantity, 0)} {t('items') || 'items'})
                  </div>
                  <div>
                    {orderItems.filter((i: any) => !i.finalized).reduce((sum: number, item: any) => sum + (item.quantity * item.priceAtOrder), 0).toFixed(2)} €
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-300">
                  <div>{t('trading_fee') || 'Trading Fee (1%)'}</div>
                  <div>
                    +{orderItems.filter((i: any) => !i.finalized).reduce((sum: number, item: any) => sum + item.feePaid, 0).toFixed(2)} €
                  </div>
                </div>
                <Separator className="my-2" />
                <div className="flex items-center justify-between text-xl font-bold">
                  <div>{t('total_with_fee') || 'Total incl. Fee'}</div>
                  <div>
                    {(
                      orderItems.filter((i: any) => !i.finalized).reduce((sum: number, item: any) => sum + (item.quantity * item.priceAtOrder), 0) +
                      orderItems.filter((i: any) => !i.finalized).reduce((sum: number, item: any) => sum + item.feePaid, 0)
                    ).toFixed(2)} €
                  </div>
                </div>
              </div>

              {/* Finalize Order Button */}
              <div className="mt-6">
                <Button
                  onClick={handleFinalizeOrders}
                  disabled={isFinalizing || orderItems.filter((i: any) => !i.finalized).length === 0}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold text-lg py-6"
                >
                  {isFinalizing ? (t('finalizing') || 'Submitting...') : (t('finalize_order') || 'Order now at the bar (paid)!')}
                </Button>
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
      )}

      {/* Order History Card - Only show finalized items */}
      {orderItems.some((item: any) => item.finalized) && (
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-2xl">
              {t('order_history') || 'Order History'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-600">
                  <tr className="text-left">
                    <th className="pb-2 font-semibold text-white">{t('drink') || 'Drink'}</th>
                    <th className="pb-2 font-semibold text-white text-right">{t('quantity') || 'Quantity'}</th>
                    <th className="pb-2 font-semibold text-white text-right">{t('original_price') || 'Original Price'}</th>
                    <th className="pb-2 font-semibold text-white text-right">{t('ordered_price') || 'Order Price'}</th>
                    <th className="pb-2 font-semibold text-white text-right">{t('saving') || 'Saving'}</th>
                    <th className="pb-2 font-semibold text-white text-right">{t('trading_fee') || 'Fee (1%)'}</th>
                    <th className="pb-2 font-semibold text-white text-right">{t('total') || 'Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems
                    .filter((item: any) => item.finalized)
                    .map((item: any) => {
                      const regularPrice = item.regularPriceAtOrder || item.priceAtOrder
                      const savingsPerItem = regularPrice - item.priceAtOrder
                      const itemTotal = item.priceAtOrder * item.quantity
                      const itemFee = item.feePaid || 0
                      const totalSavings = savingsPerItem * item.quantity
                      
                      return (
                        <tr key={item._id} className="border-b border-gray-700 last:border-0">
                          <td className="py-3 text-gray-200">{item.drinkName}</td>
                          <td className="py-3 text-right text-gray-200">{item.quantity}</td>
                          <td className="py-3 text-right text-gray-400">{regularPrice.toFixed(2)} €</td>
                          <td className="py-3 text-right text-white font-semibold">{item.priceAtOrder.toFixed(2)} €</td>
                          <td className="py-3 text-right">
                            <span className={totalSavings > 0 ? 'text-green-400 font-semibold' : totalSavings < 0 ? 'text-red-400 font-semibold' : 'text-gray-400'}>
                              {totalSavings > 0 ? '+' : ''}{totalSavings.toFixed(2)} €
                            </span>
                          </td>
                          <td className="py-3 text-right text-yellow-400">{itemFee.toFixed(2)} €</td>
                          <td className="py-3 text-right text-white font-bold">{(itemTotal + itemFee).toFixed(2)} €</td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>

            <Separator className="my-4" />

            {/* Summary Section */}
            <div className="space-y-2">
              <div className="flex justify-between text-base">
                <span className="text-gray-300">{t('total') || 'Total'} ({t('original_price') || 'Original'}):</span>
                <span className="text-gray-300">
                  {orderItems
                    .filter((item: any) => item.finalized)
                    .reduce((sum: number, item: any) => {
                      const regularPrice = item.regularPriceAtOrder || item.priceAtOrder
                      return sum + (regularPrice * item.quantity)
                    }, 0).toFixed(2)} €
                </span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-gray-300">{t('savings_total') || 'Total Savings'}:</span>
                {(() => {
                  const totalSavings = orderItems
                    .filter((item: any) => item.finalized)
                    .reduce((sum: number, item: any) => {
                      const regularPrice = item.regularPriceAtOrder || item.priceAtOrder
                      const savings = (regularPrice - item.priceAtOrder) * item.quantity
                      return sum + savings
                    }, 0)
                  const isPositive = totalSavings > 0
                  const colorClass = isPositive ? 'text-green-400' : 'text-red-400'
                  return (
                    <span className={`${colorClass} font-semibold`}>
                      {isPositive ? '+' : ''}{totalSavings.toFixed(2)} €
                    </span>
                  )
                })()}
              </div>
              <div className="flex justify-between text-base">
                <span className="text-gray-300">{t('trading_fee') || 'Trading Fee (1%)'}:</span>
                <span className="text-yellow-400">
                  +{orderItems
                    .filter((item: any) => item.finalized)
                    .reduce((sum: number, item: any) => sum + (item.feePaid || 0), 0).toFixed(2)} €
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-xl font-bold">
                <span className="text-white">{t('total_with_fee') || 'Total incl. Fee'}:</span>
                <span className="text-white">
                  {orderItems
                    .filter((item: any) => item.finalized)
                    .reduce((sum: number, item: any) => sum + (item.quantity * item.priceAtOrder) + (item.feePaid || 0), 0).toFixed(2)} €
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
