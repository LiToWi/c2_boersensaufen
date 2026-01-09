// Quick test script to check party R2O status
import { ConvexHttpClient } from 'convex/browser';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || 'http://127.0.0.1:3210';
const client = new ConvexHttpClient(convexUrl);

async function checkPartyStatus() {
  try {
    // Get the most recent party
    const parties = await client.query('parties:getAllParties');
    console.log(`Total parties: ${parties.length}\n`);
    
    // Check each party's R2O status
    for (const party of parties.slice(-3)) {
      const fullParty = await client.query('parties:getPartyById', { id: party._id });
      console.log(`Party: ${fullParty.name} (${fullParty._id})`);
      console.log(`  Closed: ${fullParty.closed}`);
      console.log(`  R2O Table ID: ${fullParty.r2oTableId || 'NOT SET'}`);
      console.log(`  R2O Status: ${fullParty.r2oTableCreationStatus || 'NOT SET'}`);
      console.log(`  R2O Error: ${fullParty.r2oTableCreationError || 'none'}`);
      console.log('');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPartyStatus();
