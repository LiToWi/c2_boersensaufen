"use node";
import { action } from './_generated/server';
import { v } from 'convex/values';
import { api, internal } from './_generated/api';

// R2O configuration
const R2O_API_BASE = 'https://api.ready2order.com/v1';
const R2O_CATEGORY_NAME = '!C2Börsensaufen'; // Shared category for all products

/**
 * Get R2O API token from environment
 */
function getR2OToken(): string {
  const token = process.env.READY2ORDER_ACCOUNT_TOKEN;
  if (!token) {
    throw new Error('READY2ORDER_ACCOUNT_TOKEN environment variable not set');
  }
  return token;
}

/**
 * Get or create the shared R2O product category
 * Returns the category/productgroup ID
 */
async function ensureR2OCategory(token: string): Promise<string> {
  // First, try to find existing category by name
  const listResponse = await fetch(`${R2O_API_BASE}/productgroups`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (listResponse.ok) {
    const groups = await listResponse.json();
    const existing = (Array.isArray(groups) ? groups : []).find(
      (g: any) => g.name === R2O_CATEGORY_NAME || g.productgroup_name === R2O_CATEGORY_NAME
    );
    if (existing) {
      return String(existing.id || existing.productgroup_id || existing.productgroupId);
    }
  }

  // Create new category if not found
  const createResponse = await fetch(`${R2O_API_BASE}/productgroups`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: R2O_CATEGORY_NAME,
      sortOrder: 999,
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create R2O category: ${errorText || createResponse.statusText}`);
  }

  const data = await createResponse.json();
  return String(data.id || data.productgroup_id || data.productgroupId);
}

/**
 * Create a product in R2O with specific name and price
 */
async function createR2OProduct(
  token: string,
  categoryId: string,
  name: string,
  price: number
): Promise<string> {
  const response = await fetch(`${R2O_API_BASE}/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_name: name,
      product_price: price,
      productgroup_id: categoryId,
      product_type: 2, // Drink type
      product_active: 1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create product "${name}": ${errorText || response.statusText}`);
  }

  const data = await response.json();
  return String(data.id || data.product_id || data.productId);
}

/**
 * Book an order to a table in R2O
 */
async function bookOrderToTable(
  token: string,
  tableId: string,
  items: Array<{ productId: string; quantity: number; unitPrice: number }>
): Promise<any> {
  const response = await fetch(`${R2O_API_BASE}/tables/${tableId}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      products: items.map(item => ({
        product_id: item.productId,
        quantity: item.quantity,
        price: item.unitPrice,
      })),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to book order to table: ${errorText || response.statusText}`);
  }

  return await response.json();
}

/**
 * Submit an order from the basket to Ready2Order
 * This is the main entry point for payment submission
 */
export const submitOrderToR2O = action({
  args: {
    partyId: v.id('parties'),
    items: v.array(v.object({
      productName: v.string(),
      quantity: v.number(),
      pricePerUnit: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const token = getR2OToken();

    // Validate inputs
    if (!args.items || args.items.length === 0) {
      throw new Error('No items in order');
    }

    for (const item of args.items) {
      if (!item.productName || item.productName.trim() === '') {
        throw new Error('Product name cannot be empty');
      }
      if (item.quantity <= 0) {
        throw new Error(`Invalid quantity for ${item.productName}: ${item.quantity}`);
      }
      if (item.pricePerUnit < 0) {
        throw new Error(`Invalid price for ${item.productName}: ${item.pricePerUnit}`);
      }
    }

    try {
      // 1. Get party and check R2O table exists
      const party = await ctx.runQuery(api.parties.getPartyById, { id: args.partyId });
      
      if (!party) {
        throw new Error('Party not found');
      }

      if (party.closed) {
        throw new Error('Cannot submit order to a closed party');
      }

      if (!party.r2oTableId) {
        throw new Error('Party has no R2O table. Table creation may be pending or failed.');
      }

      const r2oTableId = party.r2oTableId;

      // 2. Ensure category exists
      const categoryId = await ensureR2OCategory(token);

      // 3. Create products and prepare order items
      const r2oProductIds: string[] = [];
      const orderItemsForR2O: Array<{ productId: string; quantity: number; unitPrice: number }> = [];

      for (const item of args.items) {
        try {
          // Create product with exact name and price
          const productId = await createR2OProduct(
            token,
            categoryId,
            item.productName,
            item.pricePerUnit
          );

          r2oProductIds.push(productId);

          // Record product in our DB
          await ctx.runMutation(internal.r2oMutations.recordR2OProduct, {
            partyId: args.partyId,
            productName: item.productName,
            pricePerUnit: item.pricePerUnit,
            r2oProductId: productId,
            r2oTableId,
          });

          orderItemsForR2O.push({
            productId,
            quantity: item.quantity,
            unitPrice: item.pricePerUnit,
          });
        } catch (productError: any) {
          // If product creation fails, clean up already created products
          console.error(`Failed to create product ${item.productName}:`, productError);
          throw new Error(`Failed to create product "${item.productName}": ${productError.message}`);
        }
      }

      // 4. Book order to table
      let r2oResponse;
      try {
        r2oResponse = await bookOrderToTable(token, r2oTableId, orderItemsForR2O);
      } catch (bookingError: any) {
        console.error('Failed to book order to table:', bookingError);
        throw new Error(`Failed to book order: ${bookingError.message}`);
      }

      // 5. Calculate total
      const totalAmount = args.items.reduce(
        (sum, item) => sum + (item.quantity * item.pricePerUnit),
        0
      );

      // 6. Record successful submission
      await ctx.runMutation(internal.r2oMutations.recordR2OOrder, {
        partyId: args.partyId,
        orderItems: args.items,
        r2oTableId,
        r2oProductIds,
        totalAmount,
        status: 'submitted',
        r2oResponse,
      });

      return {
        success: true,
        r2oTableId,
        productCount: r2oProductIds.length,
        totalAmount,
        r2oOrderId: r2oResponse?.id || r2oResponse?.order_id,
      };
    } catch (error: any) {
      const errorMessage = error?.message || String(error);

      // Log error
      console.error('Failed to submit order to R2O:', {
        partyId: args.partyId,
        itemCount: args.items.length,
        error: errorMessage,
      });

      // Record failed submission (if we have enough context)
      try {
        const party = await ctx.runQuery(api.parties.getPartyById, { id: args.partyId });
        if (party?.r2oTableId) {
          await ctx.runMutation(internal.r2oMutations.recordR2OOrder, {
            partyId: args.partyId,
            orderItems: args.items,
            r2oTableId: party.r2oTableId,
            r2oProductIds: [],
            totalAmount: args.items.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0),
            status: 'failed',
            errorMessage,
          });
        }
      } catch (recordError) {
        // Ignore errors when recording failure
        console.error('Failed to record error:', recordError);
      }

      // Re-throw for client
      throw new Error(`Order submission failed: ${errorMessage}`);
    }
  },
});
