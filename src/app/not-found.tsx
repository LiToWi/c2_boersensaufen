// app/not-found.tsx

"use client"

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export default function NotFound() {
  const { t } = useLanguage()

  return (
    <div className="flex min-h-screen items-center justify-center text-center p-8">
      <div>
        <h1 className="text-4xl font-bold mb-4">{t('notfound_title')}</h1>
        <p className="text-lg mb-6">{t('notfound_sub')}</p>
        <Link href="/" className="text-blue-500 underline">{t('go_back_home')}</Link>
      </div>
    </div>
  )
}
