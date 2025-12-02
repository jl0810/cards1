import { describe, expect, it } from "@jest/globals";
import {
  USER_AVATAR_COLORS,
  PLAID_SYNC_CONFIG,
  DEFAULT_CURRENCY,
  DATE_FORMATS,
  API_MESSAGES,
  USER_ROLES,
} from "@/lib/constants";
import { DateTimeFormatOptionsSchema } from "@/lib/validations";
import type { z } from "zod";

type DateTimeFormatOptions = z.infer<typeof DateTimeFormatOptionsSchema>;

describe("Constants", () => {
  describe("USER_AVATAR_COLORS", () => {
    it("should have at least 5 colors", () => {
      expect(USER_AVATAR_COLORS.length).toBeGreaterThanOrEqual(5);
    });

    it("should contain valid Tailwind color classes", () => {
      USER_AVATAR_COLORS.forEach((color) => {
        expect(color).toMatch(/^bg-\w+-\d{3}$/);
      });
    });

    it("should be readonly array", () => {
      expect(Object.isFrozen(USER_AVATAR_COLORS)).toBe(true);
    });
  });

  describe("PLAID_SYNC_CONFIG", () => {
    it("should have MAX_ITERATIONS", () => {
      expect(PLAID_SYNC_CONFIG.MAX_ITERATIONS).toBeDefined();
      expect(typeof PLAID_SYNC_CONFIG.MAX_ITERATIONS).toBe("number");
      expect(PLAID_SYNC_CONFIG.MAX_ITERATIONS).toBeGreaterThan(0);
    });

    it("should have DB_TIMEOUT_MS", () => {
      expect(PLAID_SYNC_CONFIG.DB_TIMEOUT_MS).toBeDefined();
      expect(typeof PLAID_SYNC_CONFIG.DB_TIMEOUT_MS).toBe("number");
      expect(PLAID_SYNC_CONFIG.DB_TIMEOUT_MS).toBeGreaterThan(0);
    });

    it("should have reasonable timeout value", () => {
      expect(PLAID_SYNC_CONFIG.DB_TIMEOUT_MS).toBeGreaterThanOrEqual(10000);
      expect(PLAID_SYNC_CONFIG.DB_TIMEOUT_MS).toBeLessThanOrEqual(120000);
    });

    it("should have reasonable max iterations", () => {
      expect(PLAID_SYNC_CONFIG.MAX_ITERATIONS).toBeGreaterThanOrEqual(10);
      expect(PLAID_SYNC_CONFIG.MAX_ITERATIONS).toBeLessThanOrEqual(100);
    });
  });

  describe("DEFAULT_CURRENCY", () => {
    it("should be a valid currency code", () => {
      expect(DEFAULT_CURRENCY).toMatch(/^[A-Z]{3}$/);
    });

    it("should be USD", () => {
      expect(DEFAULT_CURRENCY).toBe("USD");
    });
  });

  describe("DATE_FORMATS", () => {
    it("should have SHORT format", () => {
      expect(DATE_FORMATS.SHORT).toBeDefined();
      expect(typeof DATE_FORMATS.SHORT).toBe("object");
    });

    it("should have LONG format", () => {
      expect(DATE_FORMATS.LONG).toBeDefined();
      expect(typeof DATE_FORMATS.LONG).toBe("object");
    });

    it("should have valid Intl.DateTimeFormat options", () => {
      expect(DATE_FORMATS.SHORT).toHaveProperty("month");
      expect(DATE_FORMATS.SHORT).toHaveProperty("day");
      expect(DATE_FORMATS.SHORT).toHaveProperty("year");
    });

    it("should format dates correctly", () => {
      const testDate = new Date("2025-01-15");
      const shortFormat = new Intl.DateTimeFormat(
        "en-US",
        DATE_FORMATS.SHORT as Intl.DateTimeFormatOptions,
      ).format(testDate);
      // Format is "Jan 15, 2025" not "1/15/2025" with these options
      expect(shortFormat).toMatch(/[A-Za-z]{3}\s+\d{1,2},\s+\d{4}/);
    });
  });

  describe("API_MESSAGES", () => {
    it("should have UNAUTHORIZED message", () => {
      expect(API_MESSAGES.UNAUTHORIZED).toBeDefined();
      expect(typeof API_MESSAGES.UNAUTHORIZED).toBe("string");
      expect(API_MESSAGES.UNAUTHORIZED.length).toBeGreaterThan(0);
    });

    it("should have USER_NOT_FOUND message", () => {
      expect(API_MESSAGES.USER_NOT_FOUND).toBeDefined();
      expect(typeof API_MESSAGES.USER_NOT_FOUND).toBe("string");
    });

    it("should have NAME_REQUIRED message", () => {
      expect(API_MESSAGES.NAME_REQUIRED).toBeDefined();
      expect(typeof API_MESSAGES.NAME_REQUIRED).toBe("string");
    });

    it("should have INTERNAL_ERROR message", () => {
      expect(API_MESSAGES.INTERNAL_ERROR).toBeDefined();
      expect(typeof API_MESSAGES.INTERNAL_ERROR).toBe("string");
    });

    it("should have user-friendly messages", () => {
      Object.values(API_MESSAGES).forEach((message) => {
        expect(message.length).toBeGreaterThan(5);
        expect(message.length).toBeLessThan(100);
      });
    });
  });

  describe("USER_ROLES", () => {
    it("should have OWNER role", () => {
      expect(USER_ROLES.OWNER).toBeDefined();
      expect(typeof USER_ROLES.OWNER).toBe("string");
    });

    it("should have MEMBER role", () => {
      expect(USER_ROLES.MEMBER).toBeDefined();
      expect(typeof USER_ROLES.MEMBER).toBe("string");
    });

    it("should have ADMIN role", () => {
      expect(USER_ROLES.ADMIN).toBeDefined();
      expect(typeof USER_ROLES.ADMIN).toBe("string");
    });

    it("should have distinct role values", () => {
      const roles = Object.values(USER_ROLES);
      const uniqueRoles = new Set(roles);
      expect(uniqueRoles.size).toBe(roles.length);
    });
  });

  describe("Type Safety", () => {
    it("should prevent modification of constants", () => {
      // This test ensures constants are properly typed as const
      // TypeScript will catch any attempts to modify them at compile time
      expect(Object.isFrozen(USER_AVATAR_COLORS)).toBe(true);
    });
  });
});
