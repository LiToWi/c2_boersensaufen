// src/lib/api.ts
// Utility to fetch all products from the Ready2Oder API using an account token from .env

export type Product = Record<string, any>;

const ACCOUNT_TOKEN = process.env.READY2ODER_ACCOUNT_TOKEN;
const BASE_API_URL =  "https://api.ready2oder.com/v1";

if (!ACCOUNT_TOKEN) {
    throw new Error('Missing READY2ODER_ACCOUNT_TOKEN in environment');
}

/**
 * Fetch all products from the Ready2Oder API.
 * The function tries to handle common pagination shapes:
 * - JSON array responses
 * - { products: [...] } or { items: [...] } or { data: [...] }
 * - next page info in JSON (next, next_page_url, pagination.next) or Link header rel="next"
 */
export async function getAllReady2OderProducts(): Promise<Product[]> {
    const headers = {
        Authorization: `Bearer ${ACCOUNT_TOKEN}`,
        Accept: 'application/json',
    };

    const startUrl = `${BASE_API_URL.replace(/\/$/, '')}/products`;

    const items: Product[] = [];
    let url: string | null = startUrl;

    while (url) {
        const res: Response = await fetch(url, { headers });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`Ready2Oder API request failed: ${res.status} ${res.statusText} ${text}`);
        }

        const contentType = res.headers.get('content-type') || '';
        let json: any = null;
        if (contentType.includes('application/json')) {
            json = await res.json().catch(() => null);
        } else {
            // fallback: try to parse as JSON, otherwise treat as empty
            try {
                json = await res.json();
            } catch {
                json = null;
            }
        }

        // extract list of products from common shapes
        let pageItems: Product[] = [];
        if (Array.isArray(json)) {
            pageItems = json;
        } else if (json) {
            pageItems =
                json.products ||
                json.items ||
                json.data ||
                json.results ||
                (Array.isArray(json.payload) ? json.payload : undefined) ||
                [];
        }

        if (pageItems && pageItems.length) {
            items.push(...pageItems);
        }

        // detect next page
        let next: string | undefined;

        // 1) JSON-based next links
        if (json) {
            next =
                json.next ||
                json.next_page ||
                json.next_page_url ||
                json.pagination?.next ||
                json.meta?.next ||
                json.links?.next;
        }

        // 2) Link header rel="next"
        if (!next) {
            const linkHeader = res.headers.get('link');
            if (linkHeader) {
                // parse simple Link header: <url>; rel="next", ...
                const match = linkHeader.match(/<([^>]+)>;\s*rel="?next"?/i);
                if (match) next = match[1];
            }
        }

        // normalize next to null if not present
        url = next ? String(next) : null;
    }

    return items;
}

export default getAllReady2OderProducts;