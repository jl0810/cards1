/**
 * Tests for Benefits Match API
 *
 * @implements BR-024 - Cursor-Based Tracking
 * @satisfies US-012 - Manual Benefit Matching
 */

import { POST } from "@/app/api/benefits/match/route";
import { scanAndMatchBenefits } from "@/lib/benefit-matcher";
import { auth } from "@clerk/nextjs/server";
import { rateLimit } from "@/lib/rate-limit";
import { createMockRequest } from "../../utils/mock-helpers";

// Mock dependencies
jest.mock("@/lib/benefit-matcher", () => ({
  scanAndMatchBenefits: jest.fn(),
}));

jest.mock("@clerk/nextjs/server", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/rate-limit", () => ({
  rateLimit: jest.fn(),
  RATE_LIMITS: { write: 20 },
}));

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn() },
}));

describe("Benefits Match API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as unknown as jest.Mock).mockReturnValue({ userId: "user_123" });
    (rateLimit as jest.Mock).mockResolvedValue(false); // Not rate limited
  });

  it("should trigger benefit scanning", async () => {
    const mockResult = { scanned: 10, matched: 2 };
    (scanAndMatchBenefits as jest.Mock).mockResolvedValue(mockResult);

    const req = createMockRequest({
      method: "POST",
      url: "http://localhost/api/benefits/match",
    });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ success: true, ...mockResult });
    expect(scanAndMatchBenefits).toHaveBeenCalledWith("user_123");
  });

  it("should return 429 if rate limited", async () => {
    (rateLimit as jest.Mock).mockResolvedValue(true);

    const req = createMockRequest({
      method: "POST",
      url: "http://localhost/api/benefits/match",
    });
    const res = await POST(req);

    expect(res.status).toBe(429);
    expect(scanAndMatchBenefits).not.toHaveBeenCalled();
  });

  it("should return 401 if not authenticated", async () => {
    (auth as unknown as jest.Mock).mockReturnValue({ userId: null });

    const req = createMockRequest({
      method: "POST",
      url: "http://localhost/api/benefits/match",
    });
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("should return 500 on error", async () => {
    (scanAndMatchBenefits as jest.Mock).mockRejectedValue(
      new Error("Scan failed"),
    );

    const req = createMockRequest({
      method: "POST",
      url: "http://localhost/api/benefits/match",
    });
    const res = await POST(req);

    expect(res.status).toBe(500);
  });
});
