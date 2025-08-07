"use client";

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { useParty } from '../contexts/PartyContext'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const { data: session, status } = useSession()

  // Function to close mobile menu
  const closeMobileMenu = () => {
    setIsOpen(false)
  }

  // Handle logout and close menu
  const handleLogout = () => {
    closeMobileMenu()
    signOut()
  }

  return (
    <nav className="w-full bg-gray-900 text-white shadow-md sticky top-0 z-50">
      <div className="flex h-16 items-center justify-between px-4 w-full">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center text-2xl font-bold tracking-tight hover:text-blue-600 transition">
          <span className="h-12 w-12 mr-2 relative">
            <Image src="/logo.svg" alt="Logo" fill className="object-contain" />
          </span>
          Börsensaufen 🍻
        </Link>

        {/* Center + Right group */}
        <div className="flex items-center space-x-8 ml-auto">
          {/* Nav Links */}
          <div className="hidden md:flex space-x-8 text-md font-medium">
            <Link href="/" className="hover:text-blue-600 transition">Home</Link>
            <Link href="/drinks" className="hover:text-blue-600 transition">Drinks</Link>
            {session && (
              <Link href="/dashboard/user" className="hover:text-blue-600 transition">Dashboard</Link>
            )}
            {session && (
                <Link href={`/tables/${session.user?.name}`} className="hover:text-blue-600 transition">My Party</Link>
            )}
          </div>

          {/* Login/Logout Button */}
          {status === 'loading' ? (
            <div className="hidden md:block text-sm">Loading...</div>
          ) : session ? (
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => signOut()}
                className="bg-red-500 hover:bg-red-400 text-white px-4 py-1.5 rounded-md font-semibold transition"
              >
                LOGOUT ({session.user?.name})
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden md:inline-block bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-md font-semibold transition"
            >
              LOGIN
            </Link>
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
          <Link 
            href="/" 
            className="block hover:text-blue-600 transition"
            onClick={closeMobileMenu}
          >
            Home
          </Link>
          <Link 
            href="/drinks" 
            className="block hover:text-blue-600 transition"
            onClick={closeMobileMenu}
          >
            Drinks
          </Link>
          {session && (
            <Link 
              href="/dashboard/user" 
              className="block hover:text-blue-600 transition"
              onClick={closeMobileMenu}
            >
              Dashboard
            </Link>
          )}
          {session && (
            <Link 
              href={`/tables/${session.user?.name}`} 
              className="hover:text-blue-600 transition"
              onClick={closeMobileMenu}
            >
              My Party
            </Link>
          )}
          {session ? (
            <button
              onClick={handleLogout}
              className="block w-full text-left bg-red-500 hover:bg-red-400 text-white px-4 py-2 rounded-md font-semibold transition"
            >
              LOGOUT ({session.user?.name})
            </button>
          ) : (
            <Link 
              href="/login" 
              className="block bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-semibold transition"
              onClick={closeMobileMenu}
            >
              LOGIN
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}