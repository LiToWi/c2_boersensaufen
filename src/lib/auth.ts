import CredentialsProvider from "next-auth/providers/credentials";
import { api } from "../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import type { AuthOptions } from "next-auth";

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
  },
  secret: process.env.NEXTAUTH_SECRET,
};
