'use client'

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
    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div>Loading...</div>
            </div>
        )
    }

    // Show redirecting message while redirecting
    if (!session) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div>Redirecting to login...</div>
            </div>
        )
    }

    // User is authenticated, render the dashboard content
    return <>{children}</>
}