// Quick test script to check party R2O status
import { ConvexHttpClient } from 'convex/browser';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || 'http://127.0.0.1:3210';
const client = new ConvexHttpClient(convexUrl);

async function checkPartyStatus() {
  try {
    // Get the most recent party
    const parties = await client.query('parties:getAllParties' as any);
    console.log('Recent parties:', JSON.stringify(parties, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPartyStatus();
