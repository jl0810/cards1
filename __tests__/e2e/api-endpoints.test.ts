/**
 * @jest-environment node
 * 
 * API Endpoint Smoke Tests
 * Verifies all critical API endpoints are reachable and return expected responses
 */

describe('API Endpoint Smoke Tests', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  describe('Health Checks', () => {
    it('should have API routes accessible', async () => {
      // This just verifies the test can run
      expect(BASE_URL).toBeDefined();
    });
  });

  describe('Plaid API Endpoints', () => {
    it('should return 401 for unauthenticated sync-transactions request', async () => {
      const response = await fetch(`${BASE_URL}/api/plaid/sync-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: 'test' }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 401 for unauthenticated exchange-public-token request', async () => {
      const response = await fetch(`${BASE_URL}/api/plaid/exchange-public-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: 'test' }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('User API Endpoints', () => {
    it('should return 401 for unauthenticated family member creation', async () => {
      const response = await fetch(`${BASE_URL}/api/user/family`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Benefits API Endpoints', () => {
    it('should return 401 for unauthenticated benefits usage request', async () => {
      const response = await fetch(`${BASE_URL}/api/benefits/usage`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });
});
