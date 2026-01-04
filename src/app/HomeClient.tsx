"use client"

import { useEffect } from 'react'
import { useParty } from '../contexts/PartyContext'
import { useLanguage } from '@/contexts/LanguageContext'

export default function HomeClient() {
  const { currentTable, currentParty, partyName } = useParty()
  const { t } = useLanguage()

  useEffect(() => {
    console.log('Current Party Info:', {
      currentTable,
      currentParty,
      partyName,
    })
  }, [currentTable, currentParty, partyName])

  return (
    <main className="flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold font-unica">{t('home_title')}</h1>
        <p className="mt-4 font-quantico">{t('home_subtitle')}</p>
      </div>
    </main>
  )
}
