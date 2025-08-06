import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import type { AuthOptions } from 'next-auth'

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        name: { label: 'Table Name', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.name || !credentials?.password) return null

        const table = await prisma.table.findUnique({
          where: { name: credentials.name },
        })

        if (!table) return null

        const isValid = credentials.password === table.password
        if (!isValid) return null

        return {
          id: String(table.id),
          name: table.name,
          email: null,
          image: null,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
}
