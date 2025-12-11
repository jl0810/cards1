import { NextRequest } from "next/server";

interface MockRequestOptions {
  method?: string;
  url?: string;
  body?: unknown;
}

export function createMockRequest({
  method = "GET",
  url = "http://localhost/api/test",
  body,
}: MockRequestOptions = {}) {
  const urlObj = new URL(url);

  // Return a mock object that satisfies the NextRequest interface for our needs
  // This avoids issues with NextRequest constructor in the test environment
  return {
    url: url,
    nextUrl: urlObj,
    method,
    headers: new Headers(),
    json: async () => body || {},
    text: async () => JSON.stringify(body || {}),
    clone: function () {
      return this;
    },
    // Add other properties/methods as needed by the tests
  } as unknown as NextRequest;
}

export function mockResolvedValue<T>(mock: jest.Mock, value: T) {
  mock.mockResolvedValue(value);
}

export function mockRejectedValue(mock: jest.Mock, error: Error) {
  mock.mockRejectedValue(error);
}
