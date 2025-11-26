#!/usr/bin/env tsx
/**
 * End-to-End Vault Test
 * 
 * Tests the complete flow:
 * 1. Store encrypted token in Vault via Prisma (like production)
 * 2. Retrieve token from Vault via Prisma (like production)
 * 3. Use token with Plaid API
 * 
 * Run: npm run test:vault-e2e
 */

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { prisma } from '../lib/prisma';

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

async function storeTokenInVault(accessToken: string, itemId: string): Promise<string> {
  console.log('📦 Storing token in Vault via Prisma...');
  
  // Use the same SQL query as production code
  const vaultResult = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT vault.create_secret(${accessToken}, ${itemId}, 'E2E Test Token') as id;
  `;

  const secretId = vaultResult[0]?.id;
  
  if (!secretId) {
    throw new Error('Vault storage failed: No secret_id returned');
  }
  
  console.log('✅ Token stored, secret_id:', secretId);
  return secretId;
}

async function retrieveTokenFromVault(secretId: string): Promise<string> {
  console.log('🔓 Retrieving token from Vault via Prisma...');
  
  // Use the same SQL query as production code
  const vaultResult = await prisma.$queryRaw<Array<{ decrypted_secret: string }>>`
    SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = ${secretId}::uuid;
  `;

  const accessToken = vaultResult[0]?.decrypted_secret;
  
  if (!accessToken) {
    throw new Error('Vault retrieval failed: No token found');
  }
  
  console.log('✅ Token retrieved successfully');
  return accessToken;
}

async function testPlaidWithToken(accessToken: string): Promise<void> {
  console.log('🏦 Testing Plaid API with retrieved token...');
  
  const configuration = new Configuration({
    basePath: PlaidEnvironments[PLAID_ENV as keyof typeof PlaidEnvironments],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': PLAID_CLIENT_ID!,
        'PLAID-SECRET': PLAID_SECRET!,
      },
    },
  });

  const plaidClient = new PlaidApi(configuration);
  
  const response = await plaidClient.itemGet({
    access_token: accessToken,
  });

  console.log('✅ Plaid API call successful');
  console.log('   Institution:', response.data.item.institution_id);
  console.log('   Status:', response.data.item.error ? 'ERROR' : 'OK');
}

async function main() {
  console.log('🚀 Starting End-to-End Vault Test\n');
  
  // Validate environment
  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    throw new Error('Missing Plaid credentials');
  }
  
  if (PLAID_ENV !== 'sandbox') {
    throw new Error('This test only runs in sandbox mode');
  }
  
  try {
    // Step 1: Create a sandbox Plaid item
    console.log('🏗️  Creating Plaid sandbox item...');
    const configuration = new Configuration({
      basePath: PlaidEnvironments.sandbox,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
          'PLAID-SECRET': PLAID_SECRET,
        },
      },
    });
    
    const plaidClient = new PlaidApi(configuration);
    
    const createResponse = await plaidClient.sandboxPublicTokenCreate({
      institution_id: 'ins_109508', // Chase
      initial_products: ['transactions' as any],
    });
    
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: createResponse.data.public_token,
    });
    
    const originalToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;
    console.log('✅ Sandbox item created\n');
    
    // Step 2: Store in Vault (using Prisma like production)
    const secretId = await storeTokenInVault(originalToken, itemId);
    console.log('');
    
    // Step 3: Retrieve from Vault (using Prisma like production)
    const retrievedToken = await retrieveTokenFromVault(secretId);
    console.log('');
    
    // Step 4: Verify token matches
    if (retrievedToken !== originalToken) {
      throw new Error('Token mismatch! Vault encryption/decryption failed');
    }
    console.log('✅ Token integrity verified\n');
    
    // Step 5: Use retrieved token with Plaid
    await testPlaidWithToken(retrievedToken);
    console.log('');
    
    // Step 6: Cleanup
    console.log('🧹 Cleaning up sandbox item...');
    await plaidClient.itemRemove({
      access_token: originalToken,
    });
    console.log('✅ Cleanup complete\n');
    
    console.log('='.repeat(50));
    console.log('✅ END-TO-END VAULT TEST PASSED');
    console.log('='.repeat(50));
    console.log('\nThe complete flow works:');
    console.log('  1. ✅ Vault storage (encryption)');
    console.log('  2. ✅ Vault retrieval (decryption)');
    console.log('  3. ✅ Token integrity');
    console.log('  4. ✅ Plaid API integration');
    
  } catch (error) {
    console.error('\n❌ END-TO-END TEST FAILED');
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
