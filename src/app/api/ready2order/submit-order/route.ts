import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const R2O_API_BASE = 'https://api.ready2order.com/v1';
const R2O_CATEGORY_NAME = '!C2Börsensaufen';

async function getR2OToken(): Promise<string> {
  const token = process.env.READY2ORDER_ACCOUNT_TOKEN;
  if (!token) {
    throw new Error('READY2ORDER_ACCOUNT_TOKEN environment variable not set');
  }
  return token;
}

async function ensureR2OCategory(token: string): Promise<string> {
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
      throw new Error('Failed to create R2O category');
    }

    const data = await createResponse.json();
    return String(data.id || data.productgroup_id || data.productgroupId);
  } else {
    throw new Error('Failed to fetch R2O categories');
  }
}

async function createR2OProduct(
  token: string,
  categoryId: string,
  productName: string,
  price: number
): Promise<string> {

  const productPayload: Record<string, any> = {
    product_name: productName,
    product_price: price,
    productgroup_id: categoryId,
    product_type: 2,
    product_active: 1,
    product_vat: 19,
  };

  const response = await fetch(`${R2O_API_BASE}/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(productPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create product: ${errorText}`);
  }

  const data = await response.json();
  return String(data.id || data.product_id || data.productId);
}

async function bookOrderToTable(
  token: string,
  r2oTableId: string,
  items: Array<{ productId: string; quantity: number; unitPrice: number }>
): Promise<any> {
  const url = `${R2O_API_BASE}/orders`;
  
  // Convert table ID to number
  const tableId = parseInt(r2oTableId, 10);
  if (isNaN(tableId)) {
    throw new Error(`Invalid table ID: ${r2oTableId}`);
  }
  
  const payload: Record<string, any> = {
    table_id: tableId,
    price_base: 'gross',
    training_mode: false,
    items: items.map(item => ({
      product_id: parseInt(item.productId, 10),
      item_quantity: item.quantity,
      item_price: item.unitPrice,
      item_vatRate: 19, // 19% VAT (standard in Germany)
    })),
  };
  
  console.log('[R2O] Booking order:', { url, payload });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  console.log('[R2O] Book order response status:', response.status, 'body:', responseText);
  
  if (!response.ok) {
    throw new Error(`Failed to book order: ${responseText}`);
  }

  return JSON.parse(responseText);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { partyId, items, r2oTableId } = body;

    // Validate inputs
    if (!partyId) {
      return NextResponse.json(
        { error: 'Party ID is required' },
        { status: 400 }
      );
    }

    if (!r2oTableId) {
      return NextResponse.json(
        { error: 'R2O table ID is required' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Items array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.productName || typeof item.productName !== 'string') {
        return NextResponse.json(
          { error: 'Each item must have a productName' },
          { status: 400 }
        );
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        return NextResponse.json(
          { error: `Invalid quantity for ${item.productName}` },
          { status: 400 }
        );
      }
      if (typeof item.pricePerUnit !== 'number' || item.pricePerUnit < 0) {
        return NextResponse.json(
          { error: `Invalid price for ${item.productName}` },
          { status: 400 }
        );
      }
    }

    // Check if test mode is enabled (after input validation, before any R2O calls)
    const convexUrl = process.env.CONVEX_SELF_HOSTED_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
    if (convexUrl) {
      try {
        const client = new ConvexHttpClient(convexUrl);
        const testMode = await client.query(api.testMode.getTestMode);
        if (testMode) {
          console.log('[R2O] TEST MODE ENABLED - Skipping R2O order submission');
          return NextResponse.json({
            success: true,
            r2oTableId: r2oTableId || `test-table-${Date.now()}`,
            r2oProductIds: items.map((_, i) => `test-product-${Date.now()}-${i}`),
            orderData: { testMode: true, orderId: `test-order-${Date.now()}` },
            testMode: true,
            message: 'Test mode: R2O order submission skipped',
          });
        }
      } catch (error) {
        console.warn('[R2O] Failed to check test mode:', error);
        // Continue with normal flow if test mode check fails
      }
    }

    // Get R2O token
    const token = await getR2OToken();

    // Ensure category exists
    const categoryId = await ensureR2OCategory(token);

    // Create products and book order
    const r2oProductIds: string[] = [];
    const orderItemsForR2O: Array<{ productId: string; quantity: number; unitPrice: number }> = [];

    for (const item of items) {
      try {
        const productId = await createR2OProduct(token, categoryId, item.productName, item.pricePerUnit);
        r2oProductIds.push(productId);
        orderItemsForR2O.push({
          productId,
          quantity: item.quantity,
          unitPrice: item.pricePerUnit,
        });
      } catch (error: any) {
        console.error('[R2O] Product creation error:', error);
        return NextResponse.json(
          { error: `Failed to create product: ${error.message}` },
          { status: 500 }
        );
      }
    }

    // Book order to table
    try {
      console.log('[R2O] About to book order for table:', r2oTableId);
      const orderData = await bookOrderToTable(token, r2oTableId, orderItemsForR2O);
      console.log('[R2O] Order booked successfully:', orderData);

      return NextResponse.json({
        success: true,
        r2oTableId,
        r2oProductIds,
        orderData,
      });
    } catch (error: any) {
      console.error('[R2O] Order booking error:', error);
      return NextResponse.json(
        { error: `Failed to book order: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('R2O order submission error:', error);
    
    return NextResponse.json(
      {
        error: error?.message || 'Failed to submit order to Ready2Order',
        details: error?.toString(),
      },
      { status: 500 }
    );
  }
}
