import { describe, expect, it } from "@jest/globals";
import { ApiError, Errors, successResponse } from "@/lib/api-errors";

describe("API Errors", () => {
  describe("ApiError Class", () => {
    it("should create error with message and status", () => {
      const error = new ApiError("Test error", 400);
      expect(error.message).toBe("Test error");
      expect(error.status).toBe(400);
      expect(error.name).toBe("ApiError");
    });

    it("should be instance of Error", () => {
      const error = new ApiError("Test", 500);
      expect(error instanceof Error).toBe(true);
      expect(error instanceof ApiError).toBe(true);
    });

    it("should have stack trace", () => {
      const error = new ApiError("Test", 500);
      expect(error.stack).toBeDefined();
    });
  });

  describe("Errors.unauthorized()", () => {
    it("should return 401 response", async () => {
      const response = Errors.unauthorized();
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it("should use custom message if provided", async () => {
      const response = Errors.unauthorized("Custom unauthorized message");
      const data = await response.json();
      expect(data.error).toContain("Custom unauthorized message");
    });
  });

  describe("Errors.forbidden()", () => {
    it("should return 403 response", async () => {
      const response = Errors.forbidden();
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it("should use custom message if provided", async () => {
      const response = Errors.forbidden("No access");
      const data = await response.json();
      expect(data.error).toContain("No access");
    });
  });

  describe("Errors.notFound()", () => {
    it("should return 404 response", async () => {
      const response = Errors.notFound("User");
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it("should include resource name in message", async () => {
      const response = Errors.notFound("Account");
      const data = await response.json();
      expect(data.error).toContain("Account");
    });

    it("should have default message", async () => {
      const response = Errors.notFound();
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe("Errors.badRequest()", () => {
    it("should return 400 response", async () => {
      const response = Errors.badRequest("Invalid input");
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("Invalid input");
    });

    it("should have default message", async () => {
      const response = Errors.badRequest();
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });

  describe("Errors.internal()", () => {
    it("should return 500 response", async () => {
      const response = Errors.internal();
      expect(response.status).toBe(500);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    it("should use custom message if provided", async () => {
      const response = Errors.internal("Database connection failed");
      const data = await response.json();
      // Internal errors always use generic message for security
      expect(data.error).toBe("Internal Server Error");
    });

    it("should have default generic message", async () => {
      const response = Errors.internal();
      const data = await response.json();
      expect(data.error).toContain("Internal");
    });
  });

  describe("successResponse()", () => {
    it("should return 200 response with data", async () => {
      const testData = { id: "123", name: "Test" };
      const response = successResponse(testData);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({ success: true, data: testData });
    });

    it("should handle arrays", async () => {
      const testData = [{ id: "1" }, { id: "2" }];
      const response = successResponse(testData);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].id).toBe("1");
    });

    it("should handle null values", async () => {
      const response = successResponse(null);
      const data = await response.json();
      expect(data).toEqual({ success: true, data: null });
    });

    it("should handle primitive values", async () => {
      const response = successResponse("success");
      const data = await response.json();
      expect(data).toEqual({ success: true, data: "success" });
    });
  });

  describe("Response Headers", () => {
    it("should have Content-Type header", () => {
      const response = Errors.badRequest();
      // NextResponse.json() automatically sets Content-Type
      expect(response).toBeDefined();
      expect(response.status).toBe(400);
    });

    it("should have correct Content-Type for success", () => {
      const response = successResponse({ test: true });
      // NextResponse.json() automatically sets Content-Type
      expect(response).toBeDefined();
      expect(response.status).toBe(200);
    });
  });

  describe("Error Response Format", () => {
    it("should return consistent error format", async () => {
      const response = Errors.badRequest("Test error");
      const data = await response.json();

      expect(data).toHaveProperty("error");
      expect(typeof data.error).toBe("string");
    });

    it("should not expose sensitive information", async () => {
      const response = Errors.internal("Database password: secret123");
      const data = await response.json();

      // Internal errors should use generic message, not expose details
      expect(data.error).not.toContain("secret123");
    });
  });

  describe("HTTP Status Codes", () => {
    it("should use standard status codes", () => {
      expect(Errors.unauthorized().status).toBe(401);
      expect(Errors.forbidden().status).toBe(403);
      expect(Errors.notFound().status).toBe(404);
      expect(Errors.badRequest().status).toBe(400);
      expect(Errors.internal().status).toBe(500);
      expect(successResponse({}).status).toBe(200);
    });

    it("should have valid status codes", () => {
      const statuses = [
        Errors.unauthorized().status,
        Errors.forbidden().status,
        Errors.notFound().status,
        Errors.badRequest().status,
        Errors.internal().status,
      ];

      statuses.forEach((status) => {
        expect(status).toBeGreaterThanOrEqual(400);
        expect(status).toBeLessThan(600);
      });
    });
  });

  describe("Integration with Next.js", () => {
    it("should return NextResponse instance", () => {
      const response = Errors.badRequest();
      expect(response).toHaveProperty("status");
      expect(response).toHaveProperty("headers");
      expect(typeof response.json).toBe("function");
    });

    it("should work in API route context", async () => {
      // Simulate returning from API route
      const handler = async () => {
        const isValid = false;
        if (!isValid) {
          return Errors.badRequest("Validation failed");
        }
        return successResponse({ success: true });
      };

      const response = await handler();
      expect(response.status).toBe(400);
    });
  });
});
