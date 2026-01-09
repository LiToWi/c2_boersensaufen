'use client'

import { SessionProvider } from 'next-auth/react'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { PartyProvider } from '@/contexts/PartyContext'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { Toaster } from 'sonner'

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || 'http://127.0.0.1:3210'
console.log('[Convex] Initializing client with URL:', convexUrl)
console.log('[Convex] Hostname:', typeof window !== 'undefined' ? window.location.hostname : 'server-side')
console.log('[Convex] Full URL:', typeof window !== 'undefined' ? window.location.href : 'server-side')

const convex = new ConvexReactClient(convexUrl, {
  unsavedChangesWarning: false,
})

export default function Providers({ children }: { children: React.ReactNode }) {
  // Log when component mounts
  if (typeof window !== 'undefined') {
    console.log('[Convex Provider] Mounted on', window.location.hostname)
  }
  
  return (
    <LanguageProvider>
      <SessionProvider>
        <ConvexProvider client={convex}>
            <PartyProvider>
              {children}
              <Toaster position="top-center" richColors />
            </PartyProvider>
        </ConvexProvider>
      </SessionProvider>
    </LanguageProvider>
  )
}