import { NextResponse } from 'next/server';

/**
 * Debug endpoint to test Convex connectivity
 * Helps diagnose if external devices can reach the Convex backend
 */
export async function GET(request: Request) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_SELF_HOSTED_URL || 'http://127.0.0.1:3210';
  const hostname = request.headers.get('host') || 'unknown';
  
  console.log('[Convex Debug] GET /api/debug/convex-check');
  console.log('[Convex Debug] NEXT_PUBLIC_CONVEX_URL:', process.env.NEXT_PUBLIC_CONVEX_URL);
  console.log('[Convex Debug] CONVEX_SELF_HOSTED_URL:', process.env.CONVEX_SELF_HOSTED_URL);
  console.log('[Convex Debug] Using Convex URL:', convexUrl);
  console.log('[Convex Debug] Client hostname:', hostname);

  try {
    // Try to fetch the Convex version endpoint to test connectivity
    console.log('[Convex Debug] Attempting to fetch from:', `${convexUrl}/version`);
    
    const response = await fetch(`${convexUrl}/version`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const text = await response.text();
    console.log('[Convex Debug] Response status:', response.status);
    console.log('[Convex Debug] Response body:', text);

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      convexUrl,
      clientHostname: hostname,
      convexResponse: text,
      message: response.ok ? 'Connected to Convex successfully' : 'Convex returned error',
    }, {
      status: response.ok ? 200 : response.status,
    });
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    console.error('[Convex Debug] Connection failed:', errorMessage);
    console.error('[Convex Debug] Full error:', error);

    return NextResponse.json({
      success: false,
      error: errorMessage,
      convexUrl,
      clientHostname: hostname,
      message: 'Failed to connect to Convex backend',
      troubleshooting: {
        check1: 'Ensure NEXT_PUBLIC_CONVEX_URL is set to the correct external domain',
        check2: 'Verify nginx proxy-manager is routing requests to the backend service',
        check3: 'Check that the backend Docker container is running and accessible',
        check4: `Try accessing ${convexUrl} directly from your browser`,
      },
    }, {
      status: 503,
    });
  }
}
