#!/usr/bin/env node

/**
 * Convert SVG logos to PNG format for better performance
 * One-time script to optimize bank logo display
 */

const { PrismaClient } = require("../generated/prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Create the Prisma adapter
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function convertSvgToPng(svgContent, outputPath, size = 64) {
  try {
    // Convert SVG to PNG with proper sizing
    const pngBuffer = await sharp(Buffer.from(svgContent))
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, g: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9, quality: 90 })
      .toBuffer();

    // Save to file
    fs.writeFileSync(outputPath, pngBuffer);
    return pngBuffer.toString("base64");
  } catch (error) {
    console.error("Error converting SVG to PNG:", error);
    return null;
  }
}

async function processBankLogos() {
  console.log("🔄 Starting bank logo conversion...");

  try {
    // Create output directory
    const outputDir = path.join(__dirname, "../public/bank-logos");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Get banks with SVG but no PNG
    const banks = await prisma.bank.findMany({
      where: {
        logoSvg: {
          not: null,
        },
        logoUrl: null,
      },
    });

    console.log(`📋 Found ${banks.length} banks to convert`);

    for (const bank of banks) {
      console.log(`🔄 Processing: ${bank.name}`);

      const filename = `${bank.id}.png`;
      const outputPath = path.join(outputDir, filename);

      // Convert SVG to PNG
      const base64Png = await convertSvgToPng(bank.logoSvg, outputPath);

      if (base64Png) {
        // Update database with PNG URL
        const pngUrl = `/bank-logos/${filename}`;

        await prisma.bank.update({
          where: { id: bank.id },
          data: { logoUrl: pngUrl },
        });

        console.log(`✅ Converted ${bank.name} -> ${pngUrl}`);
      } else {
        console.log(`❌ Failed to convert ${bank.name}`);
      }
    }

    console.log("🎉 Bank logo conversion complete!");
  } catch (error) {
    console.error("💥 Error processing bank logos:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the conversion
processBankLogos();
