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
  const disclaimers = [
    'disclaimer_1',
    'disclaimer_2',
    'disclaimer_3',
    'disclaimer_4',
    'disclaimer_5',
    'disclaimer_6',
    'disclaimer_7',
    'disclaimer_8',
    'disclaimer_9',
  ]


  return (
    <main className="flex items-center justify-center p-4 md:p-8">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold font-unica mb-4">{t('home_title')}</h1>
          <p className="text-lg md:text-xl font-vollkorn text-gray-300">{t('home_subtitle')}</p>
        </div>

        <div className="bg-gray-800/60 rounded-lg p-6 md:p-8 border-2 border-yellow-500/50">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-yellow-400 flex items-center gap-2">
            <span>⚠️</span>
            <span>{t('disclaimer_title')}</span>
          </h2>
          <ul className="space-y-3">
            {disclaimers.map((key, index) => (
              <li key={key} className="flex gap-3 text-gray-200">
                <span className="font-bold text-yellow-400 flex-shrink-0">{index + 1}.</span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}
