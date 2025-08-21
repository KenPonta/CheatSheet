// Test setup for AI module
import '@testing-library/jest-dom';

// Mock environment variables for tests
process.env.OPENAI_API_KEY = 'test-api-key';

// Global test utilities
global.console = {
  ...console,
  // Suppress console.warn in tests unless explicitly needed
  warn: jest.fn(),
  error: jest.fn(),
};