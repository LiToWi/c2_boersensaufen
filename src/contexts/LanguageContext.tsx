"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Lang = 'de' | 'en'

type LangContextType = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, fallback?: string) => string
}

const LanguageContext = createContext<LangContextType | undefined>(undefined)

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  de: {
    app_title: 'Börsensaufen 🍻',
    // categories
    cat_saefte: 'Säfte & Schorlen',
    cat_bier: 'Bier & Biermischgetränke',
    cat_non_alc: 'Softdrinks',
    cat_wine: 'Wein',
    cat_mocktails: 'Mocktails (alkoholfrei)',
    cat_cocktails: 'Cocktails',
    home_title: 'Servus,',
    home_subtitle: 'Scanne den Tisch-QR-Code, um an der Börsensaufen teilzunehmen!',
    nav_home: 'Startseite',
    nav_drinks: 'Getränke',
    nav_dashboard: 'Dashboard',
    nav_my_party: 'Meine Party',
    login: 'Anmelden',
    logout: 'Abmelden',
    notfound_title: '404 – Seite nicht gefunden',
    notfound_sub: 'Die gesuchte Seite konnte nicht gefunden werden.',
    go_back_home: 'Zurück zur Startseite',
    cookie_prompt_title: 'Sprache & Cookies',
    cookie_prompt_text: 'Wähle eine Sprache. Wir speichern außerdem notwendige Cookies (z.B. Session). Du kannst weitere Cookies später anpassen.',
    accept: 'Akzeptieren',
  choose_de: 'Deutsch',
  choose_en: 'English',
  choose_language: 'Sprache wählen',
    // additional
    loading: 'Lädt...',
    no_products: 'Keine Produkte',
    drinks_menu: 'Getränke Übersicht',
    ungrouped: 'Ohne Kategorie',
    cat_heiss: 'Heißgetränke',
    error_prefix: 'Fehler:',
    current_price: 'Aktueller Preis:',
  regular_price: 'Originalpreis:',
  saving: 'Ersparnis',
  more_expensive: 'Teurer um',
    info: 'Info',
    info_text: 'Einige Details zum Getränk können hier stehen.',
    history: 'Verlauf',
    history_text: 'Letzte Änderungen und Notizen.',
    user_dashboard: 'Benutzer-Dashboard',
    no_favorites: 'Noch keine Favoriten. Markiere ein Getränk mit dem Stern, um es hier anzuzeigen.',
    added: 'Hinzugefügt:',
    invalid_login: 'Ungültige Anmeldung',
    table_name: 'Tischname',
    password: 'Passwort',
    session_not_found: 'Sitzung nicht gefunden.',
    table_not_found: 'Tisch nicht gefunden.',
    go_back: 'Zurück',
    currently_joined: 'Derzeit in Party:',
    leave_party: 'Party verlassen',
    not_in_party: 'Derzeit in keiner Party',
  please_join_party: 'Bitte zuerst einer Party auf deinem Tisch beitreten, um das Dashboard zu sehen.',
  go_to_party: 'Zu den Partys an deinem Tisch',
    table_label: 'an Tisch:',
    create_new_party: 'Neue Party erstellen',
  enter_party_name: 'Party-Name eingeben...',
  party_name: 'Party Name',
    creating: 'Erstelle...',
    create_and_join: 'Erstellen & Beitreten',
    active_parties: 'Aktive Partys',
    no_parties: 'Noch keine Partys an diesem Tisch.',
    closed: 'Geschlossen',
    active: 'Aktiv',
    joined: 'Beigetreten',
    join: 'Beitreten',
    close: 'Schließen',
    parties_label: 'Partys',
    check_in: 'An einen Tisch setzen',
    check_out: 'Tisch verlassen',
  },
  en: {
    app_title: 'Bar Stock Exchange 🍻',
    // categories
    cat_saefte: 'Juices & Spritzers',
    cat_bier: 'Beer & Beer Mixes',
    cat_non_alc: 'Softdrinks',
    cat_wine: 'Wine',
    cat_mocktails: 'Mocktails (alcohol free)',
    cat_cocktails: 'Cocktails',
    home_title: 'Hello,',
    home_subtitle: 'Scan your table QR code to join the bar stock exchange!',
    nav_home: 'Home',
    nav_drinks: 'Drinks',
    nav_dashboard: 'Dashboard',
    nav_my_party: 'My Party',
    login: 'Login',
    logout: 'Logout',
    notfound_title: '404 – Page Not Found',
    notfound_sub: "Sorry, we couldn't find the page you're looking for.",
    go_back_home: 'Go back home',
    cookie_prompt_title: 'Language & Cookies',
    cookie_prompt_text: 'Pick a language. We also store essential cookies (e.g. session). You can adjust others later.',
    accept: 'Accept',
    choose_de: 'Deutsch',
    choose_en: 'English',
  choose_language: 'Choose language',
    // additional
    loading: 'Loading...',
    no_products: 'No products',
    drinks_menu: 'Drinks Menu',
    ungrouped: 'Ungrouped',
    cat_heiss: 'Hot beverages',
    error_prefix: 'Error:',
    current_price: 'Current price:',
  regular_price: 'Original price:',
  saving: 'Saving',
  more_expensive: 'More expensive by',
    info: 'Info',
    info_text: 'Some details about the drink can go here.',
    history: 'History',
    history_text: 'Recent changes and notes.',
    user_dashboard: 'User Dashboard',
    no_favorites: 'No favorite drinks yet. Star a drink to add it here.',
    added: 'Added:',
    invalid_login: 'Invalid login',
    table_name: 'Table name',
    password: 'Password',
    session_not_found: 'Session not found.',
    table_not_found: 'Table not found.',
    go_back: 'Go Back',
    currently_joined: 'Currently joined party:',
    leave_party: 'Leave Party',
    not_in_party: 'Not currently in any party',
  please_join_party: 'Please join a party first, in order to view your dashboard.',
  go_to_party: 'View the parties at your table',
    table_label: 'at Table:',
    create_new_party: 'Create New Party',
  enter_party_name: 'Enter party name...',
  party_name: 'Party Name',
    creating: 'Creating...',
    create_and_join: 'Create & Join',
    active_parties: 'Active Parties',
    no_parties: 'No parties at this table yet.',
    closed: 'Closed',
    active: 'Active',
    joined: 'Joined',
    join: 'Join',
    close: 'Close',
    parties_label: 'Parties',
    check_in: 'Sit at a table',
    check_out: 'Leave table',
  }
}

const COOKIE_LANG = 'lang'
const COOKIE_CONSENT = 'cookie_consent'

function getCookie(name: string) {
  if (typeof document === 'undefined') return undefined
  const v = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)')
  return v ? decodeURIComponent(v[2]) : undefined
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return
  const d = new Date()
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;expires=${d.toUTCString()}`
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('de')

  useEffect(() => {
    // Read existing cookies but do NOT write defaults here so the popup can ask the user.
    const c = getCookie(COOKIE_LANG)
    if (c === 'en' || c === 'de') {
      setLangState(c)
    } else {
      // default to de in memory only
      setLangState('de')
    }
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    setCookie(COOKIE_LANG, l)
  }

  const t = (key: string, fallback?: string) => {
    return TRANSLATIONS[lang][key] ?? fallback ?? key
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}

export { COOKIE_LANG, COOKIE_CONSENT }
