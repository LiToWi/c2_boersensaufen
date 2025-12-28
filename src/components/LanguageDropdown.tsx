"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function LanguageDropdown({ onSelect }: { onSelect?: (l: 'de'|'en') => void }) {
  const { lang, setLang, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('click', onDoc)
    return () => document.removeEventListener('click', onDoc)
  }, [])

  const choose = (l: 'de'|'en') => {
    setLang(l)
    if (onSelect) onSelect(l)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="p-1 rounded cursor-pointer text-gray-100 hover:text-blue-500 dark:hover:text-blue-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        title={t('choose_language', 'Language')}
      >
        <Globe size={18} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg py-1 z-20">
          <button
            onClick={() => choose('de')}
            className={`block w-full text-left hover:text-blue-500 px-3 py-2 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 ${lang === 'de' ? 'font-semibold' : ''}`}
          >
            {t('choose_de')}
          </button>
          <button
            onClick={() => choose('en')}
            className={`block w-full text-left hover:text-blue-500 px-3 py-2 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 ${lang === 'en' ? 'font-semibold' : ''}`}
          >
            {t('choose_en')}
          </button>
        </div>
      )}
    </div>
  )
}
