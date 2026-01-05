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
    home_subtitle: 'Scanne den Tisch-QR-Code, um am Börsensaufen teilzunehmen!',
      disclaimer_title: 'Wichtige Hinweise',
      disclaimer_1: 'Keine Rückerstattungen möglich',
      disclaimer_2: 'Aus Sicherheits- und Verwaltungsgründen kannst du maximal das 3-fache deiner Gruppengröße an Getränken pro Bestellung aufgeben',
      disclaimer_3: 'Alle Bestellungen werden auf einmal zum Tisch geliefert, Getränke können nicht verzögert werden',
      disclaimer_4: 'Essen ist nicht im Börsenhandel enthalten',
      disclaimer_5: 'Das Bestellen von Getränken zu regulären Preisen ist heute nicht möglich',
      disclaimer_6: 'Das Eröffnen einer Gruppe ist nur gegen Vorlage eines Studentenausweises (o.Ä.) möglich',
      disclaimer_7: 'Jedes Produkt hat eine versteckte Kapazität, danach ist es für die Nacht ausverkauft',
      disclaimer_8: 'Es wird zufällige Events geben',
      disclaimer_9: 'Bestellungen müssen innerhalb von 1 Minute abgeschlossen werden, um den Preis zu behalten',
    nav_home: 'Startseite',
    nav_drinks: 'Getränke',
    nav_dashboard: 'Dashboard',
    nav_my_party: 'Meine Gruppe',
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
    currently_joined: 'Derzeit in Gruppe:',
    leave_party: 'Gruppe verlassen',
    not_in_party: 'Derzeit in keiner Gruppe',
    create_party_limit: 'Du kannst nur eine aktive Gruppe gleichzeitig haben. Schließe zuerst die bestehende Gruppe.',
    party_already_exists: 'Eine aktive Gruppe mit diesem Namen existiert bereits an diesem Tisch. Bitte schließe sie zuerst oder wähle einen anderen Namen.',
    creator_required: 'Fehlende Ersteller-ID. Bitte erneut versuchen.',
    enter_paid_amount: 'Bezahlt an der Kasse (Betrag eingeben):',
    paid_amount_invalid: 'Ungültiger Betrag.',
    paid_amount_mismatch: 'Bezahlt stimmt nicht mit dem Gruppenumsatz überein.',
  please_join_party: 'Bitte zuerst einer Gruppe auf deinem Tisch beitreten, um das Dashboard zu sehen.',
  go_to_party: 'Zu den Gruppen an deinem Tisch',
    table_label: 'an Tisch:',
    create_new_party: 'Neue Gruppe erstellen',
  enter_party_name: 'Gruppen-Name eingeben...',
  party_name: 'Gruppen Name',
    creating: 'Erstelle...',
    create_and_join: 'Erstellen & Beitreten',
  incorrect_password: 'Falsches Passwort',
  party_name_placeholder: 'z.B: Gruppe 1',
  party_name_placeholder_title: 'Gruppen Name',
  enter_party_password: 'Bitte Passwort für die Gruppe eingeben...',
  create_party_failed: 'Erstellen der Gruppe fehlgeschlagen',
  create_party: 'Gruppe erstellen',
    active_parties: 'Aktive Gruppen',
    no_parties: 'Noch keine Gruppen an diesem Tisch.',
    closed: 'Geschlossen',
    active: 'Aktiv',
    joined: 'Beigetreten',
    join: 'Beitreten',
    close: 'Schließen',
    parties_label: 'Gruppen',
    check_in: 'An einen Tisch setzen',
    check_out: 'Tisch verlassen',
    // Shopping basket
    shopping_basket: 'Warenkorb',
    no_orders_yet: 'Noch keine Bestellungen. Beginne Getränke zu bestellen!',
    total: 'Gesamt',
    trading_fee: 'Handelsgebühr (1%)',
    total_with_fee: 'Gesamt inkl. Gebühr',
    items: 'Artikel',
    basket_info: 'Bestellungen werden getrackt, aber noch nicht an Ready2Order übermittelt. Schließe deine Gruppen-Sitzung ab, um Bestellungen zu finalisieren.',
    add_to_basket: 'Zum Warenkorb hinzufügen',
    adding: 'Wird hinzugefügt...',
    order_added: 'Zum Warenkorb hinzugefügt!',
    order_failed: 'Fehler beim Hinzufügen zum Warenkorb',
    favorite_drinks: 'Lieblingsgetränke',
    cannot_leave_with_orders: 'Es gibt ausstehende oder finalisierte Bestellungen in dieser Gruppe. Bitte schließe oder lösche alle Bestellungen, bevor du die Gruppe verlässt.',
    creator_cannot_leave: 'Als Gruppenersteller kannst du die Gruppe nicht verlassen, solange es Bestellungen gibt. Bitte schließe die Gruppe oder übertrage die Inhaberschaft.',
    last_member_cannot_leave: 'Als letztes Mitglied kannst du die Gruppe nicht verlassen, solange es Bestellungen gibt. Bitte schließe die Gruppe zuerst.',
    must_leave_party_first: 'Bitte verlasse deine Gruppe, bevor du dich abmeldest.',
    only_creator_can_close: 'Nur der Ersteller der Gruppe kann diese wieder schließen.',
    creator_cannot_leave_last: 'Als Gruppenersteller und letztes Mitglied musst du die Gruppe schließen und alle Zahlungen abwickeln, bevor du gehen kannst.',
    cannot_close_with_finalized: 'Gruppe kann nicht geschlossen werden, solange finalisierte Bestellungen bestehen. Alle Zahlungen müssen an der Kasse beglichen werden.',
    error_closing_party: 'Fehler beim Schließen der Gruppe. Bitte versuche es erneut.',
    basket_timer_info: 'Artikel werden nach 1 Minute automatisch entfernt',
    remaining: 'verbleibend',
    continue_shopping: 'Weiter einkaufen',
    view_basket: 'Warenkorb ansehen',
    view_basket_items: 'Warenkorb-Artikel ansehen und verwalten',
    quantity: 'Menge',
    quantity_error: 'Bitte mindestens 1 Artikel auswählen',
    order_history: 'Bestellhistorie',
    drink: 'Getränk',
    party_password_placeholder: 'z.B: 1234',
    party_password_placeholder_title: 'Gruppen Passwort',
    ordered_price: 'Bestellpreis',
    savings_total: 'Gesamtersparnis',
    original_price: 'Originalpreis',
    no_history: 'Noch keine Bestellungen',
    finalize_order: 'Jetzt kostenpflichtig an der Bar bestellen!',
    finalizing: 'Wird abgeschickt...',
    order_finalized: 'Bestellung erfolgreich abgeschickt!',
    finalize_error: 'Fehler beim Abschicken der Bestellung',
    purchase_limit_exceeded: 'Bestelllimit erreicht',
    purchase_limit_message: 'Deine Gruppe ({members} Mitglieder) kann maximal {limit} Artikel im Warenkorb haben. Aktuell: {current}',
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
    home_title: 'Servus,',
    home_subtitle: 'Scan your table QR code to join the bar stock exchange!',
      disclaimer_title: 'Important Notice',
      disclaimer_1: 'No refunds possible',
      disclaimer_2: 'For security and management reasons, you can only place 3x your group size drinks into one order',
      disclaimer_3: 'All orders are delivered to the table at once, drinks cannot be delayed',
      disclaimer_4: 'Food is not included in the bar stock exchange',
      disclaimer_5: 'Ordering drinks at regular prices is not possible today',
      disclaimer_6: 'Opening a party can only be done in exchange for a student ID (or similar)',
      disclaimer_7: 'Each product has a hidden capacity, after that it\'s sold out for the night',
      disclaimer_8: 'There will be random events',
      disclaimer_9: 'Orders must be placed within 1 minute to keep the price',
    nav_home: 'Home',
    create_party: 'Create party',
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
  party_password_placeholder: 'e.g: 1234',
  party_password_placeholder_title: 'Party Password',
  enter_party_password: 'Please enter party password...',
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
    create_party_limit: 'You can only have one active party at a time. Close the current one first.',
    party_already_exists: 'An active party with this name already exists at this table. Please close it first or choose a different name.',
    creator_required: 'Missing creator id. Please try again.',
    enter_paid_amount: 'Enter amount paid at register:',
    paid_amount_invalid: 'Invalid amount.',
    paid_amount_mismatch: 'Paid amount does not match party spend.',
  please_join_party: 'Please join a party first, in order to view your dashboard.',
  go_to_party: 'View the parties at your table',
    table_label: 'at Table:',
    create_new_party: 'Create New Party',
  enter_party_name: 'Enter party name...',
  party_name: 'Party Name',
    creating: 'Creating...',
    create_and_join: 'Create & Join',
  incorrect_password: 'Incorrect password',
  party_name_placeholder: 'e.g: Group 1',
  party_name_placeholder_title: 'Party Name',
  create_party_failed: 'Failed to create party',
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
    // Shopping basket
    shopping_basket: 'Shopping Basket',
    no_orders_yet: 'No orders yet. Start ordering drinks!',
    total: 'Total',
    trading_fee: 'Trading Fee (1%)',
    total_with_fee: 'Total incl. Fee',
    items: 'items',
    basket_info: 'Orders are tracked but not yet submitted to Ready2Order. Complete your party session to finalize orders.',
    add_to_basket: 'Add to Basket',
    adding: 'Adding...',
    order_added: 'Added to basket!',
    order_failed: 'Failed to add to basket',
    favorite_drinks: 'Favorite Drinks',
    cannot_leave_with_orders: 'There are pending or finalized orders in this party. Please complete or clear all orders before leaving.',
    creator_cannot_leave: 'As the party creator, you cannot leave while there are orders. Please close the party or transfer ownership first.',
    last_member_cannot_leave: 'As the last member, you cannot leave while there are orders. Please close the party first.',
    must_leave_party_first: 'Please leave your party before logging out.',
    only_creator_can_close: 'Only the creator of the party can close it.',
    creator_cannot_leave_last: 'As the party creator and last member, you must close the party and settle all payments before leaving.',
    cannot_close_with_finalized: 'Cannot close party with finalized orders. All payments must be settled at the register before closing.',
    error_closing_party: 'Failed to close party. Please try again.',
    basket_timer_info: 'Items will be automatically removed after 1 minute',
    remaining: 'remaining',
    continue_shopping: 'Continue Shopping',
    view_basket: 'View Basket',
    view_basket_items: 'View and manage your basket items',
    quantity: 'Quantity',
    quantity_error: 'Please select at least 1 item',
    order_history: 'Order History',
    drink: 'Drink',
    ordered_price: 'Order Price',
    savings_total: 'Total Savings',
    original_price: 'Original Price',
    no_history: 'No orders yet',
    finalize_order: 'Order now at the bar (paid)!',
    finalizing: 'Submitting...',
    order_finalized: 'Order successfully submitted!',
    finalize_error: 'Error submitting order',
    purchase_limit_exceeded: 'Purchase limit exceeded',
    purchase_limit_message: 'Your party ({members} members) can have max {limit} pending items in basket. Currently: {current}',
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
