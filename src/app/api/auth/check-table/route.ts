import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

const convex = new ConvexHttpClient(
  process.env.CONVEX_SELF_HOSTED_URL || process.env.NEXT_PUBLIC_CONVEX_URL || 'http://127.0.0.1:3210'
);

/**
 * Check if a table exists (for auto-login validation)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tableName } = body;

    if (!tableName) {
      return NextResponse.json(
        { error: 'tableName is required', exists: false },
        { status: 400 }
      );
    }

    const table = await convex.query(api.tables.getTableByName, {
      name: tableName,
    });

    return NextResponse.json({
      exists: !!table,
      table: table ? { id: table._id, name: table.name } : null,
    });
  } catch (error: any) {
    console.error('[Check Table] Error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to check table',
        exists: false,
      },
      { status: 500 }
    );
  }
}
