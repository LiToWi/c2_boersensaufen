import { useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

/**
 * Hook to validate session and auto-logout if session becomes invalid
 * Checks if the table still exists in Convex
 */
export function useSessionValidation() {
  const { data: session, status } = useSession();
  const tableId = typeof session?.user?.id === 'string' ? (session.user.id as Id<'tables'>) : undefined;

  const table = useQuery(api.tables.getTableByID, tableId ? { tableID: tableId } : 'skip');

  useEffect(() => {
    // Only check if we have a session and the query has resolved
    if (status === 'authenticated' && table !== undefined) {
      // If table query returned null, the table was deleted - logout
      if (table === null) {
        console.warn('[SessionValidation] Table no longer exists, logging out');
        signOut({ redirect: true, callbackUrl: '/' });
      }
    }
  }, [status, table]);

  return { session, status, tableValid: table !== null };
}
