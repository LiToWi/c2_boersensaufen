"use client"

import React, { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import HomeClient from './HomeClient'

export default function Page() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status !== 'loading' && session) {
      const dest = session.user?.name === 'admin' ? '/dashboard/admin' : '/dashboard/user'
      router.push(dest)
    }
  }, [status, session, router])

  // While checking session/loading, render nothing to avoid flicker; HomeClient will render if not logged in.
  if (status === 'loading') return null

  return <HomeClient />
}