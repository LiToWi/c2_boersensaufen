"use node";
import { action } from '../_generated/server';
import { v } from 'convex/values';
import { api, internal as internalApi } from '../_generated/api';

// Sync Ready2Order products from a filtered local service into Convex.
// Usage: call this action (from dev or via Convex action runner). It will
// fetch the URL provided by the `url` arg or from env READY2ORDER_SYNC_URL
// (defaults to http://127.0.0.1:8090/products?includeProductGroup=true).

const DEFAULT_URL = 'http://127.0.0.1:8090/products?includeProductGroup=true';

function normalizeGroupName(raw: any) {
  const name = (raw ?? '').toString().trim();
  if (!name) return 'Ungrouped';
  if (/saft|säfte|schorle|schorlen/i.test(name)) return 'Säfte & Schorlen';
  if (/bier|biere|biermisch|biermischgetränk/i.test(name)) return 'Bier & Biermischgetränke';
  return name;
}

export const syncReady2Order = action({
  args: { url: v.optional(v.string()), dryRun: v.optional(v.boolean()), sampleSize: v.optional(v.number()) },
  handler: async ({ runMutation }, args) => {
    const url = args.url ?? (process.env.READY2ORDER_SYNC_URL ?? DEFAULT_URL);
    const dryRun = args.dryRun ?? false;
    const sampleSize = args.sampleSize ?? 10;

    // Robust fetch with timeout and clearer error messages so the action
    // surfaces network errors (ECONNREFUSED, ETIMEDOUT, DNS errors) clearly.
    let res: any;
    try {
      const controller = new AbortController();
      const timeoutMs = 15000; // 15s
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      res = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
      clearTimeout(timeout);
    } catch (err: any) {
      // Re-throw with context so it's visible in the Convex action logs
      throw new Error(`Failed to fetch Ready2Order products from ${url}: ${err?.message ?? String(err)}`);
    }

    if (!res || !res.ok) {
      const statusInfo = res ? `${res.status} ${res.statusText}` : 'no response';
      throw new Error(`Failed to fetch Ready2Order products from ${url}: ${statusInfo}`);
    }

    const data = await res.json();

    // Normalize list shape (array or wrapper shapes)
    let list: any[] = [];
    if (Array.isArray(data)) list = data;
    else if (data.products && Array.isArray(data.products)) list = data.products;
    else if (data.items && Array.isArray(data.items)) list = data.items;
    else if (data.data && Array.isArray(data.data)) list = data.data;
    else if (data.results && Array.isArray(data.results)) list = data.results;

    // Cache categories by name to avoid repeated DB calls
    const categoryCache: Map<string, string> = new Map();

    const getGroupId = (p: any) => {
      const g = p.productgroup ?? {};
      return g.productgroup_id ?? g.id ?? g.productgroupId ?? g.group_id ?? undefined;
    };

    const upsertCategory = async (name: string, groupId?: string) => {
      const normalized = name || 'Ungrouped';
      const nm = normalized.toString();
      const cacheKey = groupId ? `gid:${groupId}` : `name:${nm}`;
      if (categoryCache.has(cacheKey)) return categoryCache.get(cacheKey)!;

      // Call the internal mutation to upsert category, preferring external group id when available
      const result = await runMutation(internalApi.internal.syncMutations.upsertCategory, { name: nm, r2oGroupId: groupId });
      categoryCache.set(cacheKey, result);
      return result;
    };

  let processed = 0;
  let skipped = 0;
  const samples: { passed: any[]; skipped: Array<{ item: any; reason: string }>; } = { passed: [], skipped: [] };

    const isDrinkType = (p: any) => {
      const t = p.product_type ?? p.product_type_id ?? '';
      if (!t) return true; // be permissive if missing
      // exclude explicit food types
      if (typeof t === 'string') {
        const s = String(t).toLowerCase();
        if (s === 'food' || s === 'essen' || s === 'speise') return false;
        return s === 'drink';
      }
      if (typeof t === 'number') return t === 2 || t === 11; // keep known drink type ids
      return false;
    };

    const getPriority = (p: any) => {
      const candidates = [p.priority, p.product_priority, p.sort_order, p.product_order, p.order, p.prio];
      for (const c of candidates) {
        if (typeof c === 'number') return Math.round(Number(c));
        if (typeof c === 'string' && c.trim() !== '') {
          const n = Number(c);
          if (!Number.isNaN(n)) return Math.round(n);
        }
      }
      return 0;
    };

    const passesFilters = (p: any) => {
      if (!p || typeof p !== 'object') return false;

      const name = (p.product_name ?? '').toString().trim();
      if (!name) return false;

      // exclude 'Woche' in product name (case-insensitive)
      if (name.toLowerCase().includes('woche')) return false;

      // exclude products with '!' in name
      if (name.includes('!')) return false;

      // exclude inactive products if product_active present and falsy
      const activeRaw = p.product_active;
      if (typeof activeRaw !== 'undefined') {
        // treat only explicit truthy values as active: true, 1, '1', 'true', 'yes'
        const s = String(activeRaw).toLowerCase();
        const isActive = activeRaw === true || activeRaw === 1 || s === '1' || s === 'true' || s === 'yes';
        if (!isActive) return false;
      }

      // exclude if immediate productgroup name contains '!'
      const groupName = (p.productgroup?.productgroup_name ?? '').toString();
  if (groupName.includes('!')) return false;

  // Exclude explicit unwanted groups: food ('Speisen') and custom promo groups like '2L Vollsuff'
  const gLower = groupName.toLowerCase();
  if (gLower.includes('speisen')) return false;
  if (gLower.includes('2l vollsuff')) return false;

  // Also exclude by product name in case grouping is missing
  const nameLower = name.toLowerCase();
  if (nameLower.includes('2l vollsuff')) return false;

      // Deep-scan the productgroup object (including ancestor fields) for any '!' in names.
      const pg = p.productgroup;
      if (pg && typeof pg === 'object') {
        const stack: any[] = [pg];
        while (stack.length) {
          const cur = stack.pop();
          if (!cur) continue;
          if (typeof cur === 'string') {
            if (cur.includes('!')) return false;
            continue;
          }
          if (Array.isArray(cur)) {
            for (const it of cur) stack.push(it);
            continue;
          }
          if (typeof cur === 'object') {
            for (const key of Object.keys(cur)) {
              const val = cur[key];
              if (typeof val === 'string') {
                if (val.includes('!')) return false;
              } else if (typeof val === 'object') {
                stack.push(val);
              }
            }
          }
        }
      }

      // type check
      if (!isDrinkType(p)) return false;

      return true;
    };

    for (const p of list) {
      // Basic sanitization and mapping. Only sync products we can meaningfully map.
  const pass = passesFilters(p);
  if (!pass) { skipped += 1; if (samples.skipped.length < sampleSize) samples.skipped.push({ item: p, reason: 'filtered' }); continue; }

      const name = (p.product_name ?? '').toString().trim();

      // consistent external id as string
      const r2oId = String(p.product_id ?? p.product_itemnumber ?? '');
      if (!r2oId) continue;

      // price fallback
      const priceRaw = p.product_price ?? p.price ?? 0;
      const currentPrice = Number(priceRaw) || 0;

  const rawGroup = p.productgroup?.productgroup_name ?? '';
  const categoryName = normalizeGroupName(rawGroup);
  const groupId = String(getGroupId(p) ?? '').trim() || undefined;
  const categoryId = await upsertCategory(categoryName, groupId);

      // find existing drink by r2oId

      const regularPrice = Number(currentPrice);
      const lowBoundPrice = Math.round(currentPrice * 0.35 * 100) / 100;
      const priority = getPriority(p);

      const doc = {
        r2oId,
        name,
        currentPrice,
        regularPrice,
        lowBoundPrice,
        priority,
        categoryId,
        active: !(typeof p.product_active !== 'undefined' && (p.product_active === false || p.product_active === 0 || String(p.product_active).toLowerCase() === 'false' || String(p.product_active) === '0')),
      };

      // Upsert the drink via the internal mutation (skip when dryRun)
      if (!dryRun) {
        await runMutation(internalApi.internal.syncMutations.upsertDrink, { doc });
      } else if (samples.passed.length < sampleSize) {
        samples.passed.push(doc);
      }

      processed += 1;
    }

    return { ok: true, processed, skipped, dryRun, samples };
  },
});
