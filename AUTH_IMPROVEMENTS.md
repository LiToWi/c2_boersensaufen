# Auth System Review & Improvements

## Issues Fixed

### 1. **No Session Validation on Refresh** ✅
**Problem:** When a user refreshed with a valid JWT token, the system didn't verify if the underlying table still existed in Convex.

**Solution:** 
- Added `jwt()` callback in `authOptions` to validate the table exists on every request
- Added `session()` callback to perform a final table existence check before returning session to client
- Sessions with deleted tables are automatically invalidated

### 2. **Stale Session Data** ✅
**Problem:** JWT tokens remained valid even if the table was deleted from Convex.

**Solution:**
- JWT callback now queries Convex to verify table still exists
- If table is gone, returns `null` to invalidate the token
- Session callback marks invalid sessions with `user.invalid = true` flag

### 3. **No Session Invalidation Strategy** ✅
**Problem:** No mechanism to invalidate sessions when tables are deleted or reset.

**Solution:**
- Server-side callbacks validate table on every auth flow
- Client detects `user.invalid` flag and triggers logout with redirect
- PartyContext clears on logout to prevent stale data

### 4. **PartyContext + Auth Mismatch** ✅
**Problem:** PartyContext and NextAuth could disagree about current user/table after refresh.

**Solution:**
- Main `/app/page.tsx` now syncs PartyContext with auth session on mount
- If user is authenticated but PartyContext table differs, sync them
- If session marked invalid, clear PartyContext and redirect to home

### 5. **No Table Existence Check in Routes** ✅
**Problem:** Protected routes like `/dashboard/user` didn't verify table still exists.

**Solution:**
- Added validation in user dashboard to check `session.user.invalid` flag
- Detects invalid sessions and triggers logout with redirect
- Prevents stale routes from rendering with dead sessions

## New Files Added

### `/src/lib/useSessionValidation.ts`
- Hook to validate session and auto-logout if table becomes invalid
- Can be used in any route that needs session protection
- Queries Convex to verify table exists

### `/src/app/api/auth/check-table/route.ts`
- API endpoint to check if a table exists
- Used by HomeClient for auto-login detection
- Returns table existence status and metadata

## Modified Files

### `/src/lib/auth.ts`
- Added `jwt()` callback: validates table exists on every request
- Added `session()` callback: marks sessions as invalid if table not found
- Both callbacks fail gracefully (fail-open) on Convex connection errors

### `/src/app/page.tsx`
- Syncs PartyContext with auth session on mount
- Detects invalid sessions and clears PartyContext
- Auto-logs out users whose tables no longer exist

### `/src/app/HomeClient.tsx`
- Added auto-login detection for stored table/party combos
- Checks if stored table still exists before attempting login
- Clears invalid stored data from localStorage

### `/src/app/dashboard/user/page.tsx`
- Added session validity check on mount
- Detects `user.invalid` flag and triggers logout
- Prevents rendering with dead sessions

## Auth Flow Diagram

```
User visits site
    ↓
Check if valid JWT session exists
    ↓
JWT callback: Validate table exists in Convex
    ├─ Table exists? → Continue
    └─ Table missing? → Invalidate token
    ↓
Session callback: Final table existence check
    ├─ Table exists? → Return valid session
    └─ Table missing? → Mark user.invalid = true
    ↓
Client receives session
    ├─ user.invalid = true? → Logout + redirect
    └─ Valid session? → Redirect to dashboard
    ↓
Dashboard mounts
    ├─ Check user.invalid flag
    └─ If invalid, logout + redirect to home
```

## Fail-Safe Behavior

- If Convex becomes temporarily unavailable:
  - JWT callback allows token to pass (fail-open)
  - Session is not invalidated
  - User can continue using app
  - When Convex recovers, validation resumes

- If table is deleted while user is logged in:
  - Next request will detect missing table
  - Session marked as invalid
  - User will be logged out on next page load or refresh

## Testing Recommendations

1. **Delete a table while user is logged in:**
   - Verify JWT callback detects missing table
   - Verify session callback marks invalid
   - Verify next page refresh logs out user

2. **Refresh with valid token:**
   - Verify JWT callback validates table
   - Verify session returns with valid data
   - Verify PartyContext syncs with session

3. **Manually invalidate JWT:**
   - Clear auth session cookie
   - Verify page redirects to login

4. **Test Convex connection loss:**
   - Stop backend temporarily
   - Verify auth still works (fail-open behavior)
   - Stop and restart backend
   - Verify validation resumes

## Future Improvements

1. Add refresh token rotation for additional security
2. Add user agent / IP validation to prevent session theft
3. Add audit logging for session validation events
4. Add dashboard widget to monitor session health
5. Add optional 2FA for admin table
