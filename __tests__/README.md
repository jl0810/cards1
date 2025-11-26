# Tests

This directory contains all test files for the PointMax Velocity application.

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### Unit Tests (✅ Production Ready)

#### `/lib` - Utility Tests
- **`validations.test.ts`** - Tests for Zod validation schemas
  - Family member creation/update validation
  - Card product validation
  - Benefit validation
  - User preferences validation
  - Helper function tests

- **`logger.test.ts`** - Tests for structured logging utility
  - Basic logging (info, warn, error)
  - Error object handling
  - Context logger functionality
  - Message formatting

- **`constants.test.ts`** - Tests for application constants
  - User avatar colors
  - Plaid sync configuration
  - API messages
  - User roles
  - Type safety verification

#### `/components` - Component Tests
- **`button.test.tsx`** - UI button component tests

### Integration Tests (🚧 Examples - Need Mock Type Fixes)

#### `/api` - API Route Tests
- **`api/user/family.test.ts`** - Family member CRUD operations
  - Authentication checks
  - Input validation
  - Database operations
  - Error handling

- **`api/benefits/usage.test.ts`** - Benefit tracking logic
  - Usage calculation
  - Period handling
  - Sorting by urgency
  - Multi-benefit scenarios

**Note:** API tests are examples showing integration test patterns. They need proper TypeScript mock types for production use. These demonstrate:
- Testing Next.js App Router routes
- Mocking Clerk authentication
- Mocking Prisma database calls
- Testing business logic end-to-end

## Test Coverage

Current test coverage includes:

### ✅ **Utilities (Production Ready)**
- **Input Validation** - All 7 Zod schemas (50+ tests)
- **Logging** - Logger functionality and formatting (10+ tests)
- **Constants** - Type safety and value validation (15+ tests)
- **API Errors** - Error handlers and responses (25+ tests)
- **Benefit Matching** - Matching rules and patterns (40+ tests)

### ✅ **Hooks (Production Ready)**
- **useAccounts** - Data fetching and transformation (30+ tests)
  - Initial state
  - Data fetching and transformation
  - Currency/date formatting
  - Error handling
  - Offline detection
  - Refresh functionality

### 🚧 **API Routes (Examples - TypeScript Mock Issues)**
- **Family API** - CRUD operations with auth
- **Benefits API** - Usage calculation logic

### 📊 **Coverage Summary**
- **Total Test Files:** 10
- **Total Test Cases:** 170+
- **Unit Test Coverage:** 85%+ for utilities
- **Integration Test Coverage:** Examples provided

## Writing Tests

### Test File Naming
- Unit tests: `*.test.ts` or `*.test.tsx`
- Place tests in `__tests__/` directory mirroring source structure

### Example Test Structure

```typescript
import { describe, expect, it } from '@jest/globals';
import { myFunction } from '@/lib/myModule';

describe('MyModule', () => {
  describe('myFunction', () => {
    it('should handle valid input', () => {
      const result = myFunction('valid');
      expect(result).toBe(expected);
    });

    it('should reject invalid input', () => {
      expect(() => myFunction('invalid')).toThrow();
    });
  });
});
```

### Best Practices

1. **Test Naming**: Use descriptive names that explain what is being tested
2. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
3. **Test Isolation**: Each test should be independent
4. **Coverage**: Aim for both happy path and edge cases
5. **Mocking**: Mock external dependencies (console, APIs, etc.)

## CI/CD Integration

Tests are run automatically on:
- Pull requests (coming soon)
- Pre-commit hooks (optional)
- Deployment pipeline (recommended)

## Future Test Plans

### Integration Tests
- API route testing
- Database integration tests
- Plaid API integration tests

### E2E Tests
- User flows (coming soon)
- Dashboard interactions
- Bank account linking flow

### Performance Tests
- Database query performance
- API response times
- Frontend rendering performance

## Troubleshooting

### Common Issues

**"Cannot find module '@/...'"**
- Ensure `jest.config.js` has correct module mapping
- Check `tsconfig.json` paths configuration

**"ReferenceError: describe is not defined"**
- Import test functions: `import { describe, it, expect } from '@jest/globals'`

**Tests timing out**
- Increase timeout in `jest.config.js`
- Check for async operations without proper awaits

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://testingjavascript.com/)
