'use client'

import { SessionProvider } from 'next-auth/react'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { PartyProvider } from '@/contexts/PartyContext'
import { LanguageProvider } from '@/contexts/LanguageContext'

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
})

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <SessionProvider>
        <ConvexProvider client={convex}>
            <PartyProvider>
              {children}
            </PartyProvider>
        </ConvexProvider>
      </SessionProvider>
    </LanguageProvider>
  )
}