#!/usr/bin/env node

/**
 * Generate QR code login URLs for all tables
 * Usage: node generate-login-urls.js
 */

const { ConvexHttpClient } = require("convex/browser");
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

async function main() {
  // Get Convex URL from environment or use default
  const convexUrl = process.env.CONVEX_SELF_HOSTED_URL || "http://127.0.0.1:3210";
  const baseUrl = "https://stonks.campus-cneipe.de";
  const outputDir = path.join(__dirname, 'qr-codes');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created directory: ${outputDir}\n`);
  }
  
  console.log(`Connecting to Convex at: ${convexUrl}\n`);
  
  const client = new ConvexHttpClient(convexUrl);
  
  try {
    // Fetch all tables from Convex
    const tables = await client.query("tables:getAllTables");
    
    if (!tables || tables.length === 0) {
      console.log("No tables found in database.");
      return;
    }
    
    console.log(`Found ${tables.length} tables:\n`);
    console.log("=".repeat(80));
    
    // Sort tables by name
    tables.sort((a, b) => {
      // Extract numbers from table names for proper sorting
      const aNum = parseInt(a.name.match(/\d+/)?.[0] || "0");
      const bNum = parseInt(b.name.match(/\d+/)?.[0] || "0");
      
      // If both have numbers, sort numerically
      if (aNum && bNum) return aNum - bNum;
      
      // Otherwise sort alphabetically
      return a.name.localeCompare(b.name);
    });
    
    // Output each table with its login URL
    for (const table of tables) {
      if (table.token) {
        const url = `${baseUrl}/login?token=${table.token}`;
        console.log(`${table.name}: ${url}`);
        
        // Generate QR code
        const sanitizedName = table.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const qrFilePath = path.join(outputDir, `${sanitizedName}.png`);
        
        try {
          await QRCode.toFile(qrFilePath, url, {
            width: 500,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          console.log(`  → QR code saved: ${qrFilePath}`);
        } catch (qrError) {
          console.error(`  ✗ Failed to generate QR code: ${qrError.message}`);
        }
      } else {
        console.log(`${table.name}: [NO TOKEN] - Please generate a token for this table`);
      }
    }
    
    console.log("=".repeat(80));
    console.log(`\nTotal: ${tables.length} login URLs generated`);
    console.log(`QR codes saved to: ${outputDir}`);
    
  } catch (error) {
    console.error("Error fetching tables:", error.message);
    console.error("\nMake sure:");
    console.error("1. Convex backend is running");
    console.error("2. CONVEX_SELF_HOSTED_URL is set correctly");
    console.error("3. The 'getAllTables' query exists in convex/tables.ts");
    console.error("4. QR code library is installed: npm install qrcode");
    process.exit(1);
  }
}

main();
