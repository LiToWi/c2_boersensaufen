"use client"

import React, { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useParty } from '@/contexts/PartyContext'
import HomeClient from './HomeClient'

export default function Page() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { clearCurrentParty } = useParty()

  // On mount or when session changes, sync PartyContext with auth session
  useEffect(() => {
    if (status === 'loading') return;

    // If user is authenticated
    if (session?.user) {
      const tableName = session.user.name;

      // Check if user was flagged as invalid by server callbacks
      const isInvalid = (session.user as any).invalid === true;
      if (isInvalid) {
        console.warn('[Page] Session marked as invalid, logging out');
        clearCurrentParty();
        router.push('/');
        return;
      }

      // Redirect to dashboard
      const dest = tableName === 'admin' ? '/dashboard/admin' : '/dashboard/user'
      router.push(dest);
    } else if (status === 'unauthenticated') {
      // Clear PartyContext if logged out
      clearCurrentParty();
    }
  }, [status, session, clearCurrentParty, router])

  // While checking session/loading, render nothing to avoid flicker; HomeClient will render if not logged in.
  if (status === 'loading') return null

  return <HomeClient />
}