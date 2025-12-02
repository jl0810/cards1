import "@testing-library/jest-dom";
import dotenv from "dotenv";
import path from "path";

// Load test environment variables
// Next.js loads .env.local but NOT .env.test.local by default
dotenv.config({ path: path.resolve(process.cwd(), ".env.test.local") });

// Mock fetch globally
global.fetch = jest.fn();

// Add TextEncoder/TextDecoder for Node environment
const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Next.js Request/Response for App Router API tests
global.Request = class Request {
  constructor(url, init) {
    this.url = url;
    this.init = init || {};
    this.method = init?.method || "GET";
    this.headers = new Map(Object.entries(init?.headers || {}));
  }
  json() {
    return Promise.resolve(this.init.body ? JSON.parse(this.init.body) : {});
  }
};

global.Response = class Response {
  constructor(body, init) {
    this.body = body;
    this.init = init || {};
    this.status = init?.status || 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = init?.statusText || "OK";

    // Create headers object with get method
    const headersData = init?.headers || {};
    const getHeader = (name) => {
      const lowerName = name.toLowerCase();
      for (const [key, value] of Object.entries(headersData)) {
        if (key.toLowerCase() === lowerName) {
          return value;
        }
      }
      return null;
    };
    this.headers = {
      get: getHeader,
      has: (name) => getHeader(name) !== null,
      entries: () => Object.entries(headersData),
    };
  }
  async json() {
    // Handle string bodies - parse JSON
    if (typeof this.body === "string") {
      try {
        return JSON.parse(this.body);
      } catch (e) {
        // If not valid JSON, return as error object
        return { error: this.body };
      }
    }
    return this.body;
  }
  async text() {
    if (typeof this.body === "string") {
      return this.body;
    }
    return JSON.stringify(this.body);
  }
  static json(data, init) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  }
};
