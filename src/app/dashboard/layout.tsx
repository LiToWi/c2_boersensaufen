'use client'

import LoadingAnimation from '@/components/LoadingAnimation'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === 'loading') return // Still loading session
        if (!session) router.push('/login') // No session, redirect to login
    }, [session, status, router])

    // Show loading while checking session
    if (status === 'loading' || !session) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingAnimation />
            </div>
        )
    }

    // User is authenticated, render the dashboard content
    return <>{children}</>
}