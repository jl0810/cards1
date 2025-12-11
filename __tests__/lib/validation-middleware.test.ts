/**
 * Tests for Validation Middleware
 *
 * @implements BR-026 - Input Validation Required
 * @implements BR-027 - Data Sanitization
 * @satisfies US-015 - Input Validation
 */

import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import {
  validateBody,
  validateQuery,
  validateParams,
  validateAuth,
  withValidation,
  CommonSchemas,
} from "@/lib/validation-middleware";
import { createMockRequest } from "../utils/mock-helpers";

describe("Validation Middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validateBody", () => {
    const schema = z.object({
      name: z.string().min(3),
      age: z.number().min(18),
    });

    it("should validate valid body", async () => {
      const req = createMockRequest({
        method: "POST",
        url: "http://localhost/api/test",
        body: { name: "John", age: 25 },
      });
      const result = await validateBody(schema, req);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: "John", age: 25 });
      }
    });

    it("should fail on invalid body", async () => {
      const req = createMockRequest({
        method: "POST",
        url: "http://localhost/api/test",
        body: { name: "Jo", age: 10 },
      });
      const result = await validateBody(schema, req);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NextResponse);
        expect(result.error.status).toBe(400);
      }
    });
  });

  describe("validateQuery", () => {
    const schema = z.object({
      page: z.string().transform(Number),
      sort: z.enum(["asc", "desc"]),
    });

    it("should validate valid query params", () => {
      const req = createMockRequest({
        method: "GET",
        url: "http://localhost/api/test?page=1&sort=desc",
      });
      const result = validateQuery(schema, req);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ page: 1, sort: "desc" });
      }
    });

    it("should fail on invalid query params", () => {
      const req = createMockRequest({
        method: "GET",
        url: "http://localhost/api/test?page=abc&sort=invalid",
      });
      const result = validateQuery(schema, req);

      expect(result.success).toBe(false);
    });
  });

  describe("validateParams", () => {
    const schema = z.object({
      id: z.string().uuid(),
    });

    it("should validate valid params", () => {
      const params = { id: "123e4567-e89b-12d3-a456-426614174000" };
      const result = validateParams(schema, params);

      expect(result.success).toBe(true);
    });

    it("should fail on invalid params", () => {
      const params = { id: "invalid-uuid" };
      const result = validateParams(schema, params);

      expect(result.success).toBe(false);
    });
  });

  describe("validateAuth", () => {
    it("should return null if authorized", () => {
      const result = validateAuth("user_123");
      expect(result).toBeNull();
    });

    it("should return error response if unauthorized", () => {
      const result = validateAuth(null);
      expect(result).toBeInstanceOf(NextResponse);
      expect(result?.status).toBe(401);
    });
  });

  describe("withValidation", () => {
    const schema = z.object({ name: z.string() });
    const handler = jest
      .fn()
      .mockResolvedValue(NextResponse.json({ success: true }));

    it("should call handler with validated data", async () => {
      const wrapped = withValidation(schema, handler);
      const req = createMockRequest({
        method: "POST",
        url: "http://localhost/api/test",
        body: { name: "Test" },
      });

      await wrapped(req, { params: {} });

      expect(handler).toHaveBeenCalledWith(
        req,
        expect.objectContaining({
          data: { name: "Test" },
        }),
      );
    });

    it("should return error without calling handler if validation fails", async () => {
      const wrapped = withValidation(schema, handler);
      const req = createMockRequest({
        method: "POST",
        url: "http://localhost/api/test",
        body: { age: 25 }, // Missing required 'name' field
      });

      const res = await wrapped(req, { params: {} });

      expect(handler).not.toHaveBeenCalled();
      expect(res.status).toBe(400);
    });
  });

  describe("CommonSchemas", () => {
    it("should validate pagination", () => {
      const result = CommonSchemas.pagination.safeParse({
        page: "2",
        limit: "20",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ page: 2, limit: 20 });
      }
    });

    it("should validate sort", () => {
      const result = CommonSchemas.sort.safeParse({ sortOrder: "asc" });
      expect(result.success).toBe(true);
    });
  });
});
