// Mock for @clerk/backend
// For integration tests, we pass through to the real module
// For unit tests, you can add mocks here if needed

// Try to load the actual module, but provide a fallback
try {
  const actual = jest.requireActual('@clerk/backend');
  module.exports = actual;
} catch (error) {
  console.error('Failed to load @clerk/backend:', error);
  // Provide a minimal mock if the actual module can't be loaded
  module.exports = {
    createClerkClient: () => {
      throw new Error('@clerk/backend not available in test environment');
    }
  };
}
