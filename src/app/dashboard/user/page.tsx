"use client"

import React, { useEffect, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import DrinkDetailCard from '@/components/DrinkDetailCard'
import { useParty } from '@/contexts/PartyContext'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function UserDashboardPage() {
    const { t } = useLanguage()
    const { data: session, status } = useSession()
    const { currentParty, currentTable } = useParty()
    const router = useRouter()
    const [favorites, setFavorites] = useState<Record<string, any>>({})
    const [detail, setDetail] = useState<null | { id: string; name?: string; price?: number; regularPrice?: number }>(null)

    // Check if session is marked as invalid and logout if so
    useEffect(() => {
        if (status === 'authenticated') {
            const isInvalid = (session?.user as any)?.invalid === true;
            if (isInvalid) {
                console.warn('[UserDashboard] Session is invalid, logging out');
                signOut({ redirect: true, callbackUrl: '/' });
            }
        }
    }, [status, session]);

    const favoritesKey = React.useMemo(() => {
        const id = currentParty ?? currentTable
        return id ? `favoriteDrinks:${id}` : null
    }, [currentParty, currentTable])

    useEffect(() => {
        if (!favoritesKey) {
            setFavorites({})
            return
        }
        try {
            const raw = localStorage.getItem(favoritesKey)
            if (raw) setFavorites(JSON.parse(raw))
            else setFavorites({})
        } catch (e) { setFavorites({}) }
    }, [favoritesKey])

    const openDetail = (item: any) => {
        setDetail({ id: item.id, name: item.name, price: item.price, regularPrice: item.regularPrice })
    }

    const closeDetail = () => setDetail(null)

    // Close detail modal on Escape key
    React.useEffect(() => {
        if (!detail) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeDetail();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [detail])

    const favList = Object.values(favorites || {})

    // Derive table slug: prefer in-memory `currentTable`, then session user (Navbar uses session.user.name),
    // then persist fallback from localStorage.currentParty
    let tableSlug: string | null = null
    try {
        tableSlug = currentTable ?? null
        if (!tableSlug && session?.user?.name) {
            tableSlug = String(session.user.name)
        }
        if (!tableSlug) {
            const raw = localStorage.getItem('currentParty')
            if (raw) {
                const parsed = JSON.parse(raw)
                if (parsed && parsed.table) tableSlug = parsed.table
            }
        }
    } catch (e) {
        tableSlug = currentTable ?? (session?.user?.name ? String(session.user.name) : null)
    }

    const goToHref = tableSlug ? `/tables/${tableSlug}` : '/'

    // Show the prompt whenever the user is not in a party. If they're checked in to a table
    // we link them straight to that table's page so they can join/create a party there.
    if (!currentParty) {
        return (
            <div className="p-6 max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">{t('user_dashboard')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">{t('please_join_party')}</p>
                        <div className="flex gap-2">
                            <Button asChild aria-label={t('go_to_party')}>
                                <Link href={goToHref} className="inline-block">
                                    {t('go_to_party') || 'Go to Party'}
                                </Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-6">{t('user_dashboard')}</h1>

            {/* Favorites Section */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">{t('favorite_drinks') || 'Favorite Drinks'}</h2>
                {favList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('no_favorites')}</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {favList.map((f: any) => (
                            <div 
                                key={f?.id}
                                onClick={() => openDetail(f)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(f); } }}
                                role="button"
                                tabIndex={0}
                                className="cursor-pointer transition-transform hover:scale-105"
                            >
                                <DrinkDetailCard 
                                    id={f?.id} 
                                    name={f?.name} 
                                    currentPrice={f?.price}
                                    regularPrice={f?.regularPrice}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {detail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/60" onClick={closeDetail} />
                    <div className="relative z-10 w-[min(900px,95%)] bg-gray-900 text-white rounded-lg p-6 shadow-xl">
                        <div className="flex justify-between items-start">
                            <button
                                onClick={closeDetail}
                                aria-label={t('close') ?? 'Close'}
                                title={t('close') ?? 'Close'}
                                className="absolute left-4 top-4 text-gray-300 text-2xl w-10 h-10 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-shadow"
                            >
                                ×
                            </button>
                        </div>
                        <div className="mt-4">
                            <DrinkDetailCard 
                                id={detail?.id} 
                                name={detail?.name} 
                                currentPrice={detail?.price}
                                regularPrice={detail?.regularPrice}
                                showOrderButton={true}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}