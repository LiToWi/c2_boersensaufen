"use client"

import React from 'react'
import { ChartContainer } from '@/components/ui/chart'
import * as Recharts from 'recharts'
import { useLanguage } from '@/contexts/LanguageContext'

type Snapshot = { ts: number; price: number }

type Props = {
  id?: string
  name?: string
  currentPrice?: number
  regularPrice?: number
  snapshots?: Snapshot[] | null
}

export default function DrinkDetailCard({ id, name, currentPrice, regularPrice, snapshots }: Props) {
  const { t } = useLanguage()

  const displayCurrent = typeof currentPrice === 'number' ? currentPrice : undefined
  const displayRegular = typeof regularPrice === 'number' ? regularPrice : undefined

  const saving = displayRegular !== undefined && displayCurrent !== undefined ? displayRegular - displayCurrent : undefined

  // Build chart data for Recharts
  const data = React.useMemo(() => {
    if (snapshots && snapshots.length > 0) {
      // If exactly 9 snapshots, show a constant function using the most recent price
      if (snapshots.length === 9) {
        const last = snapshots[snapshots.length - 1].price
        return snapshots.map((s, i) => ({ label: i.toString(), price: last }))
      }
      return snapshots
        .slice()
        .sort((a, b) => a.ts - b.ts)
        .map((s) => ({ label: new Date(s.ts).toLocaleString(), price: s.price }))
    }
    if (displayCurrent !== undefined) {
      return [
        { label: '0', price: displayCurrent },
        { label: '1', price: displayCurrent },
      ]
    }
    return []
  }, [snapshots, displayCurrent])

  return (
    <div className="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between">
            <div>
                <h3 className="text-lg font-medium">{name}</h3>
            </div>
            <div className="text-xl font-bold">{currentPrice} €</div>
        </div>
        <div className="mt-3">
            <div className="bg-white dark:bg-gray-900 text-black dark:text-white rounded-md p-4">
            <div className="flex items-start justify-between">
                <div>
                <h3 className="text-xl font-semibold">{name}</h3>
                <div className="text-sm text-muted-foreground">
                    {t('current_price')} {displayCurrent !== undefined ? `${displayCurrent.toFixed(2)} €` : '-'}
                </div>
                </div>
                <div className="text-right">
                {displayRegular !== undefined && (
                    <div className="text-sm text-muted-foreground">{t('regular_price')} {displayRegular.toFixed(2)} €</div>
                )}
                {saving !== undefined && (
                    <div className={"mt-1 font-mono font-medium " + (saving > 0 ? 'text-green-400' : saving < 0 ? 'text-red-400' : 'text-muted-foreground')}>
                    {saving > 0
                        ? `${t('saving') || 'Saving'} ${saving.toFixed(2)} €`
                        : saving < 0
                        ? `${t('more_expensive') || 'More expensive'} ${Math.abs(saving).toFixed(2)} €`
                        : `${t('saving') || 'Saving'} 0.00 €`}
                    </div>
                )}
                </div>
            </div>

            <div className="mt-4">
                <ChartContainer id={`drink-${id ?? name}`} config={{ price: { color: '#f59e0b' } }}>
                <Recharts.LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <Recharts.CartesianGrid strokeDasharray="3 3" />
                    <Recharts.XAxis dataKey="label" hide />
                    <Recharts.YAxis allowDecimals={true} />
                    <Recharts.Tooltip />
                    <Recharts.Line type="monotone" dataKey="price" stroke="#f59e0b" dot={{ r: 2 }} />
                </Recharts.LineChart>
                </ChartContainer>
            </div>
            </div>
        </div>
    </div>
  )
}
