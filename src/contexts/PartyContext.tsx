'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type PartyContextType = {
  currentTable: string | null
  currentParty: string | null
  partyName: string | null
  setCurrentParty: (table: string, party: string, name: string) => void
  clearCurrentParty: () => void
}

const PartyContext = createContext<PartyContextType | undefined>(undefined)

export function PartyProvider({ children }: { children: ReactNode }) {
  const [currentTable, setCurrentTable] = useState<string | null>(null)
  const [currentParty, setCurrentParty] = useState<string | null>(null)
  const [partyName, setPartyName] = useState<string | null>(null)

  const handleSetCurrentParty = (table: string, party: string, name: string) => {
    setCurrentTable(table)
    setCurrentParty(party)
    setPartyName(name)
    // Optionally save to localStorage for persistence
    localStorage.setItem('currentParty', JSON.stringify({ table, party, name }))
  }

  const clearCurrentParty = () => {
    setCurrentTable(null)
    setCurrentParty(null)
    setPartyName(null)
    localStorage.removeItem('currentParty')
  }

  return (
    <PartyContext.Provider value={{
      currentTable,
      currentParty,
      partyName,
      setCurrentParty: handleSetCurrentParty,
      clearCurrentParty
    }}>
      {children}
    </PartyContext.Provider>
  )
}

export function useParty() {
  const context = useContext(PartyContext)
  if (context === undefined) {
    throw new Error('useParty must be used within a PartyProvider')
  }
  return context
}