# CheeseSheet Testing Guide

This guide covers testing strategies, test files, and quality assurance for CheeseSheet.

## 🧪 Testing Overview

CheeseSheet uses a comprehensive testing strategy including:
- Unit tests for individual components
- Integration tests for API endpoints
- End-to-end tests for user workflows
- Performance tests for optimization

## 📋 Test Structure

```
test/
├── unit/              # Unit tests
├── integration/       # Integration tests
├── e2e/              # End-to-end tests
├── performance/      # Performance tests
└── fixtures/         # Test data and fixtures
```

## 🚀 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- components/compact-study-generator.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="PDF generation"
```

## 🔧 Test Configuration

Tests are configured using:
- **Jest** - Test runner and framework
- **Testing Library** - React component testing
- **MSW** - API mocking
- **Puppeteer** - E2E testing

### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    'backend/**/*.{js,ts}',
    '!**/*.d.ts',
  ],
}
```

## 📝 Writing Tests

### Component Tests
```typescript
import { render, screen } from '@testing-library/react'
import { CompactStudyGenerator } from '@/components/compact-study-generator'

describe('CompactStudyGenerator', () => {
  it('renders upload interface', () => {
    render(<CompactStudyGenerator />)
    expect(screen.getByText('Upload Files')).toBeInTheDocument()
  })
})
```

### API Tests
```typescript
import { POST } from '@/app/api/generate-compact-study/route'

describe('/api/generate-compact-study', () => {
  it('generates study guide from PDF', async () => {
    const request = new Request('http://localhost:3000/api/generate-compact-study', {
      method: 'POST',
      body: JSON.stringify({
        files: [{ name: 'test.pdf', content: 'base64content' }],
        config: { layout: 'compact' }
      })
    })
    
    const response = await POST(request)
    const data = await response.json()
    
    expect(data.success).toBe(true)
    expect(data.html).toBeDefined()
  })
})
```

## 🎯 Test Categories

### Unit Tests
- Component rendering
- Function logic
- Utility functions
- Error handling

### Integration Tests
- API endpoint functionality
- Database operations
- File processing
- AI service integration

### E2E Tests
- Complete user workflows
- File upload and processing
- Study guide generation
- PDF download

### Performance Tests
- Memory usage
- Processing time
- Concurrent requests
- Large file handling

## 📊 Test Coverage

Maintain high test coverage:
- **Components**: >90%
- **API Routes**: >85%
- **Utilities**: >95%
- **Critical Paths**: 100%

```bash
# Generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

## 🔍 Test Data

### Fixtures
Test data is stored in `test/fixtures/`:
- Sample PDF files
- Expected output data
- Mock API responses
- Configuration examples

### Mocking
Use MSW for API mocking:
```typescript
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.post('/api/generate-compact-study', (req, res, ctx) => {
    return res(ctx.json({ success: true, html: '<html>...</html>' }))
  })
)
```

## 🚨 Quality Gates

All code must pass:
1. **Linting** - ESLint rules
2. **Type Checking** - TypeScript compilation
3. **Unit Tests** - All tests passing
4. **Coverage** - Minimum thresholds met
5. **Build** - Production build successful

## 🔄 Continuous Integration

Tests run automatically on:
- Pull requests
- Main branch commits
- Release tags

### GitHub Actions
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

## 🐛 Debugging Tests

### Common Issues
```bash
# Clear Jest cache
npx jest --clearCache

# Run tests with verbose output
npm test -- --verbose

# Debug specific test
npm test -- --testNamePattern="your test" --verbose
```

### Test Debugging
```typescript
// Add debug output
console.log('Test data:', testData)

// Use screen.debug() for component tests
import { screen } from '@testing-library/react'
screen.debug() // Prints current DOM
```

## 📈 Performance Testing

### Memory Tests
```bash
# Test memory usage
npm run memory:check

# Profile memory during tests
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Load Testing
```bash
# Test API endpoints
npx autocannon http://localhost:3000/api/health

# Test file processing
npm run test:performance
```

## 🆘 Troubleshooting

### Test Failures
1. Check test logs for specific errors
2. Verify test data and fixtures
3. Check for timing issues in async tests
4. Ensure proper cleanup between tests

### Performance Issues
1. Use `--runInBand` for memory-intensive tests
2. Increase Jest timeout for slow tests
3. Mock external services
4. Use test.concurrent for parallel tests

---

**CheeseSheet Testing Guide v1.0**