"use client"

import React, { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, Loader2, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import type { Id } from '../../convex/_generated/dataModel'

interface OrderSubmitProps {
  partyId: Id<'parties'>
}

export default function OrderSubmit({ partyId }: OrderSubmitProps) {
  const { t } = useLanguage()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successDetails, setSuccessDetails] = useState<any>(null)

  const orderItems = useQuery(api.drinks.getPartyOrders, { partyId })
  const summary = useQuery(api.drinks.getPartyOrderSummary, { partyId })
  const party = useQuery(api.parties.getPartyById, { id: partyId })

  const handleSubmit = async () => {
    if (!orderItems || orderItems.length === 0) {
      setErrorMessage('No items to submit')
      setSubmitStatus('error')
      return
    }

    if (!party?.r2oTableId) {
      setErrorMessage('Ready2Order table not yet created. Please wait a moment and try again.')
      setSubmitStatus('error')
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage(null)

    try {
      // Group items by drink name and sum quantities
      const groupedItems = orderItems.reduce((acc: Record<string, { productName: string; quantity: number; pricePerUnit: number }>, item: any) => {
        const key = item.drinkName
        if (!acc[key]) {
          acc[key] = {
            productName: item.drinkName,
            quantity: 0,
            pricePerUnit: item.priceAtOrder,
          }
        }
        acc[key].quantity += item.quantity
        return acc
      }, {} as Record<string, { productName: string; quantity: number; pricePerUnit: number }>)

      const items = Object.values(groupedItems)

      const response = await fetch('/api/ready2order/submit-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partyId,
          items,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit order')
      }

      setSubmitStatus('success')
      setSuccessDetails(result)
    } catch (error: any) {
      console.error('Failed to submit order:', error)
      setSubmitStatus('error')
      setErrorMessage(error?.message || 'Failed to submit order to Ready2Order')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check R2O table status
  const r2oTableStatus = party?.r2oTableCreationStatus
  const r2oTableError = party?.r2oTableCreationError

  if (!orderItems || orderItems.length === 0) {
    return null
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {t('submit_payment') || 'Submit Payment'}
        </CardTitle>
        <CardDescription>
          {t('submit_payment_desc') || 'Submit your order to Ready2Order for payment processing'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* R2O Table Status Warning */}
        {r2oTableStatus === 'pending' && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <Loader2 className="h-5 w-5 text-yellow-600 animate-spin mt-0.5" />
            <div className="text-sm text-yellow-800">
              <strong>Table creation in progress...</strong>
              <p className="mt-1">Creating Ready2Order table for this party. This usually takes a few seconds.</p>
            </div>
          </div>
        )}

        {r2oTableStatus === 'failed' && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="text-sm text-red-800">
              <strong>Table creation failed</strong>
              <p className="mt-1">{r2oTableError || 'Unable to create Ready2Order table. Please contact an administrator.'}</p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {submitStatus === 'success' && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="text-sm text-green-800">
              <strong>Order submitted successfully!</strong>
              <p className="mt-1">
                {successDetails?.productCount} products created and booked to table.
                Total: {successDetails?.totalAmount?.toFixed(2) || '0.00'} €
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {submitStatus === 'error' && errorMessage && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="text-sm text-red-800">
              <strong>Submission failed</strong>
              <p className="mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="p-3 bg-muted rounded-md space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t('items') || 'Items'}:</span>
            <span className="font-medium">{summary?.totalItems || 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{t('subtotal') || 'Subtotal'}:</span>
            <span className="font-medium">{summary?.totalPrice.toFixed(2) || '0.00'} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{t('trading_fee') || 'Trading Fee'}:</span>
            <span className="font-medium">+{summary?.totalFees.toFixed(2) || '0.00'} €</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>{t('total') || 'Total'}:</span>
            <span>{((summary?.totalPrice || 0) + (summary?.totalFees || 0)).toFixed(2)} €</span>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            submitStatus === 'success' ||
            r2oTableStatus === 'pending' ||
            r2oTableStatus === 'failed' ||
            !party?.r2oTableId
          }
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('submitting') || 'Submitting...'}
            </>
          ) : submitStatus === 'success' ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              {t('submitted') || 'Submitted'}
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              {t('submit_to_ready2order') || 'Submit to Ready2Order'}
            </>
          )}
        </Button>

        {/* Info Text */}
        <p className="text-xs text-muted-foreground text-center">
          {t('submit_info') || 'This will create products in Ready2Order and book them to your party table for payment processing.'}
        </p>
      </CardContent>
    </Card>
  )
}
