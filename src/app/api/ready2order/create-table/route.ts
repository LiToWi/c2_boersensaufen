import { NextResponse } from 'next/server';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';
import type { Id } from '../../../../../convex/_generated/dataModel';

const R2O_API_BASE = 'https://api.ready2order.com/v1';
const R2O_AREA_NAME = 'Börsensaufen';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { partyName, tableId } = body;

    if (!partyName) {
      return NextResponse.json(
        { error: 'Party name is required' },
        { status: 400 }
      );
    }

    const token = process.env.READY2ORDER_ACCOUNT_TOKEN;
    if (!token) {
      console.error('[R2O] Token not found in environment');
      return NextResponse.json(
        { error: 'R2O token not configured' },
        { status: 500 }
      );
    }

    // Fetch table name if tableId is provided
    let tableName = '';
    if (tableId) {
      try {
        const convexUrl = process.env.CONVEX_SELF_HOSTED_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
        if (convexUrl) {
          const client = new ConvexHttpClient(convexUrl);
          const table = await client.query(api.tables.getTableByID, { tableID: tableId as Id<'tables'> });
          tableName = table?.name || '';
          console.log('[R2O] Fetched table name:', tableName);
        }
      } catch (error) {
        console.warn('[R2O] Failed to fetch table name:', error);
      }
    }

    // Format R2O table name as <tableName>-<partyName>
    const r2oTableName = tableName ? `${tableName}-${partyName}` : partyName;
    console.log('[R2O] Creating table with name:', r2oTableName);

    console.log('[R2O] Creating table for party:', partyName);

    // Get table area ID
    let areaId: number | null = null;
    try {
      const areaResponse = await fetch(`${R2O_API_BASE}/tableAreas`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (areaResponse.ok) {
        const data = await areaResponse.json();
        const areas = Array.isArray(data) ? data : data.data || [];
        const targetArea = areas.find(
          (area: any) => area.tableArea_name?.toLowerCase() === R2O_AREA_NAME.toLowerCase()
        );
        if (targetArea) {
          areaId = targetArea.tableArea_id;
        }
      }
    } catch (error) {
      console.warn('[R2O] Failed to fetch table area:', error);
    }

    // Build table creation payload
    const createTableBody: any = {
      table_name: r2oTableName,
      table_capacity: 12,
    };

    if (areaId !== null) {
      createTableBody.tableArea_id = areaId;
    }

    // Create table in R2O
    const response = await fetch(`${R2O_API_BASE}/tables`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createTableBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[R2O] API error:', response.status, errorText);
      return NextResponse.json(
        { error: `R2O API error: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const r2oTableId = data.id || data.table_id || data.tableId;

    if (!r2oTableId) {
      console.error('[R2O] No table ID in response:', data);
      return NextResponse.json(
        { error: 'R2O response missing table ID' },
        { status: 500 }
      );
    }

    console.log('[R2O] Table created successfully, ID:', r2oTableId);

    return NextResponse.json({
      success: true,
      r2oTableId: String(r2oTableId),
    });
  } catch (error: any) {
    console.error('[R2O] Create table error:', error);
    
    return NextResponse.json(
      {
        error: error?.message || 'Failed to create R2O table',
        details: error?.toString(),
      },
      { status: 500 }
    );
  }
}
