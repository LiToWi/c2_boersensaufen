# Ready2Order Payment System Design

## Overview

This document outlines the payment system integration between the Börsensaufen app and Ready2Order (R2O). Each party in the app is mapped to a virtual table in R2O for accounting/payment purposes.

## Key Design Principles

1. **Party-to-Table Mapping**: Each party maps 1:1 to a unique R2O table in its own category
2. **Dynamic Product Creation**: Products are created on-the-fly from basket items (not using existing R2O products)
3. **Automatic Lifecycle**: Table creation happens when party is created; table **persists** when party closes (for accounting)
4. **Stateless Orders**: Each order/basket submission creates new R2O product + books to party's table
5. **Price Snapshot**: Product price in R2O reflects the exact price from website at time of order

---

## Data Model Changes

### Schema Extensions (convex/schema.ts)

```typescript
parties: defineTable({
  tableId: v.id('tables'),
  name: v.string(),
  closed: v.boolean(),
  // ✨ NEW: Ready2Order integration
  r2oTableId: v.optional(v.string()),      // R2O table ID for this party
  // ... existing fields ...
})

// ✨ NEW: Track submitted orders to R2O
r2oOrders: defineTable({
  partyId: v.id('parties'),
  orderItems: v.array(v.object({
    productName: v.string(),
    quantity: v.number(),
    pricePerUnit: v.number(),
  })),
  r2oTableId: v.string(),           // Reference to the R2O table
  r2oProductIds: v.array(v.string()), // Created product IDs
  totalAmount: v.number(),          // Total order value
  submittedAt: v.number(),          // When submitted to R2O
  r2oResponse: v.optional(v.any()), // Raw R2O response/status
})

// ✨ NEW: Map locally created products to R2O
r2oProducts: defineTable({
  partyId: v.id('parties'),
  productName: v.string(),
  pricePerUnit: v.number(),
  r2oProductId: v.string(),        // R2O product ID
  r2oTableId: v.string(),          // Which party's table
  createdAt: v.number(),
  active: v.boolean(),
})
```

### R2O Structure

All products created via this system go into a **single shared category**: `!C2Börsensaufen`
All party tables go into an **existing area**: `Börsensaufen` (created manually in R2O)

This keeps accounting clean: one product category for all dynamic items, and all party tables centralized in one area.

## Key Environment Variables

```bash
# Required in .env.local or deploy settings
READY2ORDER_ACCOUNT_TOKEN=<your-r2o-api-token>

# Optional: for local R2O service proxy
READY2ORDER_SYNC_URL=http://127.0.0.1:8090/products?includeProductGroup=true
```

---

## Workflow: Party Creation → R2O Table

### When Party is Created (convex/parties.ts)

```typescript
// Step 1: Create party locally
const party = await ctx.db.insert('parties', {
  tableId: args.tableId,
  name: args.name,
  closed: false,
  // Don't set r2oTableId yet—will be set asynchronously
})

// Step 2: Trigger async R2O table creation
await ctx.scheduler.runAfter(0, internalApi.r2o.createPartyR2OTable, {
  partyId: party._id,
  partyName: args.name,
  tableName: `Party: ${args.name}`,
})
```

### R2O Table Creation Action (convex/r2o/createPartyTable.ts - NEW)

```typescript
export const createPartyR2OTable = internalAction({
  args: { partyId: v.id('parties'), partyName: v.string() },
  handler: async (ctx, args) => {
    // 1. Create table for this party in R2O
    //    Place it in the existing "Börsensaufen" area
    const tableResponse = await fetch('https://api.ready2order.com/v1/tables', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${READY2ORDER_TOKEN}` },
      body: JSON.stringify({
        name: args.partyName,
        capacity: 12,
        area: 'Börsensaufen',  // Existing area, not per-party
      })
    })
    const table = await tableResponse.json()
    const r2oTableId = table.id

    // 2. Update party with R2O table ID
    await ctx.runMutation(internalApi.parties.updatePartyR2OId, {
      partyId: args.partyId,
      r2oTableId,
    })

    return { r2oTableId }
  }
})
```

---

## Workflow: Basket → R2O Order

### When User Submits Basket (src/components/OrderSubmit.tsx - NEW)

**Client:**
```typescript
// User clicks "Submit Order" or "Pay"
async function submitBasketToR2O(partyId, basketItems) {
  // Send basket to API endpoint
  const response = await fetch('/api/ready2order/submit-order', {
    method: 'POST',
    body: JSON.stringify({
      partyId,
      items: basketItems.map(item => ({
        productName: item.drinkName,
        quantity: item.quantity,
        pricePerUnit: item.priceAtOrder,
      }))
    })
  })
  
  const result = await response.json()
  // result.success, result.r2oOrderId, result.r2oTableId
}
```

**API Route (src/app/api/ready2order/submit-order/route.ts - NEW):**
```typescript
export async function POST(request: Request) {
  const { partyId, items } = await request.json()
  
  // Call Convex action to handle R2O submission
  const result = await convex.action(api.r2o.submitOrderToR2O, {
    partyId,
    items,
  })
  
  return Response.json(result)
}
```

**Convex Action (convex/r2o/submitOrder.ts - NEW):**
```typescript
// R2O constants
const R2O_CATEGORY_ID = '!C2Börsensaufen';  // Single shared category for all products
const READY2ORDER_TOKEN = process.env.READY2ORDER_ACCOUNT_TOKEN;

