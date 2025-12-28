"use node";
import { action } from '../_generated/server';
import { api, internal as internalApi } from '../_generated/api';

// Action to deactivate (mark active: false) any drinks imported from
// Ready2Order that belong to categories like 'Speisen' or groups like
// '2L Vollsuff', or whose product name contains '2L Vollsuff'. This avoids
// removing records (safer) while keeping them off the site.

export const removeExcludedReady2Order = action({
  args: {},
  handler: async ({ runQuery, runMutation }) => {
    // Load categories and build a map id -> lowercased name
    const cats = await runQuery(api.categories.listCategories);
    const catMap: Record<string, string> = {};
    for (const c of cats || []) {
      if (!c || !c._id) continue;
      catMap[String(c._id)] = String(c.name ?? '').toLowerCase();
    }

    const drinks = await runQuery(api.drinks.listDrinks) || [];
    let deactivated = 0;

    for (const d of drinks) {
      try {
        const name = String(d.name ?? '').toLowerCase();
        const catId = d.categoryId;
        const catName = catId ? (catMap[String(catId)] ?? '') : '';

        const isBadCat = catName.includes('speisen') || catName.includes('2l vollsuff');
        const isBadName = name.includes('2l vollsuff');

        if (isBadCat || isBadName) {
          // Patch via the internal upsert to mark inactive. Provide r2oId so upsert finds the doc.
          const r2oId = String(d.r2oId ?? '');
          if (!r2oId) continue;
          await runMutation(internalApi.internal.syncMutations.upsertDrink, { doc: { r2oId, active: false } });
          deactivated += 1;
        }
      } catch (e) {
        // ignore individual failures and continue
        console.error('Failed to deactivate drink', d, e);
      }
    }

    return { ok: true, deactivated };
  },
});
