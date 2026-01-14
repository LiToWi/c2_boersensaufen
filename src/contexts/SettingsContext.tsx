"use client"

import React from 'react'
import { useQuery } from 'convex/react'
import { api } from '@/../convex/_generated/api'

type SettingsValue = {
  tradingFeeRate: number | undefined
  pricingConfig: any | undefined
}

const SettingsContext = React.createContext<SettingsValue>({ tradingFeeRate: undefined, pricingConfig: undefined })

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const settings = useQuery(api.settings.getSettings)
  const value = React.useMemo<SettingsValue>(() => ({
    tradingFeeRate: settings?.tradingFeeRate,
    pricingConfig: settings?.pricingConfig,
  }), [settings])

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return React.useContext(SettingsContext)
}
