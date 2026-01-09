'use client'

import { useEffect, useState } from 'react'

interface DebugInfo {
  convexUrl: string
  clientHostname: string
  timestamp: string
  status: string
  error?: string
}

export default function ConvexDebugPage() {
  const [info, setInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkResult, setCheckResult] = useState<any>(null)
  const [checkLoading, setCheckLoading] = useState(false)

  useEffect(() => {
    // Collect client-side debug info
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || 'http://127.0.0.1:3210'
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'unknown'
    
    setInfo({
      convexUrl,
      clientHostname: hostname,
      timestamp: new Date().toISOString(),
      status: 'loaded',
    })
    setLoading(false)

    // Log to console
    console.log('[Debug Page] Convex URL:', convexUrl)
    console.log('[Debug Page] Client hostname:', hostname)
    console.log('[Debug Page] Full URL:', window.location.href)
  }, [])

  const testConvexConnection = async () => {
    setCheckLoading(true)
    try {
      const response = await fetch('/api/debug/convex-check')
      const data = await response.json()
      setCheckResult(data)
      console.log('[Debug Page] Convex check result:', data)
    } catch (error) {
      setCheckResult({
        error: String(error),
        success: false,
      })
      console.error('[Debug Page] Convex check failed:', error)
    } finally {
      setCheckLoading(false)
    }
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 Convex Debug Dashboard</h1>
      
      <section style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
        <h2>Client-Side Configuration</h2>
        {loading ? (
          <p>Loading...</p>
        ) : info ? (
          <div>
            <p><strong>Convex URL:</strong> {info.convexUrl}</p>
            <p><strong>Client Hostname:</strong> {info.clientHostname}</p>
            <p><strong>Full URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
            <p><strong>Timestamp:</strong> {info.timestamp}</p>
          </div>
        ) : null}
      </section>

      <section style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
        <h2>Backend Connectivity Test</h2>
        <button 
          onClick={testConvexConnection}
          disabled={checkLoading}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            cursor: checkLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {checkLoading ? 'Testing...' : 'Test Convex Connection'}
        </button>
        
        {checkResult && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: checkResult.success ? '#e8f5e9' : '#ffebee' }}>
            <p><strong>Status:</strong> {checkResult.success ? '✅ Connected' : '❌ Failed'}</p>
            {checkResult.error && <p><strong>Error:</strong> {checkResult.error}</p>}
            {checkResult.message && <p><strong>Message:</strong> {checkResult.message}</p>}
            {checkResult.status && <p><strong>HTTP Status:</strong> {checkResult.status}</p>}
            {checkResult.convexUrl && <p><strong>Backend URL:</strong> {checkResult.convexUrl}</p>}
            {checkResult.troubleshooting && (
              <div>
                <strong>Troubleshooting:</strong>
                <ul>
                  {Object.entries(checkResult.troubleshooting).map(([key, value]) => (
                    <li key={key}>{value}</li>
                  ))}
                </ul>
              </div>
            )}
            <details>
              <summary>Full Response</summary>
              <pre>{JSON.stringify(checkResult, null, 2)}</pre>
            </details>
          </div>
        )}
      </section>

      <section style={{ marginBottom: '20px', border: '1px solid #ccc', padding: '10px' }}>
        <h2>Browser Console</h2>
        <p>Check your browser's Developer Tools (F12) Console tab for additional debug logs.</p>
        <p>Look for messages starting with <code>[Convex]</code> or <code>[Debug Page]</code></p>
      </section>
    </div>
  )
}
