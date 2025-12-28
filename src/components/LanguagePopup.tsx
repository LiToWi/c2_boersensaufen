"use client"

import React, { useEffect, useState } from 'react'
import { useLanguage, COOKIE_CONSENT, COOKIE_LANG } from '@/contexts/LanguageContext'

export default function LanguagePopup() {
  const { lang, setLang, t } = useLanguage()

  // show popup only if no explicit choice yet - check lang cookie
  // LanguageProvider already wrote a default lang cookie; we still offer a one-time UI.

  const acceptDefaults = () => {
    // ensure consent cookie exists and keep current language
    if (typeof document !== 'undefined') {
      const c = document.cookie.match('(^|;)\\s*' + COOKIE_CONSENT + '\\s*=\\s*([^;]+)')
      if (!c) {
        document.cookie = `${COOKIE_CONSENT}=${encodeURIComponent(JSON.stringify({ essential: true, analytics: false, marketing: false }))};path=/`
      }
    }
    // mark dismissed and reload so server components can pick up language if needed
    try { sessionStorage.setItem('langPopupDismissed', '1') } catch(e){}
    setDismissed(true)
    // ensure provider and cookie are in sync
    try {
      // read selectedLang (if any) and set provider
      const sel = selectedLang ?? lang
      setLang(sel)
      document.cookie = `${COOKIE_LANG}=${encodeURIComponent(sel)};path=/;max-age=${60 * 60 * 24 * 365}`
    } catch (e) {}
    window.location.reload()
  }

  const [selectedLang, setSelectedLang] = useState<'de'|'en'|null>(null)

  const setTo = (l: 'de' | 'en') => {
    // only mark selection locally; do not dismiss until user accepts
    setSelectedLang(l)
  }

  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      const v = sessionStorage.getItem('langPopupDismissed')
      if (v) setDismissed(true)
    } catch (e) {
      // ignore
    }
  }, [])

  // if dismissed, don't show
  if (dismissed) return null

  // hide the popup only when both consent AND a language choice exist.
  // If the user already accepted cookies but never selected a language, show the popup
  // so they can choose their language.
  if (typeof document !== 'undefined') {
    const consent = document.cookie.match('(^|;)\\s*' + COOKIE_CONSENT + '\\s*=\\s*([^;]+)')
    const langCookie = document.cookie.match('(^|;)\\s*' + COOKIE_LANG + '\\s*=\\s*([^;]+)')
    if (consent && langCookie) return null
  }

  const dismiss = () => {
    try { sessionStorage.setItem('langPopupDismissed', '1') } catch(e){}
    // hide immediately
    setDismissed(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      dismiss()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lang-popup-title"
      onKeyDown={handleKeyDown}
    >
  {/* backdrop */}
  <div className="absolute inset-0 z-0 bg-black/40 backdrop-blur-sm" onClick={dismiss} />

      {/* panel: bottom sheet on small, centered modal on md+ */}
      <div className="relative z-20 w-full max-w-xl mx-auto">
        <div onClick={(e) => e.stopPropagation()} className="bg-gray-800 text-white dark:bg-gray-900 dark:text-white border border-gray-700 rounded-t-lg md:rounded-lg shadow-lg w-full p-4 md:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 id="lang-popup-title" className="text-lg font-semibold mb-1">{t('cookie_prompt_title')}</h3>
              <p className="text-sm text-gray-300">{t('cookie_prompt_text')}</p>
            </div>
            <div className="ml-4">
              <button
                aria-label="Close language dialog"
                onClick={() => { dismiss() }}
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-300 hover:bg-gray-700"
              >
                ×
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:gap-3">
            <div className="flex gap-2 flex-1">
              <button
                onClick={() => setTo('de')}
                className={`flex-1 text-center px-4 py-2 rounded-md border border-gray-600 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 ${ (selectedLang ?? lang) === 'de' ? 'ring-2 ring-blue-400' : ''}`}
                aria-pressed={(selectedLang ?? lang) === 'de'}
                autoFocus
              >
                {t('choose_de')}
              </button>

              <button
                onClick={() => setTo('en')}
                className={`flex-1 text-center px-4 py-2 rounded-md border border-gray-600 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 ${ (selectedLang ?? lang) === 'en' ? 'ring-2 ring-blue-400' : ''}`}
                aria-pressed={(selectedLang ?? lang) === 'en'}
              >
                {t('choose_en')}
              </button>
            </div>

            <div className="mt-3 sm:mt-0">
              <button
                onClick={acceptDefaults}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {t('accept')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
