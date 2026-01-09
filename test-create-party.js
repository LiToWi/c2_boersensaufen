// Test script to create a party and trigger R2O table creation
import { ConvexHttpClient } from 'convex/browser';
import { api } from './convex/_generated/api.js';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || 'http://127.0.0.1:3210';
const client = new ConvexHttpClient(convexUrl);

async function testCreateParty() {
  try {
    // List all tables first
    console.log('Fetching tables...');
    // For now, use Stammtisch - but we'll create a unique party name to avoid conflicts
    
    const table = await client.query(api.tables.getTableByName, { name: 'Stammtisch' });
    if (!table) {
      console.error('Table "Stammtisch" not found');
      return;
    }
    
    // Check if there's an active party
    const parties = await client.query(api.parties.getOpenPartiesByName, { name: 'Stammtisch' });
    console.log(`Found ${parties.length} open parties at Stammtisch`);
    
    if (parties.length > 0) {
      console.log('Skipping party creation - please close existing parties first via the web UI');
      console.log('Open parties:', parties.map(p => p.name).join(', '));
      
      // Instead, let's test R2O table creation for an existing party
      const existingParty = parties[0];
      console.log(`\nTesting R2O table creation for existing party: ${existingParty.name}`);
      
      try {
        const result = await client.action(api.r2oCreateTable.createPartyR2OTablePublic, {
          partyId: existingParty._id,
          partyName: existingParty.name,
        });
        console.log('R2O table creation result:', result);
      } catch (r2oError) {
        console.error('R2O table creation failed:', r2oError);
        console.error('Full error:', JSON.stringify(r2oError, null, 2));
      }
      
      // Wait and check status
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const partyStatus = await client.query(api.parties.getPartyById, { id: existingParty._id });
      console.log('\nParty R2O status:');
      console.log('  R2O Table ID:', partyStatus.r2oTableId || 'NOT SET');
      console.log('  R2O Status:', partyStatus.r2oTableCreationStatus || 'NOT SET');
      console.log('  R2O Error:', partyStatus.r2oTableCreationError || 'none');
      
      return;
    }
    
    const testPartyName = `TestParty-${Date.now()}`;
    console.log(`Creating party "${testPartyName}"...`);
    
    // Create party
    const newParty = await client.mutation(api.parties.createParty, {
      name: testPartyName,
      tableId: table._id,
      creatorId: 'test-creator',
    });
    
    console.log('Party created:', newParty._id);
    
    // Now trigger R2O table creation
    console.log('Triggering R2O table creation...');
    try {
      const result = await client.action(api.r2oCreateTable.createPartyR2OTablePublic, {
        partyId: newParty._id,
        partyName: testPartyName,
      });
      console.log('R2O table creation result:', result);
    } catch (r2oError) {
      console.error('R2O table creation failed:', r2oError);
    }
    
    // Wait and check status
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const partyStatus = await client.query(api.parties.getPartyById, { id: newParty._id });
    console.log('\nParty R2O status:');
    console.log('  R2O Table ID:', partyStatus.r2oTableId || 'NOT SET');
    console.log('  R2O Status:', partyStatus.r2oTableCreationStatus || 'NOT SET');
    console.log('  R2O Error:', partyStatus.r2oTableCreationError || 'none');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCreateParty();
