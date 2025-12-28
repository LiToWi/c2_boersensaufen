// src/app/api/ready2order/products/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Use env var if provided (useful when running on host or different ports).
    // When running via docker-compose, the php service is reachable at its
    // service name on the internal network (php-ready2order) and the PHP
    // server listens on 8090 inside the container.
    const phpUrl = process.env.READY2ORDER_PHP_URL || 'http://php-ready2order:8090/products';

    // Forward the incoming request's query string to the PHP service so
    // query params like `includeProductGroup=true` are preserved.
    const incoming = new URL(request.url);
    const target = phpUrl + incoming.search;
    const res = await fetch(target);

    // If the PHP service returned JSON, forward it as JSON.
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const json = await res.json();

      // Filter out unwanted product groups/names so they never reach the frontend.
      // Exclude product groups like "Speisen" (food) and special groups like "2L Vollsuff".
      const shouldExclude = (p: unknown) => {
        if (!p || typeof p !== 'object') return false;
        const prod = p as Record<string, unknown>;
        const nameVal = prod['product_name'] ?? prod['product_name'] ?? '';
        const name = String(nameVal).toLowerCase();
        const pg = (prod['productgroup'] as Record<string, unknown> | undefined) ?? undefined;
        const groupVal = pg ? pg['productgroup_name'] ?? pg['name'] ?? '' : '';
        const group = String(groupVal).toLowerCase();
        if (group.includes('speisen')) return true;
        if (group.includes('2l vollsuff') || name.includes('2l vollsuff')) return true;
        return false;
      };

      const tryFilterArray = (arr: unknown[]) => arr.filter((p) => !shouldExclude(p));

      // Normalize shapes and filter arrays in-place where possible.
      if (Array.isArray(json)) {
        return NextResponse.json(tryFilterArray(json), { status: res.status });
      }

      const wrapped = { ...json };
      if (Array.isArray(wrapped.products)) wrapped.products = tryFilterArray(wrapped.products);
      if (Array.isArray(wrapped.items)) wrapped.items = tryFilterArray(wrapped.items);
      if (Array.isArray(wrapped.data)) wrapped.data = tryFilterArray(wrapped.data);
      if (Array.isArray(wrapped.results)) wrapped.results = tryFilterArray(wrapped.results);

      return NextResponse.json(wrapped, { status: res.status });
    }

    // Not JSON — return raw text/html so caller can see the PHP response (helpful for debugging)
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { 'content-type': contentType || 'text/plain; charset=utf-8' },
    });
  } catch (err) {
    console.error('Proxy to PHP ready2order failed:', err);
    // err may be unknown; stringify defensively
    let message = String(err);
    if (err && typeof err === 'object' && 'message' in err) {
      const maybeMsg = (err as { message?: unknown }).message;
      if (typeof maybeMsg === 'string') message = maybeMsg;
      else message = String(maybeMsg);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}