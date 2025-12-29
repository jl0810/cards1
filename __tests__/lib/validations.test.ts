import { describe, expect, it } from '@jest/globals';

/**
 * Validation Tests
 * @covers US-015 - Input Validation
 */

import {
  CreateFamilyMemberSchema,
  UpdateFamilyMemberSchema,
  SyncTransactionsSchema,
  UpdateAccountNicknameSchema,
  CreateCardProductSchema,
  UpdateUserPreferencesSchema,
  CreateCardBenefitSchema,
  validateSchema,
  safeValidateSchema,
} from '@/lib/validations';

describe('Validation Schemas', () => {
  describe('CreateFamilyMemberSchema', () => {
    it('should validate a valid family member', () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        role: 'Member',
      };
      const result = CreateFamilyMemberSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John Doe');
        expect(result.data.email).toBe('john@example.com');
      }
    });

    it('should trim whitespace from name', () => {
      const data = { name: '  John Doe  ' };
      const result = CreateFamilyMemberSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('John Doe');
      }
    });

    it('should reject empty name', () => {
      const data = { name: '' };
      const result = CreateFamilyMemberSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject name longer than 100 characters', () => {
      const data = { name: 'a'.repeat(101) };
      const result = CreateFamilyMemberSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const data = { name: 'John', email: 'invalid-email' };
      const result = CreateFamilyMemberSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept valid email', () => {
      const data = { name: 'John', email: 'test@example.com' };
      const result = CreateFamilyMemberSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept null email', () => {
      const data = { name: 'John', email: null };
      const result = CreateFamilyMemberSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should default role to Member', () => {
      const data = { name: 'John' };
      const result = CreateFamilyMemberSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe('Member');
      }
    });
  });

  describe('UpdateFamilyMemberSchema', () => {
    it('should allow partial updates', () => {
      const data = { name: 'Jane' };
      const result = UpdateFamilyMemberSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should allow updating just email', () => {
      const data = { email: 'new@example.com' };
      const result = UpdateFamilyMemberSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should allow all fields to be undefined', () => {
      const data = {};
      const result = UpdateFamilyMemberSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('SyncTransactionsSchema', () => {
    it('should validate itemId', () => {
      const data = { itemId: 'item_123' };
      const result = SyncTransactionsSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject empty itemId', () => {
      const data = { itemId: '' };
      const result = SyncTransactionsSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow optional cursor', () => {
      const data = { itemId: 'item_123', cursor: 'cursor_abc' };
      const result = SyncTransactionsSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('UpdateAccountNicknameSchema', () => {
    it('should accept valid nickname', () => {
      const data = { nickname: 'My Savings' };
      const result = UpdateAccountNicknameSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept null nickname', () => {
      const data = { nickname: null };
      const result = UpdateAccountNicknameSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should trim whitespace', () => {
      const data = { nickname: '  Savings  ' };
      const result = UpdateAccountNicknameSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nickname).toBe('Savings');
      }
    });

    it('should reject nickname longer than 50 characters', () => {
      const data = { nickname: 'a'.repeat(51) };
      const result = UpdateAccountNicknameSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateCardProductSchema', () => {
    it('should validate complete card product', () => {
      const data = {
        issuer: 'Chase',
        productName: 'Sapphire Preferred',
        cardType: 'Credit',
        annualFee: 95,
        signupBonus: '60,000 points',
        imageUrl: 'https://example.com/card.jpg',
      };
      const result = CreateCardProductSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject negative annual fee', () => {
      const data = {
        issuer: 'Chase',
        productName: 'Card',
        annualFee: -50,
      };
      const result = CreateCardProductSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept zero annual fee', () => {
      const data = {
        issuer: 'Chase',
        productName: 'Freedom',
        annualFee: 0,
      };
      const result = CreateCardProductSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid image URL', () => {
      const data = {
        issuer: 'Chase',
        productName: 'Card',
        imageUrl: 'not-a-url',
      };
      const result = CreateCardProductSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateUserPreferencesSchema', () => {
    it('should accept valid theme', () => {
      const data = { theme: 'dark' };
      const result = UpdateUserPreferencesSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid theme', () => {
      const data = { theme: 'invalid' };
      const result = UpdateUserPreferencesSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should accept boolean preferences', () => {
      const data = {
        emailNotifications: true,
        pushNotifications: false,
        betaFeatures: true,
      };
      const result = UpdateUserPreferencesSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should allow partial updates', () => {
      const data = { compactMode: true };
      const result = UpdateUserPreferencesSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('CreateCardBenefitSchema', () => {
    it('should validate complete benefit', () => {
      const data = {
        cardProductId: 'card_123',
        benefitName: 'Annual Travel Credit',
        type: 'STATEMENT_CREDIT',
        timing: 'Annual',
        maxAmount: 300,
        keywords: ['travel', 'airline'],
        active: true,
      };
      const result = CreateCardBenefitSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid benefit type', () => {
      const data = {
        cardProductId: 'card_123',
        benefitName: 'Credit',
        type: 'INVALID_TYPE',
        timing: 'Annual',
        keywords: ['test'],
      };
      const result = CreateCardBenefitSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject empty keywords array', () => {
      const data = {
        cardProductId: 'card_123',
        benefitName: 'Credit',
        type: 'STATEMENT_CREDIT',
        timing: 'Annual',
        keywords: [],
      };
      const result = CreateCardBenefitSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should default active to true', () => {
      const data = {
        cardProductId: 'card_123',
        benefitName: 'Credit',
        type: 'STATEMENT_CREDIT',
        timing: 'Annual',
        keywords: ['test'],
      };
      const result = CreateCardBenefitSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.active).toBe(true);
      }
    });
  });

  describe('Helper Functions', () => {
    describe('validateSchema', () => {
      it('should return parsed data on success', () => {
        const data = { name: 'John' };
        const result = validateSchema(CreateFamilyMemberSchema, data);
        expect(result.name).toBe('John');
      });

      it('should throw error on validation failure', () => {
        const data = { name: '' };
        expect(() => validateSchema(CreateFamilyMemberSchema, data)).toThrow();
      });
    });

    describe('safeValidateSchema', () => {
      it('should return success result', () => {
        const data = { name: 'John' };
        const result = safeValidateSchema(CreateFamilyMemberSchema, data);
        expect(result.success).toBe(true);
      });

      it('should return error result without throwing', () => {
        const data = { name: '' };
        const result = safeValidateSchema(CreateFamilyMemberSchema, data);
        expect(result.success).toBe(false);
      });
    });
  });
});
