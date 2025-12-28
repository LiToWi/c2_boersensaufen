"use client"

import React, { useEffect, useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import DrinkDetailCard from '@/components/DrinkDetailCard'

export default function UserDashboardPage() {
    const { t } = useLanguage()
    const [favorites, setFavorites] = useState<Record<string, any>>({})

    useEffect(() => {
        try {
            const raw = localStorage.getItem('favoriteDrinks')
            if (raw) setFavorites(JSON.parse(raw))
        } catch (e) {}
    }, [])

    const favList = Object.values(favorites || {})

    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold mb-4">{t('user_dashboard')}</h1>
            {favList.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('no_favorites')}</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {favList.map((f: any) => (
                        <div key={f.id} className="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-medium">{f.name}</h3>
                                </div>
                                <div className="text-xl font-bold">{f.price} €</div>
                            </div>
                            <div className="mt-3">
                                <DrinkDetailCard id={f?.id} name={f?.name} currentPrice={f?.price} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}