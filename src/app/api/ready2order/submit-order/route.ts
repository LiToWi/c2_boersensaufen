import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;

if (!convexUrl) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL is not set');
}

const convex = new ConvexHttpClient(convexUrl);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { partyId, items } = body;

    // Validate inputs
    if (!partyId) {
      return NextResponse.json(
        { error: 'Party ID is required' },
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

    // Call Convex action to submit order to R2O
    const result = await convex.action(api.r2oSubmitOrder.submitOrderToR2O, {
      partyId: partyId as Id<'parties'>,
      items: items.map((item: any) => ({
        productName: item.productName,
        quantity: item.quantity,
        pricePerUnit: item.pricePerUnit,
      })),
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
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
