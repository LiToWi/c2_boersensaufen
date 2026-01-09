# Bill Customization Guide

When orders are submitted to Ready2Order via the Börsensaufen system, you can customize the text and content that appears on printed receipts/bills.

## Configuration Options

Bill customization is controlled through environment variables in your `.env.local` file:

### `R2O_BILL_HEADER`
- **Description**: Text to print at the top of the bill (e.g., event name or header)
- **Default**: `Börsensaufen`
- **Example**: `R2O_BILL_HEADER="Campus Cneipe - Börsensaufen"`

### `R2O_BILL_FOOTER`
- **Description**: Text to print at the bottom of the bill (e.g., disclaimer or thank you message)
- **Default**: `Thank you for your order!`
- **Example**: `R2O_BILL_FOOTER="Cheers! Please drink responsibly."`

### `R2O_BILL_ITEM_NOTE`
- **Description**: Custom note/memo text appended to each item on the bill
- **Default**: (empty/none)
- **Example**: `R2O_BILL_ITEM_NOTE="From Börsensaufen Stock Exchange"`

### `R2O_BILL_INCLUDE_EVENT`
- **Description**: Whether to automatically include the event name (header text) in each item description on the bill
- **Default**: `true` (enabled)
- **Options**: `true` or `false`
- **Example**: `R2O_BILL_INCLUDE_EVENT=false`

### `R2O_BILL_INCLUDE_PARTY_TABLE`
- **Description**: Whether to include party name and table name on the bill (both in product names and in the order memo)
- **Default**: `true` (enabled)
- **Options**: `true` or `false`
- **Example**: `R2O_BILL_INCLUDE_PARTY_TABLE=true`

## Examples

### Example 1: Event with Custom Footer and Party/Table Info
```env
R2O_BILL_HEADER="🍺 Campus Cneipe Börsensaufen"
R2O_BILL_FOOTER="Prost! Thank you for participating in the stock exchange!"
R2O_BILL_ITEM_NOTE="Stock Exchange Price"
R2O_BILL_INCLUDE_PARTY_TABLE=true
```

This will produce bills that look like:
```
🍺 Campus Cneipe Börsensaufen
Table: T5
Party: Group A

Beer - 🍺 Campus Cneipe Börsensaufen - Table T5 - Party: Group A | Stock Exchange Price
Quantity: 2  Price: €2.50

Prost! Thank you for participating in the stock exchange!
```

### Example 2: Minimal Setup
```env
R2O_BILL_HEADER="Börsensaufen"
R2O_BILL_FOOTER=""
R2O_BILL_INCLUDE_EVENT=false
R2O_BILL_INCLUDE_PARTY_TABLE=false
```

This produces clean, simple bills with just the drink name and price.

### Example 3: No Custom Text
```env
# Leave all bill config unset or set to empty strings
R2O_BILL_HEADER=""
R2O_BILL_FOOTER=""
R2O_BILL_INCLUDE_PARTY_TABLE=false
```

This uses the default behavior with just drink names and prices.

### Example 4: Party/Table Only (No Event Name)
```env
R2O_BILL_HEADER=""
R2O_BILL_FOOTER=""
R2O_BILL_INCLUDE_EVENT=false
R2O_BILL_INCLUDE_PARTY_TABLE=true
```

Bills will include only party and table information:
```
Table: T5
Party: Group A

Beer - Table T5
Quantity: 2  Price: €2.50
```

## How It Works

### Product Names
When `R2O_BILL_INCLUDE_EVENT` is `true` (default), the system automatically appends the event name to each product:
- **Original**: `Hofbräu`
- **On Bill**: `Hofbräu - Börsensaufen`

When `R2O_BILL_INCLUDE_PARTY_TABLE` is `true` (default), the system also includes table name:
- **With Party/Table**: `Hofbräu - Börsensaufen - Table T5`

This helps bar staff identify which event/party the drinks are for.

### Item Notes
The `R2O_BILL_ITEM_NOTE` is added to the product metadata and will appear on the bill next to each item. When party/table names are enabled, they appear in the same note field. This is useful for:
- Identifying items as part of a special event
- Including party/table information for staff
- Adding custom pricing disclaimers
- Including event-specific instructions

Example with all options enabled:
```
Party: Group A | Stock Exchange Price
```

### Order Memo (Receipt Header/Footer)
The header, footer, and party/table info are combined into a memo field in the order that Ready2Order may display on the receipt. This depends on your Ready2Order configuration and printer settings.

Example output:
```
Börsensaufen
Table: T5
Party: Group A
Thank you for your order!
```

## Implementation Details

The bill customization is implemented in [src/app/api/ready2order/submit-order/route.ts](src/app/api/ready2order/submit-order/route.ts):

1. **BILL_CONFIG object** reads all environment variables at startup
2. **createR2OProduct()** adds item notes and optionally prefixes product names
3. **bookOrderToTable()** includes header/footer text in the order memo fields

## Testing

To test bill customization:

1. Update `.env.local` with desired settings
2. Restart the application
3. Submit a test order through Börsensaufen
4. Check the receipt printed by Ready2Order

Note: Some Ready2Order printer configurations may not display all memo text depending on printer capabilities and layout settings.

## Common Use Cases

### Student Event at Campus Bar
```env
R2O_BILL_HEADER="Campus Cneipe Börsensaufen 2026"
R2O_BILL_FOOTER="Thank you for supporting Campus Cneipe!"
R2O_BILL_ITEM_NOTE="Event Price"
```

### Bar Promotion/Special Night
```env
R2O_BILL_HEADER="🎉 Special Happy Hour - Börsen🍺ufen"
R2O_BILL_FOOTER="Only tonight! Enjoy the stock exchange prices!"
R2O_BILL_INCLUDE_EVENT=false
```

### Minimalist (No Custom Text)
```env
R2O_BILL_INCLUDE_EVENT=false
# Leave header/footer empty
```

## Troubleshooting

### Text Not Appearing on Receipt
- Check that environment variables are set correctly in `.env.local`
- Verify the application was restarted after changing `.env.local`
- Check Ready2Order printer settings — some printers may have character limits or disable memo printing
- Review logs for any errors during order submission

### Text Appearing in Wrong Location
- This depends on Ready2Order's bill template and printer configuration
- Contact your Ready2Order support if you need to adjust where memo text appears
- Different printer types may layout text differently

### Special Characters Not Showing
- Some printers only support ASCII characters
- Emoji (like 🍺) may not display on thermal printers
- Test with your specific printer before using special characters in production
