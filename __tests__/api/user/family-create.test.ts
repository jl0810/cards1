/**
 * @jest-environment node
 */

import { POST, GET } from '@/app/api/user/family/route';
import { getFamilyMembers, createFamilyMember, UserNotFoundError } from '@/lib/family-operations';
import { rateLimit } from '@/lib/rate-limit';

// Mock dependencies
jest.mock('@clerk/nextjs/server');
jest.mock('@/lib/family-operations');
jest.mock('@/lib/rate-limit');

import { auth } from '@clerk/nextjs/server';

/**
 * US-003/004: Family Member API Tests
 * Tests BR-003 (Ownership), BR-004 (Name Requirements)
 * 
 * @implements BR-003 - Family member ownership verification
 * @implements BR-004 - Name validation requirements
 * @satisfies US-003 - Add Family Members
 * @satisfies US-004 - Update Family Member
 */
describe('US-003: Add Family Members API', () => {
  const mockUserId = 'user_123';

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue({ userId: mockUserId });
    (rateLimit as jest.Mock).mockResolvedValue(false);
  });

  describe('BR-003: Family Member Ownership - GET', () => {
    it('should return family members for authenticated user', async () => {
      const mockMembers = [
        { id: 'member_1', name: 'John Doe', isPrimary: true },
        { id: 'member_2', name: 'Jane Doe', isPrimary: false },
      ];

      (getFamilyMembers as jest.Mock).mockResolvedValue(mockMembers);

      const request = new Request('http://localhost/api/user/family', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockMembers);
      expect(getFamilyMembers).toHaveBeenCalledWith(mockUserId);

      console.log('✅ BR-003: GET returns user\'s family members');
    });

    it('should return 401 if user not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue({ userId: null });

      const request = new Request('http://localhost/api/user/family', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(401);
      expect(getFamilyMembers).not.toHaveBeenCalled();

      console.log('✅ BR-003: GET requires authentication');
    });

    it('should return 404 if user profile not found', async () => {
      (getFamilyMembers as jest.Mock).mockRejectedValue(new UserNotFoundError());

      const request = new Request('http://localhost/api/user/family', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(404);

      console.log('✅ BR-003: GET returns 404 for missing user profile');
    });
  });

  describe('BR-003: Family Member Ownership - POST', () => {
    it('should create family member for authenticated user', async () => {
      const mockMember = {
        id: 'member_new',
        userId: 'profile_123',
        name: 'New Member',
        email: 'new@example.com',
        role: 'Member',
        isPrimary: false,
      };

      (createFamilyMember as jest.Mock).mockResolvedValue(mockMember);

      const request = new Request('http://localhost/api/user/family', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Member',
          email: 'new@example.com',
          role: 'Member',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockMember);
      expect(createFamilyMember).toHaveBeenCalledWith(mockUserId, {
        name: 'New Member',
        email: 'new@example.com',
        avatar: undefined,
        role: 'Member',
      });

      console.log('✅ BR-003: POST creates member for authenticated user');
    });

    it('should return 401 if user not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue({ userId: null });

      const request = new Request('http://localhost/api/user/family', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(createFamilyMember).not.toHaveBeenCalled();

      console.log('✅ BR-003: POST requires authentication');
    });

    it('should return 404 if user profile not found', async () => {
      (createFamilyMember as jest.Mock).mockRejectedValue(new UserNotFoundError());

      const request = new Request('http://localhost/api/user/family', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Member' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(404);

      console.log('✅ BR-003: POST returns 404 for missing user profile');
    });
  });

  describe('BR-004: Family Member Name Requirements', () => {
    it('should require name field', async () => {
      const request = new Request('http://localhost/api/user/family', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(createFamilyMember).not.toHaveBeenCalled();

      console.log('✅ BR-004: Name is required');
    });

    it('should reject empty name', async () => {
      const request = new Request('http://localhost/api/user/family', {
        method: 'POST',
        body: JSON.stringify({
          name: '',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(createFamilyMember).not.toHaveBeenCalled();

      console.log('✅ BR-004: Empty name rejected');
    });

    it('should reject name longer than 100 characters', async () => {
      const longName = 'a'.repeat(101);

      const request = new Request('http://localhost/api/user/family', {
        method: 'POST',
        body: JSON.stringify({
          name: longName,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(createFamilyMember).not.toHaveBeenCalled();

      console.log('✅ BR-004: Name length limited to 100 chars');
    });

    it('should accept valid name', async () => {
      const mockMember = {
        id: 'member_valid',
        name: 'Valid Name',
        isPrimary: false,
      };

      (createFamilyMember as jest.Mock).mockResolvedValue(mockMember);

      const request = new Request('http://localhost/api/user/family', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Valid Name',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(createFamilyMember).toHaveBeenCalled();

      console.log('✅ BR-004: Valid name accepted');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit on POST', async () => {
      (rateLimit as jest.Mock).mockResolvedValue(true);

      const request = new Request('http://localhost/api/user/family', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(429);
      expect(createFamilyMember).not.toHaveBeenCalled();

      console.log('✅ Rate limiting enforced on POST');
    });
  });

  describe('Input Validation', () => {
    it('should validate email format if provided', async () => {
      const request = new Request('http://localhost/api/user/family', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'invalid-email',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      expect(createFamilyMember).not.toHaveBeenCalled();

      console.log('✅ Email validation enforced');
    });

    it('should accept null email', async () => {
      const mockMember = {
        id: 'member_no_email',
        name: 'No Email User',
        email: null,
        isPrimary: false,
      };

      (createFamilyMember as jest.Mock).mockResolvedValue(mockMember);

      const request = new Request('http://localhost/api/user/family', {
        method: 'POST',
        body: JSON.stringify({
          name: 'No Email User',
          email: null,
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);

      console.log('✅ Null email accepted');
    });

    it('should accept optional avatar', async () => {
      const mockMember = {
        id: 'member_avatar',
        name: 'Avatar User',
        avatar: 'https://example.com/avatar.jpg',
        isPrimary: false,
      };

      (createFamilyMember as jest.Mock).mockResolvedValue(mockMember);

      const request = new Request('http://localhost/api/user/family', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Avatar User',
          avatar: 'https://example.com/avatar.jpg',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(createFamilyMember).toHaveBeenCalledWith(mockUserId, expect.objectContaining({
        avatar: 'https://example.com/avatar.jpg',
      }));

      console.log('✅ Avatar field accepted');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on unexpected error in GET', async () => {
      (getFamilyMembers as jest.Mock).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/user/family', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBe(500);

      console.log('✅ GET returns 500 on unexpected error');
    });

    it('should return 500 on unexpected error in POST', async () => {
      (createFamilyMember as jest.Mock).mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/user/family', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);

      console.log('✅ POST returns 500 on unexpected error');
    });
  });
});
