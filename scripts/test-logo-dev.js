#!/usr/bin/env node

/**
 * Search for better bank logos on logo.dev API
 */

require("dotenv").config({ path: ".env.local" });

const API_KEY =
  process.env.LOGODEV_SECRET_KEY ||
  process.env.NEXT_PUBLIC_LOGODEV_PUBLISHABLE_KEY;

async function searchLogo(bankName) {
  console.log(`🔍 Searching for: ${bankName}`);

  try {
    const response = await fetch(
      `https://api.logo.dev/search?q=${encodeURIComponent(bankName)}`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Error: ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Found ${data.length} results:`);

    data.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.name} - ${result.domain}`);
      if (result.logo_url) {
        console.log(`     Logo: ${result.logo_url}`);
      }
    });

    return data;
  } catch (error) {
    console.log(`💥 Network error: ${error.message}`);
    return null;
  }
}

// Search for remaining banks
const banks = [
  "capital one",
  "discover",
  "td bank",
  "us bank",
  "robinhood",
  "barclays bank",
  "cardless",
];

banks.forEach((bank) => {
  searchLogo(bank);
  console.log("---");
});

// Search specifically for US Bank
searchLogo("usbank");
