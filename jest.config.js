const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    // Mock ESM modules that Jest can't parse
    // Note: @clerk/backend is NOT mocked - we use the real module for integration tests
    "^uncrypto$": "<rootDir>/__mocks__/uncrypto.js",
    "^@upstash/redis$": "<rootDir>/__mocks__/@upstash/redis.js",
  },
  testEnvironmentOptions: {
    customExportConditions: ["node", "node-addons"],
  },
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/e2e/",
    "<rootDir>/__tests__/e2e/",
  ],
  testMatch: [
    "**/__tests__/**/*.test.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
