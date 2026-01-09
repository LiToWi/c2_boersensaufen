"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParty } from '../contexts/PartyContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

export default function HomeClient() {
  const { currentTable, currentParty, partyName } = useParty()
  const { t } = useLanguage()
  const marketState = useQuery(api.pricingTick.getMarketState)

  useEffect(() => {
    console.log('Current Party Info:', {
      currentTable,
      currentParty,
      partyName,
    })
  }, [currentTable, currentParty, partyName])

  const targetDate = useMemo(() => new Date(Date.UTC(2026, 0, 15, 17, 0, 0)), [])
  const { display: countdownText, expired } = useCountdown(targetDate, t)
  const marketActive = marketState ? marketState.active !== false : false
  const showCountdownOnly = marketState !== undefined && !marketActive

  const disclaimers = [
    'disclaimer_1',
    'disclaimer_2',
    'disclaimer_3',
    'disclaimer_4',
    'disclaimer_5',
    'disclaimer_7',
    'disclaimer_8',
    'disclaimer_9',
  ]

  const loading = marketState === undefined
  const countdownBlock = (
    <div className="bg-slate-900/70 border border-blue-500/40 rounded-xl p-6 md:p-8 text-center shadow-lg">
      <p className="text-sm text-blue-200 mb-2 uppercase tracking-wide">{t('event_countdown_title') || 'Next Börsensaufen session'}</p>
      <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{countdownText}</h2>
      <p className="text-gray-300 text-lg mb-2">{t('event_countdown_cta') || 'See you soon — catch the swings!'}</p>
      <p className="text-gray-400 text-sm">{t('market_inactive_message') || 'Market is currently stopped or reset. Only countdown is shown.'}</p>
    </div>
  )

  return (
    <main className="flex items-center justify-center p-4 md:p-8">
      <div className="max-w-4xl w-full space-y-6 relative">
        {expired && <BeerConfetti />}

        {expired && (
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold font-unica mb-4">{t('home_title')}</h1>
            <p className="text-lg md:text-xl font-vollkorn text-gray-300">{t('home_subtitle')}</p>
          </div>
        )}

        {!loading && showCountdownOnly ? (
          <div className="space-y-4">
            {countdownBlock}
            <EventBanner />
            <CombinedRulesAndDisclaimers disclaimers={disclaimers} />
          </div>
        ) : (
          <div className="space-y-6">
            <EventBanner />
            <CombinedRulesAndDisclaimers disclaimers={disclaimers} />
          </div>
        )}
      </div>
    </main>
  )
}

function EventBanner() {
  const { t } = useLanguage()
  return (
    <div className="bg-gradient-to-r from-blue-900/60 via-indigo-800/60 to-purple-800/60 border border-blue-500/40 rounded-xl p-6 md:p-8 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-blue-200">{t('event_banner_title') || 'Börsensaufen Event'}</p>
          <h2 className="text-3xl font-bold text-white mb-2">{t('app_title')}</h2>
          <p className="text-gray-200 max-w-2xl">{t('event_banner_body') || 'Dynamic market: prices update every minute.'}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
          <InfoPill label={t('tick_frequency') || 'Ticks every 60s'} />
          <InfoPill label={t('price_floor') || 'Price floor: buying cost'} />
          <InfoPill label={t('price_unlimited') || 'No price ceiling'} />
        </div>
      </div>
    </div>
  )
}

function CombinedRulesAndDisclaimers({ disclaimers }: { disclaimers: string[] }) {
  const { t } = useLanguage()
  return (
    <div className="bg-gray-800/60 rounded-lg p-6 md:p-8 border-2 border-yellow-500/50">
      <h2 className="text-2xl md:text-3xl font-bold mb-4 text-yellow-400 flex items-center gap-2">
        <span>⚠️</span>
        <span>{t('disclaimer_title')}</span>
      </h2>

      {/* Event Rules Section */}
      <div className="mb-6 pb-4 border-b border-yellow-500/30">
        <div className="bg-yellow-900/20 border border-yellow-400/30 rounded p-3 text-sm text-yellow-50">
          <p className="font-semibold mb-1">{t('party_coc_title') || 'Code of Conduct'}</p>
          <p>{t('fair_play_notice') || 'Fair play required. Abuse → exclusion.'}</p>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-400/30 rounded p-3 text-sm text-yellow-50">
          <p className="font-semibold mb-1">{t('party_helper_title') || 'Party creation'}</p>
          <p>{t('party_helper_hint') || 'Swap an ID to get a party code that allows you to participate. Later you can settle payment at the register.'}</p>
        </div>
      </div>

      {/* Disclaimers Section */}
      <h3 className="text-lg font-semibold text-yellow-300 mb-3">{t('event_rules_title') || 'Event rules'}</h3>
      <ul className="space-y-3">
        {disclaimers.map((key, index) => (
          <li key={key} className="flex gap-3 text-gray-200">
            <span className="font-bold text-yellow-400 flex-shrink-0">{index + 1}.</span>
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BeerConfetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 32 }).map((_, idx) => ({
        id: idx,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 3 + Math.random() * 2,
        rotate: Math.random() * 360,
        size: 18 + Math.random() * 8,
      })),
    []
  )

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
        {pieces.map((p) => (
          <span
            key={p.id}
            className="absolute top-[-10%] animate-beer-fall"
            style={{
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              fontSize: `${p.size}px`,
              transform: `rotate(${p.rotate}deg)`,
            }}
          >
            🍺
          </span>
        ))}
      </div>
      <style jsx global>{`
        @keyframes beer-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        .animate-beer-fall {
          animation-name: beer-fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
    </>
  )
}

function InfoPill({ label }: { label: string }) {
  return (
    <div className="bg-slate-800/70 border border-blue-500/30 rounded-lg px-4 py-3 text-center text-sm text-blue-50">
      {label}
    </div>
  )
}

function useCountdown(targetDate: Date, t: (key: string, fallback?: string) => string) {
  const [now, setNow] = useState<Date>(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const diffMs = targetDate.getTime() - now.getTime()
  if (diffMs <= 0) {
    return { display: '00:00:00', expired: true }
  }

  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (n: number) => n.toString().padStart(2, '0')
  const timePart = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  const dLabel = t('days_short', 'd')
  return { display: days > 0 ? `${days}${dLabel} ${timePart}` : timePart, expired: false }
}
