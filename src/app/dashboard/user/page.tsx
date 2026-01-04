"use client"

import React, { useEffect, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import DrinkDetailCard from '@/components/DrinkDetailCard'
import { useParty } from '@/contexts/PartyContext'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function UserDashboardPage() {
    const { t } = useLanguage()
    const { data: session } = useSession()
    const { currentParty, currentTable } = useParty()
    const [favorites, setFavorites] = useState<Record<string, any>>({})

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
            <h1 className="text-2xl font-semibold mb-4">{t('user_dashboard')}</h1>
            {favList.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('no_favorites')}</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {favList.map((f: any) => (
                        <DrinkDetailCard id={f?.id} name={f?.name} currentPrice={f?.price} />
                    ))}
                </div>
            )}
        </div>
    )
}