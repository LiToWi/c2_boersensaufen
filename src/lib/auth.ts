import CredentialsProvider from "next-auth/providers/credentials";
import { api } from "../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import type { AuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";

// Server-side Convex client: Docker service name for auth (inside container)
const serverConvex = new ConvexHttpClient("http://backend:3210");

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        name: { label: "Table Name", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.name || !credentials?.password) return null;

        try {
          // Use Convex to fetch the table by name
          const table = await serverConvex.query(api.tables.getTableByName, {
            name: credentials.name,
          });

          if (!table) return null;

          const isAdmin = table.name?.toLowerCase() === 'admin';
          if (!isAdmin) {
            const marketState = await serverConvex.query(api.pricingTick.getMarketState, {} as any);
            if (!marketState || marketState.active === false) {
              throw new Error('MARKET_INACTIVE');
            }
          }

          // Validate password using the mutation
          await serverConvex.mutation(api.tables.validateTablePassword, {
            tableId: table._id,
            password: credentials.password,
          });

          return {
            id: String(table._id),
            name: table.name,
            email: null,
            image: null,
          };
        } catch (e) {
          console.error("Auth error:", e);
          return null;
        }
      },
    }),
    CredentialsProvider({
      id: "token",
      name: "token",
      credentials: {
        token: { label: "Token", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.token) return null;

        try {
          // Use Convex to fetch the table by name
          const table = await serverConvex.query(api.tables.getTableByToken, {
            token: credentials.token,
          });

          if (!table) return null;

          const isAdmin = table.name?.toLowerCase() === 'admin';
          if (!isAdmin) {
            const marketState = await serverConvex.query(api.pricingTick.getMarketState, {} as any);
            if (!marketState || marketState.active === false) {
              throw new Error('MARKET_INACTIVE');
            }
          }

          return {
            id: String(table._id),
            name: table.name,
            email: null,
            image: null,
          };
        } catch (e) {
          console.error("Auth error:", e);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
    // Keep sessions alive a long time (24 hours)
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    /**
     * JWT Callback: Validate token on every request
     * This runs before the session callback and can invalidate tokens
     */
    async jwt({ token, user, account }: { token: JWT; user?: any; account?: any }) {
      // On sign in, add user data to token
      if (user) {
        token.sub = user.id;
        token.name = user.name;
      }

      // On every request: validate the table still exists
      if (token.sub) {
        try {
          const table = await serverConvex.query(api.tables.getTableByID, {
            tableID: token.sub as any,
          });

          if (!table) {
            // Table no longer exists - invalidate token
            console.warn(`[Auth] Table ${token.sub} no longer exists, invalidating token`);
            return null as any;
          }

          // Update token with current table name (in case it changed)
          token.name = table.name;
        } catch (error) {
          console.warn('[Auth] Failed to validate table on JWT callback:', error);
          // If Convex is unreachable, allow token to pass (fail open)
          // This prevents complete lockout during temporary backend issues
        }
      }

      return token;
    },

    /**
     * Session Callback: Return validated session to client
     * This is called when getSession/useSession is invoked
     */
    async session({ session, token }: { session: any; token: JWT }) {
      if (token && session.user) {
        session.user.id = token.sub;
        session.user.name = token.name;
      }

      // Final check: verify table still exists
      if (session.user?.id) {
        try {
          const table = await serverConvex.query(api.tables.getTableByID, {
            tableID: session.user.id as any,
          });

          if (!table) {
            console.warn(`[Auth] Invalidating session: table ${session.user.id} not found`);
            // Return session with invalid flag to signal client to log out
            return { ...session, user: { ...session.user, invalid: true } };
          }
        } catch (error) {
          console.warn('[Auth] Failed to validate table in session callback:', error);
          // Allow session to pass on error (fail open)
        }
      }

      return session;
    },
  },
};
