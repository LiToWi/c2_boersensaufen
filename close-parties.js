// Script to close all active parties
import { ConvexHttpClient } from 'convex/browser';
import { api } from './convex/_generated/api.js';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || 'http://127.0.0.1:3210';
const client = new ConvexHttpClient(convexUrl);

async function closeAllParties() {
  try {
    const parties = await client.query(api.parties.getAllParties);
    
    for (const party of parties) {
      if (!party.closed) {
        console.log(`Closing party: ${party.name} (${party._id})`);
        await client.mutation(api.parties.closeParty, {
          partyId: party._id,
          creatorId: 'test-creator',
        });
      }
    }
    
    console.log('All parties closed');
  } catch (error) {
    console.error('Error:', error);
  }
}

closeAllParties();
