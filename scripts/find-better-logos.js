#!/usr/bin/env node

/**
 * Simple script to search for better bank logos and update database
 */

const fs = require("fs");
const path = require("path");

// Bank logo mappings from reliable sources
const BANK_LOGO_MAPPINGS = {
  Chase: {
    logoUrl: "https://cdn.simpleicons.org/chase/FFFFFF",
    brandColor: "#117AC9",
  },
  "Bank of America": {
    logoUrl: "https://cdn.simpleicons.org/bankofamerica/FFFFFF",
    brandColor: "#012169",
  },
  "Wells Fargo": {
    logoUrl: "https://cdn.simpleicons.org/wellsfargo/FFFFFF",
    brandColor: "#d71e28",
  },
  "Citibank Online": {
    logoUrl: "https://cdn.simpleicons.org/citibank/FFFFFF",
    brandColor: "#003A8F",
  },
  "American Express": {
    logoUrl: "https://cdn.simpleicons.org/americanexpress/FFFFFF",
    brandColor: "#006FCF",
  },
  "Barclays - Cards": {
    logoUrl: "https://cdn.simpleicons.org/barclays/FFFFFF",
    brandColor: "#00aeef",
  },
  "Capital One": {
    logoUrl: "https://cdn.simpleicons.org/capitalone/FFFFFF",
    brandColor: "#0057B8",
  },
  Discover: {
    logoUrl: "https://cdn.simpleicons.org/discover/FFFFFF",
    brandColor: "#FF6000",
  },
};

console.log("🔍 Searching for better bank logos...");

// Create a SQL file with the updates
const sqlUpdates = [];

Object.entries(BANK_LOGO_MAPPINGS).forEach(([bankName, logoData]) => {
  sqlUpdates.push(`UPDATE banks 
    SET "logoUrl" = '${logoData.logoUrl}', 
        "brandColor" = '${logoData.brandColor}' 
    WHERE name = '${bankName}' 
    AND "logoUrl" IS NULL;`);

  console.log(`✅ Found logo for ${bankName}: ${logoData.logoUrl}`);
});

if (sqlUpdates.length > 0) {
  const sqlContent = sqlUpdates.join("\n\n");
  const outputFile = path.join(__dirname, "../scripts/update-bank-logos.sql");

  fs.writeFileSync(outputFile, sqlContent);
  console.log(`📄 SQL file created: ${outputFile}`);
  console.log(`🎯 Found logos for ${sqlUpdates.length} banks`);
  console.log("⚡ Run this SQL file to update your database");
} else {
  console.log("❌ No bank logos found");
}

console.log("🎉 Logo search complete!");
