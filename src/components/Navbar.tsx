"use client";

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, X, ShoppingCart } from 'lucide-react'
import LanguageDropdown from './LanguageDropdown'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSession, signOut } from 'next-auth/react'
import { useParty } from '@/contexts/PartyContext'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { data: session, status } = useSession()
  const { t } = useLanguage()
  const { currentParty, clearCurrentParty } = useParty()
  const leaveMember = useMutation(api.partyMembers.leaveMember)
  
  // Get basket item count
  const basketSummary = useQuery(
    api.drinks.getPartyOrderSummary,
    currentParty && currentParty !== "" ? { partyId: currentParty as Id<'parties'> } : "skip"
  )
  const allPartyOrders = useQuery(
    api.drinks.getPartyOrders,
    currentParty && currentParty !== "" ? { partyId: currentParty as Id<'parties'> } : "skip"
  )
  
  // Calculate total quantity of all items (not finalized)
  const basketCount = allPartyOrders
    ? allPartyOrders
        .filter((item: any) => !item.finalized)
        .reduce((sum: number, item: any) => sum + item.quantity, 0)
    : 0

  // Function to close mobile menu
  const closeMobileMenu = () => {
    setIsOpen(false)
  }

  const router = useRouter()

  // Handle logout and close menu — use signOut without automatic redirect to avoid slow full-page signout
  const handleLogout = async () => {
    closeMobileMenu()
    
    // Block logout if user is still in a party
    if (currentParty) {
      alert(
        t('must_leave_party_first') || 
        'Please leave your party before logging out.'
      );
      return;
    }
    
    try {
      await signOut({ redirect: false })
    } finally {
      // push to landing or login quickly on the client
      router.push('/')
    }
  }


  return (
    <nav className="w-full bg-gray-900 text-white shadow-md sticky top-0 z-50">
      <div className="flex h-16 items-center justify-between px-4 w-full">
        {/* Left: Logo */}
  <Link href="/" className="flex items-center text-2xl md:text-4xl font-bold tracking-tight hover:text-blue-600 transition">
          <span className="h-12 w-12 mr-2 relative">
            <Image src="/logo.svg" alt="Logo" fill className="object-contain" />
          </span>
          {t('app_title')}
        </Link>

        {/* Center + Right group */}
        <div className="flex items-center space-x-8 ml-auto">
          {/* Nav Links */}
          <div className="hidden md:flex space-x-8 text-xl font-medium items-center">
            {!session && (
              <Link href="/" className="hover:text-blue-600 transition">{t('nav_home')}</Link>
            )}
            <Link href="/drinks" className="hover:text-blue-600 transition">{t('nav_drinks')}</Link>
            {session && (
              <Link href={session.user?.name === 'admin' ? '/dashboard/admin/' : '/dashboard/user'} className="hover:text-blue-600 transition">{t('nav_dashboard')}</Link>
            )}
            {session && (
                <Link href={`/tables/${session.user?.name}`} className="hover:text-blue-600 transition">{t('nav_my_party')}</Link>
            )}
            {session && currentParty && (
              <Link href="/basket" className="hover:text-blue-600 transition relative">
                <ShoppingCart className="h-6 w-6" />
                {basketCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {basketCount}
                  </span>
                )}
              </Link>
            )}
          </div>

          {/* Login/Logout Button */}
          {status === 'loading' ? (
            <div className="hidden md:block text-sm" />
          ) : session ? (
            <div className="hidden md:flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-4">
                <div className="hidden md:block">
                  <LanguageDropdown />
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-400 text-white px-4 py-2 rounded-md font-semibold transition text-xl"
                >
                  {t('check_out')} ({session.user?.name})
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-4">
              <LanguageDropdown />
              <Link
                href="/login"
                className="hidden md:inline-block bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-semibold transition text-xl"
              >
                {t('check_in')}
              </Link>
            </div>
          )}

          {/* Mobile toggle button */}
          <button
            className="md:hidden focus:outline-none ml-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden px-4 pb-4 space-y-2">
          <div className="block">
            <LanguageDropdown />
          </div>

          {!session && (
            <Link 
              href="/" 
              className="block hover:text-blue-600 transition text-lg"
              onClick={closeMobileMenu}
            >
              {t('nav_home')}
            </Link>
          )}
          <Link 
            href="/drinks" 
            className="block hover:text-blue-600 transition text-lg"
            onClick={closeMobileMenu}
          >
            {t('nav_drinks')}
          </Link>
          {session && (
            <Link 
              href={session.user?.name === 'admin' ? '/dashboard/admin' : '/dashboard/user'} 
              className="block hover:text-blue-600 transition text-lg"
              onClick={closeMobileMenu}
            >
              {t('nav_dashboard')}
            </Link>
          )}
          {session && (
            <Link 
              href={`/tables/${session.user?.name}`} 
              className="block hover:text-blue-600 transition text-lg"
              onClick={closeMobileMenu}
            >
              {t('nav_my_party')}
            </Link>
          )}
          {session && currentParty && (
            <Link 
              href="/basket" 
              className="block hover:text-blue-600 transition text-lg flex items-center gap-2"
              onClick={closeMobileMenu}
            >
              <ShoppingCart className="h-5 w-5" />
              {t('shopping_basket')} {basketCount > 0 && `(${basketCount})`}
            </Link>
          )}
          {session ? (
            <button
              onClick={handleLogout}
              className="block w-full text-left bg-red-500 hover:bg-red-400 text-white px-4 py-2 rounded-md font-semibold transition"
            >
              {t('check_out')} ({session.user?.name})
            </button>
          ) : (
            <Link 
              href="/login" 
              className="block bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-semibold transition"
              onClick={closeMobileMenu}
            >
              {t('check_in')}
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}