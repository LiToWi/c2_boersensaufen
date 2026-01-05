"use client"

import { useEffect, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useParty } from '@/contexts/PartyContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Clock, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Id } from '../../convex/_generated/dataModel'

export default function BasketTimerBanner() {
  const { currentParty } = useParty()
  const { t } = useLanguage()
  const pathname = usePathname()
  const [, forceUpdate] = useState(0)

  const orderItems = useQuery(
    api.drinks.getPartyOrders,
    currentParty && currentParty !== "" ? { partyId: currentParty as Id<'parties'> } : "skip"
  )

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(n => n + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Don't show banner on basket page
  if (pathname === '/basket') return null

  if (!orderItems || orderItems.length === 0) return null

  // Filter non-finalized items
  const pendingItems = orderItems.filter((item: any) => !item.finalized)
  if (pendingItems.length === 0) return null

  // Find the item with the shortest remaining time
  const now = Date.now()
  const itemsWithTime = pendingItems.map((item: any) => {
    const age = now - item.createdAt
    const remaining = Math.max(0, 60000 - age)
    return {
      ...item,
      remainingMs: remaining,
      remainingSeconds: Math.ceil(remaining / 1000)
    }
  }).filter(item => item.remainingMs > 0) // Only show items that haven't expired yet

  if (itemsWithTime.length === 0) return null

  // Get the item with shortest time
  const shortestItem = itemsWithTime.reduce((shortest, current) => 
    current.remainingMs < shortest.remainingMs ? current : shortest
  )

  const isExpiring = shortestItem.remainingSeconds <= 10
  const itemCount = pendingItems.length

  return (
    <Link href="/basket">
      <div className={`sticky top-0 z-40 ${
        isExpiring ? 'bg-red-600' : 'bg-blue-600'
      } text-white shadow-lg transition-colors duration-300`}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-5 w-5" />
            <span className="font-semibold">
              {itemCount} {itemCount === 1 ? (t('item') || 'item') : (t('items') || 'items')} {t('in_basket') || 'in basket'}
            </span>
          </div>
          
          <div className={`flex items-center gap-2 ${isExpiring ? 'animate-pulse' : ''}`}>
            <Clock className="h-5 w-5" />
            <span className="font-bold text-lg">
              {shortestItem.remainingSeconds}s
            </span>
            <span className="text-sm opacity-90">
              {isExpiring ? (t('expiring_soon') || 'Expiring!') : (t('remaining') || 'remaining')}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
