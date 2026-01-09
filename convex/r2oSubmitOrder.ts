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
      productgroup_name: R2O_CATEGORY_NAME,
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
      product_vat: 19, // German standard VAT rate (19%)
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
  // Try the standard endpoint first
  let endpoint = `${R2O_API_BASE}/tables/${tableId}/orders`;
  console.log(`[R2O] Attempting to book order to ${endpoint}`);
  
  const response = await fetch(endpoint, {
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
    console.error(`[R2O] Booking failed for table ${tableId}:`, {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    
    // Return error details for debugging
    throw new Error(`Failed to book order to table ${tableId} (${response.status}): ${errorText || response.statusText}`);
  }

  const result = await response.json();
  console.log(`[R2O] Order booked successfully:`, result);
  return result;
}

/**
 * Submit an order from the basket to Ready2Order
 * This is the main entry point for payment submission
 */
export const submitOrderToR2O = action({
  args: {
    partyId: v.id('parties'),
    items: v.array(v.object({
      drinkId: v.id('drinks'),
      productName: v.string(),
      quantity: v.number(),
      pricePerUnit: v.number(),
    })),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    r2oTableId: string;
    productCount: number;
    totalAmount: number;
    r2oOrderId?: string;
  }> => {
    const token = getR2OToken();

    // Validate inputs
    if (!args.items || args.items.length === 0) {
      throw new Error('No items in order');
    }

    for (const item of args.items) {
      if (!item.drinkId) {
        throw new Error('Item missing drinkId');
      }
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
      const party = await ctx.runQuery(api.parties.getPartyById, { id: args.partyId }) as any;
      
      if (!party) {
        throw new Error('Party not found');
      }

      if (party.closed) {
        throw new Error('Cannot submit order to a closed party');
      }

      if (!party.r2oTableId) {
        throw new Error('Party has no R2O table. Please create a table first or contact support.');
      }

      const r2oTableId = party.r2oTableId as string;
      console.log(`[R2O] Submitting order to R2O table: ${r2oTableId}`);

      // 2. Look up drink information to get R2O product IDs
      const r2oProductIds: string[] = [];
      const orderItemsForR2O: Array<{ productId: string; quantity: number; unitPrice: number }> = [];

      for (const item of args.items) {
        try {
          // Look up the drink to get its R2O product ID
          const drink = await ctx.runQuery(api.drinks.getDrinkById, { drinkId: item.drinkId });
          
          if (!drink) {
            throw new Error(`Drink not found: ${item.drinkId}`);
          }

          if (!drink.r2oId) {
            throw new Error(`Drink "${item.productName}" has no R2O product ID. Please contact support.`);
          }

          const r2oProductId = drink.r2oId;
          r2oProductIds.push(r2oProductId);

          orderItemsForR2O.push({
            productId: r2oProductId,
            quantity: item.quantity,
            unitPrice: item.pricePerUnit,
          });

          console.log(`[R2O] Using existing product "${item.productName}" (ID: ${r2oProductId})`);
        } catch (lookupError: any) {
          console.error(`Failed to process item ${item.productName}:`, lookupError);
          throw new Error(`Failed to process item "${item.productName}": ${lookupError.message}`);
        }
      }

      // 4. Create order in R2O using POST /v1/orders endpoint
      console.log(`[R2O] Creating order in R2O for table ${r2oTableId} with ${orderItemsForR2O.length} items`);
      
      let r2oResponse: any = null;
      try {
        // Build the order payload for POST /v1/orders
        // NOTE: Our prices are brutto (include VAT), but R2O expects netto prices
        // So we need to calculate net price from gross price
        // Also need to add 1.5% trading fee to the price
        const VAT_RATE = 19; // 19% German VAT
        const VAT_MULTIPLIER = 1 + (VAT_RATE / 100); // 1.19
        const TRADING_FEE_RATE = 0.01; // 1% trading fee
        
        const orderPayload: any = {
          table_id: parseInt(r2oTableId, 10), // Convert to integer
          price_base: 'netto', // We're sending net prices, R2O will add VAT
          items: orderItemsForR2O.map(item => ({
            product_id: parseInt(item.productId, 10), // R2O expects integer product IDs
            item_quantity: item.quantity, // Correct field name for quantity
            // Add 1.5% trading fee to brutto price, then convert to netto
            item_price: Number(((item.unitPrice * (1 + TRADING_FEE_RATE)) / VAT_MULTIPLIER).toFixed(2)),
            item_vatRate: VAT_RATE, // German standard VAT rate (19%)
          })),
        };

        console.log('[R2O] Order payload:', JSON.stringify(orderPayload, null, 2));

        // POST to /v1/orders to create the order
        const orderResponse = await fetch(`${R2O_API_BASE}/orders`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderPayload),
        });

        const responseText = await orderResponse.text();
        console.log(`[R2O] Order creation response status: ${orderResponse.status}, body: ${responseText}`);

        if (!orderResponse.ok) {
          console.error(`[R2O] Failed to create order in R2O:`, {
            status: orderResponse.status,
            statusText: orderResponse.statusText,
            error: responseText,
          });
          throw new Error(`Failed to create order in R2O (${orderResponse.status}): ${responseText || orderResponse.statusText}`);
        }

        r2oResponse = responseText ? JSON.parse(responseText) : { success: true };
        console.log(`[R2O] Order created successfully in R2O:`, r2oResponse);
      } catch (orderError: any) {
        console.error('[R2O] Order creation error:', orderError.message);
        throw new Error(`Order creation failed: ${orderError.message}`);
      }

      // 5. Calculate total
      const totalAmount = args.items.reduce(
        (sum, item) => sum + (item.quantity * item.pricePerUnit),
        0
      );

      // 6. Record successful submission
      await ctx.runMutation(internal.r2oMutations.recordR2OOrder, {
        partyId: args.partyId,
        orderItems: args.items.map(item => ({
          productName: item.productName,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
        })),
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
            orderItems: args.items.map(item => ({
              productName: item.productName,
              quantity: item.quantity,
              pricePerUnit: item.pricePerUnit,
            })),
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
