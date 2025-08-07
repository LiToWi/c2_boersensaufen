'use client'

import { SessionProvider } from 'next-auth/react'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { PartyProvider } from '@/contexts/PartyContext'

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ConvexProvider client={convex}>
        <PartyProvider>
          {children}
        </PartyProvider>
      </ConvexProvider>
    </SessionProvider>
  )
}