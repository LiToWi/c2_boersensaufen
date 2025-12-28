"use client"

import React from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { lang, setLang, t } = useLanguage()

  return (
    <div className={`flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
      <button onClick={() => setLang('de')} className={`px-2 py-1 rounded ${lang==='de' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>{t('choose_de')}</button>
      <button onClick={() => setLang('en')} className={`px-2 py-1 rounded ${lang==='en' ? 'bg-gray-200' : 'hover:bg-gray-100'}`}>{t('choose_en')}</button>
    </div>
  )
}
