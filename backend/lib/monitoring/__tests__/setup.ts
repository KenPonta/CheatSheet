/**
 * Test setup for monitoring tests
 * Sets up required environment variables and mocks
 */

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.OPENAI_MODEL = 'gpt-4o';
process.env.OPENAI_MAX_TOKENS = '4000';
process.env.MAX_FILE_SIZE = '50000000';
process.env.MAX_FILES_PER_REQUEST = '10';
process.env.UPLOAD_TIMEOUT = '300000';
process.env.RATE_LIMIT_REQUESTS_PER_MINUTE = '60';
process.env.RATE_LIMIT_REQUESTS_PER_HOUR = '1000';
process.env.HEALTH_CHECK_INTERVAL = '30000';
process.env.HEALTH_CHECK_TIMEOUT = '5000';

// Mock console methods to reduce test noise
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});

// Mock timers for testing
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllTimers();
});

export {};