"use node";
import { internalAction, action } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';

// R2O configuration
const R2O_API_BASE = 'https://api.ready2order.com/v1';
const R2O_AREA_NAME = 'Börsensaufen'; // Existing area in R2O

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
 * Fetch table area ID by name from R2O API
 */
async function getTableAreaId(areaName: string): Promise<number | null> {
  const token = getR2OToken();
  
  const response = await fetch(`${R2O_API_BASE}/tableAreas`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('[R2O] Failed to fetch table areas:', response.status);
    return null;
  }

  const data = await response.json();

  // R2O API typically returns an array or object with data property
  const areas = Array.isArray(data) ? data : data.data || [];
  
  // Find area by name (case-insensitive)
  const targetArea = areas.find(
    (area: any) => area.tableArea_name?.toLowerCase() === areaName.toLowerCase()
  );

  if (targetArea) {
    return targetArea.tableArea_id;
  }

  console.warn(`[R2O] Area "${areaName}" not found in available areas`);
  return null;
}

/**
 * PUBLIC: Create a table in Ready2Order for a party
 * Can be called from the frontend after party creation
 */
export const createPartyR2OTablePublic = action({
  args: {
    partyId: v.id('parties'),
    partyName: v.string(),
  },
  handler: async (ctx, args) => {
    return await createPartyR2OTableImpl(ctx, args);
  },
});

/**
 * INTERNAL: Create a table in Ready2Order for a party
 * Called asynchronously after party creation
 */
export const createPartyR2OTable = internalAction({
  args: {
    partyId: v.id('parties'),
    partyName: v.string(),
  },
  handler: async (ctx, args) => {
    return await createPartyR2OTableImpl(ctx, args);
  },
});

/**
 * Shared implementation for creating R2O table
 */
async function createPartyR2OTableImpl(ctx: any, args: { partyId: any; partyName: string }) {
  console.log('[R2O] Creating table for party:', args.partyName);
  
  let token;
  try {
    token = getR2OToken();
  } catch (error) {
    console.error('[R2O] Failed to get token:', error);
    throw error;
  }

  try {
    // Mark as pending
    await ctx.runMutation(internal.r2oMutations.markPartyR2OTableCreationPending, {
      partyId: args.partyId,
    });

    // Fetch party to get tableId
    const party = await ctx.runQuery(internal.r2oQueries.getPartyForR2O, {
      partyId: args.partyId,
    });

    if (!party) {
      throw new Error('Party not found');
    }

    // Fetch table name from the tables collection
    let tableName = '';
    if (party.tableId) {
      const table = await ctx.runQuery(internal.r2oQueries.getTableForR2O, {
        tableId: party.tableId,
      });
      tableName = table?.name || '';
    }

    // Format R2O table name as <tableName>-<partyName>
    const r2oTableName = tableName ? `${tableName}-${args.partyName}` : args.partyName;
    console.log('[R2O] Formatted table name:', r2oTableName);

    // Get table area ID
    const areaId = await getTableAreaId(R2O_AREA_NAME);
    
    // Build table creation payload
    const createTableBody: any = {
      table_name: r2oTableName,
      table_capacity: 12,
    };
    
    // Only add tableArea_id if we found the area
    if (areaId !== null) {
      createTableBody.tableArea_id = areaId;
    } else {
      console.warn('[R2O] Creating table without area assignment');
    }

    // Create table in R2O
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(`${R2O_API_BASE}/tables`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createTableBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[R2O] API error:', response.status, errorText);
      throw new Error(
        `R2O API error (${response.status}): ${errorText || response.statusText}`
      );
    }

    const data = await response.json();
    const r2oTableId = data.id || data.table_id || data.tableId;

    if (!r2oTableId) {
      console.error('[R2O] No table ID in response:', data);
      throw new Error('R2O response missing table ID');
    }

    console.log('[R2O] Table created successfully, ID:', r2oTableId);

    // Update party with R2O table ID
    await ctx.runMutation(internal.r2oMutations.updatePartyR2OTableId, {
      partyId: args.partyId,
      r2oTableId: String(r2oTableId),
    });

    return {
      success: true,
      r2oTableId: String(r2oTableId),
    };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    
    // Log error for debugging
    console.error('[R2O] Failed to create R2O table for party:', {
      partyId: args.partyId,
      partyName: args.partyName,
      error: errorMessage,
      stack: error?.stack,
    });

    // Mark creation as failed
    await ctx.runMutation(internal.r2oMutations.markPartyR2OTableCreationFailed, {
      partyId: args.partyId,
      errorMessage,
    });

    // Don't throw - allow party to continue working locally
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Retry R2O table creation for a party (can be called manually from admin)
 */
export const retryPartyR2OTableCreation = internalAction({
  args: {
    partyId: v.id('parties'),
    partyName: v.string(),
  },
  handler: async (ctx, args) => {
    // Just call the main creation function
    const token = getR2OToken();

    try {
      // Mark as pending
      await ctx.runMutation(internal.r2oMutations.markPartyR2OTableCreationPending, {
        partyId: args.partyId,
      });

      // Fetch party to get tableId
      const party = await ctx.runQuery(internal.r2oQueries.getPartyForR2O, {
        partyId: args.partyId,
      });

      if (!party) {
        throw new Error('Party not found');
      }

      // Fetch table name from the tables collection
      let tableName = '';
      if (party.tableId) {
        const table = await ctx.runQuery(internal.r2oQueries.getTableForR2O, {
          tableId: party.tableId,
        });
        tableName = table?.name || '';
      }

      // Format R2O table name as <tableName>-<partyName>
      const r2oTableName = tableName ? `${tableName}-${args.partyName}` : args.partyName;

      // Get table area ID
      const areaId = await getTableAreaId(R2O_AREA_NAME);
      
      // Build table creation payload
      const createTableBody: any = {
        table_name: r2oTableName,
        table_capacity: 12,
      };
      
      if (areaId !== null) {
        createTableBody.tableArea_id = areaId;
      }

      // Create table in R2O
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(`${R2O_API_BASE}/tables`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createTableBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `R2O API error (${response.status}): ${errorText || response.statusText}`
        );
      }

      const data = await response.json();
      const r2oTableId = data.id || data.table_id || data.tableId;

      if (!r2oTableId) {
        throw new Error('R2O response missing table ID');
      }

      // Update party with R2O table ID
      await ctx.runMutation(internal.r2oMutations.updatePartyR2OTableId, {
        partyId: args.partyId,
        r2oTableId: String(r2oTableId),
      });

      return {
        success: true,
        r2oTableId: String(r2oTableId),
      };
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      
      // Mark creation as failed
      await ctx.runMutation(internal.r2oMutations.markPartyR2OTableCreationFailed, {
        partyId: args.partyId,
        errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  },
});
