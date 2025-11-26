#!/usr/bin/env tsx
/**
 * Production Smoke Test
 * 
 * Validates critical production endpoints are working
 * Run after every deployment: npm run smoke-test
 */

import { env } from '@/env';

const PRODUCTION_URL = process.env.SMOKE_TEST_URL || 'https://your-app.vercel.app';
const TEST_TIMEOUT = 10000;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`✅ ${name}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg, duration: Date.now() - start });
    console.error(`❌ ${name}: ${errorMsg}`);
  }
}

async function testHealthEndpoint() {
  const response = await fetch(`${PRODUCTION_URL}/api/health`, {
    signal: AbortSignal.timeout(TEST_TIMEOUT),
  });
  
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  
  const data = await response.json();
  if (data.status !== 'ok') {
    throw new Error('Health check returned non-ok status');
  }
}

async function testEnvironmentVariables() {
  // Validate critical env vars are set
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'PLAID_CLIENT_ID',
    'PLAID_SECRET',
    'CLERK_SECRET_KEY',
  ];
  
  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required env var: ${key}`);
    }
  }
}

async function testSupabaseConnection() {
  const response = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
    {
      headers: {
        'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      signal: AbortSignal.timeout(TEST_TIMEOUT),
    }
  );
  
  if (!response.ok && response.status !== 404) {
    throw new Error(`Supabase connection failed: ${response.status}`);
  }
}

async function testVaultRPCExists() {
  // Just check the RPC endpoint exists (don't actually call it without auth)
  const response = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_plaid_access_token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ token_id: 'test' }),
      signal: AbortSignal.timeout(TEST_TIMEOUT),
    }
  );
  
  // We expect 401/403 (unauthorized), NOT 404 (function doesn't exist)
  if (response.status === 404) {
    throw new Error('Vault RPC function not found - check Supabase setup');
  }
}

async function testDatabaseConnection() {
  // This would require a test endpoint - placeholder
  console.log('⚠️  Database connection test not implemented (requires test endpoint)');
}

async function main() {
  console.log('🔍 Running Production Smoke Tests...\n');
  console.log(`Target: ${PRODUCTION_URL}\n`);
  
  await runTest('Environment Variables', testEnvironmentVariables);
  await runTest('Supabase Connection', testSupabaseConnection);
  await runTest('Vault RPC Exists', testVaultRPCExists);
  
  // Only test production URL if provided
  if (process.env.SMOKE_TEST_URL) {
    await runTest('Health Endpoint', testHealthEndpoint);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('SMOKE TEST RESULTS');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`\n✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total time: ${results.reduce((sum, r) => sum + r.duration, 0)}ms\n`);
  
  if (failed > 0) {
    console.error('SMOKE TESTS FAILED - DO NOT DEPLOY');
    process.exit(1);
  } else {
    console.log('✅ ALL SMOKE TESTS PASSED');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('Fatal error running smoke tests:', error);
  process.exit(1);
});