export const submitOrderToR2O = action({
  args: {
    partyId: v.id('parties'),
    items: v.array(v.object({
      productName: v.string(),
      quantity: v.number(),
      pricePerUnit: v.number(),
    }))
  },
  handler: async (ctx, args) => {
    // 1. Get party & fetch its R2O table ID
    const party = await ctx.runQuery(api.parties.getById, { id: args.partyId })
    if (!party.r2oTableId) throw new Error('Party has no R2O table')

    // 2. For each item in basket:
    //    - Create product in shared "!C2Börsensaufen" category
    //    - Book to party's table
    const r2oProductIds = []
    
    for (const item of args.items) {
      // Create product in the shared category with exact name + price
      const productResp = await fetch('https://api.ready2order.com/v1/products', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${READY2ORDER_TOKEN}` },
        body: JSON.stringify({
          name: item.productName,
          price: item.pricePerUnit,
          productGroup: R2O_CATEGORY_ID,  // All products go here
          quantity: item.quantity,
        })
      })
      const product = await productResp.json()
      r2oProductIds.push(product.id)

      // 3. Create order item for this product on the party's table
      await fetch(`https://api.ready2order.com/v1/tables/${party.r2oTableId}/orders`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${READY2ORDER_TOKEN}` },
        body: JSON.stringify({
          products: [{
            productId: product.id,
            quantity: item.quantity,
            unitPrice: item.pricePerUnit,
          }]
        })
      })
    }

    // 4. Record in our DB
    await ctx.runMutation(internalApi.r2o.recordR2OOrder, {
      partyId: args.partyId,
      items: args.items,
      r2oTableId: party.r2oTableId,
      r2oProductIds,
      totalAmount: args.items.reduce((sum, i) => sum + (i.quantity * i.pricePerUnit), 0),
    })

    return {
      success: true,
      r2oTableId: party.r2oTableId,
      productCount: r2oProductIds.length,
    }
  }
})
```

---

## Workflow: Party Close (≠ Table Close)

### When Party is Marked Closed

**Important**: The R2O table is **NOT** closed. It remains open for admin to finalize/close manually in R2O UI.

```typescript
export const closeParty = mutation({
  args: { partyId: v.id('parties') },
  handler: async (ctx, args) => {
    const party = await ctx.db.get(args.partyId)
    
    // Just close party locally
    await ctx.db.patch(args.partyId, {
      closed: true,
      closedAt: Date.now(),
    })
    
    // ✨ DO NOT close R2O table
    // Admin will manually close/finalize in R2O for accounting
    
    return { success: true }
  }
})
```

---

## Implementation Checklist

### Phase 1: Schema & Core Mutations
- [ ] Extend `convex/schema.ts` with `r2oOrders` and `r2oProducts` tables
- [ ] Add `r2oTableId` to `parties` table (remove `r2oCategoryId`)
- [ ] Create `convex/r2o/` folder with initialization functions

### Phase 2: Automatic Party Table Creation
- [ ] Implement `convex/r2o/createPartyTable.ts` action
- [ ] Wire into `convex/parties.ts` mutation on party creation
- [ ] Configure to create tables in existing "Börsensaufen" area
- [ ] Test: create party, verify table appears in R2O under Börsensaufen area

### Phase 3: Basket Submission
- [ ] Implement `convex/r2o/submitOrder.ts` action (uses shared `!C2Börsensaufen` category)
- [ ] Create API endpoint `src/app/api/ready2order/submit-order/route.ts`
- [ ] Add "Submit to R2O" button in basket UI
- [ ] Test: submit basket, verify products appear in `!C2Börsensaufen` category

### Phase 4: Accounting & Admin Dashboard
- [ ] Add admin view showing party → R2O table mapping
- [ ] Show submission history + status
- [ ] Optional: sync R2O receipt/invoice data back to app

---

## Error Handling & Resilience

### What if R2O table creation fails?
- Retry with exponential backoff (via Convex scheduler)
- Log failure; admin notified via dashboard
- Party still usable locally; just no R2O integration

### What if product creation fails during order submission?
- Rollback: delete created products
- Return error to client with clear message
- Prompt retry or manual submission

### What if R2O API is down?
- Queue submission locally in `r2oOrders` as "pending"
- Background cron job retries every 5 minutes
- Admin can manually push via dashboard

---

## R2O API Integration Points

### Required R2O Endpoints

1. **POST /v1/tables** — Create table per party (in Börsensaufen area)
2. **POST /v1/products** — Create product in !C2Börsensaufen category dynamically
3. **POST /v1/tables/{tableId}/orders** — Book order to party's table
4. **GET /v1/tables/{tableId}** — Fetch table state (optional, for status)

### Auth
- Header: `Authorization: Bearer ${READY2ORDER_ACCOUNT_TOKEN}`
- Token loaded from env on startup

---

## UI Components to Create/Modify

1. **OrderSubmit.tsx** (new)
   - Button: "Submit Order to R2O" or "Pay"
   - Shows loading spinner + status

2. **AdminR2OStatus.tsx** (new)
   - List parties + their R2O table IDs
   - Show submission history
   - Manual retry button if needed

3. **ShoppingBasket.tsx** (modify)
   - Add submit button linking to OrderSubmit
   - Show "submitted to R2O" status

---

## Security & Validation

- **Validate basket items** before sending (qty > 0, price >= 0)
- **Rate limit** submissions (max 10 orders/party/minute)
- **Auth check**: Only logged-in table members can submit
- **Idempotency**: Track submission IDs to prevent duplicates
- **Audit log**: Record all R2O submissions with timestamps

---

## Testing Strategy

### Local Dev
```bash
# 1. Start both Next + Convex
npm run dev
npx convex dev

# 2. Test party creation → R2O table appears
# (check R2O API or logs)

# 3. Test basket submission → Products + order appear
# (submit via UI, check R2O)

# 4. Test party close → R2O table persists
# (close party, verify table still in R2O)
```

### Production
- Dry-run mode: log to console without calling R2O API
- Feature flag to enable/disable R2O submissions
- Monitoring: alert if >5 consecutive R2O API failures
