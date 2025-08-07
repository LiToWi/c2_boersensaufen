import CredentialsProvider from 'next-auth/providers/credentials'
import { api } from '../../convex/_generated/api'
import { ConvexHttpClient } from 'convex/browser'
import type { AuthOptions } from 'next-auth'

// Create Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

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

        try {
          // Use Convex to fetch the table by name
          const table = await convex.query(api.tables.getTableByName, {
            name: credentials.name,
          })

          if (!table) return null

          // Validate password using the mutation
          await convex.mutation(api.tables.validateTablePassword, {
            tableId: table._id,
            password: credentials.password,
          })

          return {
            id: String(table._id),
            name: table.name,
            email: null,
            image: null,
          }
        } catch (e) {
          console.error('Auth error:', e)
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
}